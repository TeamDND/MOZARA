import React from 'react';
import { User, Users, Star } from 'lucide-react';

// TypeScript: UserProfile 컴포넌트 타입 정의
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
}

interface UserProfileProps {
  userInfo: UserInfo;
  loading: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ userInfo, loading }) => {
  return (
    <div className="px-4 py-6 bg-white">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
          <User className="h-8 w-8 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{userInfo.name}</h2>
          <p className="text-sm text-gray-500 mb-2">가입일: {userInfo.joinDate}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {loading ? "로딩 중..." : `${userInfo.totalAnalysis}회 분석`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium text-gray-700">{userInfo.satisfaction} 만족도</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
