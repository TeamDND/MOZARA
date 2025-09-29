import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const fixedFolderPath = 'C:\\Users\\301\\Desktop\\hair_loss_rag\\hair_rag_dataset_image\\hair_rag_dataset_ragging';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/api/analysis/analyze-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('분석 실패:', error);
      setResult({ success: false, error: '분석 중 오류가 발생했습니다.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch('http://localhost:8000/api/analysis/add-folder-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_path: fixedFolderPath,
          recreate_index: true
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`데이터베이스 설정 완료! 총 ${data.total_embeddings}개의 이미지가 처리되었습니다.`);
      } else {
        alert('설정 실패: ' + (data.error || data.message));
      }
    } catch (error) {
      alert('설정 중 오류 발생: ' + error);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 헤더 */}
      <header className="header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: '#3b82f6',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              fontSize: '24px'
            }}>
              🧠
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Hair Loss RAG Analyzer
              </h1>
              <p style={{ margin: 0, color: '#6b7280' }}>
                AI 기반 탈모 단계 분석 시스템
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        <div className="grid grid-cols-3">
          {/* 왼쪽: 데이터베이스 설정 */}
          <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: '16px' }}>시스템 설정</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                설정된 데이터셋 경로:
              </label>
              <div style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                fontFamily: 'monospace'
              }}>
                {fixedFolderPath}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                <p style={{ margin: '4px 0', fontWeight: 'bold' }}>📁 필요한 폴더 구조:</p>
                <div style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                  hair_rag_dataset_ragging/<br/>
                  ├── level2/<br/>
                  │   ├── image1.jpg<br/>
                  │   └── image2.png<br/>
                  ├── level3/<br/>
                  ├── level4/<br/>
                  ├── level5/<br/>
                  ├── level6/<br/>
                  └── level7/
                </div>
                <p style={{ margin: '4px 0', fontSize: '11px', color: '#ef4444' }}>
                  ⚠️ 위 경로에 레벨별 폴더를 만들어 이미지를 넣어주세요!
                </p>
              </div>
            </div>

            <button
              onClick={handleSetup}
              disabled={isSettingUp}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {isSettingUp ? '설정 중...' : '데이터베이스 설정'}
            </button>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              처음 사용 시 데이터베이스를 설정해주세요 (수분 소요)
            </p>
          </div>

          {/* 오른쪽: 이미지 분석 */}
          <div>
            {/* 이미지 업로드 */}
            <div className="card">
              <h2 style={{ marginTop: 0, marginBottom: '16px' }}>이미지 분석</h2>

              <div style={{ marginBottom: '16px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ marginBottom: '8px' }}
                />
                {selectedFile && (
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    선택된 파일: {selectedFile.name}
                  </p>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {isAnalyzing ? '분석 중...' : '분석 시작'}
              </button>
            </div>

            {/* 로딩 */}
            {isAnalyzing && (
              <div className="card text-center">
                <div className="spinner"></div>
                <p style={{ marginTop: '16px' }}>이미지 분석 중...</p>
              </div>
            )}

            {/* 결과 */}
            {result && !isAnalyzing && (
              <div className="card">
                {result.success ? (
                  <div>
                    <h3 style={{ marginTop: 0, color: '#059669' }}>✅ 분석 완료</h3>

                    <div className={`result-stage stage-${result.predicted_stage}`}>
                      Level {result.predicted_stage}
                    </div>

                    <p><strong>설명:</strong> {result.stage_description}</p>
                    <p><strong>신뢰도:</strong> {(result.confidence * 100).toFixed(1)}%</p>

                    {result.stage_scores && (
                      <div style={{ marginTop: '16px' }}>
                        <h4>단계별 점수:</h4>
                        {Object.entries(result.stage_scores).map(([stage, score]: [string, any]) => (
                          <div key={stage} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px'
                          }}>
                            <span>Level {stage}</span>
                            <span>{(score * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 style={{ marginTop: 0, color: '#dc2626' }}>❌ 분석 실패</h3>
                    <p>{result.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* 안내 */}
            {!selectedFile && !isAnalyzing && !result && (
              <div className="card bg-blue-50 border-blue-200">
                <h3 style={{ marginTop: 0, color: '#2563eb' }}>💡 사용 방법</h3>
                <ol style={{ color: '#2563eb' }}>
                  <li>먼저 데이터베이스를 설정하세요</li>
                  <li>탈모 이미지를 선택하세요</li>
                  <li>분석 버튼을 클릭하세요</li>
                </ol>
                <p style={{ fontSize: '12px', marginBottom: 0 }}>
                  <strong>지원 형식:</strong> JPG, PNG, BMP<br/>
                  <strong>분석 단계:</strong> Level 2-7
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="footer text-center">
        <div className="container">
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Hair Loss RAG Analyzer v1.0 - Powered by Pinecone & CLIP
          </p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
            이 도구는 참고용으로만 사용하세요. 정확한 진단은 전문의와 상담하시기 바랍니다.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;