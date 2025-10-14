"""
============================================================================
🧠 탈모 AI 분석 모델 - 초보자를 위한 쉬운 설명
============================================================================

이 파일이 하는 일:
📸 사진 → 🤖 AI 분석 → 📊 탈모 단계 판단 (0~3단계)

쉽게 말하면:
- 정수리 사진 + 측면 사진을 받아서
- "이 사람의 탈모가 얼마나 진행되었는지" 판단하는 AI입니다

입력: RGB 사진(일반 사진) + 헤어 마스크(머리카락만 강조한 사진) = 총 6채널
출력: 0(정상), 1(경미), 2(중등도), 3(심각) 중 하나

============================================================================
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from timm.models.layers import DropPath, to_2tuple, trunc_normal_
import math


# ============================================================================
# 📦 기본 구성 요소 (레고 블록 같은 것들)
# ============================================================================

class Mlp(nn.Module):
    """
    🔹 MLP = Multi-Layer Perceptron (다층 퍼셉트론)

    쉽게 설명:
    - "계산기" 역할을 하는 블록입니다
    - 입력받은 숫자들을 여러 번 계산해서 의미있는 숫자로 바꿉니다

    비유:
    - 마치 요리사가 재료를 여러 번 손질하는 것과 같습니다
    - 생고기(입력) → 손질(계산1) → 양념(계산2) → 완성된 요리(출력)

    실제 동작:
    1. 숫자를 4배로 늘립니다 (더 많은 정보 추출)
    2. 비선형 변환 (복잡한 패턴 학습)
    3. 다시 원래 크기로 줄입니다
    """

    def __init__(self, in_features, hidden_features=None, out_features=None,
                 act_layer=nn.GELU, drop=0.):
        """
        설정:
            in_features: 입력 숫자 개수 (예: 96개)
            hidden_features: 중간 계산용 숫자 개수 (예: 384개, 보통 4배)
            drop: 과적합 방지용 (0.1 = 10%를 랜덤하게 끔)
        """
        super().__init__()
        out_features = out_features or in_features
        hidden_features = hidden_features or in_features

        self.fc1 = nn.Linear(in_features, hidden_features)  # 첫 번째 계산
        self.act = act_layer()                               # 비선형 변환
        self.fc2 = nn.Linear(hidden_features, out_features) # 두 번째 계산
        self.drop = nn.Dropout(drop)                         # 과적합 방지

    def forward(self, x):
        """
        실제 계산 과정:
        입력 → 확장 → 활성화 → 축소 → 출력
        """
        x = self.fc1(x)      # 숫자 개수를 4배로 늘림
        x = self.act(x)      # 복잡한 패턴을 학습할 수 있게 변환
        x = self.drop(x)     # 랜덤하게 일부를 0으로 (과적합 방지)
        x = self.fc2(x)      # 다시 원래 숫자 개수로
        x = self.drop(x)     # 한번 더 과적합 방지
        return x


def window_partition(x, window_size):
    """
    🪟 사진을 작은 조각(윈도우)으로 나누기

    왜 나누나요?
    - 사진 전체를 한번에 보면 계산이 너무 오래 걸립니다
    - 작은 조각으로 나눠서 각각 보면 빠릅니다!

    비유:
    - 큰 퍼즐을 한번에 맞추기 vs 작은 영역씩 맞추기
    - 작은 영역씩 보는게 훨씬 빠릅니다!

    그림으로 보면:
    ┌─────────────────┐
    │ 전체 사진 224x224│
    └─────────────────┘
            ↓ 7x7씩 자르기
    ┌──┬──┬──┬──┐
    │ 1│ 2│ 3│ 4│  각각 7x7 크기
    ├──┼──┼──┼──┤  총 32x32 = 1024조각
    │ 5│ 6│ 7│ 8│
    └──┴──┴──┴──┘

    입력: 큰 사진 (B, H, W, C)
          예: (2장, 56픽셀, 56픽셀, 96채널)
    출력: 작은 조각들 (조각개수*사진개수, 7, 7, 채널)
          예: (128조각, 7픽셀, 7픽셀, 96채널)
    """
    B, H, W, C = x.shape

    # 사진을 7x7 조각으로 자르기
    x = x.view(B, H // window_size, window_size, W // window_size, window_size, C)
    windows = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(-1, window_size, window_size, C)
    return windows


def window_reverse(windows, window_size, H, W):
    """
    🔄 작은 조각들을 다시 큰 사진으로 합치기

    window_partition의 반대 작업입니다.
    조각난 퍼즐을 다시 완성된 그림으로 맞추는 것과 같습니다.
    """
    B = int(windows.shape[0] / (H * W / window_size / window_size))
    x = windows.view(B, H // window_size, W // window_size, window_size, window_size, -1)
    x = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(B, H, W, -1)
    return x


# ============================================================================
# 👁️ Attention 메커니즘 (AI가 "주목"하는 방법)
# ============================================================================

class WindowAttention(nn.Module):
    """
    🎯 Window Attention - AI가 중요한 부분에 집중하는 기능

    "Attention"이 뭔가요?
    - 사람이 사진을 볼 때 중요한 부분에 시선이 가는 것처럼
    - AI도 이미지에서 중요한 부분에 "주목"하는 기능입니다

    예시:
    - 탈모 진단할 때:
      ✓ 헤어라인의 후퇴 정도 ← 여기 집중!
      ✓ 정수리의 머리카락 밀도 ← 여기도 집중!
      ✗ 배경은 별로 안 중요 ← 무시

    왜 "Window" Attention인가요?
    - 사진 전체를 보면 계산이 너무 많아집니다 (50,000개 픽셀 전부 비교 = 25억번 계산!)
    - 7x7 작은 윈도우로 나누면 (49개만 비교 = 2,400번 계산!)
    - 1000배 이상 빠릅니다! 🚀

    Multi-Head는 뭔가요?
    - "여러 관점에서 보기"입니다
    - 헤드1: 머리카락 밀도 관점
    - 헤드2: 헤어라인 모양 관점
    - 헤드3: 두피 상태 관점
    - 이렇게 여러 관점을 종합해서 판단합니다
    """

    def __init__(self, dim, window_size, num_heads, qkv_bias=True,
                 qk_scale=None, attn_drop=0., proj_drop=0.):
        """
        설정:
            dim: 채널 수 (예: 96)
            window_size: 윈도우 크기 (7x7)
            num_heads: 관점 개수 (예: 3개 관점)
            attn_drop: 과적합 방지 비율
        """
        super().__init__()
        self.dim = dim
        self.window_size = window_size
        self.num_heads = num_heads
        head_dim = dim // num_heads
        self.scale = qk_scale or head_dim ** -0.5

        # 📍 Relative Position Bias (상대적 위치 정보)
        # "헤어라인은 위쪽에 있고, 정수리는 중앙에 있다"는 위치 정보를 학습
        self.relative_position_bias_table = nn.Parameter(
            torch.zeros((2 * window_size[0] - 1) * (2 * window_size[1] - 1), num_heads))

        # 각 픽셀 간의 상대적 위치 계산
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

        # Query, Key, Value 계산 레이어
        # Q: "나는 무엇을 찾고 있나?"
        # K: "나는 어떤 특징을 가졌나?"
        # V: "나의 실제 값은 무엇인가?"
        self.qkv = nn.Linear(dim, dim * 3, bias=qkv_bias)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(proj_drop)

        trunc_normal_(self.relative_position_bias_table, std=.02)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x, mask=None):
        """
        🔄 Attention 계산 과정

        쉬운 비유:
        1. 각 픽셀이 "나는 이런 것을 찾고 있어"라고 질문(Q)
        2. 다른 픽셀들이 "나는 이런 특징이 있어"라고 대답(K)
        3. 비슷한 것들끼리 점수를 높게 매김 (Q와 K의 유사도)
        4. 점수가 높은 것들의 값(V)을 많이 반영

        실제 동작:
        1️⃣ Query, Key, Value 계산
        2️⃣ Q와 K를 비교해서 유사도 점수 계산
        3️⃣ 위치 정보 추가 (어디에 있는지도 중요!)
        4️⃣ 점수를 확률로 변환 (합이 100%가 되도록)
        5️⃣ 점수에 따라 Value를 가중평균

        입력: (윈도우개수, 49픽셀, 채널)
        출력: (윈도우개수, 49픽셀, 채널) - 주목한 결과
        """
        B_, N, C = x.shape

        # Q, K, V를 한번에 계산 후 분리
        qkv = self.qkv(x).reshape(B_, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        # Attention 점수 계산 (얼마나 비슷한지)
        q = q * self.scale
        attn = (q @ k.transpose(-2, -1))

        # 위치 정보 추가 (같은 특징이라도 위치에 따라 의미가 다름)
        relative_position_bias = self.relative_position_bias_table[
            self.relative_position_index.view(-1)].view(
            self.window_size[0] * self.window_size[1],
            self.window_size[0] * self.window_size[1], -1)
        relative_position_bias = relative_position_bias.permute(2, 0, 1).contiguous()
        attn = attn + relative_position_bias.unsqueeze(0)

        # 마스킹 (필요한 경우)
        if mask is not None:
            nW = mask.shape[0]
            attn = attn.view(B_ // nW, nW, self.num_heads, N, N) + mask.unsqueeze(1).unsqueeze(0)
            attn = attn.view(-1, self.num_heads, N, N)
            attn = self.softmax(attn)
        else:
            attn = self.softmax(attn)

        attn = self.attn_drop(attn)

        # Attention 점수로 Value 가중평균
        x = (attn @ v).transpose(1, 2).reshape(B_, N, C)
        x = self.proj(x)
        x = self.proj_drop(x)
        return x


# ============================================================================
# 🧱 Transformer 블록 (메인 처리 단위)
# ============================================================================

class SwinTransformerBlock(nn.Module):
    """
    🧱 Swin Transformer Block - 이미지 처리의 기본 단위

    무엇을 하나요?
    - 이미지를 보고 중요한 패턴을 찾아냅니다
    - "이 부분에 머리카락이 적네", "여기 헤어라인이 후퇴했네" 같은 정보 추출

    처리 과정 (순서대로):
    ┌─────────────────────────┐
    │ 입력 이미지 조각         │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 1. 정규화 (값 안정화)    │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 2. 윈도우로 나누기       │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 3. Attention (주목!)     │
    │    중요한 부분 찾기      │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 4. 다시 합치기           │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 5. 원본과 합치기 (+)     │
    │    (정보 보존)           │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 6. MLP (추가 계산)       │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 7. 또 합치기 (+)         │
    └─────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ 출력 (패턴 정보 포함)    │
    └─────────────────────────┘

    W-MSA vs SW-MSA:
    - W-MSA: 일반 윈도우로 나눔
    - SW-MSA: 윈도우를 조금 이동시켜서 경계 정보도 봄

    비유:
    - W-MSA: 퍼즐 조각을 그대로 보기
    - SW-MSA: 퍼즐 조각을 조금 밀어서 연결 부분도 보기
    """

    def __init__(self, dim, input_resolution, num_heads, window_size=7, shift_size=0,
                 mlp_ratio=4., qkv_bias=True, qk_scale=None, drop=0., attn_drop=0.,
                 drop_path=0., act_layer=nn.GELU, norm_layer=nn.LayerNorm):
        """
        설정:
            dim: 채널 수 (정보량)
            input_resolution: 이미지 크기 (높이, 너비)
            num_heads: 관점 개수
            window_size: 윈도우 크기 (보통 7x7)
            shift_size: 윈도우 이동 크기 (0이면 W-MSA, >0이면 SW-MSA)
            mlp_ratio: MLP 확장 비율 (보통 4배)
        """
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.num_heads = num_heads
        self.window_size = window_size
        self.shift_size = shift_size
        self.mlp_ratio = mlp_ratio

        # 이미지가 윈도우보다 작으면 윈도우 나누기 스킵
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
        실제 처리 과정

        SW-MSA의 윈도우 이동:
        ┌──┬──┐     이동     ┌─┬───┬─┐
        ├──┼──┤    ────→    ├─┼───┼─┤  경계 부분도
        ├──┼──┤             ├─┼───┼─┤  볼 수 있음!
        └──┴──┘             └─┴───┴─┘
        """
        H, W = self.input_resolution
        B, L, C = x.shape

        shortcut = x  # 원본 저장 (나중에 더하기 위해)
        x = self.norm1(x)  # 값 안정화
        x = x.view(B, H, W, C)

        # Cyclic Shift (SW-MSA인 경우 윈도우 이동)
        if self.shift_size > 0:
            shifted_x = torch.roll(x, shifts=(-self.shift_size, -self.shift_size), dims=(1, 2))
        else:
            shifted_x = x

        # 윈도우로 나누기
        x_windows = window_partition(shifted_x, self.window_size)
        x_windows = x_windows.view(-1, self.window_size * self.window_size, C)

        # Attention 수행 (중요한 부분 찾기)
        attn_windows = self.attn(x_windows)

        # 윈도우 다시 합치기
        attn_windows = attn_windows.view(-1, self.window_size, self.window_size, C)
        shifted_x = window_reverse(attn_windows, self.window_size, H, W)

        # Shift 복원
        if self.shift_size > 0:
            x = torch.roll(shifted_x, shifts=(self.shift_size, self.shift_size), dims=(1, 2))
        else:
            x = shifted_x
        x = x.view(B, H * W, C)

        # 원본과 합치기 (Residual Connection)
        # 이유: 원본 정보를 잃지 않기 위해
        x = shortcut + self.drop_path(x)

        # MLP로 추가 처리 후 또 합치기
        x = x + self.drop_path(self.mlp(self.norm2(x)))

        return x


