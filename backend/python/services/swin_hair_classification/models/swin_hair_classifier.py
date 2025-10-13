"""
Swin Transformer 기반 탈모 분류 모델
- 6채널 입력 (RGB 3채널 + 헤어 마스크 3채널)
- 4단계 탈모 레벨 분류 (0: 정상 ~ 3: 심각)
- Shifted Window Attention 메커니즘 사용
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from timm.models.layers import DropPath, to_2tuple, trunc_normal_
import math

class Mlp(nn.Module):
    """
    Multi-Layer Perceptron (MLP) 블록
    Transformer의 Feed-Forward Network 역할
    """
    def __init__(self, in_features, hidden_features=None, out_features=None, act_layer=nn.GELU, drop=0.):
        """
        Args:
            in_features: 입력 특징 차원
            hidden_features: 히든 레이어 차원 (기본값: in_features)
            out_features: 출력 특징 차원 (기본값: in_features)
            act_layer: 활성화 함수 (기본값: GELU)
            drop: 드롭아웃 비율
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
        순전파
        x -> Linear -> Activation -> Dropout -> Linear -> Dropout
        """
        x = self.fc1(x)
        x = self.act(x)
        x = self.drop(x)
        x = self.fc2(x)
        x = self.drop(x)
        return x

def window_partition(x, window_size):
    """
    이미지를 윈도우 단위로 분할
    Swin Transformer의 핵심: 이미지를 작은 윈도우로 나눠서 각 윈도우 내에서만 attention 계산

    Args:
        x: 입력 텐서 (B, H, W, C) - 배치, 높이, 너비, 채널
        window_size (int): 윈도우 크기 (기본값: 7x7)
    Returns:
        windows: 윈도우들의 배치 (num_windows*B, window_size, window_size, C)

    예시: 224x224 이미지를 7x7 윈도우로 분할 -> 32x32 = 1024개의 윈도우
    """
    B, H, W, C = x.shape
    # (B, H//win, win, W//win, win, C)로 reshape 후 재배열
    x = x.view(B, H // window_size, window_size, W // window_size, window_size, C)
    windows = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(-1, window_size, window_size, C)
    return windows

def window_reverse(windows, window_size, H, W):
    """
    윈도우들을 다시 원본 이미지 형태로 복원
    window_partition의 역연산

    Args:
        windows: 윈도우 배치 (num_windows*B, window_size, window_size, C)
        window_size (int): 윈도우 크기
        H (int): 원본 이미지 높이
        W (int): 원본 이미지 너비
    Returns:
        x: 복원된 이미지 (B, H, W, C)
    """
    B = int(windows.shape[0] / (H * W / window_size / window_size))
    x = windows.view(B, H // window_size, W // window_size, window_size, window_size, -1)
    x = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(B, H, W, -1)
    return x

class WindowAttention(nn.Module):
    """
    Window 기반 Multi-Head Self Attention (W-MSA)
    - Swin의 핵심: 윈도우 내에서만 attention 계산 (계산 복잡도 O(N) 대신 O(M^2))
    - Relative Position Bias 사용: 절대 위치가 아닌 상대 위치로 학습
    """
    def __init__(self, dim, window_size, num_heads, qkv_bias=True, qk_scale=None, attn_drop=0., proj_drop=0.):
        """
        Args:
            dim: 입력 채널 수
            window_size: 윈도우 크기 (튜플 또는 정수)
            num_heads: Attention Head 개수
            qkv_bias: Query, Key, Value에 bias 사용 여부
            qk_scale: Query-Key 스케일 (None이면 자동 계산)
            attn_drop: Attention 드롭아웃 비율
            proj_drop: 프로젝션 드롭아웃 비율
        """
        super().__init__()
        self.dim = dim
        self.window_size = window_size  # (Wh, Ww)
        self.num_heads = num_heads
        head_dim = dim // num_heads
        self.scale = qk_scale or head_dim ** -0.5  # Attention 스케일링 팩터

        # Relative Position Bias 테이블 정의
        # 윈도우 내 모든 토큰 쌍의 상대적 위치에 대한 학습 가능한 파라미터
        self.relative_position_bias_table = nn.Parameter(
            torch.zeros((2 * window_size[0] - 1) * (2 * window_size[1] - 1), num_heads))

        # 윈도우 내 각 토큰의 상대 위치 인덱스 계산
        coords_h = torch.arange(self.window_size[0])
        coords_w = torch.arange(self.window_size[1])
        coords = torch.stack(torch.meshgrid([coords_h, coords_w]))  # 2, Wh, Ww
        coords_flatten = torch.flatten(coords, 1)  # 2, Wh*Ww
        relative_coords = coords_flatten[:, :, None] - coords_flatten[:, None, :]  # 2, Wh*Ww, Wh*Ww
        relative_coords = relative_coords.permute(1, 2, 0).contiguous()  # Wh*Ww, Wh*Ww, 2
        relative_coords[:, :, 0] += self.window_size[0] - 1  # 0부터 시작하도록 shift
        relative_coords[:, :, 1] += self.window_size[1] - 1
        relative_coords[:, :, 0] *= 2 * self.window_size[1] - 1
        relative_position_index = relative_coords.sum(-1)  # Wh*Ww, Wh*Ww
        self.register_buffer("relative_position_index", relative_position_index)

        # Query, Key, Value를 한번에 계산하는 레이어
        self.qkv = nn.Linear(dim, dim * 3, bias=qkv_bias)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(proj_drop)

        trunc_normal_(self.relative_position_bias_table, std=.02)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x, mask=None):
        """
        Window Attention 순전파
        1. Q, K, V 계산
        2. Attention 스코어 계산 (Q @ K^T)
        3. Relative Position Bias 추가
        4. Softmax로 Attention 확률 계산
        5. V와 곱하여 최종 출력

        Args:
            x: 입력 (B_, N, C) - 윈도우 배치, 토큰 수, 채널 수
            mask: Shifted Window Attention용 마스크 (선택)
        """
        B_, N, C = x.shape
        # QKV 계산: (B_, N, C) -> (3, B_, num_heads, N, head_dim)
        qkv = self.qkv(x).reshape(B_, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]  # 각각 (B_, num_heads, N, head_dim)

        # Scaled Dot-Product Attention
        q = q * self.scale
        attn = (q @ k.transpose(-2, -1))  # (B_, num_heads, N, N)

        # Relative Position Bias 추가 (Swin의 핵심 특징)
        relative_position_bias = self.relative_position_bias_table[self.relative_position_index.view(-1)].view(
            self.window_size[0] * self.window_size[1], self.window_size[0] * self.window_size[1], -1)
        relative_position_bias = relative_position_bias.permute(2, 0, 1).contiguous()  # nH, Wh*Ww, Wh*Ww
        attn = attn + relative_position_bias.unsqueeze(0)

        # Shifted Window Masking (SW-MSA에서 사용)
        if mask is not None:
            nW = mask.shape[0]
            attn = attn.view(B_ // nW, nW, self.num_heads, N, N) + mask.unsqueeze(1).unsqueeze(0)
            attn = attn.view(-1, self.num_heads, N, N)
            attn = self.softmax(attn)
        else:
            attn = self.softmax(attn)

        attn = self.attn_drop(attn)

        # Attention 적용 후 원래 차원으로 복원
        x = (attn @ v).transpose(1, 2).reshape(B_, N, C)
        x = self.proj(x)
        x = self.proj_drop(x)
        return x

class SwinTransformerBlock(nn.Module):
    """
    Swin Transformer Block
    - W-MSA (Window Multi-head Self Attention) 또는 SW-MSA (Shifted Window MSA) 수행
    - LayerNorm -> Attention -> Residual -> LayerNorm -> MLP -> Residual 구조
    - shift_size=0이면 W-MSA, shift_size>0이면 SW-MSA
    """
    def __init__(self, dim, input_resolution, num_heads, window_size=7, shift_size=0,
                 mlp_ratio=4., qkv_bias=True, qk_scale=None, drop=0., attn_drop=0., drop_path=0.,
                 act_layer=nn.GELU, norm_layer=nn.LayerNorm):
        """
        Args:
            dim: 입력/출력 채널 수
            input_resolution: 입력 해상도 (H, W)
            num_heads: Attention head 개수
            window_size: 윈도우 크기 (기본값 7)
            shift_size: 윈도우 이동 크기 (0이면 W-MSA, >0이면 SW-MSA)
            mlp_ratio: MLP 히든 차원 비율 (기본값 4배)
            qkv_bias: QKV 레이어에 bias 사용 여부
            drop: 드롭아웃 비율
            attn_drop: Attention 드롭아웃 비율
            drop_path: Stochastic Depth 비율
        """
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.num_heads = num_heads
        self.window_size = window_size
        self.shift_size = shift_size
        self.mlp_ratio = mlp_ratio

        # 입력 해상도가 윈도우 크기보다 작으면 윈도우 분할 안함
        if min(self.input_resolution) <= self.window_size:
            self.shift_size = 0
            self.window_size = min(self.input_resolution)
        assert 0 <= self.shift_size < self.window_size, "shift_size must in 0-window_size"

        self.norm1 = norm_layer(dim)
        self.attn = WindowAttention(
            dim, window_size=to_2tuple(self.window_size), num_heads=num_heads,
            qkv_bias=qkv_bias, qk_scale=qk_scale, attn_drop=attn_drop, proj_drop=drop)

        # Stochastic Depth (학습 시 일부 레이어를 랜덤하게 스킵)
        self.drop_path = DropPath(drop_path) if drop_path > 0. else nn.Identity()
        self.norm2 = norm_layer(dim)
        mlp_hidden_dim = int(dim * mlp_ratio)
        self.mlp = Mlp(in_features=dim, hidden_features=mlp_hidden_dim, act_layer=act_layer, drop=drop)

    def forward(self, x):
        """
        Swin Transformer Block 순전파
        1. LayerNorm 적용
        2. Cyclic Shift (SW-MSA인 경우)
        3. Window Partition
        4. Window Attention
        5. Window Merge
        6. Reverse Cyclic Shift
        7. Residual Connection
        8. MLP with Residual

        Args:
            x: 입력 텐서 (B, H*W, C)
        Returns:
            출력 텐서 (B, H*W, C)
        """
        H, W = self.input_resolution
        B, L, C = x.shape
        assert L == H * W, "input feature has wrong size"

        shortcut = x
        x = self.norm1(x)
        x = x.view(B, H, W, C)

        # Cyclic Shift (SW-MSA에서만 수행)
        # 윈도우를 이동시켜 인접 윈도우 간 정보 교환 가능하게 함
        if self.shift_size > 0:
            shifted_x = torch.roll(x, shifts=(-self.shift_size, -self.shift_size), dims=(1, 2))
        else:
            shifted_x = x

        # 윈도우 단위로 분할
        x_windows = window_partition(shifted_x, self.window_size)  # nW*B, window_size, window_size, C
        x_windows = x_windows.view(-1, self.window_size * self.window_size, C)  # nW*B, window_size*window_size, C

        # Window Attention 수행 (W-MSA 또는 SW-MSA)
        attn_windows = self.attn(x_windows)  # nW*B, window_size*window_size, C

        # 윈도우들을 다시 병합
        attn_windows = attn_windows.view(-1, self.window_size, self.window_size, C)
        shifted_x = window_reverse(attn_windows, self.window_size, H, W)  # B H' W' C

        # Cyclic Shift 복원
        if self.shift_size > 0:
            x = torch.roll(shifted_x, shifts=(self.shift_size, self.shift_size), dims=(1, 2))
        else:
            x = shifted_x
        x = x.view(B, H * W, C)

        # Residual Connection + MLP
        x = shortcut + self.drop_path(x)  # Attention 결과와 residual
        x = x + self.drop_path(self.mlp(self.norm2(x)))  # MLP 결과와 residual

        return x

class PatchMerging(nn.Module):
    """
    Patch Merging Layer (다운샘플링)
    - 해상도를 1/2로 줄이고 채널 수를 2배로 늘림
    - 2x2 패치를 하나로 합쳐서 계층적 특징 추출
    - CNN의 Pooling과 유사한 역할
    """
    def __init__(self, input_resolution, dim, norm_layer=nn.LayerNorm):
        """
        Args:
            input_resolution: 입력 해상도 (H, W)
            dim: 입력 채널 수
            norm_layer: 정규화 레이어
        """
        super().__init__()
        self.input_resolution = input_resolution
        self.dim = dim
        self.reduction = nn.Linear(4 * dim, 2 * dim, bias=False)  # 4C -> 2C 차원 축소
        self.norm = norm_layer(4 * dim)

    def forward(self, x):
        """
        2x2 패치를 병합하여 다운샘플링
        - 해상도: (H, W) -> (H/2, W/2)
        - 채널: C -> 2C

        Args:
            x: 입력 (B, H*W, C)
        Returns:
            출력 (B, H/2*W/2, 2C)
        """
        H, W = self.input_resolution
        B, L, C = x.shape
        assert L == H * W, "input feature has wrong size"
        assert H % 2 == 0 and W % 2 == 0, f"x size ({H}*{W}) are not even."

        x = x.view(B, H, W, C)

        # 2x2 패치의 4개 위치를 각각 추출
        x0 = x[:, 0::2, 0::2, :]  # 좌상단 (B, H/2, W/2, C)
        x1 = x[:, 1::2, 0::2, :]  # 좌하단
        x2 = x[:, 0::2, 1::2, :]  # 우상단
        x3 = x[:, 1::2, 1::2, :]  # 우하단
        x = torch.cat([x0, x1, x2, x3], -1)  # 4개를 채널 방향으로 연결 (B, H/2, W/2, 4C)
        x = x.view(B, -1, 4 * C)  # (B, H/2*W/2, 4C)

        x = self.norm(x)
        x = self.reduction(x)  # Linear로 4C -> 2C 차원 축소

        return x

class BasicLayer(nn.Module):
    """
    Swin Transformer의 한 Stage (여러 Transformer Block의 집합)
    - W-MSA와 SW-MSA를 번갈아가며 수행 (짝수번째는 W-MSA, 홀수번째는 SW-MSA)
    - 마지막에 Patch Merging으로 다운샘플링 (선택적)
    """
    def __init__(self, dim, input_resolution, depth, num_heads, window_size,
                 mlp_ratio=4., qkv_bias=True, qk_scale=None, drop=0., attn_drop=0.,
                 drop_path=0., norm_layer=nn.LayerNorm, downsample=None, use_checkpoint=False):
        """
        Args:
            dim: 채널 수
            input_resolution: 입력 해상도 (H, W)
            depth: 이 Stage의 Transformer Block 개수
            num_heads: Attention head 개수
            window_size: 윈도우 크기
            mlp_ratio: MLP 히든 차원 비율
            downsample: 다운샘플링 레이어 (PatchMerging 또는 None)
            use_checkpoint: Gradient Checkpointing 사용 여부
        """
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.depth = depth
        self.use_checkpoint = use_checkpoint

        # Swin Transformer Block들 생성
        # 짝수 인덱스(0,2,4...): W-MSA (shift_size=0)
        # 홀수 인덱스(1,3,5...): SW-MSA (shift_size=window_size//2)
        self.blocks = nn.ModuleList([
            SwinTransformerBlock(dim=dim, input_resolution=input_resolution,
                                 num_heads=num_heads, window_size=window_size,
                                 shift_size=0 if (i % 2 == 0) else window_size // 2,
                                 mlp_ratio=mlp_ratio,
                                 qkv_bias=qkv_bias, qk_scale=qk_scale,
                                 drop=drop, attn_drop=attn_drop,
                                 drop_path=drop_path[i] if isinstance(drop_path, list) else drop_path,
                                 norm_layer=norm_layer)
            for i in range(depth)])

        # Patch Merging Layer (Stage 마지막에 다운샘플링)
        if downsample is not None:
            self.downsample = downsample(input_resolution, dim=dim, norm_layer=norm_layer)
        else:
            self.downsample = None

    def forward(self, x):
        """
        순전파: 모든 Transformer Block 통과 후 다운샘플링
        """
        for blk in self.blocks:
            x = blk(x)
        if self.downsample is not None:
            x = self.downsample(x)
        return x

class PatchEmbed(nn.Module):
    """
    Image to Patch Embedding (이미지를 패치 임베딩으로 변환)
    - 6채널 입력 지원 (RGB 3채널 + 헤어 마스크 3채널)
    - 4x4 패치 단위로 분할하여 임베딩 벡터로 변환
    - 예: 224x224 이미지 -> 56x56 = 3136개의 패치
    """
    def __init__(self, img_size=224, patch_size=4, in_chans=6, embed_dim=96, norm_layer=None):
        """
        Args:
            img_size: 입력 이미지 크기 (기본값 224x224)
            patch_size: 패치 크기 (기본값 4x4)
            in_chans: 입력 채널 수 (6채널: RGB + Mask)
            embed_dim: 임베딩 차원 (기본값 96)
            norm_layer: 정규화 레이어 (선택)
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

        # Convolution으로 패치 임베딩 (stride=patch_size로 다운샘플링)
        self.proj = nn.Conv2d(in_chans, embed_dim, kernel_size=patch_size, stride=patch_size)
        if norm_layer is not None:
            self.norm = norm_layer(embed_dim)
        else:
            self.norm = None

    def forward(self, x):
        """
        입력 이미지를 패치 임베딩으로 변환
        (B, 6, 224, 224) -> (B, 3136, 96)

        Args:
            x: 입력 이미지 (B, 6, H, W)
        Returns:
            패치 임베딩 (B, num_patches, embed_dim)
        """
        B, C, H, W = x.shape
        assert H == self.img_size[0] and W == self.img_size[1], \
            f"Input image size ({H}*{W}) doesn't match model ({self.img_size[0]}*{self.img_size[1]})."

        # Conv로 패치 추출 및 임베딩
        x = self.proj(x).flatten(2).transpose(1, 2)  # (B, embed_dim, H/4, W/4) -> (B, num_patches, embed_dim)

        if self.norm is not None:
            x = self.norm(x)
        return x

