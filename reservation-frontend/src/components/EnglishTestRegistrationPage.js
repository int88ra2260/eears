// components/EnglishTestRegistrationPage.js
// 獨立的培力英檢報名頁面
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '../hooks/useMediaQuery';
import EnglishTestStep3Form from './EnglishTestStep3Form';
import EnglishTestDetailForm from './EnglishTestDetailForm';
import EnglishTestViewEditModal from './EnglishTestViewEditModal';
import useToast from './ui/useToast';
import useAlert from './ui/useAlert';

export default function EnglishTestRegistrationPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { alert } = useAlert();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 576px)');
  const [englishTestStep, setEnglishTestStep] = useState(0); // 0: 個資使用同意書, 1: 第一步驗證, 2: 步驟三, 3: 步驟四
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false); // 個資使用同意書勾選狀態
  const [englishTestForm, setEnglishTestForm] = useState({
    studentId: '',
    name: '',
    idNumber: ''
  });
  const [formErrors, setFormErrors] = useState({
    studentId: '',
    name: '',
    idNumber: ''
  });
  const [studentData, setStudentData] = useState(null); // 學生資料（用於步驟三和步驟四的初始資料）
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [showViewEditModal, setShowViewEditModal] = useState(false); // 檢視與修正 Modal
  const [existingRegistration, setExistingRegistration] = useState(null); // 現有報名資料
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(false);
  const [step3Data, setStep3Data] = useState(null); // 步驟三的資料
  const [registrationTab, setRegistrationTab] = useState('individual'); // 報名類型標籤：'individual' 個人報名（團體報名會直接導航到獨立頁面）
  const [registrationEnabled, setRegistrationEnabled] = useState(true); // 報名功能是否啟用（預設為啟用）
  const [isCheckingRegistrationStatus, setIsCheckingRegistrationStatus] = useState(true); // 檢查報名狀態中

  // 載入報名狀態（檢查後台開關）
  useEffect(() => {
    const loadRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/settings/english-test-registration-enabled');
        if (response.ok) {
          const data = await response.json();
          setRegistrationEnabled(data.enabled !== false); // 預設為 true
        } else {
          // 如果 API 失敗，預設為啟用以保持向後兼容
          setRegistrationEnabled(true);
        }
      } catch (error) {
        console.error('載入報名狀態錯誤:', error);
        // 發生錯誤時預設為啟用（向後兼容）
        setRegistrationEnabled(true);
      } finally {
        setIsCheckingRegistrationStatus(false);
      }
    };
    loadRegistrationStatus();
  }, []);

  // 驗證學號：B開頭 + 9位數字
  const validateStudentId = (studentId) => {
    const pattern = /^B\d{9}$/;
    if (!pattern.test(studentId)) {
      return '學號必須是字母B開頭加上9位數字（例如：B123456789）';
    }
    return '';
  };

  // 驗證姓名：必須是中文，且至少兩個中文字以上
  const validateName = (name) => {
    const chinesePattern = /^[\u4e00-\u9fa5]+$/;
    if (!chinesePattern.test(name)) {
      return '姓名必須是中文';
    }
    if (name.length < 2) {
      return '姓名必須至少兩個中文字以上';
    }
    return '';
  };

  // 驗證身分證字號：符合中華民國身分證字號編碼規則
  const validateIdNumber = (idNumber) => {
    // 基本格式：第一碼大寫英文字母（A-Z，包括I、O），第二碼性別碼（1或2），後8碼數字
    const pattern = /^[A-Z][12]\d{8}$/;
    if (!pattern.test(idNumber)) {
      return '身分證字號格式錯誤：第一碼必須為大寫英文字母（A-Z），第二碼為1或2，後8碼為數字';
    }

    // 檢查碼驗證
    // 台灣身分證字號字母對應表（根據官方驗證規則）
    // 轉換數值 (a1a2)：A=10, B=11, C=12, D=13, E=14, F=15, G=16, H=17,
    // I=34, J=18, K=19, L=20, M=21, N=22, O=35, P=23, Q=24, R=25, S=26, T=27, U=28, V=29,
    // W=32, X=30, Y=31, Z=33
    const letterMap = {
      'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17,
      'I': 34, 'J': 18, 'K': 19, 'L': 20, 'M': 21, 'N': 22, 'O': 35, 'P': 23, 'Q': 24, 'R': 25,
      'S': 26, 'T': 27, 'U': 28, 'V': 29, 'W': 32, 'X': 30, 'Y': 31, 'Z': 33
    };

    const firstLetter = idNumber.charAt(0);
    const letterValue = letterMap[firstLetter];
    
    if (!letterValue) {
      return '身分證字號第一碼無效';
    }

    // 將字母轉換為數字：十位數 + 個位數 * 9
    const letterNumber = Math.floor(letterValue / 10) + (letterValue % 10) * 9;
    
    // 第二到九位數字依序乘以 8,7,6,5,4,3,2,1
    let sum = letterNumber;
    for (let i = 1; i < 9; i++) {
      sum += parseInt(idNumber.charAt(i)) * (9 - i);
    }
    
    // 計算檢查碼
    const checkDigit = (10 - (sum % 10)) % 10;
    const lastDigit = parseInt(idNumber.charAt(9));
    
    if (checkDigit !== lastDigit) {
      return '身分證字號檢查碼錯誤';
    }
    
    return '';
  };

  // 關閉培力英檢報名視窗並重置所有狀態
  const handleCloseEnglishTestModal = () => {
    // 可以選擇返回首頁或關閉
    navigate('/');
  };

  // 處理個資使用同意書的下一步
  const handlePrivacyPolicyNext = () => {
    if (!agreedToPrivacyPolicy) {
      toast.warning('請先勾選同意個資使用同意書後才能繼續');
      return;
    }
    setEnglishTestStep(1);
  };

  // 查詢現有報名資料
  const handleViewEdit = async () => {
    // 先驗證表單
    const errors = {
      studentId: validateStudentId(englishTestForm.studentId),
      name: validateName(englishTestForm.name),
      idNumber: validateIdNumber(englishTestForm.idNumber)
    };

    setFormErrors(errors);

    if (errors.studentId || errors.name || errors.idNumber) {
      toast.warning('請修正表單錯誤後再查詢');
      return;
    }

    setIsLoadingRegistration(true);
    try {
      const response = await fetch('/api/english-test/registrations/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: englishTestForm.studentId,
          name: englishTestForm.name,
          idNumber: englishTestForm.idNumber
        })
      });

      const data = await response.json();

      if (response.ok && data.found) {
        setExistingRegistration(data.registration);
        setShowViewEditModal(true);
        // 提示訊息會在 Modal 中顯示
      } else {
        // 顯示更明確的錯誤訊息
        const errorMsg = data.error || '找不到報名資料';
        if (data.mismatchedFields && Array.isArray(data.mismatchedFields)) {
          await alert({
            title: '找不到報名資料',
            description: `${errorMsg}\n\n不正確的欄位：${data.mismatchedFields.join('、')}`,
            variant: 'warning',
          });
        } else {
          toast.warning(errorMsg);
        }
      }
    } catch (error) {
      console.error('查詢報名資料錯誤:', error);
      toast.error('查詢報名資料時發生錯誤，請稍後再試');
    } finally {
      setIsLoadingRegistration(false);
    }
  };

  const handleEnglishTestFormChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // 學號自動轉大寫（僅第一個字母）
    if (name === 'studentId' && value.length > 0) {
      processedValue = value.charAt(0).toUpperCase() + value.slice(1);
    }

    // 身分證字號自動轉大寫
    if (name === 'idNumber') {
      processedValue = value.toUpperCase();
    }

    setEnglishTestForm(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // 即時驗證
    let error = '';
    if (name === 'studentId' && processedValue) {
      error = validateStudentId(processedValue);
    } else if (name === 'name' && processedValue) {
      error = validateName(processedValue);
    } else if (name === 'idNumber' && processedValue) {
      error = validateIdNumber(processedValue);
    }

    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleEnglishTestSubmit = async (e) => {
    e.preventDefault();
    
    // 檢查報名功能是否啟用
    if (!registrationEnabled) {
      await alert({
        title: '報名已截止',
        description: '報名時間已截止，無法進行新報名。\n如需檢視或修正已報名資料，請使用「檢視與修正」功能。',
        variant: 'warning',
      });
      return;
    }
    
    // 進行完整驗證
    const errors = {
      studentId: validateStudentId(englishTestForm.studentId),
      name: validateName(englishTestForm.name),
      idNumber: validateIdNumber(englishTestForm.idNumber)
    };

    setFormErrors(errors);

    // 如果有任何錯誤，不提交
    if (errors.studentId || errors.name || errors.idNumber) {
      toast.warning('請修正表單錯誤後再提交');
      return;
    }

    // 先檢查是否已報名
    setIsLoadingStudent(true);
    try {
      // 先查詢是否已報名
      const registrationCheckResponse = await fetch('/api/english-test/registrations/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: englishTestForm.studentId,
          name: englishTestForm.name,
          idNumber: englishTestForm.idNumber
        })
      });

      // 處理 404 錯誤（API 不存在或路由問題）
      if (registrationCheckResponse.status === 404) {
        console.warn('查詢 API 不存在 (404)，跳過檢查直接進入下一步');
        // 如果 API 不存在，直接進入下一步（允許報名）
        setStudentData(null);
        setEnglishTestStep(2);
        setIsLoadingStudent(false);
        return;
      }

      let registrationCheckData;
      try {
        registrationCheckData = await registrationCheckResponse.json();
      } catch (jsonError) {
        console.error('解析回應 JSON 失敗:', jsonError);
        // 如果無法解析 JSON，可能是伺服器錯誤，但允許繼續報名
        setStudentData(null);
        setEnglishTestStep(2);
        setIsLoadingStudent(false);
        return;
      }

      // 如果已報名，阻止進入下一步，只能檢視與修正
      if (registrationCheckResponse.ok && registrationCheckData.found) {
        await alert({
          title: '不可重複報名',
          description: '您已經報名過培力英檢，無法重複報名。\n請使用「檢視與修正」功能來修改您的報名資料。',
          variant: 'info',
        });
        setIsLoadingStudent(false);
        return;
      }

      // 直接進入步驟三，不再查詢 Excel 資料
      setStudentData(null);
      setEnglishTestStep(2);
    } catch (error) {
      console.error('檢查報名狀態錯誤:', error);
      // 發生錯誤時，允許繼續報名（不阻擋用戶）
      console.warn('查詢報名狀態失敗，允許繼續報名流程');
      setStudentData(null);
      setEnglishTestStep(2);
    } finally {
      setIsLoadingStudent(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: 'url("/images/bg-pattern2.png")',
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        backgroundAttachment: 'fixed',
        padding: isSmallMobile ? '1rem 0.5rem' : isMobile ? '1.5rem 1rem' : '2rem 1rem',
      }}
    >
      {/* 自定義樣式 */}
      <style>
        {`
          .registration-page-container {
            max-width: ${englishTestStep === 1 ? '500px' : '900px'};
            width: 100%;
            margin: 0 auto;
          }
          
          .registration-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: ${isMobile ? '12px' : '16px'};
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            padding: ${isSmallMobile ? '1.25rem' : isMobile ? '1.5rem' : '2.5rem'};
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.8);
          }
          
          .registration-card:hover {
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
          }
          
          .step-indicator-container {
            display: flex;
            align-items: center;
            gap: ${isSmallMobile ? '0.25rem' : '0.5rem'};
            margin-bottom: ${isMobile ? '1.5rem' : '2rem'};
          }
          
          .step-bar {
            flex: 1;
            height: ${isSmallMobile ? '3px' : '4px'};
            border-radius: 2px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .step-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 100%;
            background: linear-gradient(90deg, #FF6B6B 0%, #FF8787 100%);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.5s ease;
          }
          
          .step-bar.active::after {
            transform: scaleX(1);
          }
          
          .step-number {
            margin-left: ${isSmallMobile ? '0.5rem' : '1rem'};
            font-size: ${isSmallMobile ? '0.75rem' : '0.875rem'};
            color: #666;
            font-weight: 600;
            white-space: nowrap;
          }
          
          .form-input {
            transition: all 0.3s ease;
            border: 2px solid #e0e0e0;
          }
          
          .form-input:focus {
            border-color: #FF6B6B;
            box-shadow: 0 0 0 0.2rem rgba(255, 107, 107, 0.25);
            outline: none;
          }
          
          .form-input.error {
            border-color: #dc3545;
            background-color: #fff5f5;
          }
          
          .btn-primary-custom {
            background: linear-gradient(135deg, #FF6B6B 0%, #FF8787 100%);
            border: none;
            color: white;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
          }
          
          .btn-primary-custom:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
            background: linear-gradient(135deg, #FF5252 0%, #FF6B6B 100%);
          }
          
          .btn-primary-custom:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .privacy-checkbox {
            padding: ${isMobile ? '1rem' : '1.5rem'};
            background: #f8f9fa;
            border-radius: 8px;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
          }
          
          .privacy-checkbox:hover {
            border-color: #FF6B6B;
            background: #fff5f5;
          }
          
          .privacy-image-container {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            overflow: hidden;
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
          }
          
          .privacy-image-container:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          
          @media (max-width: 576px) {
            .registration-page-container {
              max-width: 100%;
            }
            
            .step-number {
              display: none;
            }
          }
        `}
      </style>
      
      {/* 導覽列 */}
      <div className="container">
        <nav 
          className="d-flex align-items-center justify-content-end mb-4"
          style={{
            flexWrap: isSmallMobile ? 'wrap' : 'nowrap',
            gap: isSmallMobile ? '0.75rem' : '1rem'
          }}
        >
          <button
            onClick={() => navigate('/')}
            className="btn btn-outline-secondary"
            style={{
              padding: isSmallMobile ? '0.4rem 1rem' : '0.5rem 1.5rem',
              fontSize: isSmallMobile ? '0.875rem' : '1rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {isSmallMobile ? '← 返回' : '返回首頁'}
          </button>
        </nav>

        {/* 報名表單容器 */}
        <div className="registration-page-container">
          <div className="registration-card">
            <div 
              className="d-flex justify-content-between align-items-center mb-4"
              style={{
                flexWrap: isSmallMobile ? 'wrap' : 'nowrap',
                gap: isSmallMobile ? '0.75rem' : '1rem'
              }}
            >
              <h2
                className="mb-0"
                style={{
                  fontSize: isSmallMobile ? '1.25rem' : isMobile ? '1.5rem' : '1.75rem',
                  fontWeight: 'bold',
                  color: '#FF6B6B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flex: 1
                }}
              >
                <span style={{ fontSize: isSmallMobile ? '1.5rem' : '2rem' }}>🎓</span>
                <span>培力英檢報名</span>
              </h2>
              <button
                onClick={handleCloseEnglishTestModal}
                className="btn-close"
                aria-label="關閉"
                style={{
                  fontSize: isSmallMobile ? '1.25rem' : '1.5rem',
                  opacity: 0.6,
                  transition: 'opacity 0.3s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.6'}
              ></button>
            </div>

            {/* 步驟指示器 */}
            <div className="step-indicator-container">
              <div 
                className={`step-bar ${englishTestStep >= 0 ? 'active' : ''}`}
                style={{
                  backgroundColor: englishTestStep >= 0 ? '#FF6B6B' : '#e0e0e0'
                }}
              ></div>
              <div 
                className={`step-bar ${englishTestStep >= 1 ? 'active' : ''}`}
                style={{
                  backgroundColor: englishTestStep >= 1 ? '#FF6B6B' : '#e0e0e0'
                }}
              ></div>
              <div 
                className={`step-bar ${englishTestStep >= 2 ? 'active' : ''}`}
                style={{
                  backgroundColor: englishTestStep >= 2 ? '#FF6B6B' : '#e0e0e0'
                }}
              ></div>
              <div 
                className={`step-bar ${englishTestStep >= 3 ? 'active' : ''}`}
                style={{
                  backgroundColor: englishTestStep >= 3 ? '#FF6B6B' : '#e0e0e0'
                }}
              ></div>
              <span className="step-number">
                步驟 {englishTestStep + 1} / 4
              </span>
            </div>

            {/* 檢查報名狀態中 */}
            {isCheckingRegistrationStatus && (
              <div className="text-center py-5" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
                <div className="spinner-border text-primary" role="status" style={{ marginBottom: '1rem' }}>
                  <span className="visually-hidden">載入中...</span>
                </div>
                <p style={{ color: '#6c757d', fontSize: isSmallMobile ? '0.875rem' : '1rem' }}>正在檢查報名狀態...</p>
              </div>
            )}

            {/* 步驟 0：個資使用同意書 */}
            {!isCheckingRegistrationStatus && englishTestStep === 0 && (
            <div>
              <div className="mb-4">
                <h4 
                  className="mb-3" 
                  style={{ 
                    color: '#FF6B6B', 
                    fontWeight: 'bold',
                    fontSize: isSmallMobile ? '1.1rem' : isMobile ? '1.25rem' : '1.5rem'
                  }}
                >
                  個資使用同意書
                </h4>
                <p 
                  className="text-muted mb-4" 
                  style={{
                    fontSize: isSmallMobile ? '0.875rem' : isMobile ? '0.9375rem' : '1rem',
                    lineHeight: '1.6'
                  }}
                >
                  為配合政府個人資料保護法並確保考生的權益，請詳細閱讀下列個資使用同意書所載內容：
                </p>
                <div className="mb-4 privacy-image-container">
                  <img
                    src="/個資使用同意書.jpg"
                    alt="BESTEP培力英檢考生個資使用同意書"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                    onError={(e) => {
                      console.error('圖片載入失敗');
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'block';
                      }
                    }}
                  />
                  <div style={{ display: 'none', padding: '2rem', textAlign: 'center', color: '#999' }}>
                    圖片載入失敗，請重新整理頁面
                  </div>
                </div>
              </div>

              <div className="mb-4 privacy-checkbox">
                <div className="form-check" style={{ fontSize: isSmallMobile ? '0.9375rem' : '1rem' }}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="agreedToPrivacyPolicy"
                    checked={agreedToPrivacyPolicy}
                    onChange={(e) => setAgreedToPrivacyPolicy(e.target.checked)}
                    style={{
                      width: isSmallMobile ? '1.1rem' : '1.25rem',
                      height: isSmallMobile ? '1.1rem' : '1.25rem',
                      cursor: 'pointer',
                      marginTop: '0.25rem'
                    }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="agreedToPrivacyPolicy"
                    style={{
                      marginLeft: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      lineHeight: '1.5'
                    }}
                  >
                    本人已確實審閱並同意以上「BESTEP培力英檢考生個資使用同意書」內容。
                    <span style={{ color: '#dc3545' }}> *</span>
                  </label>
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-primary-custom"
                  onClick={handlePrivacyPolicyNext}
                  disabled={!agreedToPrivacyPolicy}
                  style={{
                    padding: isSmallMobile ? '0.625rem 1.5rem' : '0.75rem 2rem',
                    fontSize: isSmallMobile ? '0.9375rem' : '1rem',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    minWidth: isSmallMobile ? '100px' : '120px'
                  }}
                >
                  下一步 →
                </button>
              </div>
            </div>
          )}

          {/* 第一步：基本資料驗證（檢視與修正功能，不受報名截止時間限制） */}
          {!isCheckingRegistrationStatus && englishTestStep === 1 && (
            <div>
              {/* 標籤頁導航 */}
              <ul className="nav nav-tabs mb-4" role="tablist" style={{ borderBottom: '2px solid #dee2e6' }}>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${registrationTab === 'individual' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setRegistrationTab('individual')}
                    style={{
                      color: registrationTab === 'individual' ? '#FF6B6B' : '#6c757d',
                      borderBottom: registrationTab === 'individual' ? '2px solid #FF6B6B' : 'none',
                      fontWeight: registrationTab === 'individual' ? 'bold' : 'normal',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: registrationTab === 'individual' ? '2px solid #FF6B6B' : '2px solid transparent',
                      marginBottom: '-2px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    個人報名
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    type="button"
                    onClick={() => navigate('/register/english-test/group')}
                    style={{
                      color: '#6c757d',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '2px solid transparent',
                      marginBottom: '-2px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#FF6B6B';
                      e.target.style.borderBottomColor = '#FF6B6B';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#6c757d';
                      e.target.style.borderBottomColor = 'transparent';
                    }}
                  >
                    團體報名
                  </button>
                </li>
              </ul>

              {/* 標籤頁內容 */}
              <div className="tab-content">
                {/* 單獨報名標籤頁 */}
                {registrationTab === 'individual' && (
                  <form onSubmit={handleEnglishTestSubmit}>
              <div className="mb-4">
                <label 
                  htmlFor="studentId" 
                  className="form-label" 
                  style={{ 
                    fontWeight: 'bold', 
                    fontSize: isSmallMobile ? '0.9375rem' : '1.1rem',
                    color: '#333',
                    marginBottom: '0.5rem'
                  }}
                >
                  學號 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  className={`form-control form-input ${formErrors.studentId ? 'error' : ''}`}
                  id="studentId"
                  name="studentId"
                  value={englishTestForm.studentId}
                  onChange={handleEnglishTestFormChange}
                  required
                  placeholder="請輸入學號（例如：B123456789）"
                  maxLength="10"
                  style={{
                    fontSize: isSmallMobile ? '0.9375rem' : '1rem',
                    padding: isSmallMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                />
                {formErrors.studentId && (
                  <div className="text-danger mt-2" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>⚠️</span>
                    <span>{formErrors.studentId}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label 
                  htmlFor="name" 
                  className="form-label" 
                  style={{ 
                    fontWeight: 'bold', 
                    fontSize: isSmallMobile ? '0.9375rem' : '1.1rem',
                    color: '#333',
                    marginBottom: '0.5rem'
                  }}
                >
                  姓名 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  className={`form-control form-input ${formErrors.name ? 'error' : ''}`}
                  id="name"
                  name="name"
                  value={englishTestForm.name}
                  onChange={handleEnglishTestFormChange}
                  required
                  placeholder="請輸入中文姓名"
                  style={{
                    fontSize: isSmallMobile ? '0.9375rem' : '1rem',
                    padding: isSmallMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                />
                {formErrors.name && (
                  <div className="text-danger mt-2" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>⚠️</span>
                    <span>{formErrors.name}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label 
                  htmlFor="idNumber" 
                  className="form-label" 
                  style={{ 
                    fontWeight: 'bold', 
                    fontSize: isSmallMobile ? '0.9375rem' : '1.1rem',
                    color: '#333',
                    marginBottom: '0.5rem'
                  }}
                >
                  身分證字號 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  className={`form-control form-input ${formErrors.idNumber ? 'error' : ''}`}
                  id="idNumber"
                  name="idNumber"
                  value={englishTestForm.idNumber}
                  onChange={handleEnglishTestFormChange}
                  required
                  placeholder="請輸入身分證字號（例如：A123456789）"
                  maxLength="10"
                  style={{
                    fontSize: isSmallMobile ? '0.9375rem' : '1rem',
                    padding: isSmallMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.3s ease'
                  }}
                />
                {formErrors.idNumber && (
                  <div className="text-danger mt-2" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>⚠️</span>
                    <span>{formErrors.idNumber}</span>
                  </div>
                )}
              </div>

              <div 
                className="d-flex justify-content-between align-items-center"
                style={{
                  flexDirection: isSmallMobile ? 'column' : 'row',
                  gap: isSmallMobile ? '1rem' : '0.5rem',
                  flexWrap: 'wrap'
                }}
              >
                {/* 左下方：檢視與修正按鈕 */}
                <button
                  type="button"
                  className="btn btn-outline-info"
                  onClick={handleViewEdit}
                  disabled={isLoadingRegistration}
                  style={{
                    padding: isSmallMobile ? '0.625rem 1.25rem' : '0.625rem 1.5rem',
                    fontSize: isSmallMobile ? '0.875rem' : '1rem',
                    fontWeight: 'bold',
                    opacity: isLoadingRegistration ? 0.6 : 1,
                    borderRadius: '8px',
                    width: isSmallMobile ? '100%' : 'auto',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoadingRegistration) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {isLoadingRegistration ? '查詢中...' : '🔍 檢視與修正'}
                </button>

                {/* 右側：取消和下一步按鈕 */}
                <div 
                  className="d-flex gap-2"
                  style={{
                    width: isSmallMobile ? '100%' : 'auto'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseEnglishTestModal}
                    style={{
                      padding: isSmallMobile ? '0.625rem 1.25rem' : '0.625rem 1.5rem',
                      fontSize: isSmallMobile ? '0.875rem' : '1rem',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      flex: isSmallMobile ? 1 : 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary-custom"
                    disabled={isLoadingStudent || !registrationEnabled}
                    style={{
                      padding: isSmallMobile ? '0.625rem 1.25rem' : '0.625rem 1.5rem',
                      fontSize: isSmallMobile ? '0.875rem' : '1rem',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      flex: isSmallMobile ? 1 : 'none',
                      minWidth: isSmallMobile ? 'auto' : '120px',
                      opacity: (!registrationEnabled || isLoadingStudent) ? 0.6 : 1,
                      cursor: (!registrationEnabled || isLoadingStudent) ? 'not-allowed' : 'pointer'
                    }}
                    onClick={(e) => {
                      if (!registrationEnabled) {
                        e.preventDefault();
                        toast.warning('報名時間已截止，無法進行新報名（可使用「檢視與修正」）。');
                        return;
                      }
                    }}
                  >
                    {isLoadingStudent ? '檢查中...' : '下一步 →'}
                  </button>
                </div>
              </div>
            </form>
                )}
              </div>
            </div>
            )}

            {/* 檢視與修正 Modal */}
            {showViewEditModal && existingRegistration && (
              <EnglishTestViewEditModal
                registration={existingRegistration}
                basicInfo={englishTestForm}
                onClose={() => {
                  setShowViewEditModal(false);
                  setExistingRegistration(null);
                }}
                onUpdateSuccess={() => {
                  setShowViewEditModal(false);
                  setExistingRegistration(null);
                  toast.success('報名資料已更新成功！');
                }}
              />
            )}

            {/* 步驟三：英語能力與培力資格（需要檢查報名是否啟用） */}
            {!isCheckingRegistrationStatus && registrationEnabled && englishTestStep === 2 && (
            <EnglishTestStep3Form
              basicInfo={englishTestForm}
              initialData={studentData}
              onNext={(step3FormData) => {
                setStep3Data(step3FormData);
                setEnglishTestStep(3);
              }}
              onClose={handleCloseEnglishTestModal}
              onSubmitNonExam={async (nonExamData) => {
                // 處理「不報考」的情況：直接提交報名資料
                try {
                  const submitData = new FormData();
                  
                  // 基本資料
                  submitData.append('studentId', englishTestForm.studentId);
                  submitData.append('name', englishTestForm.name);
                  submitData.append('idNumber', englishTestForm.idNumber);
                  
                  // 步驟三的資料（不報考）
                  submitData.append('examType', nonExamData.examType);
                  submitData.append('hasCEFRB2', nonExamData.hasCEFRB2);
                  
                  // 其他必填欄位設為空或預設值
                  submitData.append('email', '');
                  submitData.append('studentNameZh', englishTestForm.name);
                  submitData.append('lastNameEn', '');
                  submitData.append('firstNameEn', '');
                  // birthDate 不傳遞，讓後端設為 null
                  submitData.append('phone', '');
                  submitData.append('postalCode', '');
                  submitData.append('city', '');
                  submitData.append('district', '');
                  submitData.append('address', '');
                  submitData.append('degreeLevel', '');
                  submitData.append('grade', '');
                  submitData.append('college', '');
                  submitData.append('department', '');
                  submitData.append('isLowIncome', '否');
                  submitData.append('hasDisabilityCard', '否');
                  submitData.append('disabilityTypes', JSON.stringify([]));
                  submitData.append('examAssistanceOptions', JSON.stringify([]));
                  submitData.append('examAssistanceOther', '');
                  submitData.append('agreedToTerms', 'true');
                  submitData.append('infoSource', '其他');
                  
                  // 如果 Q2=是，需要包含 Q3 和 Q4 的資料
                  if (nonExamData.hasCEFRB2 === '是') {
                    // Q3: 各項成績（只 append 一次，避免變成陣列）
                    submitData.append('listeningExamType', nonExamData.listeningExamType || '');
                    submitData.append('listeningScore', nonExamData.listeningScore || '');
                    submitData.append('readingExamType', nonExamData.readingExamType || '');
                    submitData.append('readingScore', nonExamData.readingScore || '');
                    submitData.append('speakingExamType', nonExamData.speakingExamType || '');
                    submitData.append('speakingScore', nonExamData.speakingScore || '');
                    submitData.append('writingExamType', nonExamData.writingExamType || '');
                    submitData.append('writingScore', nonExamData.writingScore || '');
                    // 上傳 B2 成績證明檔案
                    if (nonExamData.b2CertificateFiles && nonExamData.b2CertificateFiles.length > 0) {
                      nonExamData.b2CertificateFiles.forEach((file) => {
                        submitData.append('b2CertificateFiles', file);
                      });
                    }
                  } else {
                    // Q2=否時，Q3 和 Q4 為空
                    submitData.append('listeningExamType', '');
                    submitData.append('listeningScore', '');
                    submitData.append('readingExamType', '');
                    submitData.append('readingScore', '');
                    submitData.append('speakingExamType', '');
                    submitData.append('speakingScore', '');
                    submitData.append('writingExamType', '');
                    submitData.append('writingScore', '');
                  }

                  const response = await fetch('/api/english-test/register', {
                    method: 'POST',
                    body: submitData
                  });

                  const data = await response.json();

                  if (response.ok) {
                    // 在新標籤頁開啟成功頁面
                    // 使用 setTimeout 確保在用戶交互上下文中打開，避免被瀏覽器阻止
                    const successUrl = '/english-test-success.html';
                    setTimeout(() => {
                      const newWindow = window.open(successUrl, '_blank');
                      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                        // 如果彈窗被阻止，顯示提示訊息
                        toast.success('報名成功！若未自動開啟成功頁，請確認瀏覽器是否阻擋新分頁。');
                      }
                    }, 100);
                    // 關閉當前表單（回到首頁）
                    handleCloseEnglishTestModal();
                  } else {
                    toast.error(data.error || data.message || '提交失敗，請稍後再試');
                  }
                } catch (error) {
                  console.error('提交報名資料錯誤:', error);
                  toast.error('提交失敗，請稍後再試');
                }
              }}
            />
          )}

            {/* 步驟四：詳細報名表單（需要檢查報名是否啟用） */}
            {!isCheckingRegistrationStatus && registrationEnabled && englishTestStep === 3 && (
              <EnglishTestDetailForm
                initialData={studentData}
                basicInfo={englishTestForm}
                step3Data={step3Data}
                onBack={() => setEnglishTestStep(2)}
                onClose={handleCloseEnglishTestModal}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
