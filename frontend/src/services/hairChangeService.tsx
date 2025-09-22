import React from 'react';
import apiClient from '../services/apiClient';
import Header from '../pages/Header';
import Footer from '../pages/Footer';

export interface HairChangeRequest {
  image: File;
  hairstyle: string;
  customPrompt?: string;
}

export interface HairChangeResponse {
  result: string;
  images: Array<{
    data: string;
    mime_type: string;
  }>;
  message: string;
}

export interface Hairstyle {
  [key: string]: string;
}

class HairChangeService {
  private baseUrl = 'ai/hair-change';
  
  /**
   * Header와 Footer를 포함한 레이아웃 컴포넌트
   */
  renderWithLayout(children: React.ReactNode): React.ReactElement {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  async generateHairstyle(request: HairChangeRequest): Promise<HairChangeResponse> {
    const formData = new FormData();
    formData.append('image', request.image);
    formData.append('hairstyle', request.hairstyle);
    
    if (request.customPrompt) {
      formData.append('customPrompt', request.customPrompt);
    }

    const response = await apiClient.post<HairChangeResponse>(
      `${this.baseUrl}/generate`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2분 타임아웃
      }
    );

    return response.data;
  }

  async getHairstyles(): Promise<Hairstyle> {
    const response = await apiClient.get<Hairstyle>(`${this.baseUrl}/hairstyles`);
    return response.data;
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await apiClient.get<{ status: string; service: string }>(`${this.baseUrl}/health`);
    return response.data;
  }
}

export const hairChangeService = new HairChangeService();