class SwinHairClassifier(nn.Module):
    """
    Swin Transformer 기반 탈모 분류 모델
    - 논문: 'Swin Transformer: Hierarchical Vision Transformer using Shifted Windows'
    - 6채널 입력 (RGB 3채널 + 헤어 마스크 3채널)
    - 4단계 탈모 레벨 분류 (0: 정상, 1: 경미, 2: 중등도, 3: 심각)

    아키텍처 구조:
    1. PatchEmbed: 224x224 이미지 -> 56x56 패치 (96차원)
    2. Stage 1: 56x56 해상도, 96채널, 2개 블록
    3. Stage 2: 28x28 해상도, 192채널, 2개 블록
    4. Stage 3: 14x14 해상도, 384채널, 6개 블록 (메인 특징 추출)
    5. Stage 4: 7x7 해상도, 768채널, 2개 블록
    6. Classification Head: 768차원 -> 4클래스
    """
    def __init__(self, img_size=224, patch_size=4, in_chans=6, num_classes=4,
                 embed_dim=96, depths=[2, 2, 6, 2], num_heads=[3, 6, 12, 24],
                 window_size=7, mlp_ratio=4., qkv_bias=True, qk_scale=None,
                 drop_rate=0., attn_drop_rate=0., drop_path_rate=0.1,
                 norm_layer=nn.LayerNorm, ape=False, patch_norm=True,
                 use_checkpoint=False, **kwargs):
        """
        Args:
            img_size: 입력 이미지 크기 (224)
            patch_size: 패치 크기 (4)
            in_chans: 입력 채널 수 (6: RGB + Mask)
            num_classes: 분류 클래스 개수 (4: 탈모 레벨 0~3)
            embed_dim: 초기 임베딩 차원 (96)
            depths: 각 Stage의 블록 개수 [2,2,6,2]
            num_heads: 각 Stage의 Attention head 개수 [3,6,12,24]
            window_size: Attention 윈도우 크기 (7x7)
            mlp_ratio: MLP 히든 차원 비율 (4배)
            drop_rate: 드롭아웃 비율
            drop_path_rate: Stochastic Depth 비율
            ape: Absolute Position Embedding 사용 여부
        """
        super().__init__()

        self.num_classes = num_classes  # 4개 클래스
        self.num_layers = len(depths)  # 4개 Stage
        self.embed_dim = embed_dim  # 96
        self.ape = ape  # Absolute Position Embedding
        self.patch_norm = patch_norm
        self.num_features = int(embed_dim * 2 ** (self.num_layers - 1))  # 최종 특징 차원: 96*8=768
        self.mlp_ratio = mlp_ratio

        # Patch Embedding: 6채널 이미지 -> 패치 임베딩
        self.patch_embed = PatchEmbed(
            img_size=img_size, patch_size=patch_size, in_chans=in_chans, embed_dim=embed_dim,
            norm_layer=norm_layer if self.patch_norm else None)
        num_patches = self.patch_embed.num_patches  # 56*56 = 3136
        patches_resolution = self.patch_embed.patches_resolution  # (56, 56)
        self.patches_resolution = patches_resolution

        # Absolute Position Embedding (선택적, 기본값은 False)
        if self.ape:
            self.absolute_pos_embed = nn.Parameter(torch.zeros(1, num_patches, embed_dim))
            trunc_normal_(self.absolute_pos_embed, std=.02)

        self.pos_drop = nn.Dropout(p=drop_rate)

        # Stochastic Depth (레이어가 깊어질수록 drop_path 확률 증가)
        dpr = [x.item() for x in torch.linspace(0, drop_path_rate, sum(depths))]

        # 4개의 Stage (BasicLayer) 생성
        # Stage 0: 56x56, 96채널, 2블록
        # Stage 1: 28x28, 192채널, 2블록
        # Stage 2: 14x14, 384채널, 6블록 (가장 많은 연산)
        # Stage 3: 7x7, 768채널, 2블록
        self.layers = nn.ModuleList()
        for i_layer in range(self.num_layers):
            layer = BasicLayer(dim=int(embed_dim * 2 ** i_layer),  # 채널: 96, 192, 384, 768
                               input_resolution=(patches_resolution[0] // (2 ** i_layer),
                                                 patches_resolution[1] // (2 ** i_layer)),  # 해상도 절반씩 감소
                               depth=depths[i_layer],  # 블록 개수
                               num_heads=num_heads[i_layer],  # Attention head 개수
                               window_size=window_size,
                               mlp_ratio=self.mlp_ratio,
                               qkv_bias=qkv_bias, qk_scale=qk_scale,
                               drop=drop_rate, attn_drop=attn_drop_rate,
                               drop_path=dpr[sum(depths[:i_layer]):sum(depths[:i_layer + 1])],
                               norm_layer=norm_layer,
                               downsample=PatchMerging if (i_layer < self.num_layers - 1) else None,  # 마지막 Stage는 다운샘플링 없음
                               use_checkpoint=use_checkpoint)
            self.layers.append(layer)

        self.norm = norm_layer(self.num_features)
        self.avgpool = nn.AdaptiveAvgPool1d(1)  # Global Average Pooling

        # Classification Head: 768차원 -> 256차원 -> 4클래스
        self.head = nn.Sequential(
            nn.Linear(self.num_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),  # 과적합 방지
            nn.Linear(256, num_classes)  # 최종 4개 클래스 출력
        )

        self.apply(self._init_weights)  # 가중치 초기화

    def _init_weights(self, m):
        """
        가중치 초기화
        - Linear: Truncated Normal (std=0.02)
        - LayerNorm: weight=1.0, bias=0
        """
        if isinstance(m, nn.Linear):
            trunc_normal_(m.weight, std=.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)

    @torch.jit.ignore
    def no_weight_decay(self):
        """Weight Decay를 적용하지 않을 파라미터"""
        return {'absolute_pos_embed'}

    @torch.jit.ignore
    def no_weight_decay_keywords(self):
        """Weight Decay를 적용하지 않을 파라미터 키워드"""
        return {'relative_position_bias_table'}

    def forward_features(self, x):
        """
        특징 추출 파이프라인
        1. Patch Embedding
        2. Position Embedding (선택)
        3. 4개 Stage 통과
        4. Global Average Pooling

        Args:
            x: 입력 이미지 (B, 6, 224, 224)
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

        x = self.norm(x)  # (B, 49, 768) - 7x7=49 패치
        x = self.avgpool(x.transpose(1, 2))  # (B, 768, 1) - Global Average Pooling
        x = torch.flatten(x, 1)  # (B, 768)
        return x

    def forward(self, x):
        """
        전체 순전파
        입력: (B, 6, 224, 224) - RGB + Mask
        출력: (B, 4) - 4개 클래스 로짓

        Args:
            x: 6채널 입력 이미지 (RGB 3채널 + 헤어 마스크 3채널)
        Returns:
            탈모 레벨 분류 로짓 (0~3)
        """
        x = self.forward_features(x)  # 특징 추출
        x = self.head(x)  # 분류
        return x

def swin_tiny_patch4_window7_224_hair(num_classes=4, **kwargs):
    """
    Swin-Tiny 모델 생성 (탈모 분류용)
    - 파라미터 수: 약 28M
    - Stage별 블록: [2, 2, 6, 2]
    - 경량화된 모델로 빠른 추론 속도

    Args:
        num_classes: 분류 클래스 개수 (기본값 4)
    Returns:
        SwinHairClassifier 모델
    """
    model = SwinHairClassifier(
        patch_size=4,
        window_size=7,
        embed_dim=96,
        depths=[2, 2, 6, 2],  # Tiny 버전
        num_heads=[3, 6, 12, 24],
        num_classes=num_classes,
        **kwargs
    )
    return model

def swin_small_patch4_window7_224_hair(num_classes=4, **kwargs):
    """
    Swin-Small 모델 생성 (탈모 분류용)
    - 파라미터 수: 약 50M
    - Stage별 블록: [2, 2, 18, 2]
    - Stage 3의 블록이 18개로 증가 (더 깊은 특징 추출)

    Args:
        num_classes: 분류 클래스 개수 (기본값 4)
    Returns:
        SwinHairClassifier 모델
    """
    model = SwinHairClassifier(
        patch_size=4,
        window_size=7,
        embed_dim=96,
        depths=[2, 2, 18, 2],  # Small 버전 (Stage 3이 18블록)
        num_heads=[3, 6, 12, 24],
        num_classes=num_classes,
        **kwargs
    )
    return model

# 테스트 코드
if __name__ == "__main__":
    """
    모델 테스트 코드
    - Swin-Tiny 모델 생성 및 추론 테스트
    - 6채널 입력 (RGB + Mask) 검증
    """
    # Swin-Tiny 모델 생성
    model = swin_tiny_patch4_window7_224_hair(num_classes=4)

    # 6채널 입력 생성 (RGB 3채널 + Mask 3채널)
    batch_size = 2
    rgb_image = torch.randn(batch_size, 3, 224, 224)  # RGB 이미지
    mask_image = torch.randn(batch_size, 3, 224, 224)  # 헤어 마스크

    # 6채널로 결합
    dual_input = torch.cat([rgb_image, mask_image], dim=1)  # (B, 6, 224, 224)

    print(f"입력 shape: {dual_input.shape}")
    print(f"모델 파라미터 수: {sum(p.numel() for p in model.parameters()):,}")

    # 순전파 테스트
    with torch.no_grad():
        output = model(dual_input)
        print(f"출력 shape: {output.shape}")  # (B, 4)
        print(f"출력 로짓: {output}")

        # Softmax로 확률 변환
        probs = torch.softmax(output, dim=1)
        print(f"클래스별 확률:")
        for i, prob in enumerate(probs[0]):
            print(f"  Level {i}: {prob.item():.2%}")