/**
 * 이미지 파일 유효성 검사 유틸리티
 */

/**
 * 이미지 파일 유효성 검사
 * @param file - 검사할 이미지 파일
 * @returns { isValid: boolean, message?: string }
 */
export const validateImageFile = (file: File): { isValid: boolean; message?: string } => {
  // 파일 크기 검사 (10MB 제한)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return {
      isValid: false,
      message: '이미지 파일은 10MB 이하여야 합니다.'
    };
  }

  // 파일 형식 검사
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      message: 'JPEG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.'
    };
  }

  return { isValid: true };
};

