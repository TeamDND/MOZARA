import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Camera } from 'lucide-react';
import { validateImageFile } from '../../utils/imageValidation';
import apiClient from '../../services/apiClient';

interface ImageUploadStepProps {
  uploadedPhoto: string | null;
  setUploadedPhoto: React.Dispatch<React.SetStateAction<string | null>>;
  setUploadedPhotoFile: React.Dispatch<React.SetStateAction<File | null>>;
  uploadedSidePhoto: string | null;
  setUploadedSidePhoto: React.Dispatch<React.SetStateAction<string | null>>;
  setUploadedSidePhotoFile: React.Dispatch<React.SetStateAction<File | null>>;
  gender?: string; // 성별 추가
  setUploadedPhotoUrl?: React.Dispatch<React.SetStateAction<string | null>>; // S3 URL 저장
  setUploadedSidePhotoUrl?: React.Dispatch<React.SetStateAction<string | null>>; // S3 URL 저장
}

const ImageUploadStep: React.FC<ImageUploadStepProps> = ({
  uploadedPhoto,
  setUploadedPhoto,
  setUploadedPhotoFile,
  uploadedSidePhoto,
  setUploadedSidePhoto,
  setUploadedSidePhotoFile,
  gender,
  setUploadedPhotoUrl,
  setUploadedSidePhotoUrl
}) => {
  // 남성인 경우에만 Side View 필요
  const isMale = gender === 'male';
  const user = useSelector((state: any) => state.user);

  const [isUploadingTop, setIsUploadingTop] = useState(false);
  const [isUploadingSide, setIsUploadingSide] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 유효성 검사
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.message);
        return;
      }

      // ✅ 이미지 타입 검증 (BiSeNet 귀 감지)
      try {
        setIsUploadingTop(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('image_type', 'top');

        const validateResponse = await fetch('http://localhost:8000/validate-image', {
          method: 'POST',
          body: formData,
        });

        const validateResult = await validateResponse.json();

        if (!validateResult.is_valid) {
          alert(validateResult.message);
          setIsUploadingTop(false);
          return;
        }
      } catch (error) {
        console.error('[이미지 검증 오류] Top 이미지:', error);
        // 검증 실패해도 업로드는 진행 (사용자 경험)
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPhoto(e.target?.result as string);
        setUploadedPhotoFile(file);
      };
      reader.readAsDataURL(file);

      // S3 업로드
      if (user?.username && setUploadedPhotoUrl) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('username', user.username);
          formData.append('viewType', 'top');

          const response = await apiClient.post('/images/upload/hair-loss', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (response.data.success) {
            setUploadedPhotoUrl(response.data.imageUrl);
          }
        } catch (error) {
          console.error('❌ Top View S3 업로드 실패:', error);
          alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        } finally {
          setIsUploadingTop(false);
        }
      } else {
        setIsUploadingTop(false);
      }
    }
  };

  const handleSidePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 유효성 검사
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.message);
        return;
      }

      // ✅ 이미지 타입 검증 (BiSeNet 귀 감지)
      try {
        setIsUploadingSide(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('image_type', 'side');

        const validateResponse = await fetch('http://localhost:8000/validate-image', {
          method: 'POST',
          body: formData,
        });

        const validateResult = await validateResponse.json();

        if (!validateResult.is_valid) {
          alert(validateResult.message);
          setIsUploadingSide(false);
          return;
        }
      } catch (error) {
        console.error('[이미지 검증 오류] Side 이미지:', error);
        // 검증 실패해도 업로드는 진행 (사용자 경험)
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedSidePhoto(e.target?.result as string);
        setUploadedSidePhotoFile(file);
      };
      reader.readAsDataURL(file);

      // S3 업로드
      if (user?.username && setUploadedSidePhotoUrl) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('username', user.username);
          formData.append('viewType', 'side');

          const response = await apiClient.post('/images/upload/hair-loss', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (response.data.success) {
            setUploadedSidePhotoUrl(response.data.imageUrl);
          }
        } catch (error) {
          console.error('❌ Side View S3 업로드 실패:', error);
          alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        } finally {
          setIsUploadingSide(false);
        }
      } else {
        setIsUploadingSide(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <Camera className="w-12 h-12 text-[#1f0101] mx-auto" />
        <h2 className="text-xl font-bold text-gray-800">AI 탈모 분석</h2>
        <p className="text-sm text-gray-600">
          두피와 탈모 상태를 AI가 객관적으로 분석해드려요
        </p>
      </div>

      <div className="space-y-6">
        {/* Top View - 머리 윗부분 사진 */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Top View - 머리 윗부분</h3>
            <p className="text-sm text-gray-600">
              정수리와 헤어라인이 잘 보이는 위에서 찍은 사진을 업로드해주세요
            </p>
          </div>
          
          {!uploadedPhoto ? (
            <div className="text-center space-y-4">
              {/* 샘플 이미지 - 성별에 따라 다른 이미지 표시 */}
              <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                <img
                  src={isMale ? "/assets/images/check/TopView.PNG" : "/assets/images/check/female-TopView.png"}
                  alt="Top View 샘플 이미지"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <Button 
                  type="button" 
                  onClick={() => document.getElementById('top-photo-upload')?.click()}
                  className="h-12 px-6 bg-[#1f0101] hover:bg-[#333333] text-white rounded-xl active:scale-[0.98]"
                >
                  Top View 사진 선택
                </Button>
                <Input
                  id="top-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200">
                <img 
                  src={uploadedPhoto} 
                  alt="업로드된 Top View 사진" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center gap-3">
                <Badge variant="secondary" className="px-3 py-1">
                  {isUploadingTop ? '⏳ S3 업로드 중...' : '✅ Top View 업로드 완료'}
                </Badge>
                <div>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-gray-50 px-3 py-1"
                    onClick={() => document.getElementById('top-photo-reupload')?.click()}
                  >
                    다시 선택
                  </Badge>
                  <Input
                    id="top-photo-reupload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side View - 머리 옆부분 사진 (남성만 표시) */}
        {isMale && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Side View - 머리 옆부분</h3>
            <p className="text-sm text-gray-600">
              머리 옆면과 헤어라인이 잘 보이는 측면 사진을 업로드해주세요
            </p>
          </div>
          
          {!uploadedSidePhoto ? (
            <div className="text-center space-y-4">
              {/* 샘플 이미지 */}
              <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                <img 
                  src="/assets/images/check/SideView.PNG" 
                  alt="Side View 샘플 이미지" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <Button 
                  type="button" 
                  onClick={() => document.getElementById('side-photo-upload')?.click()}
                  className="h-12 px-6 bg-[#1f0101] hover:bg-[#333333] text-white rounded-xl active:scale-[0.98]"
                >
                  Side View 사진 선택
                </Button>
                <Input
                  id="side-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSidePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200">
                <img 
                  src={uploadedSidePhoto} 
                  alt="업로드된 Side View 사진" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center gap-3">
                <Badge variant="secondary" className="px-3 py-1">
                  {isUploadingSide ? '⏳ S3 업로드 중...' : '✅ Side View 업로드 완료'}
                </Badge>
                <div>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-gray-50 px-3 py-1"
                    onClick={() => document.getElementById('side-photo-reupload')?.click()}
                  >
                    다시 선택
                  </Badge>
                  <Input
                    id="side-photo-reupload"
                    type="file"
                    accept="image/*"
                    onChange={handleSidePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        <div className="bg-gray-50 p-4 rounded-xl">
          <h4 className="font-semibold text-gray-800 mb-3">📸 탈모 분석 촬영 가이드</h4>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• 밝은 곳에서 촬영해주세요</li>
            <li>• 머리를 완전히 말린 상태로 촬영해주세요</li>
            <li>• 정수리와 헤어라인이 모두 보이도록 해주세요</li>
            <li>• 스타일링 제품 없이 자연스러운 상태로 촬영해주세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadStep;
