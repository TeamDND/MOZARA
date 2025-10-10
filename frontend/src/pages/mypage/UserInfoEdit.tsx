import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { User, Activity } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../utils/store';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../../utils/tokenSlice';
import { clearUser } from '../../utils/userSlice';

// TypeScript: UserInfoEdit 컴포넌트 타입 정의
interface UserInfo {
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  totalAnalysis: number;
  satisfaction: number;
  gender: string;
  age: number;
  role: string;
  recentHairLoss: boolean; // true/false
  familyHistory: boolean | string; // boolean (구버전) 또는 string (신버전: 'both', 'father', 'mother', 'none')
  stress?: string; // 스트레스 수준 (low, medium, high)
}

interface UserInfoEditProps {
  userInfo: UserInfo;
  initialTab?: 'basic' | 'analysis';
  onInfoUpdated?: () => void; // 정보 업데이트 시 호출될 콜백
}

const UserInfoEdit: React.FC<UserInfoEditProps> = ({ userInfo, initialTab = 'basic', onInfoUpdated }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'analysis'>(initialTab);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux에서 username 가져오기
  const username = useSelector((state: RootState) => state.user.username);

  // 기본 정보 상태
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // 분석 정보 상태
  const [gender, setGender] = useState("");
  const [age, setAge] = useState<string>(""); // string으로 변경하여 빈 값 허용
  const [recentHairLoss, setRecentHairLoss] = useState(false);
  const [familyHistory, setFamilyHistory] = useState<string>('none');
  const [stress, setStress] = useState<string>(""); // 스트레스 수준 추가

  // 비밀번호 변경 상태
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // userInfo 변경 시 상태 업데이트
  useEffect(() => {
    if (userInfo) {
      setName(userInfo.name || "");
      setEmail(userInfo.email || "");

      // 한글 성별을 영어로 변환 (하위 호환성)
      let genderValue = userInfo.gender || "";
      if (genderValue === "남" || genderValue === "남성") {
        genderValue = "male";
      } else if (genderValue === "여" || genderValue === "여성") {
        genderValue = "female";
      }
      setGender(genderValue);

      setAge(userInfo.age ? String(userInfo.age) : "");
      setRecentHairLoss(userInfo.recentHairLoss || false);

      // familyHistory 변환: boolean -> string
      if (typeof userInfo.familyHistory === 'boolean') {
        setFamilyHistory(userInfo.familyHistory ? 'father' : 'none');
      } else {
        setFamilyHistory(userInfo.familyHistory || 'none');
      }

      setStress(userInfo.stress || "");
    }
  }, [userInfo]);

  // 기본 정보 수정 핸들러
  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert("이메일을 입력해주세요.");
      return;
    }

    if (userInfo.name === name && userInfo.email === email) {
      alert("변경된 내용이 없습니다.");
      return;
    }

    try {
      const res = await apiClient.put(`/userinfo/basic/${username}`, {
        email,
        nickname: name // UserBasicInfoDTO는 nickname 필드 사용
      });

      if (res?.data) {
        alert('정보가 수정되었습니다.');
        // 필요시 페이지 새로고침 또는 상태 업데이트
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error || "정보 수정 중 오류가 발생했습니다.";
      alert(errorMessage);
    }
  };

  // 분석 정보 수정 핸들러
  const handleAnalysisInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 나이 유효성 검사
    if (!age || age.trim() === "") {
      alert("나이를 입력해주세요.");
      return;
    }

    const ageNumber = parseInt(age);
    if (isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 150) {
      alert("올바른 나이를 입력해주세요. (1-150)");
      return;
    }

    // familyHistory 비교를 위한 정규화
    const normalizedOldFamilyHistory = typeof userInfo.familyHistory === 'boolean'
      ? (userInfo.familyHistory ? 'father' : 'none')
      : userInfo.familyHistory;

    if (userInfo.gender === gender && userInfo.age === ageNumber &&
        userInfo.recentHairLoss === recentHairLoss && normalizedOldFamilyHistory === familyHistory &&
        userInfo.stress === stress) {
      alert("변경된 내용이 없습니다.");
      return;
    }

    try {
      const res = await apiClient.put(`/userinfo/${username}`, {
        gender,
        age: ageNumber,
        isLoss: recentHairLoss,
        familyHistory,  // 'none', 'father', 'mother', 'both'
        stress: stress || null
      });

      if (res?.data) {
        alert('정보가 수정되었습니다.');
        // 부모 컴포넌트에 업데이트 알림
        if (onInfoUpdated) {
          onInfoUpdated();
        }
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error || "정보 수정 중 오류가 발생했습니다.";
      alert(errorMessage);
    }
  };

  // 비밀번호 변경 토글
  const togglePasswordChange = () => {
    setShowPasswordChange(!showPasswordChange);
    setCurrentPassword("");
    setIsPasswordVerified(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  // 현재 비밀번호 확인 핸들러
  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      alert("현재 비밀번호를 입력해주세요.");
      return;
    }

    try {
      const res = await apiClient.post(`/verify-password/${username}`, currentPassword, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      const isValid = res?.data?.valid;
      if (isValid) {
        setIsPasswordVerified(true);
        alert("비밀번호가 확인되었습니다.");
      } else {
        alert("현재 비밀번호가 일치하지 않습니다.");
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error || "비밀번호 확인 중 오류가 발생했습니다.";
      alert(errorMessage);
    }
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 8) {
      alert("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    try {
      const res = await apiClient.put(`/password/reset/${username}?password=${newPassword}`);

      if (res?.data) {
        alert('비밀번호가 변경되었습니다.');
        setShowPasswordChange(false);
        setCurrentPassword("");
        setIsPasswordVerified(false);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error || "비밀번호 변경 중 오류가 발생했습니다.";
      alert(errorMessage);
    }
  };

  // 회원 탈퇴 핸들러
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.");

    if (!confirmDelete) {
      return;
    }

    const doubleConfirm = window.confirm("모든 데이터가 삭제됩니다. 정말 진행하시겠습니까?");

    if (!doubleConfirm) {
      return;
    }

    try {
      const res = await apiClient.delete(`/delete-member/${username}`);

      if (res?.data) {
        alert('회원 탈퇴가 완료되었습니다.');

        // Redux 상태 초기화
        dispatch(clearToken());
        dispatch(clearUser());

        // localStorage 초기화
        localStorage.clear();

        // 메인 페이지로 이동
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error || "회원 탈퇴 중 오류가 발생했습니다.";
      alert(errorMessage);
    }
  };

  const renderBasicInfo = () => (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-gray-900">기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">닉네임</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-lg text-sm text-gray-900 border border-gray-200 focus:border-[#1f0101] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-lg text-sm text-gray-900 border border-gray-200 focus:border-[#1f0101] focus:outline-none"
            />
          </div>

          <Button type="submit" className="w-full mt-6 bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium">
            정보 수정하기
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderAnalysisInfo = () => {
    // 분석 정보가 없는지 확인 (gender가 없거나 age가 0이면 데이터 없음으로 간주)
    const hasAnalysisData = userInfo.gender && userInfo.age > 0;

    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-gray-900">분석 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAnalysisData ? (
            // 데이터가 없을 때 표시
            <div className="text-center py-8 space-y-4">
              <div className="text-gray-600 text-sm">
                분석 실행이 먼저 필요합니다.
              </div>
              <Button
                onClick={() => navigate('/integrated-diagnosis')}
                className="bg-[#1f0101] hover:bg-[#333333] text-white px-6 py-2 rounded-lg font-medium"
              >
                분석 바로가기
              </Button>
            </div>
          ) : (
            // 데이터가 있을 때 수정 폼 표시
            <form onSubmit={handleAnalysisInfoSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">성별</label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setGender("male")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  gender === "male" || gender === "남" || gender === "남성"
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                남
              </Button>
              <Button
                type="button"
                onClick={() => setGender("female")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  gender === "female" || gender === "여" || gender === "여성"
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                여
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">나이</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="나이를 입력하세요"
              min="1"
              max="150"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm text-gray-900 border border-gray-200 focus:border-[#1f0101] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">최근 머리빠짐</label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setRecentHairLoss(true)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  recentHairLoss
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                예
              </Button>
              <Button
                type="button"
                onClick={() => setRecentHairLoss(false)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  !recentHairLoss
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                아니오
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">가족력</label>
            <p className="text-xs text-gray-500">부계 유전 62.8%, 모계 8.6% (PLOS One 2024)</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => setFamilyHistory('both')}
                className={`py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  familyHistory === 'both'
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                부모 모두
              </Button>
              <Button
                type="button"
                onClick={() => setFamilyHistory('father')}
                className={`py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  familyHistory === 'father'
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                아버지 쪽
              </Button>
              <Button
                type="button"
                onClick={() => setFamilyHistory('mother')}
                className={`py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  familyHistory === 'mother'
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                어머니 쪽
              </Button>
              <Button
                type="button"
                onClick={() => setFamilyHistory('none')}
                className={`py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  familyHistory === 'none'
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                없음
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">스트레스 수준</label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setStress("high")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  stress === "high"
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                높음
              </Button>
              <Button
                type="button"
                onClick={() => setStress("medium")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  stress === "medium"
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                보통
              </Button>
              <Button
                type="button"
                onClick={() => setStress("low")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
                  stress === "low"
                    ? "bg-[#1f0101] text-white hover:bg-[#333333] scale-105 shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }`}
              >
                낮음
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-6 bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium">
            분석 정보 수정하기
          </Button>
        </form>
          )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 px-1">회원정보 수정</h3>

      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'basic'
              ? 'border-[#1f0101] text-[#1f0101]'
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
              ? 'border-[#1f0101] text-[#1f0101]'
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
            onClick={togglePasswordChange}
            className="w-full justify-start bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            비밀번호 변경
          </Button>

          {/* 비밀번호 변경 폼 */}
          {showPasswordChange && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg mt-3">
              {/* 1단계: 현재 비밀번호 확인 */}
              {!isPasswordVerified ? (
                <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-3 bg-white rounded-lg text-sm text-gray-900 border border-gray-200 focus:border-[#1f0101] focus:outline-none"
                      placeholder="현재 비밀번호를 입력하세요"
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button type="submit" className="bg-[#1f0101] hover:bg-[#333333] text-white px-8 py-2 rounded-lg font-medium">
                      확인
                    </Button>
                  </div>
                </form>
              ) : (
                /* 2단계: 새 비밀번호 입력 */
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">새 비밀번호</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-3 bg-white rounded-lg text-sm text-gray-900 border border-gray-200 focus:border-[#1f0101] focus:outline-none"
                      placeholder="8자 이상 입력"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">비밀번호 재확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 bg-white rounded-lg text-sm text-gray-900 border border-gray-200 focus:border-[#1f0101] focus:outline-none"
                      placeholder="비밀번호 재입력"
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button type="submit" className="bg-[#1f0101] hover:bg-[#333333] text-white px-8 py-2 rounded-lg font-medium">
                      수정
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full justify-start bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            알림 설정
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteAccount}
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
