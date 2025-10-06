/**
 * 날짜를 한국 형식으로 포맷팅 (YYYY.MM.DD)
 * @param date - 포맷팅할 날짜 문자열 또는 null
 * @returns 포맷팅된 날짜 문자열 또는 'N/A'
 */
export const formatKoreanDate = (date: string | null | undefined): string => {
  if (!date) return 'N/A';

  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\./g, '.').replace(/\s/g, '');
};
