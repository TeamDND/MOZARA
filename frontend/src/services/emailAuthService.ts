import apiClient from './apiClient';

export interface EmailAuthRequest {
  email: string;
  authCode?: string;
}

export interface EmailAuthResponse {
  success: boolean;
  message: string;
  remainingTime?: number;
}

export const emailAuthService = {
  // 인증코드 발송
  sendAuthCode: async (email: string): Promise<EmailAuthResponse> => {
    const response = await apiClient.post('/email-auth/send', { email });
    return response.data;
  },

  // 인증코드 검증
  verifyAuthCode: async (email: string, authCode: string): Promise<EmailAuthResponse> => {
    const response = await apiClient.post('/email-auth/verify', { 
      email, 
      authCode 
    });
    return response.data;
  },

  // 인증 상태 확인
  checkAuthStatus: async (email: string): Promise<EmailAuthResponse> => {
    const response = await apiClient.get(`/email-auth/status/${email}`);
    return response.data;
  }
};
