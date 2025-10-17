import matplotlib.pyplot as plt
from matplotlib import font_manager, rc
import pandas as pd

# ✅ 윈도우 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

# 데이터 정의
data = {
    '항목': ['파라미터', '블록 구성', 'GPU 추론'],
    'Swin-Tiny': ['28M', '[2, 2, 6, 2]', '약 0.5초'],
    'Swin-Small': ['50M', '[2, 2, 18, 2]', '약 1.5초']
}

# DataFrame 생성
df = pd.DataFrame(data)

# 테이블 스타일 설정
fig, ax = plt.subplots(figsize=(6, 2))
ax.axis('off')

# 표 만들기
table = ax.table(
    cellText=df.values,
    colLabels=df.columns,
    cellLoc='center',
    loc='center'
)

# 스타일 다듬기
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1.2, 1.8)

# 헤더 스타일 강조
for (row, col), cell in table.get_celld().items():
    cell.set_edgecolor("black")
    if row == 0:
        cell.set_text_props(weight='bold', color='white')
        cell.set_facecolor('#4A90E2')  # 파란색 헤더
    else:
        cell.set_facecolor('#F9F9F9' if row % 2 == 0 else '#FFFFFF')

# 제목 추가
plt.title('Swin Transformer 모델 비교', fontsize=14, fontweight='bold', pad=15)

# 저장
plt.tight_layout()
plt.savefig('Swin_Model_Table.png', dpi=300, bbox_inches='tight')
plt.show()
