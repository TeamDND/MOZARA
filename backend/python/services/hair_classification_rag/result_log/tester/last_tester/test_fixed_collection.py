#!/usr/bin/env python3
"""
수정된 파일 수집 함수 테스트
"""

import re
from pathlib import Path

TEST_ROOT = Path(r"C:\Users\301\Desktop\classification_test")

def collect_test_set_fixed(root: Path):
    items = []
    seen_files = set()  # 중복 제거용
    if not root.exists():
        return items
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if child.name.lower().startswith("pick"):
            continue
        mm = re.search(r"level[_-]?(\d+)", child.name, re.IGNORECASE)
        if not mm:
            continue
        st = int(mm.group(1))
        if not (2 <= st <= 7):  # Only level 2-7
            continue
        print(f"Processing {child.name} (level {st})")
        level_count = 0
        # 모든 이미지 파일 찾기 (한 번에)
        for fp in child.iterdir():
            if fp.is_file() and fp.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                if "pick" in fp.parts:
                    continue
                # 중복 제거
                if fp not in seen_files:
                    seen_files.add(fp)
                    items.append((fp, st))
                    level_count += 1
        print(f"  -> {level_count} files added")
    return items

def main():
    print("=== 수정된 파일 수집 테스트 ===")
    items = collect_test_set_fixed(TEST_ROOT)

    print(f"\n총 수집된 파일: {len(items)}")

    # 레벨별 카운트
    level_counts = {}
    for fp, st in items:
        level_counts[st] = level_counts.get(st, 0) + 1

    for level in sorted(level_counts.keys()):
        print(f"Level {level}: {level_counts[level]}개")

if __name__ == "__main__":
    main()