# ============================================================================
# 📉 이미지 크기 줄이기 (다운샘플링)
# ============================================================================

class PatchMerging(nn.Module):
    """
    📉 Patch Merging - 이미지를 작게 만들기

    왜 작게 만드나요?
    - 큰 이미지: 작은 디테일(머리카락 한 올)을 볼 수 있음
    - 작은 이미지: 전체적인 패턴(헤어라인 모양)을 볼 수 있음
    - 둘 다 필요하므로 점점 작게 만들면서 처리합니다!

    동작:
    ┌──┬──┐
    │ 1│ 2│           ┌────┐
    ├──┼──┤  합치기→  │1234│
    │ 3│ 4│           └────┘
    └──┴──┘

    2x2 픽셀 4개를 1개로 합칩니다

    변화:
    - 크기: (56x56) → (28x28) = 1/2
    - 정보량: 96 → 192 = 2배
    - 총 데이터량은 비슷 (56*56*96 ≈ 28*28*192)

    비유:
    - 구글 맵에서 줌아웃하는 것과 비슷
    - 가까이서 보다가 → 멀리서 전체 보기
    """

    def __init__(self, input_resolution, dim, norm_layer=nn.LayerNorm):
        """
        설정:
            input_resolution: 입력 크기 (H, W)
            dim: 채널 수
        """
        super().__init__()
        self.input_resolution = input_resolution
        self.dim = dim
        self.reduction = nn.Linear(4 * dim, 2 * dim, bias=False)
        self.norm = norm_layer(4 * dim)

    def forward(self, x):
        """
        2x2 픽셀을 1개로 합치기

        예시:
        입력: (B, 56*56, 96)  - 56x56 이미지, 채널 96
        출력: (B, 28*28, 192) - 28x28 이미지, 채널 192
        """
        H, W = self.input_resolution
        B, L, C = x.shape

        x = x.view(B, H, W, C)

        # 2x2 영역의 4개 픽셀을 각각 추출
        x0 = x[:, 0::2, 0::2, :]  # 좌상단
        x1 = x[:, 1::2, 0::2, :]  # 좌하단
        x2 = x[:, 0::2, 1::2, :]  # 우상단
        x3 = x[:, 1::2, 1::2, :]  # 우하단
        x = torch.cat([x0, x1, x2, x3], -1)  # 4개를 이어붙임
        x = x.view(B, -1, 4 * C)

        x = self.norm(x)
        x = self.reduction(x)  # 4C → 2C로 압축

        return x


