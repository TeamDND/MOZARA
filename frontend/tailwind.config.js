/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind CSS 설정
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // src 폴더 내 모든 JS/TS 파일에서 클래스 검색
  ],
  theme: {
    extend: {
      // 커스텀 색상 정의
      colors: {
        primary: {
          DEFAULT: '#2563eb', // 기본 primary 색상
          foreground: '#ffffff', // primary 색상 위의 텍스트 색상
        },
        secondary: {
          DEFAULT: '#64748b', // 기본 secondary 색상
          foreground: '#ffffff', // secondary 색상 위의 텍스트 색상
        },
        destructive: {
          DEFAULT: '#ef4444', // 오류/삭제 색상
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#6b7280', // 흐린 텍스트 색상
          foreground: '#374151',
        },
        accent: {
          DEFAULT: '#f1f5f9', // 강조 색상
          foreground: '#0f172a',
        },
        background: '#ffffff', // 배경 색상
        foreground: '#0f172a', // 전경 텍스트 색상
      },
      // 커스텀 폰트 크기
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
}

