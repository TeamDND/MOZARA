"""
Fine-tuning 전략 시각화 이미지 생성 스크립트
실행: python generate_finetuning_images.py
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
import numpy as np
import os
import sys

# Windows 콘솔 유니코드 출력 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 한글 폰트 설정 (Windows)
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

# 출력 디렉토리 생성
output_dir = 'finetuning_images'
os.makedirs(output_dir, exist_ok=True)

print("Fine-tuning 이미지 생성 시작...")


# ============================================================================
# 이미지 1: 전체 파이프라인
# ============================================================================
def create_pipeline_image():
    fig, ax = plt.subplots(figsize=(14, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # 제목
    ax.text(5, 9.5, 'Fine-tuning 전략 파이프라인',
            ha='center', fontsize=24, fontweight='bold')

    # 단계별 박스
    stages = [
        (1.5, 7.5, '1단계\nImageNet\n사전 학습 모델', '#E3F2FD'),
        (5, 7.5, '2단계\n모델 구조\n수정', '#FFF3E0'),
        (8.5, 7.5, '3단계\n레이어별\n학습률 설정', '#F3E5F5'),
        (1.5, 4.5, '4단계\n데이터\n증강', '#E8F5E9'),
        (5, 4.5, '5단계\n정규화\n기법 적용', '#FFF9C4'),
        (8.5, 4.5, '6단계\n학습\n스케줄', '#FFEBEE'),
        (5, 1.5, '결과\n97.95%\n정확도 달성', '#C8E6C9'),
    ]

    for x, y, text, color in stages:
        bbox = FancyBboxPatch((x-0.7, y-0.6), 1.4, 1.2,
                              boxstyle="round,pad=0.1",
                              facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(bbox)
        ax.text(x, y, text, ha='center', va='center', fontsize=11, fontweight='bold')

    # 화살표
    arrows = [
        (2.2, 7.5, 4.3, 7.5),
        (5.7, 7.5, 7.8, 7.5),
        (1.5, 6.9, 1.5, 5.7),
        (5, 6.9, 5, 5.7),
        (8.5, 6.9, 8.5, 5.7),
        (2.2, 4.5, 4.3, 4.5),
        (5.7, 4.5, 7.8, 4.5),
        (5, 3.9, 5, 2.7),
    ]

    for x1, y1, x2, y2 in arrows:
        arrow = FancyArrowPatch((x1, y1), (x2, y2),
                               arrowstyle='->', mutation_scale=30,
                               linewidth=2.5, color='#1976D2')
        ax.add_patch(arrow)

    plt.tight_layout()
    filepath = os.path.join(output_dir, '01_pipeline.png')
    plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"✅ 생성 완료: {filepath}")


# ============================================================================
# 이미지 2: 입력 채널 확장
# ============================================================================
def create_channel_expansion_image():
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6)
    ax.axis('off')

    # 제목
    ax.text(6, 5.5, '입력 채널 확장: 3채널 → 6채널',
            ha='center', fontsize=20, fontweight='bold')

    # 기존 (3채널)
    ax.text(2.5, 4.5, '기존 Swin', ha='center', fontsize=14, fontweight='bold')

    colors_rgb = ['#FF6B6B', '#4ECDC4', '#45B7D1']
    labels_rgb = ['R', 'G', 'B']
    for i, (color, label) in enumerate(zip(colors_rgb, labels_rgb)):
        rect = Rectangle((1.5 + i*0.3, 2.5), 0.25, 1.5,
                         facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(rect)
        ax.text(1.625 + i*0.3, 3.25, label, ha='center', va='center',
                fontsize=12, fontweight='bold', color='white')

    ax.text(2.5, 1.8, '3 채널', ha='center', fontsize=12)

    # 화살표
    arrow = FancyArrowPatch((3.5, 3.25), (5.5, 3.25),
                           arrowstyle='->', mutation_scale=40,
                           linewidth=3, color='#1976D2')
    ax.add_patch(arrow)
    ax.text(4.5, 3.6, 'Fine-tuning', ha='center', fontsize=12,
            bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))

    # 수정 (6채널)
    ax.text(8.5, 4.5, '수정된 Swin', ha='center', fontsize=14, fontweight='bold')

    for i, (color, label) in enumerate(zip(colors_rgb, labels_rgb)):
        rect = Rectangle((7 + i*0.3, 2.5), 0.25, 1.5,
                         facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(rect)
        ax.text(7.125 + i*0.3, 3.25, label, ha='center', va='center',
                fontsize=12, fontweight='bold', color='white')

    ax.text(8, 3.8, '+', ha='center', fontsize=16, fontweight='bold')

    colors_mask = ['#95A5A6', '#95A5A6', '#95A5A6']
    labels_mask = ['M', 'M', 'M']
    for i, (color, label) in enumerate(zip(colors_mask, labels_mask)):
        rect = Rectangle((8.2 + i*0.3, 2.5), 0.25, 1.5,
                         facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(rect)
        ax.text(8.325 + i*0.3, 3.25, label, ha='center', va='center',
                fontsize=12, fontweight='bold', color='white')

    ax.text(8.5, 1.8, '6 채널 (RGB + Mask)', ha='center', fontsize=12)

    # 설명
    ax.text(8.5, 0.8, 'Hair Mask 3채널 추가 → 머리카락 영역 집중 분석',
            ha='center', fontsize=11, style='italic',
            bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))

    plt.tight_layout()
    filepath = os.path.join(output_dir, '02_channel_expansion.png')
    plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"✅ 생성 완료: {filepath}")


# ============================================================================
# 이미지 3: 레이어별 학습률
# ============================================================================
def create_learning_rate_image():
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # 제목
    ax.text(5, 9.5, '레이어별 학습률 전략',
            ha='center', fontsize=20, fontweight='bold')

    # 레이어 정보
    layers = [
        ('Patch Embedding', 1e-5, 8.5),
        ('Stage 1 (56×56×96)', 2e-5, 7.5),
        ('Stage 2 (28×28×192)', 3e-5, 6.5),
        ('Stage 3 (14×14×384)', 4e-5, 5.5),
        ('Stage 4 (7×7×768)', 5e-5, 4.5),
        ('Classification Head', 1e-3, 3.5),
    ]

    max_lr = 1e-3

    for name, lr, y in layers:
        # 레이어 이름
        ax.text(1.5, y, name, ha='left', va='center', fontsize=12, fontweight='bold')

        # 학습률 바
        width = (lr / max_lr) * 5
        color = '#FF6B6B' if lr == max_lr else '#4ECDC4'
        rect = Rectangle((4, y-0.15), width, 0.3,
                         facecolor=color, edgecolor='black', linewidth=1.5)
        ax.add_patch(rect)

        # 학습률 값
        ax.text(9.5, y, f'{lr:.0e}', ha='right', va='center', fontsize=11)

    # 설명 박스
    ax.text(5, 2, '전략: 하위 레이어는 미세 조정, 상위 레이어는 빠르게 학습',
            ha='center', fontsize=12, style='italic',
            bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8, pad=0.5))

    # 화살표 및 주석
    ax.annotate('가장 낮음\n(미세 조정)', xy=(9, 8.5), xytext=(9.5, 9),
                fontsize=10, ha='right',
                arrowprops=dict(arrowstyle='->', color='blue', lw=2))

    ax.annotate('가장 높음\n(빠른 학습)', xy=(9, 3.5), xytext=(9.5, 2.5),
                fontsize=10, ha='right',
                arrowprops=dict(arrowstyle='->', color='red', lw=2))

    plt.tight_layout()
    filepath = os.path.join(output_dir, '03_learning_rate.png')
    plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"✅ 생성 완료: {filepath}")


# ============================================================================
# 이미지 4: 데이터 증강
# ============================================================================
def create_augmentation_image():
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6)
    ax.axis('off')

    # 제목
    ax.text(6, 5.5, '데이터 증강 (Data Augmentation)',
            ha='center', fontsize=20, fontweight='bold')

    # 원본
    ax.text(2, 4.5, '원본 이미지', ha='center', fontsize=12, fontweight='bold')
    rect = Rectangle((1.5, 3), 1, 1, facecolor='lightblue',
                     edgecolor='black', linewidth=2)
    ax.add_patch(rect)

    # 화살표
    arrow = FancyArrowPatch((2, 2.8), (2, 2),
                           arrowstyle='->', mutation_scale=30,
                           linewidth=2.5, color='#1976D2')
    ax.add_patch(arrow)

    # 증강 기법들
    augmentations = [
        (1.5, 'Rotation\n±15°', '↻', '#FFE5E5'),
        (4, 'Flip\n50%', '⇄', '#E5F5FF'),
        (6.5, 'Color Jitter\n밝기/대비', '☀', '#FFF9E5'),
        (9, 'Mixup\n이미지 혼합', '⊕', '#E5FFE5'),
    ]

    for x, title, symbol, color in augmentations:
        # 박스
        bbox = FancyBboxPatch((x-0.6, 0.5), 1.2, 1.2,
                              boxstyle="round,pad=0.1",
                              facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(bbox)

        # 심볼
        ax.text(x, 1.3, symbol, ha='center', va='center',
                fontsize=24, fontweight='bold')

        # 제목
        ax.text(x, 0.9, title, ha='center', va='center', fontsize=9)

    # 하단 설명
    ax.text(6, 0.2, '→ 과적합 방지 & 일반화 성능 향상',
            ha='center', fontsize=12, style='italic',
            bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.3))

    plt.tight_layout()
    filepath = os.path.join(output_dir, '04_augmentation.png')
    plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"✅ 생성 완료: {filepath}")


# ============================================================================
# 이미지 5: Fine-tuning vs From Scratch 비교
# ============================================================================
def create_comparison_image():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

    # 전체 제목
    fig.suptitle('Fine-tuning vs From Scratch 비교', fontsize=20, fontweight='bold', y=0.98)

    # 왼쪽: 정확도 비교
    methods = ['From\nScratch', 'Fine-tuning']
    accuracies = [89.3, 97.95]
    colors = ['#95A5A6', '#4ECDC4']

    bars1 = ax1.bar(methods, accuracies, color=colors, edgecolor='black', linewidth=2)
    ax1.set_ylabel('정확도 (%)', fontsize=14, fontweight='bold')
    ax1.set_ylim(0, 105)
    ax1.set_title('정확도 비교', fontsize=16, fontweight='bold', pad=15)
    ax1.grid(axis='y', alpha=0.3, linestyle='--')

    # 값 표시
    for bar, acc in zip(bars1, accuracies):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height + 1,
                f'{acc}%', ha='center', va='bottom', fontsize=14, fontweight='bold')

    # 향상 표시
    ax1.annotate('', xy=(1, 97.95), xytext=(1, 89.3),
                arrowprops=dict(arrowstyle='<->', color='red', lw=3))
    ax1.text(1.15, 93.5, '+8.65%p\n⭐', ha='left', va='center',
            fontsize=12, fontweight='bold', color='red')

    # 오른쪽: 학습 시간 비교
    times = [20, 8]
    bars2 = ax2.bar(methods, times, color=colors, edgecolor='black', linewidth=2)
    ax2.set_ylabel('학습 시간 (시간)', fontsize=14, fontweight='bold')
    ax2.set_ylim(0, 25)
    ax2.set_title('학습 시간 비교', fontsize=16, fontweight='bold', pad=15)
    ax2.grid(axis='y', alpha=0.3, linestyle='--')

    # 값 표시
    for bar, time in zip(bars2, times):
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                f'{time}h', ha='center', va='bottom', fontsize=14, fontweight='bold')

    # 단축 표시
    ax2.annotate('', xy=(1, 8), xytext=(1, 20),
                arrowprops=dict(arrowstyle='<->', color='blue', lw=3))
    ax2.text(1.15, 14, '-60%\n⭐', ha='left', va='center',
            fontsize=12, fontweight='bold', color='blue')

    plt.tight_layout()
    filepath = os.path.join(output_dir, '05_comparison.png')
    plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"✅ 생성 완료: {filepath}")


# ============================================================================
# 이미지 6: 학습 스케줄 (Cosine Annealing)
# ============================================================================
def create_schedule_image():
    fig, ax = plt.subplots(figsize=(12, 6))

    # 제목
    ax.set_title('학습률 스케줄 (Cosine Annealing)', fontsize=20, fontweight='bold', pad=20)

    # Cosine Annealing 곡선
    epochs = np.arange(0, 101)
    warmup_epochs = 5

    # Warmup
    warmup_lr = np.linspace(0, 1e-3, warmup_epochs)

    # Cosine Annealing
    cosine_lr = 1e-3 * 0.5 * (1 + np.cos(np.pi * (epochs[warmup_epochs:] - warmup_epochs) / (100 - warmup_epochs)))
    cosine_lr = np.maximum(cosine_lr, 1e-6)

    # 전체 학습률
    lr_schedule = np.concatenate([warmup_lr, cosine_lr])

    # 그래프
    ax.plot(epochs, lr_schedule, linewidth=3, color='#1976D2', label='학습률')
    ax.axvline(x=warmup_epochs, color='red', linestyle='--', linewidth=2, label='Warmup 종료')
    ax.axvline(x=68, color='green', linestyle='--', linewidth=2, label='Best Model (Epoch 68)')

    ax.set_xlabel('Epoch', fontsize=14, fontweight='bold')
    ax.set_ylabel('학습률', fontsize=14, fontweight='bold')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 1.1e-3)
    ax.legend(fontsize=12, loc='upper right')
    ax.grid(True, alpha=0.3, linestyle='--')

    # 주석
    ax.annotate('Warmup\n(5 epochs)', xy=(2.5, 5e-4), xytext=(10, 8e-4),
                fontsize=11, ha='left',
                arrowprops=dict(arrowstyle='->', color='red', lw=2),
                bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))

    ax.annotate('Cosine 감소', xy=(50, 5e-4), xytext=(70, 8e-4),
                fontsize=11, ha='left',
                arrowprops=dict(arrowstyle='->', color='blue', lw=2),
                bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))

    plt.tight_layout()
    filepath = os.path.join(output_dir, '06_schedule.png')
    plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"✅ 생성 완료: {filepath}")


# ============================================================================
# 이미지 7: Transfer Learning 효과
# ============================================================================
def create_transfer_learning_image():
    fig, ax = plt.subplots(figsize=(12, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.axis('off')

    # 제목
    ax.text(6, 6.5, 'Transfer Learning 효과',
            ha='center', fontsize=20, fontweight='bold')

    # ImageNet 학습 내용
    ax.text(2.5, 5.5, 'ImageNet 학습 내용', ha='center', fontsize=14,
            fontweight='bold', bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))

    imagenet_features = [
        (2.5, 4.8, '텍스처 인식', '#E3F2FD'),
        (2.5, 3.8, '패턴 인식', '#FFF3E0'),
        (2.5, 2.8, '경계 검출', '#F3E5F5'),
        (2.5, 1.8, '전역 구조 파악', '#E8F5E9'),
    ]

    for x, y, text, color in imagenet_features:
        bbox = FancyBboxPatch((x-0.7, y-0.3), 1.4, 0.5,
                              boxstyle="round,pad=0.05",
                              facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(bbox)
        ax.text(x, y, text, ha='center', va='center', fontsize=11, fontweight='bold')

    # 화살표들
    for _, y, _, _ in imagenet_features:
        arrow = FancyArrowPatch((3.3, y), (6.7, y),
                               arrowstyle='->', mutation_scale=30,
                               linewidth=2.5, color='#1976D2')
        ax.add_patch(arrow)

    # 중앙 텍스트
    ax.text(5, 3.3, 'Transfer\nLearning', ha='center', va='center',
            fontsize=12, fontweight='bold',
            bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.8))

    # 탈모 분석 활용
    ax.text(9.5, 5.5, '탈모 분석 활용', ha='center', fontsize=14,
            fontweight='bold', bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.7))

    hair_features = [
        (9.5, 4.8, '머리카락 질감', '#E3F2FD'),
        (9.5, 3.8, '헤어라인 모양', '#FFF3E0'),
        (9.5, 2.8, '두피-머리 경계', '#F3E5F5'),
        (9.5, 1.8, '전체 탈모 패턴', '#E8F5E9'),
    ]

    for x, y, text, color in hair_features:
        bbox = FancyBboxPatch((x-0.7, y-0.3), 1.4, 0.5,
                              boxstyle="round,pad=0.05",
                              facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(bbox)
        ax.text(x, y, text, ha='center', va='center', fontsize=11, fontweight='bold')

    # 하단 설명
    ax.text(6, 0.7, '💡 저수준 특징(Low-level Features)은 다양한 도메인에서 공통적으로 유용!',
            ha='center', fontsize=12, style='italic',
            bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8, pad=0.5))

    plt.tight_layout()
    filepath = os.path.join(output_dir, '07_transfer_learning.png')
    plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"✅ 생성 완료: {filepath}")


# ============================================================================
# 모든 이미지 생성 실행
# ============================================================================
if __name__ == '__main__':
    print("\n" + "="*60)
    print("Fine-tuning 시각화 이미지 생성 스크립트")
    print("="*60 + "\n")

    create_pipeline_image()
    create_channel_expansion_image()
    create_learning_rate_image()
    create_augmentation_image()
    create_comparison_image()
    create_schedule_image()
    create_transfer_learning_image()

    print("\n" + "="*60)
    print("모든 이미지 생성 완료!")
    print(f"저장 위치: {os.path.abspath(output_dir)}/")
    print("="*60)
    print("\n생성된 이미지:")
    print("  1. 01_pipeline.png - 전체 파이프라인")
    print("  2. 02_channel_expansion.png - 입력 채널 확장")
    print("  3. 03_learning_rate.png - 레이어별 학습률")
    print("  4. 04_augmentation.png - 데이터 증강")
    print("  5. 05_comparison.png - Fine-tuning vs From Scratch")
    print("  6. 06_schedule.png - 학습 스케줄")
    print("  7. 07_transfer_learning.png - Transfer Learning 효과")
    print("\n")