# ============================================================================
# 🎪 Stage (여러 블록의 묶음)
# ============================================================================

class BasicLayer(nn.Module):
    """
    🎪 Stage - 여러 Transformer 블록의 집합

    무엇을 하나요?
    - 여러 개의 Transformer Block을 연속으로 실행합니다
    - W-MSA와 SW-MSA를 번갈아가며 실행 (짝수번째, 홀수번째)

    구조:
    ┌──────────────────────────┐
    │ Block 0 (일반 윈도우)     │
    │ Block 1 (이동된 윈도우)   │  ← 번갈아가며
    │ Block 2 (일반 윈도우)     │
    │ Block 3 (이동된 윈도우)   │
    │ ...                      │
    │ Patch Merging (작게)     │
    └──────────────────────────┘

    왜 번갈아가며 하나요?
    - 일반: 각 영역을 집중해서 봄
    - 이동: 영역 간 연결 관계도 봄
    - 둘 다 해야 완벽한 분석!
    """

    def __init__(self, dim, input_resolution, depth, num_heads, window_size,
                 mlp_ratio=4., qkv_bias=True, qk_scale=None, drop=0., attn_drop=0.,
                 drop_path=0., norm_layer=nn.LayerNorm, downsample=None, use_checkpoint=False):
        """
        설정:
            dim: 채널 수
            input_resolution: 이미지 크기
            depth: 이 Stage에 블록이 몇 개인지 (예: 2개, 6개)
            num_heads: 관점 개수
            window_size: 윈도우 크기
            downsample: 마지막에 크기 줄이기 (PatchMerging)
        """
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.depth = depth

        # Transformer Block 여러 개 만들기
        # 짝수 번째: shift_size=0 (일반)
        # 홀수 번째: shift_size=window_size//2 (이동)
        self.blocks = nn.ModuleList([
            SwinTransformerBlock(
                dim=dim, input_resolution=input_resolution,
                num_heads=num_heads, window_size=window_size,
                shift_size=0 if (i % 2 == 0) else window_size // 2,  # 번갈아가며!
                mlp_ratio=mlp_ratio,
                qkv_bias=qkv_bias, qk_scale=qk_scale,
                drop=drop, attn_drop=attn_drop,
                drop_path=drop_path[i] if isinstance(drop_path, list) else drop_path,
                norm_layer=norm_layer)
            for i in range(depth)])

        # 마지막에 이미지 크기 줄이기
        if downsample is not None:
            self.downsample = downsample(input_resolution, dim=dim, norm_layer=norm_layer)
        else:
            self.downsample = None

    def forward(self, x):
        """모든 블록 실행 후 크기 줄이기"""
        for blk in self.blocks:
            x = blk(x)
        if self.downsample is not None:
            x = self.downsample(x)
        return x


