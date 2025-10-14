#!/usr/bin/python
# -*- encoding: utf-8 -*-

"""
============================================================================
🧱 ResNet18 - BiSeNet의 백본 네트워크
============================================================================

이 파일이 하는 일:
📸 이미지 → 🔍 계층적 특징 추출 → 📊 3개 스케일 출력

무엇인가요?
- ResNet18: 딥러닝의 "표준 백본"
- 18개 레이어로 이미지 특징을 추출하는 네트워크
- BiSeNet의 Context Path로 사용됨

ResNet의 핵심: Residual Connection (잔차 연결)
┌─────────┐
│  입력   │
└─────────┘
    ↓ ↘
┌─────────┐  ┌─────────┐
│  Conv   │  │ 바로가기 │ ← Shortcut!
└─────────┘  └─────────┘
    ↓ ↙
┌─────────┐
│  출력   │ = Conv(입력) + 입력
└─────────┘

왜 Residual인가요?
- 깊은 네트워크는 학습이 어려움 (기울기 소실)
- Shortcut으로 정보를 직접 전달 → 학습 쉬워짐
- 더 깊은 네트워크 가능! (18층, 50층, 101층...)

우리의 ResNet18 구조:
┌──────────────────┐
│ 입력 (3×H×W)     │ RGB 이미지
└──────────────────┘
        ↓
┌──────────────────┐
│ Conv1 + MaxPool  │ 1/4 크기
└──────────────────┘
        ↓
┌──────────────────┐
│ Layer1 (64채널)  │ 1/4 크기 (2 blocks)
└──────────────────┘
        ↓
┌──────────────────┐
│ Layer2 (128채널) │ 1/8 크기 (2 blocks) → feat8 ⭐
└──────────────────┘
        ↓
┌──────────────────┐
│ Layer3 (256채널) │ 1/16 크기 (2 blocks) → feat16 ⭐
└──────────────────┘
        ↓
┌──────────────────┐
│ Layer4 (512채널) │ 1/32 크기 (2 blocks) → feat32 ⭐
└──────────────────┘

출력: feat8, feat16, feat32 (3개 스케일)
- feat8: 디테일한 정보 (머리카락 텍스처)
- feat16: 중간 패턴 (얼굴 윤곽)
- feat32: 전체 맥락 (전체 구도)

============================================================================
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.utils.model_zoo as modelzoo

# from modules.bn import InPlaceABNSync as BatchNorm2d

# 사전 학습된 ResNet18 가중치 다운로드 URL
resnet18_url = 'https://download.pytorch.org/models/resnet18-5c106cde.pth'


# ============================================================================
# 🔨 기본 블록들
# ============================================================================

def conv3x3(in_planes, out_planes, stride=1):
    """
    🔹 3×3 Convolution (padding 포함)

    무엇을 하나요?
    - 가장 흔하게 쓰는 3×3 convolution
    - padding=1로 크기 유지 (stride=1일 때)

    왜 3×3인가요?
    - 5×5나 7×7보다 계산량 적음
    - 여러 번 쌓으면 큰 필터와 같은 효과
    - 파라미터 효율적!
    """
    return nn.Conv2d(in_planes, out_planes, kernel_size=3, stride=stride,
                     padding=1, bias=False)  # BatchNorm 쓰므로 bias 불필요


class BasicBlock(nn.Module):
    """
    🧱 ResNet의 기본 블록 (Residual Block)

    무엇을 하나요?
    - 입력을 변환하면서도 원본 정보를 보존
    - "원본 + 변환" = Residual Learning의 핵심!

    구조:
    ┌─────────┐
    │ 입력 x  │
    └─────────┘
        ↓ ↘ (Shortcut)
    ┌─────────┐          ┌─────────┐
    │ Conv1   │          │ Identity│ 또는
    │   ↓     │          │   or    │
    │ ReLU    │          │ Conv1×1 │ (크기 다를 때)
    │   ↓     │          └─────────┘
    │ Conv2   │                ↓
    │   ↓     │                ↓
    │  BN     │ →  더하기 ←───┘
    └─────────┘       ↓
                  ┌─────────┐
                  │  ReLU   │
                  └─────────┘
                      ↓
                  출력 (입력 + 변환)

    왜 이렇게 하나요?
    - 일반 Conv: F(x)를 학습
    - Residual: F(x) - x를 학습 (잔차만 학습)
    - 잔차가 더 학습하기 쉬움!

    예시:
    - 입력: [1, 2, 3]
    - Conv로 변환: [1.1, 2.2, 2.9]
    - Shortcut: [1, 2, 3]
    - 출력: [2.1, 4.2, 5.9] = 변환 + 원본
    """
    def __init__(self, in_chan, out_chan, stride=1):
        """
        BasicBlock 초기화

        in_chan: 입력 채널 수
        out_chan: 출력 채널 수
        stride: 크기 줄이기 (1=유지, 2=절반)
        """
        super(BasicBlock, self).__init__()
        self.conv1 = conv3x3(in_chan, out_chan, stride)
        self.bn1 = nn.BatchNorm2d(out_chan)
        self.conv2 = conv3x3(out_chan, out_chan)
        self.bn2 = nn.BatchNorm2d(out_chan)
        self.relu = nn.ReLU(inplace=True)

        # Downsample: 입출력 크기가 다를 때 Shortcut 조정
        self.downsample = None
        if in_chan != out_chan or stride != 1:
            # 1×1 Conv로 채널 수와 크기 맞춤
            self.downsample = nn.Sequential(
                nn.Conv2d(in_chan, out_chan,
                          kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_chan),
                )

    def forward(self, x):
        """
        순전파: Residual Learning 수행

        과정:
        1. 입력 → Conv1 → ReLU → Conv2 → BN (변환)
        2. Shortcut 준비 (필요하면 Downsample)
        3. 변환 + Shortcut
        4. ReLU
        """
        # 메인 경로 (변환)
        residual = self.conv1(x)
        residual = F.relu(self.bn1(residual))
        residual = self.conv2(residual)
        residual = self.bn2(residual)

        # Shortcut 경로 (원본)
        shortcut = x
        if self.downsample is not None:
            shortcut = self.downsample(x)  # 크기/채널 맞추기

        # Residual Connection: 더하기!
        out = shortcut + residual
        out = self.relu(out)
        return out


def create_layer_basic(in_chan, out_chan, bnum, stride=1):
    """
    🏗️ ResNet Layer 생성 (여러 BasicBlock 묶음)

    무엇을 하나요?
    - BasicBlock을 여러 개 쌓아서 하나의 Layer 만듦

    입력:
        in_chan: 입력 채널
        out_chan: 출력 채널
        bnum: 블록 개수 (예: 2개)
        stride: 첫 블록의 stride (나머지는 1)

    출력:
        Sequential (BasicBlock 여러 개)

    예시:
    - bnum=2, stride=2
    → Block1(stride=2) + Block2(stride=1)
    → 크기는 첫 블록에서만 줄어듦
    """
    layers = [BasicBlock(in_chan, out_chan, stride=stride)]  # 첫 블록 (크기 조정)
    for i in range(bnum-1):
        layers.append(BasicBlock(out_chan, out_chan, stride=1))  # 나머지 (크기 유지)
    return nn.Sequential(*layers)


# ============================================================================
# 🏛️ ResNet18 메인 모델
# ============================================================================

class Resnet18(nn.Module):
    """
    🏆 ResNet18 - 18층 잔차 네트워크

    무엇을 하나요?
    - 이미지에서 계층적 특징을 추출
    - 3개 스케일 출력: 디테일 → 중간 → 전체

    구조 상세:
    ┌─────────────────────────────────────┐
    │ 입력 (B, 3, H, W)                    │ 원본 RGB
    └─────────────────────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ Conv1 (7×7, stride=2)                │
    │ + BN + ReLU                          │ 1/2 크기
    └─────────────────────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ MaxPool (3×3, stride=2)              │ 1/4 크기
    └─────────────────────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ Layer1: 64 채널, 2 blocks            │ 1/4 크기
    └─────────────────────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ Layer2: 128 채널, 2 blocks           │ 1/8 크기 → feat8 ⭐
    └─────────────────────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ Layer3: 256 채널, 2 blocks           │ 1/16 크기 → feat16 ⭐
    └─────────────────────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ Layer4: 512 채널, 2 blocks           │ 1/32 크기 → feat32 ⭐
    └─────────────────────────────────────┘

    출력:
        feat8: (B, 128, H/8, W/8) - 디테일 (머리카락 텍스처)
        feat16: (B, 256, H/16, W/16) - 패턴 (얼굴 구조)
        feat32: (B, 512, H/32, W/32) - 맥락 (전체 구도)

    총 파라미터: 약 11M개
    총 레이어: 18개 (Conv1 + Layer1~4 + FC)
    """
    def __init__(self):
        """ResNet18 초기화 및 사전 학습 가중치 로드"""
        super(Resnet18, self).__init__()

        # Stem: 초기 Convolution
        self.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)

        # 4개 Layer (각 2개 블록)
        self.layer1 = create_layer_basic(64, 64, bnum=2, stride=1)    # 64 채널
        self.layer2 = create_layer_basic(64, 128, bnum=2, stride=2)   # 128 채널
        self.layer3 = create_layer_basic(128, 256, bnum=2, stride=2)  # 256 채널
        self.layer4 = create_layer_basic(256, 512, bnum=2, stride=2)  # 512 채널

        self.init_weight()  # 사전 학습 가중치 로드

    def forward(self, x):
        """
        순전파: 3개 스케일 특징 추출

        과정:
        1. Stem (Conv1 + MaxPool) → 1/4 크기
        2. Layer1 → 1/4 크기
        3. Layer2 → 1/8 크기 (feat8 출력)
        4. Layer3 → 1/16 크기 (feat16 출력)
        5. Layer4 → 1/32 크기 (feat32 출력)

        입력: (B, 3, H, W)
        출력: (feat8, feat16, feat32) 3개 텐서
        """
        # Stem
        x = self.conv1(x)
        x = F.relu(self.bn1(x))
        x = self.maxpool(x)

        # 4개 Layer
        x = self.layer1(x)           # 1/4 크기
        feat8 = self.layer2(x)       # 1/8 크기 ⭐
        feat16 = self.layer3(feat8)  # 1/16 크기 ⭐
        feat32 = self.layer4(feat16) # 1/32 크기 ⭐

        return feat8, feat16, feat32

    def init_weight(self):
        """
        🔧 사전 학습 가중치 로드 (Transfer Learning)

        무엇을 하나요?
        - ImageNet으로 학습된 ResNet18 가중치를 가져옴
        - FC(분류) 레이어는 제외하고 특징 추출 부분만 사용

        왜 필요한가요?
        - 처음부터 학습하면 오래 걸림
        - ImageNet 학습 가중치는 일반적인 특징 잘 잡아냄
        - Transfer Learning으로 빠르고 정확하게!

        과정:
        1. PyTorch Hub에서 ResNet18 가중치 다운로드
        2. FC 레이어 제외 (우리는 특징 추출만 필요)
        3. 나머지 가중치를 현재 모델에 복사
        """
        # ImageNet 사전 학습 가중치 다운로드
        state_dict = modelzoo.load_url(resnet18_url)
        self_state_dict = self.state_dict()

        # FC 레이어 빼고 복사
        for k, v in state_dict.items():
            if 'fc' in k:
                continue  # FC 레이어는 스킵 (분류 레이어, 우리는 특징만 필요)
            self_state_dict.update({k: v})

        self.load_state_dict(self_state_dict)

    def get_params(self):
        """
        📊 학습 파라미터 분리 (Weight Decay 적용 여부)

        무엇을 하나요?
        - Weight Decay를 적용할 파라미터와 안 할 파라미터 구분

        왜 분리하나요?
        - Conv/Linear의 weight: Weight Decay 적용 (과적합 방지)
        - BatchNorm, bias: Weight Decay 적용 안 함 (성능 저하 방지)

        출력:
            wd_params: Weight Decay 적용할 파라미터 (Conv, Linear weight)
            nowd_params: Weight Decay 적용 안 할 파라미터 (BatchNorm, bias)
        """
        wd_params, nowd_params = [], []
        for name, module in self.named_modules():
            if isinstance(module, (nn.Linear, nn.Conv2d)):
                wd_params.append(module.weight)  # Weight는 Decay 적용
                if not module.bias is None:
                    nowd_params.append(module.bias)  # Bias는 Decay 안 함
            elif isinstance(module,  nn.BatchNorm2d):
                nowd_params += list(module.parameters())  # BatchNorm은 Decay 안 함
        return wd_params, nowd_params


if __name__ == "__main__":
    net = Resnet18()
    x = torch.randn(16, 3, 224, 224)
    out = net(x)
    print(out[0].size())
    print(out[1].size())
    print(out[2].size())
    net.get_params()
