"""
두 개의 Pinecone 인덱스에서 동일한 파일 패턴을 검색하고 삭제하는 통합 관리 스크립트
- hair-loss-rag-analyzer (1536차원)
- hair-loss-vit-s16 (384차원)
"""
import os
import sys
import numpy as np
import time
from typing import List, Dict, Any
from pathlib import Path
from datetime import datetime

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import Pinecone

class DualIndexVectorManager:
    """두 인덱스를 동시에 관리하는 벡터 매니저"""

    def __init__(self):
        self.api_key = os.getenv('PINECONE_API_KEY')
        if not self.api_key:
            raise ValueError("PINECONE_API_KEY가 설정되지 않았습니다.")

        self.pc = Pinecone(api_key=self.api_key)

        # 두 인덱스 초기화
        self.indexes = {
            'convnext': {
                'name': 'hair-loss-rag-analyzer',
                'dimension': 1536,
                'index': self.pc.Index("hair-loss-rag-analyzer")
            },
            'vit': {
                'name': 'hair-loss-vit-s16',
                'dimension': 384,
                'index': self.pc.Index("hair-loss-vit-s16")
            }
        }

    def get_both_index_stats(self) -> Dict:
        """두 인덱스의 통계 정보"""
        stats = {}
        for key, idx_info in self.indexes.items():
            try:
                index_stats = idx_info['index'].describe_index_stats()
                stats[key] = {
                    'name': idx_info['name'],
                    'dimension': idx_info['dimension'],
                    'total_vectors': index_stats.get('total_vector_count', 0),
                    'index_fullness': index_stats.get('index_fullness', 0)
                }
            except Exception as e:
                stats[key] = {'error': str(e)}
        return stats

    def search_patterns_in_both_indexes(self, patterns: List[str], max_vectors_per_index: int = 15000) -> Dict:
        """두 인덱스에서 패턴들을 검색"""
        results = {
            'convnext': {},
            'vit': {},
            'summary': {}
        }

        for idx_key, idx_info in self.indexes.items():
            print(f"\n=== {idx_info['name']} 인덱스에서 패턴 검색 중... ===")

            try:
                # 더미 벡터 생성
                dummy_vector = np.zeros(idx_info['dimension']).tolist()

                # 전체 벡터 수집
                all_matches = []
                batch_size = 10000

                for offset in range(0, max_vectors_per_index, batch_size):
                    print(f"배치 수집 중: {offset}~{offset+batch_size-1}")

                    query_results = idx_info['index'].query(
                        vector=dummy_vector,
                        top_k=batch_size,
                        include_metadata=True
                    )

                    current_matches = query_results.matches
                    if not current_matches:
                        break

                    all_matches.extend(current_matches)

                    if len(current_matches) < batch_size:
                        break

                print(f"수집된 총 벡터 수: {len(all_matches)}")

                # 각 패턴별 검색
                results[idx_key] = {}
                for pattern in patterns:
                    matching_vectors = []
                    unique_filenames = set()

                    for match in all_matches:
                        if match.metadata and match.metadata.get('filename'):
                            filename = match.metadata['filename']
                            if pattern in filename:
                                matching_vectors.append({
                                    'id': match.id,
                                    'filename': filename,
                                    'pointview': match.metadata.get('pointview'),
                                    'stage': match.metadata.get('stage')
                                })
                                unique_filenames.add(filename)

                    results[idx_key][pattern] = {
                        'vectors': matching_vectors,
                        'vector_count': len(matching_vectors),
                        'unique_files': list(unique_filenames),
                        'unique_file_count': len(unique_filenames)
                    }

                    print(f"패턴 '{pattern}': {len(matching_vectors)}개 벡터, {len(unique_filenames)}개 고유 파일")

            except Exception as e:
                print(f"{idx_info['name']} 검색 중 오류: {e}")
                results[idx_key] = {'error': str(e)}

        # 요약 정보 생성
        results['summary'] = self._generate_search_summary(results, patterns)
        return results

    def _generate_search_summary(self, results: Dict, patterns: List[str]) -> Dict:
        """검색 결과 요약 생성"""
        summary = {
            'total_patterns': len(patterns),
            'patterns': {},
            'total_vectors_to_delete': 0
        }

        for pattern in patterns:
            pattern_summary = {
                'convnext_vectors': 0,
                'vit_vectors': 0,
                'total_vectors': 0,
                'common_files': []
            }

            # ConvNeXt 결과
            if 'convnext' in results and pattern in results['convnext'] and 'vectors' in results['convnext'][pattern]:
                pattern_summary['convnext_vectors'] = results['convnext'][pattern]['vector_count']
                convnext_files = set(results['convnext'][pattern]['unique_files'])
            else:
                convnext_files = set()

            # ViT 결과
            if 'vit' in results and pattern in results['vit'] and 'vectors' in results['vit'][pattern]:
                pattern_summary['vit_vectors'] = results['vit'][pattern]['vector_count']
                vit_files = set(results['vit'][pattern]['unique_files'])
            else:
                vit_files = set()

            # 공통 파일 찾기
            pattern_summary['common_files'] = list(convnext_files.intersection(vit_files))
            pattern_summary['total_vectors'] = pattern_summary['convnext_vectors'] + pattern_summary['vit_vectors']

            summary['patterns'][pattern] = pattern_summary
            summary['total_vectors_to_delete'] += pattern_summary['total_vectors']

        return summary

    def delete_vectors_by_patterns(self, patterns: List[str], confirm_deletion: bool = False, dry_run: bool = True) -> Dict:
        """패턴별로 두 인덱스에서 벡터 삭제"""

        if not confirm_deletion and not dry_run:
            return {
                'error': 'confirm_deletion=True 또는 dry_run=True 중 하나는 설정되어야 합니다.',
                'deleted': False
            }

        # 먼저 검색 수행
        search_results = self.search_patterns_in_both_indexes(patterns)

        deletion_results = {
            'search_results': search_results,
            'deletion_log': [],
            'total_deleted': 0,
            'dry_run': dry_run,
            'timestamp': datetime.now().isoformat()
        }

        if dry_run:
            print("\n" + "="*60)
            print("DRY RUN 모드 - 실제 삭제는 수행하지 않습니다")
            print("="*60)

            # 삭제 예정 정보만 출력
            for idx_key in ['convnext', 'vit']:
                if idx_key not in search_results or 'error' in search_results[idx_key]:
                    continue

                idx_info = self.indexes[idx_key]
                print(f"\n[인덱스] {idx_info['name']} 인덱스 삭제 예정:")

                total_vectors_in_index = 0
                for pattern in patterns:
                    if pattern in search_results[idx_key]:
                        vector_count = search_results[idx_key][pattern]['vector_count']
                        total_vectors_in_index += vector_count

                        if vector_count > 0:
                            print(f"  - 패턴 '{pattern}': {vector_count}개 벡터")

                print(f"  [합계] 총 {total_vectors_in_index}개 벡터 삭제 예정")

            return deletion_results

        if not confirm_deletion:
            print("\n[경고] 실제 삭제를 수행하려면 confirm_deletion=True로 설정하세요.")
            return deletion_results

        # 실제 삭제 수행
        print("\n" + "="*60)
        print("실제 삭제 작업 시작")
        print("="*60)

        for idx_key in ['convnext', 'vit']:
            if idx_key not in search_results or 'error' in search_results[idx_key]:
                continue

            idx_info = self.indexes[idx_key]
            print(f"\n[삭제중] {idx_info['name']} 인덱스에서 삭제 중...")

            for pattern in patterns:
                if pattern in search_results[idx_key]:
                    vectors_to_delete = search_results[idx_key][pattern]['vectors']

                    if vectors_to_delete:
                        vector_ids = [v['id'] for v in vectors_to_delete]

                        try:
                            # 배치 삭제 수행
                            deletion_success = self._delete_vectors_batch(idx_info['index'], vector_ids, f"{idx_info['name']}-{pattern}")

                            if deletion_success:
                                deletion_results['total_deleted'] += len(vector_ids)
                                deletion_results['deletion_log'].append({
                                    'index': idx_info['name'],
                                    'pattern': pattern,
                                    'deleted_count': len(vector_ids),
                                    'success': True
                                })
                                print(f"  [성공] 패턴 '{pattern}': {len(vector_ids)}개 벡터 삭제 완료")
                            else:
                                deletion_results['deletion_log'].append({
                                    'index': idx_info['name'],
                                    'pattern': pattern,
                                    'deleted_count': 0,
                                    'success': False,
                                    'error': '배치 삭제 실패'
                                })
                                print(f"  [실패] 패턴 '{pattern}': 삭제 실패")

                        except Exception as e:
                            deletion_results['deletion_log'].append({
                                'index': idx_info['name'],
                                'pattern': pattern,
                                'deleted_count': 0,
                                'success': False,
                                'error': str(e)
                            })
                            print(f"  [오류] 패턴 '{pattern}': 삭제 중 오류 - {e}")

        return deletion_results

    def _delete_vectors_batch(self, index, vector_ids: List[str], batch_name: str, batch_size: int = 1000) -> bool:
        """배치 단위로 벡터 삭제"""
        try:
            total_deleted = 0

            for i in range(0, len(vector_ids), batch_size):
                batch_ids = vector_ids[i:i + batch_size]

                index.delete(ids=batch_ids)
                total_deleted += len(batch_ids)

                print(f"    [배치] {batch_name} 배치 삭제: {len(batch_ids)}개 ({total_deleted}/{len(vector_ids)})")

                # API 레이트 리미트 방지
                time.sleep(1)

            return True

        except Exception as e:
            print(f"    [실패] {batch_name} 배치 삭제 실패: {e}")
            return False

    def generate_deletion_report(self, deletion_results: Dict) -> str:
        """삭제 결과 리포트 생성"""
        report_lines = []
        report_lines.append("="*80)
        report_lines.append("PINECONE 벡터 삭제 리포트")
        report_lines.append("="*80)
        report_lines.append(f"실행 시간: {deletion_results.get('timestamp', 'N/A')}")
        report_lines.append(f"DRY RUN 모드: {'예' if deletion_results.get('dry_run', True) else '아니오'}")
        report_lines.append("")

        # 인덱스별 통계
        if 'search_results' in deletion_results:
            search_results = deletion_results['search_results']

            report_lines.append("인덱스별 통계:")
            for idx_key in ['convnext', 'vit']:
                if idx_key in search_results and 'error' not in search_results[idx_key]:
                    idx_info = self.indexes[idx_key]
                    report_lines.append(f"  - {idx_info['name']} ({idx_info['dimension']}차원)")

                    total_vectors = 0
                    for pattern_key in search_results[idx_key]:
                        if isinstance(search_results[idx_key][pattern_key], dict) and 'vector_count' in search_results[idx_key][pattern_key]:
                            count = search_results[idx_key][pattern_key]['vector_count']
                            total_vectors += count
                            if count > 0:
                                report_lines.append(f"    - {pattern_key}: {count}개 벡터")

                    report_lines.append(f"    [소계] {total_vectors}개 벡터")
                    report_lines.append("")

        # 요약 정보
        if 'summary' in deletion_results.get('search_results', {}):
            summary = deletion_results['search_results']['summary']
            report_lines.append("전체 요약:")
            report_lines.append(f"  - 검색된 패턴 수: {summary.get('total_patterns', 0)}")
            report_lines.append(f"  - 총 삭제 대상 벡터: {summary.get('total_vectors_to_delete', 0)}개")

            if deletion_results.get('dry_run', True):
                report_lines.append(f"  - 상태: 삭제 예정 (DRY RUN)")
            else:
                report_lines.append(f"  - 실제 삭제된 벡터: {deletion_results.get('total_deleted', 0)}개")
            report_lines.append("")

        # 패턴별 상세 정보
        if 'search_results' in deletion_results and 'summary' in deletion_results['search_results']:
            summary = deletion_results['search_results']['summary']
            if 'patterns' in summary:
                report_lines.append("패턴별 상세:")
                for pattern, pattern_info in summary['patterns'].items():
                    report_lines.append(f"  [패턴] {pattern}")
                    report_lines.append(f"    - ConvNeXt 인덱스: {pattern_info.get('convnext_vectors', 0)}개")
                    report_lines.append(f"    - ViT 인덱스: {pattern_info.get('vit_vectors', 0)}개")
                    report_lines.append(f"    - 총 벡터: {pattern_info.get('total_vectors', 0)}개")
                    report_lines.append(f"    - 공통 파일: {len(pattern_info.get('common_files', []))}개")
                    report_lines.append("")

        # 삭제 로그
        if 'deletion_log' in deletion_results and deletion_results['deletion_log']:
            report_lines.append("삭제 로그:")
            for log_entry in deletion_results['deletion_log']:
                status = "[성공]" if log_entry.get('success', False) else "[실패]"
                report_lines.append(f"  {status} {log_entry.get('index', 'Unknown')}: {log_entry.get('pattern', 'Unknown')} - {log_entry.get('deleted_count', 0)}개")
                if 'error' in log_entry:
                    report_lines.append(f"      오류: {log_entry['error']}")
            report_lines.append("")

        report_lines.append("="*80)

        return "\n".join(report_lines)

def main():
    """메인 실행 함수 - 사용 예시"""
    print("=== 이중 인덱스 벡터 관리 도구 ===")
    print("⚠️ 이 스크립트는 실행하지 마세요. 수정만 완료된 상태입니다.")
    print("")

    # 사용 예시 코드 (실행되지 않음)
    example_patterns = [
        "37-Back_jpg",
        "20231224152230NVMy5f",
        # "다른 패턴들을 여기에 추가..."
    ]

    print("📝 설정된 검색 패턴:")
    for i, pattern in enumerate(example_patterns, 1):
        print(f"  {i}. {pattern}")

    print("\n🚀 실행 방법:")
    print("manager = DualIndexVectorManager()")
    print("# DRY RUN (실제 삭제 안함)")
    print("results = manager.delete_vectors_by_patterns(patterns, dry_run=True)")
    print("print(manager.generate_deletion_report(results))")
    print("")
    print("# 실제 삭제 (신중하게!)")
    print("results = manager.delete_vectors_by_patterns(patterns, confirm_deletion=True, dry_run=False)")

if __name__ == "__main__":
    main()