# ============================================================================
# 🧩 사진을 AI가 이해할 수 있는 형태로 변환
# ============================================================================

class PatchEmbed(nn.Module):
    """
    🧩 Patch Embedding - 사진을 AI 입력 형태로 변환

    무엇을 하나요?
    - 일반 사진 (224x224 픽셀) → AI가 처리할 수 있는 형태로 변환

    동작:
    ┌─────────────────────┐
    │  224x224 사진        │  보통 사진
    │  (6채널)             │  RGB + 마스크
    └─────────────────────┘
              ↓ 4x4씩 묶기
    ┌─────────────────────┐
    │  56x56 패치          │  56*56 = 3,136개 조각
    │  (96채널)            │  각 조각이 4x4 영역을 대표
    └─────────────────────┘

    왜 이렇게 하나요?
    - 픽셀 하나하나 보면 너무 느림
    - 4x4 영역씩 묶어서 보면 빠르면서도 정보 손실 적음

    비유:
    - 글자 하나씩 읽기 vs 단어 단위로 읽기
    - 단어로 읽는 게 빠르면서도 의미 파악 잘 됨!
    """

    def __init__(self, img_size=224, patch_size=4, in_chans=6, embed_dim=96, norm_layer=None):
        """
        설정:
            img_size: 입력 사진 크기 (224x224)
            patch_size: 패치 크기 (4x4)
            in_chans: 입력 채널 수 (6: RGB 3개 + 마스크 3개)
            embed_dim: 출력 채널 수 (96)
        """
        super().__init__()
        img_size = to_2tuple(img_size)
        patch_size = to_2tuple(patch_size)
        patches_resolution = [img_size[0] // patch_size[0], img_size[1] // patch_size[1]]

        self.img_size = img_size
        self.patch_size = patch_size
        self.patches_resolution = patches_resolution
        self.num_patches = patches_resolution[0] * patches_resolution[1]  # 56*56 = 3136
        self.in_chans = in_chans
        self.embed_dim = embed_dim

        # Convolution으로 패치 만들기
        self.proj = nn.Conv2d(in_chans, embed_dim, kernel_size=patch_size, stride=patch_size)
        if norm_layer is not None:
            self.norm = norm_layer(embed_dim)
        else:
            self.norm = None

    def forward(self, x):
        """
        사진을 패치로 변환

        변환 과정:
        (B, 6, 224, 224)  사진 6채널
            ↓ Conv2d로 4x4씩 묶기
        (B, 96, 56, 56)   56x56 크기, 96채널
            ↓ 펼치기
        (B, 3136, 96)     3136개 패치, 각 96차원
        """
        B, C, H, W = x.shape

        x = self.proj(x).flatten(2).transpose(1, 2)
        if self.norm is not None:
            x = self.norm(x)
        return x


# ============================================================================
# 🎨 메인 모델 (모든 것을 합친 최종 모델)
# ============================================================================

class SwinHairClassifier(nn.Module):
    """
    ===================================================================
    🏆 탈모 AI 분석 메인 모델 - 전체 구조
    ===================================================================

    이 모델이 하는 일:
    📸 정수리 + 측면 사진 → 🤖 AI 분석 → 📊 탈모 단계 (0~3)

    전체 흐름 (4단계):

    📥 입력: 224x224 사진 (RGB 3채널 + 마스크 3채널 = 6채널)
    ↓
    🧩 [Patch Embed] 56x56 패치로 변환, 채널 96
    ↓
    🎪 [Stage 1] 56x56, 채널 96, 블록 2개
         - 작은 디테일 찾기 (머리카락 텍스처, 모공 등)
    ↓ (크기 1/2로)
    🎪 [Stage 2] 28x28, 채널 192, 블록 2개
         - 중간 패턴 찾기 (헤어라인 모양, 밀도 변화 등)
    ↓ (크기 1/2로)
    🎪 [Stage 3] 14x14, 채널 384, 블록 6개 ⭐ 가장 많은 계산!
         - 중요한 특징 추출 (탈모 패턴 전반)
    ↓ (크기 1/2로)
    🎪 [Stage 4] 7x7, 채널 768, 블록 2개
         - 전체적인 특징 통합
    ↓
    📊 [분류기] 768차원 → 256차원 → 4클래스
         - 최종 판단: 0(정상), 1(경미), 2(중등도), 3(심각)
    ↓
    📤 출력: 탈모 단계 + 확률

    ===================================================================

    비유:
    - Stage 1: 나무 잎사귀 보기 (디테일)
    - Stage 2: 나무 가지 보기 (패턴)
    - Stage 3: 나무 전체 보기 (구조)
    - Stage 4: 숲 전체 보기 (전반적 상황)

    📊 모델 크기:
    - Tiny: 28M 파라미터 (빠름, 가벼움)
    - Small: 50M 파라미터 (정확함, 무거움)

    🎯 출력 클래스:
    - Level 0: 정상 - 탈모 없음
    - Level 1: 경미 - 초기 단계, 눈에 잘 안띔
    - Level 2: 중등도 - 눈에 보이기 시작, 관리 필요
    - Level 3: 심각 - 뚜렷하게 보임, 적극적 치료 필요
    """

    def __init__(self, img_size=224, patch_size=4, in_chans=6, num_classes=4,
                 embed_dim=96, depths=[2, 2, 6, 2], num_heads=[3, 6, 12, 24],
                 window_size=7, mlp_ratio=4., qkv_bias=True, qk_scale=None,
                 drop_rate=0., attn_drop_rate=0., drop_path_rate=0.1,
                 norm_layer=nn.LayerNorm, ape=False, patch_norm=True,
                 use_checkpoint=False, **kwargs):
        """
        모델 설정

        주요 파라미터:
            img_size: 입력 사진 크기 (224x224)
            in_chans: 입력 채널 (6 = RGB 3 + 마스크 3)
            num_classes: 출력 클래스 개수 (4 = 레벨 0~3)
            embed_dim: 시작 채널 수 (96)
            depths: 각 Stage의 블록 개수 [2, 2, 6, 2]
            num_heads: 각 Stage의 관점 개수 [3, 6, 12, 24]
            window_size: 윈도우 크기 (7x7)
        """
        super().__init__()

        self.num_classes = num_classes  # 4개 클래스
        self.num_layers = len(depths)   # 4개 Stage
        self.embed_dim = embed_dim      # 96
        self.ape = ape
        self.patch_norm = patch_norm
        self.num_features = int(embed_dim * 2 ** (self.num_layers - 1))  # 96*8 = 768
        self.mlp_ratio = mlp_ratio

        # 🧩 1단계: 사진을 패치로 변환
        self.patch_embed = PatchEmbed(
            img_size=img_size, patch_size=patch_size, in_chans=in_chans,
            embed_dim=embed_dim, norm_layer=norm_layer if self.patch_norm else None)
        num_patches = self.patch_embed.num_patches
        patches_resolution = self.patch_embed.patches_resolution
        self.patches_resolution = patches_resolution

        # 📍 위치 정보 (선택적)
        if self.ape:
            self.absolute_pos_embed = nn.Parameter(torch.zeros(1, num_patches, embed_dim))
            trunc_normal_(self.absolute_pos_embed, std=.02)

        self.pos_drop = nn.Dropout(p=drop_rate)

        # 🎲 Stochastic Depth (과적합 방지)
        dpr = [x.item() for x in torch.linspace(0, drop_path_rate, sum(depths))]

        # 🎪 2단계: 4개 Stage 생성
        self.layers = nn.ModuleList()
        for i_layer in range(self.num_layers):
            layer = BasicLayer(
                dim=int(embed_dim * 2 ** i_layer),  # 96 → 192 → 384 → 768
                input_resolution=(
                    patches_resolution[0] // (2 ** i_layer),
                    patches_resolution[1] // (2 ** i_layer)
                ),  # 56 → 28 → 14 → 7
                depth=depths[i_layer],          # 2, 2, 6, 2
                num_heads=num_heads[i_layer],   # 3, 6, 12, 24
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
        self.avgpool = nn.AdaptiveAvgPool1d(1)  # 전체 평균

        # 🎯 3단계: 분류기 (최종 판단)
        self.head = nn.Sequential(
            nn.Linear(self.num_features, 256),  # 768 → 256
            nn.ReLU(inplace=True),              # 활성화
            nn.Dropout(0.3),                    # 과적합 방지
            nn.Linear(256, num_classes)         # 256 → 4 (최종 클래스)
        )

        self.apply(self._init_weights)

    def _init_weights(self, m):
        """
        가중치 초기화
        - 학습 시작 전 초기값 설정
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
        """학습 시 decay 적용하지 않을 파라미터"""
        return {'absolute_pos_embed'}

    @torch.jit.ignore
    def no_weight_decay_keywords(self):
        """학습 시 decay 적용하지 않을 키워드"""
        return {'relative_position_bias_table'}

    def forward_features(self, x):
        """
        🔍 특징 추출 (1~2단계)

        과정:
        1. 사진 → 패치로 변환
        2. Stage 1~4 통과하며 특징 추출
        3. 전체 평균으로 하나의 벡터로

        입력: (B, 6, 224, 224) - 6채널 사진
        출력: (B, 768) - 768차원 특징 벡터
        """
        x = self.patch_embed(x)  # (B, 3136, 96)
        if self.ape:
            x = x + self.absolute_pos_embed
        x = self.pos_drop(x)

        # 4개 Stage 통과
        for layer in self.layers:
            x = layer(x)

        x = self.norm(x)                         # 정규화
        x = self.avgpool(x.transpose(1, 2))      # 평균 (7x7 → 1개 값)
        x = torch.flatten(x, 1)                  # 펼치기
        return x

    def forward(self, x):
        """
        🚀 전체 실행 (1~3단계 모두)

        흐름:
        입력 사진 → 특징 추출 → 분류 → 탈모 단계 출력

        입력: (B, 6, 224, 224)
              - B: 배치 크기 (한번에 몇 장 처리)
              - 6: RGB 3채널 + 마스크 3채널
              - 224x224: 사진 크기

        출력: (B, 4)
              - 4개 클래스의 점수 (로짓)
              - Softmax 거치면 확률로 변환 가능

        예시:
        입력: 정수리 사진 1장
        출력: [0.1, 0.2, 0.5, 0.2]
               ↑    ↑    ↑    ↑
              정상  경미 중등도 심각
        → 중등도(50% 확률)로 판단!
        """
        x = self.forward_features(x)  # 특징 추출 (768차원)
        x = self.head(x)               # 분류 (4클래스)
        return x


# ============================================================================
# 🏭 모델 생성 함수 (사용하기 쉽게)
# ============================================================================

def swin_tiny_patch4_window7_224_hair(num_classes=4, **kwargs):
    """
    🔹 Swin-Tiny 모델 (가벼운 버전)

    언제 사용하나요?
    - 빠른 분석이 필요할 때
    - 서버 성능이 낮을 때
    - 모바일 앱에 넣을 때

    스펙:
    - 파라미터: 28M개 (2800만 개)
    - 블록 구성: [2, 2, 6, 2]
    - 속도: ⚡⚡⚡ 매우 빠름
    - 정확도: ⭐⭐⭐ 좋음
    - 메모리: 적게 사용

    추론 시간:
    - GPU: ~0.5초
    - CPU: ~3초
    """
    model = SwinHairClassifier(
        patch_size=4,
        window_size=7,
        embed_dim=96,
        depths=[2, 2, 6, 2],        # Tiny 버전 블록 개수
        num_heads=[3, 6, 12, 24],
        num_classes=num_classes,
        **kwargs
    )
    return model


def swin_small_patch4_window7_224_hair(num_classes=4, **kwargs):
    """
    🔸 Swin-Small 모델 (강력한 버전)

    언제 사용하나요?
    - 최고의 정확도가 필요할 때
    - 서버 성능이 좋을 때
    - 의료 진단 등 정밀도가 중요할 때

    스펙:
    - 파라미터: 50M개 (5000만 개)
    - 블록 구성: [2, 2, 18, 2] ← Stage 3이 18개!
    - 속도: ⚡⚡ 보통
    - 정확도: ⭐⭐⭐⭐ 매우 좋음
    - 메모리: 많이 사용

    추론 시간:
    - GPU: ~1.5초
    - CPU: ~8초

    Tiny vs Small:
    - Tiny: 빠르지만 약간 덜 정확
    - Small: 느리지만 더 정확
    """
    model = SwinHairClassifier(
        patch_size=4,
        window_size=7,
        embed_dim=96,
        depths=[2, 2, 18, 2],       # Small 버전 (Stage 3이 18블록)
        num_heads=[3, 6, 12, 24],
        num_classes=num_classes,
        **kwargs
    )
    return model


# ============================================================================
# 🧪 테스트 코드 (모델이 제대로 작동하는지 확인)
# ============================================================================

if __name__ == "__main__":
    """
    모델 테스트

    확인 사항:
    1. 모델이 제대로 생성되는지
    2. 입력이 제대로 들어가는지
    3. 출력이 제대로 나오는지
    4. 출력을 확률로 변환하면 어떻게 되는지
    """
    print("=" * 60)
    print("🧪 탈모 AI 모델 테스트 시작")
    print("=" * 60)

    # 1️⃣ 모델 생성 (Tiny 버전)
    print("\n1️⃣ 모델 생성 중...")
    model = swin_tiny_patch4_window7_224_hair(num_classes=4)
    print("   ✅ 모델 생성 완료!")

    # 2️⃣ 테스트 입력 생성
    print("\n2️⃣ 테스트 입력 생성 중...")
    batch_size = 2  # 2장의 사진
    rgb_image = torch.randn(batch_size, 3, 224, 224)    # RGB 이미지
    mask_image = torch.randn(batch_size, 3, 224, 224)   # 헤어 마스크
    dual_input = torch.cat([rgb_image, mask_image], dim=1)  # 6채널로 합치기
    print(f"   ✅ 입력 생성 완료: {dual_input.shape}")

    # 3️⃣ 모델 정보 출력
    print("\n3️⃣ 모델 정보:")
    param_count = sum(p.numel() for p in model.parameters())
    print(f"   - 파라미터 개수: {param_count:,}개")
    print(f"   - 메모리 사용량: ~{param_count * 4 / 1024 / 1024:.1f} MB")

    # 4️⃣ 순전파 테스트
    print("\n4️⃣ 순전파 테스트 중...")
    with torch.no_grad():  # 학습 아님, 추론만
        output = model(dual_input)
        print(f"   ✅ 출력 생성 완료: {output.shape}")
        print(f"\n   📊 출력 값 (로짓):")
        print(f"      샘플 1: {output[0].numpy()}")

        # 5️⃣ 확률로 변환
        probs = torch.softmax(output, dim=1)
        print(f"\n5️⃣ 확률로 변환 (Softmax):")
        print(f"   샘플 1의 클래스별 확률:")
        level_names = ["정상 (Level 0)", "경미 (Level 1)",
                      "중등도 (Level 2)", "심각 (Level 3)"]
        for i, (prob, name) in enumerate(zip(probs[0], level_names)):
            bar = "█" * int(prob.item() * 50)  # 막대 그래프
            print(f"      {name}: {prob.item():.1%} {bar}")

        # 6️⃣ 최종 예측
        predicted = torch.argmax(probs[0])
        print(f"\n6️⃣ 최종 예측: {level_names[predicted]}")
        print(f"   신뢰도: {probs[0][predicted].item():.1%}")

    print("\n" + "=" * 60)
    print("✨ 테스트 완료! 모델이 정상 작동합니다.")
    print("=" * 60)

    # 💡 사용 팁
    print("\n💡 사용 팁:")
    print("   1. 실제 사용 시에는 RGB + 헤어 마스크를 6채널로 합쳐서 입력")
    print("   2. 출력은 torch.softmax()로 확률로 변환")
    print("   3. torch.argmax()로 가장 높은 확률의 클래스 선택")
    print("   4. GPU 사용 시: model.cuda(), input.cuda()")
    print("   5. 추론 시: torch.no_grad() 사용 (메모리 절약)")
