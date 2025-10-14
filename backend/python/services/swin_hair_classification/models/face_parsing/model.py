#!/usr/bin/python
# -*- encoding: utf-8 -*-

"""
============================================================================
👤 BiSeNet - 얼굴 영역 분석 모델 (Bilateral Segmentation Network)
============================================================================

이 파일이 하는 일:
📸 사진 → 🔍 픽셀별 분류 → 🎭 얼굴 부위 마스크

무엇인가요?
- 사진의 각 픽셀이 "무엇"인지 분류하는 AI
- 19개 클래스: 피부, 눈, 코, 입, 머리카락 등

우리가 사용하는 방법:
1. 헤어 마스크 생성: 클래스 17 (머리카락)만 추출
2. 얼굴 블러: 클래스 1, 10, 11, 12, 13 (피부, 코, 눈, 눈썹, 귀)만 블러

모델 구조:
┌─────────────────┐
│ 입력 사진        │ 512×512 RGB
└─────────────────┘
        ↓
┌─────────────────┐
│ Spatial Path     │ 고해상도로 디테일 캡처
└─────────────────┘
        ↓ ↘
┌─────────────────┐  ┌─────────────────┐
│ Context Path     │  │ Spatial Path    │
│ (ResNet18)       │  │ (빠른 다운샘플) │
│ 전체 맥락 파악   │  │ 디테일 보존     │
└─────────────────┘  └─────────────────┘
        ↓ ↙
┌─────────────────┐
│ Feature Fusion   │ 두 경로 합치기
└─────────────────┘
        ↓
┌─────────────────┐
│ 출력 (19채널)    │ 각 픽셀이 어느 클래스인지
└─────────────────┘

19개 클래스:
0: background, 1: skin, 2: l_brow, 3: r_brow, 4: l_eye, 5: r_eye,
6: eye_g (안경), 7: l_ear, 8: r_ear, 9: ear_r (귀걸이), 10: nose,
11: mouth, 12: u_lip, 13: l_lip, 14: neck, 15: neck_l (목걸이),
16: cloth, 17: hair ⭐ (우리가 필요한 부분!), 18: hat

============================================================================
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision

from .resnet import Resnet18
# from modules.bn import InPlaceABNSync as BatchNorm2d


# ============================================================================
# 🧱 기본 블록들
# ============================================================================

class ConvBNReLU(nn.Module):
    """
    🔨 기본 Convolution 블록 (Conv + BatchNorm + ReLU)

    무엇을 하나요?
    - Convolution: 이미지 특징 추출
    - BatchNorm: 값 안정화
    - ReLU: 비선형 활성화

    왜 묶어놨나요?
    - 이 3개는 거의 항상 같이 사용됨
    - 매번 쓰기 귀찮으니 하나로 묶음
    """
    def __init__(self, in_chan, out_chan, ks=3, stride=1, padding=1, *args, **kwargs):
        super(ConvBNReLU, self).__init__()
        self.conv = nn.Conv2d(in_chan,
                out_chan,
                kernel_size = ks,
                stride = stride,
                padding = padding,
                bias = False)  # BatchNorm 쓰면 bias 불필요
        self.bn = nn.BatchNorm2d(out_chan)
        self.init_weight()

    def forward(self, x):
        x = self.conv(x)
        x = F.relu(self.bn(x))
        return x

    def init_weight(self):
        for ly in self.children():
            if isinstance(ly, nn.Conv2d):
                nn.init.kaiming_normal_(ly.weight, a=1)
                if not ly.bias is None: nn.init.constant_(ly.bias, 0)

class BiSeNetOutput(nn.Module):
    def __init__(self, in_chan, mid_chan, n_classes, *args, **kwargs):
        super(BiSeNetOutput, self).__init__()
        self.conv = ConvBNReLU(in_chan, mid_chan, ks=3, stride=1, padding=1)
        self.conv_out = nn.Conv2d(mid_chan, n_classes, kernel_size=1, bias=False)
        self.init_weight()

    def forward(self, x):
        x = self.conv(x)
        x = self.conv_out(x)
        return x

    def init_weight(self):
        for ly in self.children():
            if isinstance(ly, nn.Conv2d):
                nn.init.kaiming_normal_(ly.weight, a=1)
                if not ly.bias is None: nn.init.constant_(ly.bias, 0)

    def get_params(self):
        wd_params, nowd_params = [], []
        for name, module in self.named_modules():
            if isinstance(module, nn.Linear) or isinstance(module, nn.Conv2d):
                wd_params.append(module.weight)
                if not module.bias is None:
                    nowd_params.append(module.bias)
            elif isinstance(module, nn.BatchNorm2d):
                nowd_params += list(module.parameters())
        return wd_params, nowd_params


class AttentionRefinementModule(nn.Module):
    """
    🎯 Attention Refinement Module (ARM)

    무엇을 하나요?
    - 중요한 특징에 집중하도록 만드는 모듈
    - "이 부분이 중요해!"라고 강조하는 기능

    동작:
    1. 특징 추출
    2. Global Average Pooling (전체 평균)
    3. Attention 맵 생성 (어디가 중요한지)
    4. 원본 특징에 Attention 곱하기

    예시:
    - 머리카락 영역: Attention 높음 (1.0) → 그대로 유지
    - 배경 영역: Attention 낮음 (0.1) → 약하게 만듦

    비유:
    - 사진에 형광펜으로 중요한 부분 표시하는 것과 비슷
    """
    def __init__(self, in_chan, out_chan, *args, **kwargs):
        super(AttentionRefinementModule, self).__init__()
        self.conv = ConvBNReLU(in_chan, out_chan, ks=3, stride=1, padding=1)
        self.conv_atten = nn.Conv2d(out_chan, out_chan, kernel_size= 1, bias=False)
        self.bn_atten = nn.BatchNorm2d(out_chan)
        self.sigmoid_atten = nn.Sigmoid()  # 0~1 사이 값으로
        self.init_weight()

    def forward(self, x):
        """
        Attention 적용 과정:
        특징 → 전체 평균 → Attention 맵 → 원본에 곱하기
        """
        feat = self.conv(x)  # 특징 추출
        atten = F.avg_pool2d(feat, feat.size()[2:])  # 전체 평균 (H×W → 1×1)
        atten = self.conv_atten(atten)  # Attention 계산
        atten = self.bn_atten(atten)
        atten = self.sigmoid_atten(atten)  # 0~1 사이로 정규화
        out = torch.mul(feat, atten)  # 원본에 Attention 가중치 곱하기
        return out

    def init_weight(self):
        for ly in self.children():
            if isinstance(ly, nn.Conv2d):
                nn.init.kaiming_normal_(ly.weight, a=1)
                if not ly.bias is None: nn.init.constant_(ly.bias, 0)


class ContextPath(nn.Module):
    def __init__(self, *args, **kwargs):
        super(ContextPath, self).__init__()
        self.resnet = Resnet18()
        self.arm16 = AttentionRefinementModule(256, 128)
        self.arm32 = AttentionRefinementModule(512, 128)
        self.conv_head32 = ConvBNReLU(128, 128, ks=3, stride=1, padding=1)
        self.conv_head16 = ConvBNReLU(128, 128, ks=3, stride=1, padding=1)
        self.conv_avg = ConvBNReLU(512, 128, ks=1, stride=1, padding=0)

        self.init_weight()

    def forward(self, x):
        H0, W0 = x.size()[2:]
        feat8, feat16, feat32 = self.resnet(x)
        H8, W8 = feat8.size()[2:]
        H16, W16 = feat16.size()[2:]
        H32, W32 = feat32.size()[2:]

        avg = F.avg_pool2d(feat32, feat32.size()[2:])
        avg = self.conv_avg(avg)
        avg_up = F.interpolate(avg, (H32, W32), mode='nearest')

        feat32_arm = self.arm32(feat32)
        feat32_sum = feat32_arm + avg_up
        feat32_up = F.interpolate(feat32_sum, (H16, W16), mode='nearest')
        feat32_up = self.conv_head32(feat32_up)

        feat16_arm = self.arm16(feat16)
        feat16_sum = feat16_arm + feat32_up
        feat16_up = F.interpolate(feat16_sum, (H8, W8), mode='nearest')
        feat16_up = self.conv_head16(feat16_up)

        return feat8, feat16_up, feat32_up  # x8, x8, x16

    def init_weight(self):
        for ly in self.children():
            if isinstance(ly, nn.Conv2d):
                nn.init.kaiming_normal_(ly.weight, a=1)
                if not ly.bias is None: nn.init.constant_(ly.bias, 0)

    def get_params(self):
        wd_params, nowd_params = [], []
        for name, module in self.named_modules():
            if isinstance(module, (nn.Linear, nn.Conv2d)):
                wd_params.append(module.weight)
                if not module.bias is None:
                    nowd_params.append(module.bias)
            elif isinstance(module, nn.BatchNorm2d):
                nowd_params += list(module.parameters())
        return wd_params, nowd_params


### This is not used, since I replace this with the resnet feature with the same size
class SpatialPath(nn.Module):
    def __init__(self, *args, **kwargs):
        super(SpatialPath, self).__init__()
        self.conv1 = ConvBNReLU(3, 64, ks=7, stride=2, padding=3)
        self.conv2 = ConvBNReLU(64, 64, ks=3, stride=2, padding=1)
        self.conv3 = ConvBNReLU(64, 64, ks=3, stride=2, padding=1)
        self.conv_out = ConvBNReLU(64, 128, ks=1, stride=1, padding=0)
        self.init_weight()

    def forward(self, x):
        feat = self.conv1(x)
        feat = self.conv2(feat)
        feat = self.conv3(feat)
        feat = self.conv_out(feat)
        return feat

    def init_weight(self):
        for ly in self.children():
            if isinstance(ly, nn.Conv2d):
                nn.init.kaiming_normal_(ly.weight, a=1)
                if not ly.bias is None: nn.init.constant_(ly.bias, 0)

    def get_params(self):
        wd_params, nowd_params = [], []
        for name, module in self.named_modules():
            if isinstance(module, nn.Linear) or isinstance(module, nn.Conv2d):
                wd_params.append(module.weight)
                if not module.bias is None:
                    nowd_params.append(module.bias)
            elif isinstance(module, nn.BatchNorm2d):
                nowd_params += list(module.parameters())
        return wd_params, nowd_params


class FeatureFusionModule(nn.Module):
    def __init__(self, in_chan, out_chan, *args, **kwargs):
        super(FeatureFusionModule, self).__init__()
        self.convblk = ConvBNReLU(in_chan, out_chan, ks=1, stride=1, padding=0)
        self.conv1 = nn.Conv2d(out_chan,
                out_chan//4,
                kernel_size = 1,
                stride = 1,
                padding = 0,
                bias = False)
        self.conv2 = nn.Conv2d(out_chan//4,
                out_chan,
                kernel_size = 1,
                stride = 1,
                padding = 0,
                bias = False)
        self.relu = nn.ReLU(inplace=True)
        self.sigmoid = nn.Sigmoid()
        self.init_weight()

    def forward(self, fsp, fcp):
        fcat = torch.cat([fsp, fcp], dim=1)
        feat = self.convblk(fcat)
        atten = F.avg_pool2d(feat, feat.size()[2:])
        atten = self.conv1(atten)
        atten = self.relu(atten)
        atten = self.conv2(atten)
        atten = self.sigmoid(atten)
        feat_atten = torch.mul(feat, atten)
        feat_out = feat_atten + feat
        return feat_out

    def init_weight(self):
        for ly in self.children():
            if isinstance(ly, nn.Conv2d):
                nn.init.kaiming_normal_(ly.weight, a=1)
                if not ly.bias is None: nn.init.constant_(ly.bias, 0)

    def get_params(self):
        wd_params, nowd_params = [], []
        for name, module in self.named_modules():
            if isinstance(module, nn.Linear) or isinstance(module, nn.Conv2d):
                wd_params.append(module.weight)
                if not module.bias is None:
                    nowd_params.append(module.bias)
            elif isinstance(module, nn.BatchNorm2d):
                nowd_params += list(module.parameters())
        return wd_params, nowd_params



# ============================================================================
# 🏛️ BiSeNet 메인 모델
# ============================================================================

class BiSeNet(nn.Module):
    """
    🏆 BiSeNet (Bilateral Segmentation Network) - 메인 모델

    무엇을 하나요?
    - 사진의 각 픽셀을 19개 클래스로 분류
    - 실시간 처리 가능한 빠른 세그멘테이션 모델

    구조:
    ┌──────────────────────────────────────┐
    │ 입력 (512×512 RGB)                    │
    └──────────────────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ Context Path (ResNet18)               │
    │ - feat_res8  (1/8 크기, 디테일)       │
    │ - feat_cp8   (1/8 크기, ARM 적용)     │
    │ - feat_cp16  (1/16 크기, ARM 적용)    │
    └──────────────────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ Spatial Path = feat_res8              │
    │ (별도 Spatial Path 대신 ResNet 특징)  │
    └──────────────────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ Feature Fusion Module (FFM)           │
    │ Spatial + Context 합치기              │
    └──────────────────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ 3개의 출력 (멀티스케일 감독)           │
    │ - feat_out   : 메인 출력 (1/8)        │
    │ - feat_out16 : 보조 출력 (1/16)       │
    │ - feat_out32 : 보조 출력 (1/32)       │
    └──────────────────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ Upsampling (원본 크기로)               │
    │ 512×512×19 (각 픽셀의 클래스별 점수)   │
    └──────────────────────────────────────┘

    왜 3개 출력인가요?
    - 학습 시: 3개 모두 사용 (멀티스케일 감독, 더 잘 학습됨)
    - 추론 시: feat_out만 사용 (가장 정확)

    입력:
        x: (B, 3, H, W) - RGB 이미지

    출력:
        학습 시: (feat_out, feat_out16, feat_out32) 3개 모두
        추론 시: feat_out만 사용
        각 출력: (B, 19, H, W) - 19개 클래스의 점수
    """
    def __init__(self, n_classes, *args, **kwargs):
        """
        BiSeNet 초기화

        n_classes: 클래스 개수 (우리는 19개)
        """
        super(BiSeNet, self).__init__()
        self.cp = ContextPath()  # ResNet18 기반 Context Path
        ## here self.sp is deleted (원래는 별도 Spatial Path 있었음)
        self.ffm = FeatureFusionModule(256, 256)  # 두 경로 합치기
        self.conv_out = BiSeNetOutput(256, 256, n_classes)    # 메인 출력
        self.conv_out16 = BiSeNetOutput(128, 64, n_classes)   # 보조 출력 1
        self.conv_out32 = BiSeNetOutput(128, 64, n_classes)   # 보조 출력 2
        self.init_weight()

    def forward(self, x):
        """
        순전파 (실제 분류 수행)

        과정:
        1. Context Path로 특징 추출 (3개 스케일)
        2. Spatial Path = ResNet의 초기 특징 (feat_res8)
        3. Feature Fusion으로 합치기
        4. 3개 스케일로 출력
        5. 원본 크기로 Upsampling

        입력: (B, 3, H, W)
        출력: 3개의 (B, 19, H, W) 텐서
        """
        H, W = x.size()[2:]

        # Context Path에서 3개 스케일 특징 추출
        feat_res8, feat_cp8, feat_cp16 = self.cp(x)  # ResNet의 res3b1 특징 반환

        # Spatial Path 특징 (원래는 별도 경로, 여기선 ResNet 초기 특징 재사용)
        feat_sp = feat_res8  # ResNet의 1/8 특징을 Spatial Path로 사용

        # Feature Fusion (Spatial + Context)
        feat_fuse = self.ffm(feat_sp, feat_cp8)

        # 3개 스케일로 출력 (멀티스케일 감독)
        feat_out = self.conv_out(feat_fuse)      # 1/8 크기 출력 (메인)
        feat_out16 = self.conv_out16(feat_cp8)   # 1/16 크기 출력 (보조)
        feat_out32 = self.conv_out32(feat_cp16)  # 1/32 크기 출력 (보조)

        # 원본 크기로 Upsampling (Bilinear Interpolation)
        feat_out = F.interpolate(feat_out, (H, W), mode='bilinear', align_corners=True)
        feat_out16 = F.interpolate(feat_out16, (H, W), mode='bilinear', align_corners=True)
        feat_out32 = F.interpolate(feat_out32, (H, W), mode='bilinear', align_corners=True)

        return feat_out, feat_out16, feat_out32

    def init_weight(self):
        for ly in self.children():
            if isinstance(ly, nn.Conv2d):
                nn.init.kaiming_normal_(ly.weight, a=1)
                if not ly.bias is None: nn.init.constant_(ly.bias, 0)

    def get_params(self):
        wd_params, nowd_params, lr_mul_wd_params, lr_mul_nowd_params = [], [], [], []
        for name, child in self.named_children():
            child_wd_params, child_nowd_params = child.get_params()
            if isinstance(child, FeatureFusionModule) or isinstance(child, BiSeNetOutput):
                lr_mul_wd_params += child_wd_params
                lr_mul_nowd_params += child_nowd_params
            else:
                wd_params += child_wd_params
                nowd_params += child_nowd_params
        return wd_params, nowd_params, lr_mul_wd_params, lr_mul_nowd_params


if __name__ == "__main__":
    net = BiSeNet(19)
    net.cuda()
    net.eval()
    in_ten = torch.randn(16, 3, 640, 480).cuda()
    out, out16, out32 = net(in_ten)
    print(out.shape)

    net.get_params()
