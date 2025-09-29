import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { User, Activity } from 'lucide-react';

// TypeScript: UserInfoEdit 컴포넌트 타입 정의
interface UserInfo {
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  totalAnalysis: number;
  satisfaction: number;
  address: string;
  gender: string;
  age: number;
  role: string;
  recentHairLoss: boolean;
  familyHistory: boolean;
}

interface UserInfoEditProps {
  userInfo: UserInfo;
}

const UserInfoEdit: React.FC<UserInfoEditProps> = ({ userInfo }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'analysis'>('basic');

  const renderBasicInfo = () => (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-gray-900">기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">이름</label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.name}</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">이메일</label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.email}</div>
        </div>

        

        <Button className="w-full mt-6 bg-[#222222] hover:bg-[#333333] text-white py-3 rounded-xl font-medium">
          정보 수정하기
        </Button>
      </CardContent>
    </Card>
  );

  const renderAnalysisInfo = () => (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-gray-900">분석 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">성별</label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.gender}</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">나이</label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.age > 0 ? `${userInfo.age}세` : "나이 정보 없음"}</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">최근 머리빠짐</label>
          <div className={`p-3 rounded-lg text-sm font-medium ${
            userInfo.recentHairLoss 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-gray-50 text-gray-800 border border-gray-200'
          }`}>
            {userInfo.recentHairLoss ? '예' : '아니오'}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">가족력</label>
          <div className={`p-3 rounded-lg text-sm font-medium ${
            userInfo.familyHistory 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-gray-50 text-gray-800 border border-gray-200'
          }`}>
            {userInfo.familyHistory ? '예' : '아니오'}
          </div>
        </div>

        <Button className="w-full mt-6 bg-[#222222] hover:bg-[#333333] text-white py-3 rounded-xl font-medium">
          분석 정보 수정하기
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 px-1">회원정보 수정</h3>

      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'basic'
              ? 'border-[#222222] text-[#222222]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <User className="h-4 w-4" />
            기본정보
          </div>
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'analysis'
              ? 'border-[#222222] text-[#222222]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Activity className="h-4 w-4" />
            분석정보
          </div>
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="min-h-[200px]">
        {activeTab === 'basic' ? renderBasicInfo() : renderAnalysisInfo()}
      </div>

      {/* 계정 관리 섹션 (공통) */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-gray-900">계정 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            비밀번호 변경
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            알림 설정
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 bg-white border-gray-200 hover:bg-red-50 rounded-lg"
          >
            회원 탈퇴
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserInfoEdit;
