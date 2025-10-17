"""
============================================================================
🧠 Swin Transformer 기반 탈모 분류 AI 모델
============================================================================

📌 주요 특징:
- 6채널 입력: RGB 이미지(3채널) + 헤어 마스크(3채널)
- 4단계 탈모 분류: 0(정상) → 1(경미) → 2(중등도) → 3(심각)
- Shifted Window Attention으로 효율적인 특징 추출

📊 모델 구조 요약:
    입력(224x224) → Patch Embed → Stage1(56x56) → Stage2(28x28)
    → Stage3(14x14) → Stage4(7x7) → 분류(4클래스)

📄 논문: "Swin Transformer: Hierarchical Vision Transformer using Shifted Windows"
============================================================================
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from timm.models.layers import DropPath, to_2tuple, trunc_normal_
import math


# ============================================================================
# 🔧 보조 모듈 (Helper Modules)
# ============================================================================

class Mlp(nn.Module):
    """
    🔹 Multi-Layer Perceptron (MLP) 블록

    역할: Transformer의 Feed-Forward Network
    동작: 입력 → 확장(4배) → 활성화 → 축소 → 출력

    예시:
        입력: (배치, 토큰, 96차원)
        히든: (배치, 토큰, 384차원)  ← 4배 확장
        출력: (배치, 토큰, 96차원)
    """

    def __init__(self, in_features, hidden_features=None, out_features=None,
                 act_layer=nn.GELU, drop=0.):
        """
        파라미터:
            in_features (int): 입력 차원 (예: 96)
            hidden_features (int): 히든 차원 (예: 384, 기본값=입력*4)
            out_features (int): 출력 차원 (기본값=입력과 동일)
            act_layer: 활성화 함수 (GELU 사용)
            drop (float): 드롭아웃 비율
        """
        super().__init__()
        out_features = out_features or in_features
        hidden_features = hidden_features or in_features

        self.fc1 = nn.Linear(in_features, hidden_features)
        self.act = act_layer()
        self.fc2 = nn.Linear(hidden_features, out_features)
        self.drop = nn.Dropout(drop)

    def forward(self, x):
        """
        순전파 경로:
        x → Linear1 → GELU → Dropout → Linear2 → Dropout → output
        """
        x = self.fc1(x)      # 차원 확장
        x = self.act(x)      # 비선형 활성화
        x = self.drop(x)     # 정규화
        x = self.fc2(x)      # 원래 차원으로 축소
        x = self.drop(x)     # 정규화
        return x


def window_partition(x, window_size):
    """
    🪟 이미지를 작은 윈도우로 분할

    핵심 아이디어:
    - 전체 이미지에 대해 Attention 계산하면 O(N²)로 너무 느림
    - 작은 윈도우(7x7)로 나눠서 각각 계산하면 O(M²)로 빠름!

    시각화:
    ┌─────────────────┐
    │  ┌──┬──┬──┬──┐  │  224x224 이미지를
    │  ├──┼──┼──┼──┤  │  7x7 윈도우로 분할
    │  ├──┼──┼──┼──┤  │  → 32x32 = 1024개의 윈도우
    │  └──┴──┴──┴──┘  │
    └─────────────────┘

    Args:
        x: 입력 텐서 (배치, 높이, 너비, 채널)
           예: (2, 56, 56, 96)
        window_size (int): 윈도우 크기 (보통 7)

    Returns:
        windows: (윈도우개수*배치, 7, 7, 채널)
                 예: (128, 7, 7, 96)
    """
    B, H, W, C = x.shape

    # 이미지를 윈도우 단위로 재배열
    x = x.view(B, H // window_size, window_size, W // window_size, window_size, C)
    windows = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(-1, window_size, window_size, C)
    return windows


def window_reverse(windows, window_size, H, W):
    """
    🔄 윈도우들을 다시 원본 이미지로 복원

    window_partition의 반대 연산

    Args:
        windows: 윈도우 배치 (윈도우개수*배치, 7, 7, 채널)
        window_size (int): 윈도우 크기
        H, W (int): 원본 이미지의 높이와 너비

    Returns:
        x: 복원된 이미지 (배치, 높이, 너비, 채널)
    """
    B = int(windows.shape[0] / (H * W / window_size / window_size))
    x = windows.view(B, H // window_size, W // window_size, window_size, window_size, -1)
    x = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(B, H, W, -1)
    return x


# ============================================================================
# 💡 Attention 모듈 (핵심 메커니즘)
# ============================================================================

class WindowAttention(nn.Module):
    """
    🎯 Window 기반 Multi-Head Self Attention (W-MSA)

    ✨ Swin Transformer의 핵심 메커니즘!

    기존 Vision Transformer 문제:
        - 전체 이미지에 Attention → 계산량 폭발 💥
        - 224x224 이미지 = 50,176개 토큰 → O(N²) = 2.5억번 연산!

    Swin의 해결책:
        - 7x7 윈도우로 분할 → 49개 토큰만 계산 → O(49²) = 2,401번!
        - 100배 이상 빠름! 🚀

    특징:
        1. Window 단위로 Attention 계산 (계산 효율 ↑)
        2. Relative Position Bias 사용 (위치 정보 학습)
        3. Multi-Head로 다양한 패턴 학습
    """

    def __init__(self, dim, window_size, num_heads, qkv_bias=True,
                 qk_scale=None, attn_drop=0., proj_drop=0.):
        """
        파라미터:
            dim (int): 입력 채널 수 (예: 96)
            window_size (tuple): 윈도우 크기 (7, 7)
            num_heads (int): Attention Head 개수 (예: 3)
            qkv_bias (bool): Query/Key/Value에 bias 사용 여부
            attn_drop (float): Attention 드롭아웃
            proj_drop (float): 출력 프로젝션 드롭아웃
        """
        super().__init__()
        self.dim = dim
        self.window_size = window_size  # (Wh, Ww)
        self.num_heads = num_heads
        head_dim = dim // num_heads
        self.scale = qk_scale or head_dim ** -0.5  # Attention 스케일

        # 📍 Relative Position Bias 테이블
        # 위치 정보를 학습 가능한 파라미터로 저장
        self.relative_position_bias_table = nn.Parameter(
            torch.zeros((2 * window_size[0] - 1) * (2 * window_size[1] - 1), num_heads))

        # 윈도우 내 각 토큰 쌍의 상대 위치 계산
        coords_h = torch.arange(self.window_size[0])
        coords_w = torch.arange(self.window_size[1])
        coords = torch.stack(torch.meshgrid([coords_h, coords_w]))
        coords_flatten = torch.flatten(coords, 1)
        relative_coords = coords_flatten[:, :, None] - coords_flatten[:, None, :]
        relative_coords = relative_coords.permute(1, 2, 0).contiguous()
        relative_coords[:, :, 0] += self.window_size[0] - 1
        relative_coords[:, :, 1] += self.window_size[1] - 1
        relative_coords[:, :, 0] *= 2 * self.window_size[1] - 1
        relative_position_index = relative_coords.sum(-1)
        self.register_buffer("relative_position_index", relative_position_index)

        # Query, Key, Value를 한번에 계산
        self.qkv = nn.Linear(dim, dim * 3, bias=qkv_bias)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(proj_drop)

        trunc_normal_(self.relative_position_bias_table, std=.02)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x, mask=None):
        """
        🔄 Window Attention 순전파

        단계별 동작:
        1️⃣ Query, Key, Value 계산
        2️⃣ Attention 스코어 = Q @ K^T (내적)
        3️⃣ Relative Position Bias 추가 (위치 정보)
        4️⃣ Softmax로 확률 분포 계산
        5️⃣ Value와 곱해서 최종 출력

        Args:
            x: 입력 (윈도우*배치, 49토큰, 채널)
            mask: Shifted Window용 마스크 (선택적)

        Returns:
            출력 (윈도우*배치, 49토큰, 채널)
        """
        B_, N, C = x.shape

        # QKV 계산 (한번에 계산 후 분리)
        qkv = self.qkv(x).reshape(B_, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        # Scaled Dot-Product Attention
        q = q * self.scale
        attn = (q @ k.transpose(-2, -1))  # (B_, heads, N, N)

        # Relative Position Bias 추가 (Swin의 핵심!)
        relative_position_bias = self.relative_position_bias_table[
            self.relative_position_index.view(-1)].view(
            self.window_size[0] * self.window_size[1],
            self.window_size[0] * self.window_size[1], -1)
        relative_position_bias = relative_position_bias.permute(2, 0, 1).contiguous()
        attn = attn + relative_position_bias.unsqueeze(0)

        # Shifted Window Masking (필요시)
        if mask is not None:
            nW = mask.shape[0]
            attn = attn.view(B_ // nW, nW, self.num_heads, N, N) + mask.unsqueeze(1).unsqueeze(0)
            attn = attn.view(-1, self.num_heads, N, N)
            attn = self.softmax(attn)
        else:
            attn = self.softmax(attn)

        attn = self.attn_drop(attn)

        # Attention 가중치로 Value 집계
        x = (attn @ v).transpose(1, 2).reshape(B_, N, C)
        x = self.proj(x)
        x = self.proj_drop(x)
        return x


# ============================================================================
# 🏗️ Transformer 블록
# ============================================================================

class SwinTransformerBlock(nn.Module):
    """
    🧱 Swin Transformer Block (기본 구성 단위)

    동작 순서:
    ┌─────────────────────────────────────┐
    │  입력                                │
    │   ↓                                 │
    │  LayerNorm                          │
    │   ↓                                 │
    │  Window Partition (윈도우 분할)      │
    │   ↓                                 │
    │  Window Attention (주목!)           │
    │   ↓                                 │
    │  Window Merge (윈도우 병합)         │
    │   ↓                                 │
    │  Residual Connection (+)            │
    │   ↓                                 │
    │  LayerNorm                          │
    │   ↓                                 │
    │  MLP (Feed Forward)                 │
    │   ↓                                 │
    │  Residual Connection (+)            │
    │   ↓                                 │
    │  출력                                │
    └─────────────────────────────────────┘

    W-MSA vs SW-MSA:
    - W-MSA (shift=0): 일반 윈도우 Attention
    - SW-MSA (shift>0): 윈도우를 이동시켜 경계 정보 교환
    """

    def __init__(self, dim, input_resolution, num_heads, window_size=7, shift_size=0,
                 mlp_ratio=4., qkv_bias=True, qk_scale=None, drop=0., attn_drop=0.,
                 drop_path=0., act_layer=nn.GELU, norm_layer=nn.LayerNorm):
        """
        파라미터:
            dim (int): 채널 수
            input_resolution (tuple): 입력 해상도 (H, W)
            num_heads (int): Attention head 개수
            window_size (int): 윈도우 크기 (7)
            shift_size (int): 윈도우 이동 크기 (0 또는 window_size//2)
            mlp_ratio (float): MLP 확장 비율 (4배)
            drop_path (float): Stochastic Depth 비율
        """
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.num_heads = num_heads
        self.window_size = window_size
        self.shift_size = shift_size
        self.mlp_ratio = mlp_ratio

        # 입력이 윈도우보다 작으면 윈도우 분할 스킵
        if min(self.input_resolution) <= self.window_size:
            self.shift_size = 0
            self.window_size = min(self.input_resolution)

        self.norm1 = norm_layer(dim)
        self.attn = WindowAttention(
            dim, window_size=to_2tuple(self.window_size), num_heads=num_heads,
            qkv_bias=qkv_bias, qk_scale=qk_scale, attn_drop=attn_drop, proj_drop=drop)

        self.drop_path = DropPath(drop_path) if drop_path > 0. else nn.Identity()
        self.norm2 = norm_layer(dim)
        mlp_hidden_dim = int(dim * mlp_ratio)
        self.mlp = Mlp(in_features=dim, hidden_features=mlp_hidden_dim,
                       act_layer=act_layer, drop=drop)

    def forward(self, x):
        """
        순전파 (Shifted Window가 핵심!)

        SW-MSA의 윈도우 이동 개념:
        ┌──┬──┐    shift    ┌─┬───┬─┐
        ├──┼──┤    ────→    ├─┼───┼─┤  인접 윈도우 간
        ├──┼──┤             ├─┼───┼─┤  정보 교환!
        └──┴──┘             └─┴───┴─┘
        """
        H, W = self.input_resolution
        B, L, C = x.shape

        shortcut = x
        x = self.norm1(x)
        x = x.view(B, H, W, C)

        # Cyclic Shift (SW-MSA에서만)
        if self.shift_size > 0:
            shifted_x = torch.roll(x, shifts=(-self.shift_size, -self.shift_size), dims=(1, 2))
        else:
            shifted_x = x

        # 윈도우 분할
        x_windows = window_partition(shifted_x, self.window_size)
        x_windows = x_windows.view(-1, self.window_size * self.window_size, C)

        # Window Attention
        attn_windows = self.attn(x_windows)

        # 윈도우 병합
        attn_windows = attn_windows.view(-1, self.window_size, self.window_size, C)
        shifted_x = window_reverse(attn_windows, self.window_size, H, W)

        # Shift 복원
        if self.shift_size > 0:
            x = torch.roll(shifted_x, shifts=(self.shift_size, self.shift_size), dims=(1, 2))
        else:
            x = shifted_x
        x = x.view(B, H * W, C)

        # Residual Connection
        x = shortcut + self.drop_path(x)
        x = x + self.drop_path(self.mlp(self.norm2(x)))

        return x


# ============================================================================
# 🔽 다운샘플링 모듈
# ============================================================================

class PatchMerging(nn.Module):
    """
    📉 Patch Merging Layer (다운샘플링)

    동작: 2x2 패치를 하나로 합침

    시각화:
    ┌──┬──┐
    │ 1│ 2│        ┌────┐
    ├──┼──┤  ────→ │1234│  해상도 1/2, 채널 2배
    │ 3│ 4│        └────┘
    └──┴──┘

    변화:
        - 해상도: (H, W) → (H/2, W/2)
        - 채널: C → 2C
        - 토큰 수: H*W → H/2*W/2 (1/4로 감소)

    CNN의 Pooling과 유사하지만 정보 손실 적음!
    """

    def __init__(self, input_resolution, dim, norm_layer=nn.LayerNorm):
        """
        파라미터:
            input_resolution (tuple): 입력 해상도 (H, W)
            dim (int): 입력 채널 수
        """
        super().__init__()
        self.input_resolution = input_resolution
        self.dim = dim
        self.reduction = nn.Linear(4 * dim, 2 * dim, bias=False)
        self.norm = norm_layer(4 * dim)

    def forward(self, x):
        """
        2x2 패치를 병합하여 다운샘플링

        예시:
            입력: (B, 56*56, 96)
            출력: (B, 28*28, 192)
        """
        H, W = self.input_resolution
        B, L, C = x.shape

        x = x.view(B, H, W, C)

        # 2x2 패치의 4개 위치 추출
        x0 = x[:, 0::2, 0::2, :]  # 좌상단
        x1 = x[:, 1::2, 0::2, :]  # 좌하단
        x2 = x[:, 0::2, 1::2, :]  # 우상단
        x3 = x[:, 1::2, 1::2, :]  # 우하단
        x = torch.cat([x0, x1, x2, x3], -1)  # 채널 방향 결합 (4C)
        x = x.view(B, -1, 4 * C)

        x = self.norm(x)
        x = self.reduction(x)  # 4C → 2C 차원 축소

        return x


# ============================================================================
# 🎭 Stage 구성
# ============================================================================

class BasicLayer(nn.Module):
    """
    🎪 Swin Transformer Stage (여러 블록의 집합)

    구조:
    ┌─────────────────────────────────┐
    │  Block 0 (W-MSA)                │
    │  Block 1 (SW-MSA)  ← shift!     │
    │  Block 2 (W-MSA)                │
    │  Block 3 (SW-MSA)  ← shift!     │
    │  ...                            │
    │  Patch Merging (다운샘플링)      │
    └─────────────────────────────────┘

    특징:
        - W-MSA와 SW-MSA를 번갈아 사용
        - 인접 윈도우 간 정보 교환 가능!
    """

    def __init__(self, dim, input_resolution, depth, num_heads, window_size,
                 mlp_ratio=4., qkv_bias=True, qk_scale=None, drop=0., attn_drop=0.,
                 drop_path=0., norm_layer=nn.LayerNorm, downsample=None, use_checkpoint=False):
        """
        파라미터:
            dim (int): 채널 수
            input_resolution (tuple): 입력 해상도
            depth (int): 이 Stage의 블록 개수
            num_heads (int): Attention head 개수
            window_size (int): 윈도우 크기
            downsample: 다운샘플링 레이어 (PatchMerging)
        """
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.depth = depth

        # Transformer Block 생성
        # 짝수: W-MSA, 홀수: SW-MSA
        self.blocks = nn.ModuleList([
            SwinTransformerBlock(
                dim=dim, input_resolution=input_resolution,
                num_heads=num_heads, window_size=window_size,
                shift_size=0 if (i % 2 == 0) else window_size // 2,  # 교대로!
                mlp_ratio=mlp_ratio,
                qkv_bias=qkv_bias, qk_scale=qk_scale,
                drop=drop, attn_drop=attn_drop,
                drop_path=drop_path[i] if isinstance(drop_path, list) else drop_path,
                norm_layer=norm_layer)
            for i in range(depth)])

        # 다운샘플링 레이어
        if downsample is not None:
            self.downsample = downsample(input_resolution, dim=dim, norm_layer=norm_layer)
        else:
            self.downsample = None

    def forward(self, x):
        """모든 블록 통과 후 다운샘플링"""
        for blk in self.blocks:
            x = blk(x)
        if self.downsample is not None:
            x = self.downsample(x)
        return x


# ============================================================================
# 🖼️ 패치 임베딩
# ============================================================================

class PatchEmbed(nn.Module):
    """
    🧩 Image to Patch Embedding (이미지 → 패치 임베딩)

    동작:
    ┌─────────────────────┐
    │  224x224 이미지      │
    │  (6채널)             │
    └─────────────────────┘
            ↓ Convolution (stride=4)
    ┌─────────────────────┐
    │  56x56 패치          │
    │  (96채널)            │
    └─────────────────────┘

    특징:
        - 6채널 입력 지원 (RGB 3채널 + 마스크 3채널)
        - 4x4 패치로 분할 (224/4 = 56)
        - 총 3,136개 패치 생성 (56*56)
    """

    def __init__(self, img_size=224, patch_size=4, in_chans=6, embed_dim=96, norm_layer=None):
        """
        파라미터:
            img_size (int): 입력 이미지 크기 (224)
            patch_size (int): 패치 크기 (4)
            in_chans (int): 입력 채널 (6: RGB + Mask)
            embed_dim (int): 임베딩 차원 (96)
        """
        super().__init__()
        img_size = to_2tuple(img_size)
        patch_size = to_2tuple(patch_size)
        patches_resolution = [img_size[0] // patch_size[0], img_size[1] // patch_size[1]]

        self.img_size = img_size
        self.patch_size = patch_size
        self.patches_resolution = patches_resolution
        self.num_patches = patches_resolution[0] * patches_resolution[1]  # 3136
        self.in_chans = in_chans
        self.embed_dim = embed_dim

        # Convolution으로 패치 추출
        self.proj = nn.Conv2d(in_chans, embed_dim, kernel_size=patch_size, stride=patch_size)
        if norm_layer is not None:
            self.norm = norm_layer(embed_dim)
        else:
            self.norm = None

    def forward(self, x):
        """
        이미지를 패치 임베딩으로 변환

        변환 과정:
            (B, 6, 224, 224) → Conv2d → (B, 96, 56, 56)
            → Flatten → (B, 3136, 96)
        """
        B, C, H, W = x.shape

        x = self.proj(x).flatten(2).transpose(1, 2)
        if self.norm is not None:
            x = self.norm(x)
        return x


# ============================================================================
# 🎨 메인 모델
# ============================================================================

class SwinHairClassifier(nn.Module):
    """
    ===================================================================
    🏆 Swin Transformer 기반 탈모 분류 모델 (메인 모델)
    ===================================================================

    📊 전체 아키텍처:

    입력: (B, 6, 224, 224)  ← RGB + 헤어 마스크
      ↓
    [Patch Embed] 56x56, 96채널
      ↓
    [Stage 1] 56x56, 96채널, 2블록   ← W-MSA, SW-MSA
      ↓ Patch Merging
    [Stage 2] 28x28, 192채널, 2블록  ← W-MSA, SW-MSA
      ↓ Patch Merging
    [Stage 3] 14x14, 384채널, 6블록  ← 가장 많은 연산!
      ↓ Patch Merging
    [Stage 4] 7x7, 768채널, 2블록    ← W-MSA, SW-MSA
      ↓ Global Average Pooling
    [Classification] 768 → 256 → 4클래스
      ↓
    출력: (B, 4)  ← 탈모 레벨 0~3

    ===================================================================

    📈 모델 크기:
        - Tiny: ~28M 파라미터, 빠른 추론
        - Small: ~50M 파라미터, 더 정확한 예측

    🎯 탈모 레벨:
        - Level 0: 정상 (탈모 없음)
        - Level 1: 경미 (초기 단계)
        - Level 2: 중등도 (진행 중)
        - Level 3: 심각 (상당한 탈모)
    """

    def __init__(self, img_size=224, patch_size=4, in_chans=6, num_classes=4,
                 embed_dim=96, depths=[2, 2, 6, 2], num_heads=[3, 6, 12, 24],
                 window_size=7, mlp_ratio=4., qkv_bias=True, qk_scale=None,
                 drop_rate=0., attn_drop_rate=0., drop_path_rate=0.1,
                 norm_layer=nn.LayerNorm, ape=False, patch_norm=True,
                 use_checkpoint=False, **kwargs):
        """
        파라미터:
            img_size (int): 입력 이미지 크기 (224)
            in_chans (int): 입력 채널 (6: RGB + Mask)
            num_classes (int): 분류 클래스 (4: 레벨 0~3)
            embed_dim (int): 초기 임베딩 차원 (96)
            depths (list): 각 Stage의 블록 개수 [2,2,6,2]
            num_heads (list): 각 Stage의 head 개수 [3,6,12,24]
            window_size (int): Attention 윈도우 크기 (7)
        """
        super().__init__()

        self.num_classes = num_classes
        self.num_layers = len(depths)  # 4개 Stage
        self.embed_dim = embed_dim
        self.ape = ape
        self.patch_norm = patch_norm
        self.num_features = int(embed_dim * 2 ** (self.num_layers - 1))  # 768
        self.mlp_ratio = mlp_ratio

        # 🧩 Patch Embedding
        self.patch_embed = PatchEmbed(
            img_size=img_size, patch_size=patch_size, in_chans=in_chans,
            embed_dim=embed_dim, norm_layer=norm_layer if self.patch_norm else None)
        num_patches = self.patch_embed.num_patches
        patches_resolution = self.patch_embed.patches_resolution
        self.patches_resolution = patches_resolution

        # 📍 Position Embedding (선택적)
        if self.ape:
            self.absolute_pos_embed = nn.Parameter(torch.zeros(1, num_patches, embed_dim))
            trunc_normal_(self.absolute_pos_embed, std=.02)

        self.pos_drop = nn.Dropout(p=drop_rate)

        # 📉 Stochastic Depth (깊어질수록 확률 증가)
        dpr = [x.item() for x in torch.linspace(0, drop_path_rate, sum(depths))]

        # 🎭 4개 Stage 생성
        self.layers = nn.ModuleList()
        for i_layer in range(self.num_layers):
            layer = BasicLayer(
                dim=int(embed_dim * 2 ** i_layer),  # 96, 192, 384, 768
                input_resolution=(
                    patches_resolution[0] // (2 ** i_layer),
                    patches_resolution[1] // (2 ** i_layer)
                ),  # 56, 28, 14, 7
                depth=depths[i_layer],  # 2, 2, 6, 2
                num_heads=num_heads[i_layer],  # 3, 6, 12, 24
                window_size=window_size,
                mlp_ratio=self.mlp_ratio,
                qkv_bias=qkv_bias, qk_scale=qk_scale,
                drop=drop_rate, attn_drop=attn_drop_rate,
                drop_path=dpr[sum(depths[:i_layer]):sum(depths[:i_layer + 1])],
                norm_layer=norm_layer,
                downsample=PatchMerging if (i_layer < self.num_layers - 1) else None,
                use_checkpoint=use_checkpoint)
            self.layers.append(layer)

        self.norm = norm_layer(self.num_features)
        self.avgpool = nn.AdaptiveAvgPool1d(1)

        # 🎯 Classification Head
        self.head = nn.Sequential(
            nn.Linear(self.num_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )

        self.apply(self._init_weights)

    def _init_weights(self, m):
        """
        가중치 초기화
        - Linear: Truncated Normal
        - LayerNorm: bias=0, weight=1
        """
        if isinstance(m, nn.Linear):
            trunc_normal_(m.weight, std=.02)
            if m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)

    @torch.jit.ignore
    def no_weight_decay(self):
        return {'absolute_pos_embed'}

    @torch.jit.ignore
    def no_weight_decay_keywords(self):
        return {'relative_position_bias_table'}

    def forward_features(self, x):
        """
        🔍 특징 추출 파이프라인

        흐름:
        1. Patch Embedding (224x224 → 56x56 패치)
        2. Stage 1~4 통과 (계층적 특징 추출)
        3. Global Average Pooling (공간 정보 통합)

        Args:
            x: (B, 6, 224, 224)

        Returns:
            특징 벡터 (B, 768)
        """
        x = self.patch_embed(x)  # (B, 3136, 96)
        if self.ape:
            x = x + self.absolute_pos_embed
        x = self.pos_drop(x)

        # 4개 Stage 통과
        for layer in self.layers:
            x = layer(x)

        x = self.norm(x)
        x = self.avgpool(x.transpose(1, 2))  # Global Average Pooling
        x = torch.flatten(x, 1)
        return x

    def forward(self, x):
        """
        🚀 전체 순전파

        입력 → 특징 추출 → 분류 → 출력

        Args:
            x: (B, 6, 224, 224) - RGB + 헤어 마스크

        Returns:
            (B, 4) - 탈모 레벨 로짓
        """
        x = self.forward_features(x)  # 특징 추출
        x = self.head(x)  # 분류
        return x


# ============================================================================
# 🏭 모델 팩토리 함수
# ============================================================================

def swin_tiny_patch4_window7_224_hair(num_classes=4, **kwargs):
    """
    🔹 Swin-Tiny 모델 (경량 버전)

    사양:
        - 파라미터: ~28M
        - Stage 블록: [2, 2, 6, 2]
        - 추론 속도: ⚡⚡⚡ 빠름
        - 정확도: ⭐⭐⭐ 좋음

    용도: 실시간 분석, 모바일 배포
    """
    model = SwinHairClassifier(
        patch_size=4,
        window_size=7,
        embed_dim=96,
        depths=[2, 2, 6, 2],  # Tiny
        num_heads=[3, 6, 12, 24],
        num_classes=num_classes,
        **kwargs
    )
    return model


def swin_small_patch4_window7_224_hair(num_classes=4, **kwargs):
    """
    🔸 Swin-Small 모델 (고성능 버전)

    사양:
        - 파라미터: ~50M
        - Stage 블록: [2, 2, 18, 2]  ← Stage 3이 18블록!
        - 추론 속도: ⚡⚡ 중간
        - 정확도: ⭐⭐⭐⭐ 매우 좋음

    용도: 서버 기반 분석, 고정밀 진단
    """
    model = SwinHairClassifier(
        patch_size=4,
        window_size=7,
        embed_dim=96,
        depths=[2, 2, 18, 2],  # Small (Stage 3이 18블록)
        num_heads=[3, 6, 12, 24],
        num_classes=num_classes,
        **kwargs
    )
    return model


# ============================================================================
# 🧪 테스트 코드
# ============================================================================

if __name__ == "__main__":
    """
    모델 테스트 및 검증

    테스트 내용:
    1. 모델 생성
    2. 6채널 입력 테스트
    3. 출력 shape 확인
    4. 클래스별 확률 출력
    """
    print("=" * 60)
    print("🧪 Swin Transformer 탈모 분류 모델 테스트")
    print("=" * 60)

    # Swin-Tiny 모델 생성
    model = swin_tiny_patch4_window7_224_hair(num_classes=4)

    # 더미 입력 생성
    batch_size = 2
    rgb_image = torch.randn(batch_size, 3, 224, 224)    # RGB 이미지
    mask_image = torch.randn(batch_size, 3, 224, 224)   # 헤어 마스크
    dual_input = torch.cat([rgb_image, mask_image], dim=1)  # 6채널로 결합

    print(f"\n📊 모델 정보:")
    print(f"   - 입력 shape: {dual_input.shape}")
    print(f"   - 파라미터 수: {sum(p.numel() for p in model.parameters()):,}")

    # 순전파 테스트
    with torch.no_grad():
        output = model(dual_input)
        print(f"\n✅ 순전파 성공!")
        print(f"   - 출력 shape: {output.shape}")
        print(f"   - 출력 로짓: {output[0]}")

        # Softmax로 확률 변환
        probs = torch.softmax(output, dim=1)
        print(f"\n📈 클래스별 확률 (샘플 1):")
        for i, prob in enumerate(probs[0]):
            level_name = ["정상", "경미", "중등도", "심각"][i]
            print(f"   Level {i} ({level_name}): {prob.item():.2%}")

    print("\n" + "=" * 60)
    print("✨ 테스트 완료!")
    print("=" * 60)
