#!/usr/bin/env python3
"""
파일 카운팅 디버그 스크립트
"""

import os
import re
from pathlib import Path

TEST_ROOT = Path(r"C:\Users\301\Desktop\classification_test")

def collect_test_set_debug(root: Path):
    items = []
    if not root.exists():
        return items

    print(f"Scanning directory: {root}")

    for child in sorted(root.iterdir()):
        print(f"Found child: {child}")
        if not child.is_dir():
            print(f"  -> Skipping (not directory)")
            continue
        if child.name.lower().startswith("pick"):
            print(f"  -> Skipping (pick folder)")
            continue
        mm = re.search(r"level[_-]?(\d+)", child.name, re.IGNORECASE)
        if not mm:
            print(f"  -> Skipping (no level number)")
            continue
        st = int(mm.group(1))
        if not (2 <= st <= 7):
            print(f"  -> Skipping (level {st} not in 2-7)")
            continue

        print(f"  -> Processing level {st}")
        level_count = 0

        for ext in ("*.jpg","*.jpeg","*.png","*.JPG","*.JPEG","*.PNG"):
            files_for_ext = list(child.glob(ext))
            print(f"    Extension {ext}: {len(files_for_ext)} files")
            for fp in files_for_ext:
                if "pick" in fp.parts:
                    print(f"      -> Skipping {fp.name} (pick in path)")
                    continue
                items.append((fp, st))
                level_count += 1
                print(f"      -> Added {fp.name}")

        print(f"  -> Total for level {st}: {level_count} files")

    return items

def main():
    print("=== 파일 수집 디버그 ===")
    items = collect_test_set_debug(TEST_ROOT)

    print(f"\n=== 결과 요약 ===")
    print(f"총 수집된 파일: {len(items)}")

    # 레벨별 카운트
    level_counts = {}
    for fp, st in items:
        level_counts[st] = level_counts.get(st, 0) + 1

    for level in sorted(level_counts.keys()):
        print(f"Level {level}: {level_counts[level]}개")

if __name__ == "__main__":
    main()