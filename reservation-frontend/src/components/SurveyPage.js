// src/components/SurveyPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DynamicSurveyModal from './DynamicSurveyModal';
import { Card, Alert, Spinner } from 'react-bootstrap';
import useToast from './ui/useToast';

export default function SurveyPage() {
  const toast = useToast();
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [surveyConfig, setSurveyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // 載入問卷配置
    const loadSurveyConfig = async () => {
      try {
        const response = await fetch(`/api/surveys/public/${surveyId}`);
        const data = await response.json();
        const config = data?.survey;
        if (!response.ok || !config) {
          setError('找不到指定的問卷 / Survey not found');
          return;
        }
        const currentSemester = data?.meta?.currentSemester;
        setSurveyConfig({
          ...config,
          subtitle: currentSemester ? `目前學期：${currentSemester}` : '',
        });
      } catch (err) {
        setError('載入問卷配置失敗 / Failed to load survey configuration');
      } finally {
        setLoading(false);
      }
    };

    // 取得使用者資訊 - 從預約資料中取得學生資訊，如果沒有則提供空值讓問卷自行收集
    const loadUserInfo = () => {
      // 從 localStorage 取得學生預約時填寫的資料
      const studentId = localStorage.getItem('lastStudentId');
      const studentName = localStorage.getItem('lastStudentName');
      const studentEmail = localStorage.getItem('lastStudentEmail');
      
      // 如果沒有預約資料，提供空值讓問卷自行收集
      setUserInfo({
        studentId: studentId || '',
        studentName: studentName || '',
        studentEmail: studentEmail || ''
      });
    };

    // 檢查學生是否已填寫過問卷
    const checkSurveyStatus = async () => {
      try {
        const studentId = localStorage.getItem('lastStudentId');
        if (!studentId) return; // 沒有學號就不檢查

        const response = await fetch(`/api/surveys/check/${surveyId}/${studentId}`);
        const data = await response.json();
        
        if (data.filled) {
          setError('您本學期已填寫過此問卷，無需重複填寫。 / You have already filled out this survey this semester, no need to fill it out again.');
        }
      } catch (err) {
        console.log('Could not check survey status:', err);
        // 檢查失敗不影響問卷載入
      }
    };

    loadSurveyConfig();
    loadUserInfo();
    checkSurveyStatus();
  }, [surveyId]);

  const handleSurveyComplete = async () => {
    // 檢查是否有待完成的預約
    const pendingReservationStr = sessionStorage.getItem('pendingReservation');
    
    if (pendingReservationStr) {
      try {
        const pendingReservation = JSON.parse(pendingReservationStr);
        
        // 清除 sessionStorage 中的待完成預約資訊
        sessionStorage.removeItem('pendingReservation');

        // Phase 2.3：明確告知「中斷後已恢復」；後續成功會承接到預約成功畫面
        toast.info('你剛剛中斷的預約已恢復，系統正在為你完成原本的預約流程。');
        
        // 自動嘗試預約
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: pendingReservation.eventId,
            studentId: pendingReservation.studentId,
            studentName: pendingReservation.studentName,
            studentEmail: pendingReservation.studentEmail,
            eventType: pendingReservation.eventType
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // 預約成功：承接到 booking modal success state
          toast.success(`問卷已完成，預約成功：${pendingReservation.eventName}`);
          sessionStorage.setItem(
            'pendingReservationRecoveredSuccess',
            JSON.stringify({
              ...pendingReservation,
              // 建議欄位對齊 modal success view
              studentEmail: pendingReservation.studentEmail || '',
            })
          );
          navigate('/events?recovered=1');
        } else {
          // 預約失敗，顯示錯誤訊息
          toast.error(`問卷已完成，但預約失敗：${data.error || '未知錯誤'}`);
          navigate('/');
        }
      } catch (error) {
        console.error('自動預約失敗:', error);
        // 發生錯誤時，至少完成問卷並跳轉到首頁
        toast.warning('問卷已完成，但自動預約失敗；請回到活動列表手動預約。');
        navigate('/');
      }
    } else {
      // 沒有待完成的預約，直接跳轉到首頁
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <Card>
            <Card.Body className="text-center">
              <Spinner animation="border" className="mb-3" />
              <p>載入問卷中... / Loading survey...</p>
            </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // 檢查是否為已填寫過問卷的錯誤
    const isAlreadyFilled = error.includes('已填寫過此問卷') || error.includes('already filled out');
    
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <Alert variant={isAlreadyFilled ? "info" : "danger"}>
              <Alert.Heading>
                {isAlreadyFilled ? (
                  <>
                    <i className="fas fa-check-circle me-2"></i>
                    問卷已完成 / Survey Completed
                  </>
                ) : (
                  <>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    錯誤 / Error
                  </>
                )}
              </Alert.Heading>
              <p>{error}</p>
              {isAlreadyFilled && (
                <div className="mt-3">
                  <p className="mb-2">
                    <i className="fas fa-info-circle me-2"></i>
                    感謝您對本學期活動的參與！ / Thank you for your participation this semester!
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/')}
                  >
                    <i className="fas fa-home me-2"></i>
                    返回首頁 / Return to Home
                  </button>
                </div>
              )}
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (!surveyConfig) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <Alert variant="warning">
              <Alert.Heading>無法載入問卷 / Unable to Load Survey</Alert.Heading>
              <p>請檢查問卷ID或重新整理頁面 / Please check the survey ID or refresh the page</p>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <Card>
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-clipboard-list me-2"></i>
                {surveyConfig.title}
              </h4>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-4">{surveyConfig.description}</p>
              
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                <strong>填寫說明 / Instructions：</strong>
                <ul className="mb-0 mt-2">
                  <li>標示 <span className="text-danger">*</span> 的欄位為必填項目 / Fields marked with <span className="text-danger">*</span> are required</li>
                  <li>請仔細閱讀每個問題並誠實回答 / Please read each question carefully and answer honestly</li>
                  <li>填寫完成後請點擊「送出問卷」按鈕 / Click "Submit Survey" button when finished</li>
                </ul>
              </div>

              <div className="text-center">
                <DynamicSurveyModal
                  show={true}
                  onClose={() => navigate('/')}
                  onSurveyComplete={handleSurveyComplete}
                  userInfo={userInfo}
                  surveyConfig={surveyConfig}
                />
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
