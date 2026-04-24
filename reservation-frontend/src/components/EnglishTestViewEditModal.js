// components/EnglishTestViewEditModal.js
import React, { useState, useEffect, useRef } from 'react';
import { getCityDistrictByPostalCode } from '../utils/postalCodeMap';

export default function EnglishTestViewEditModal({ registration, basicInfo, onClose, onUpdateSuccess }) {
  // 檢查是否為不可編輯狀態（已通過、報名成功、報名失敗都只能檢視不能修正）
  const cannotEdit = ['approved', 'success', 'failed'].includes(registration.status);
  
  // 根據狀態顯示不同的提示訊息
  const getStatusMessage = () => {
    switch (registration.status) {
      case 'approved':
      case 'success':
        return '你的基本資料已經通過審查，是否報名成功仍以信件通知為準，若是想要修改報考項目或是補照片請聯繫全英語卓越教學中心';
      case 'failed':
        return '此報名已失敗，無法進行修改。如有疑問請聯繫全英語卓越教學中心';
      default:
        return '';
    }
  };
  
  const [formData, setFormData] = useState({
    registrationId: registration.id,
    studentId: registration.studentId,
    name: registration.name,
    idNumber: registration.idNumber,
    // Q1-Q5: 基本聯絡資訊
    email: registration.email || '',
    studentNameZh: registration.studentNameZh || registration.name || '',
    lastNameEn: registration.lastNameEn || '',
    firstNameEn: registration.firstNameEn || '',
    birthDate: registration.birthDate || '',
    // Q6-Q13: 身分與學籍資料
    nationalId: registration.nationalId || registration.idNumber || '',
    phone: registration.phone || '',
    postalCode: registration.postalCode || '',
    city: registration.city || '',
    district: registration.district || '',
    address: registration.address || '',
    degreeLevel: registration.degreeLevel || '',
    grade: registration.grade || '',
    college: registration.college || '',
    department: registration.department || '',
    // Q14-Q18: 特殊身分與協助需求
    isLowIncome: registration.isLowIncome || '否',
    hasDisabilityCard: registration.hasDisabilityCard || '否',
    disabilityTypes: registration.disabilityTypes || [],
    disabilityCertFront: null,
    disabilityCertBack: null,
    examAssistanceOptions: registration.examAssistanceOptions || [],
    examAssistanceOther: registration.examAssistanceOther || '',
    // Q19-Q21: 照片與同意事項
    idPhoto: null,
    agreedToTerms: registration.agreedToTerms || false,
    infoSource: registration.infoSource || ''
  });

  const [fileInputs, setFileInputs] = useState({
    idPhoto: null,
    disabilityCertFront: null,
    disabilityCertBack: null
  });

  // 預覽圖片 URL
  const [previewUrls, setPreviewUrls] = useState({
    idPhoto: null,
    disabilityCertFront: null,
    disabilityCertBack: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 為每個欄位創建 ref，用於自動跳轉
  const fieldRefs = useRef({});
  
  // 獲取欄位的 ref
  const getFieldRef = (fieldName) => {
    if (!fieldRefs.current[fieldName]) {
      fieldRefs.current[fieldName] = React.createRef();
    }
    return fieldRefs.current[fieldName];
  };

  const handleChange = (e) => {
    // 如果狀態為已通過、報名成功或報名失敗，不允許修改
    if (cannotEdit) {
      return;
    }
    
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'agreedToTerms') {
        setFormData(prev => ({ ...prev, [name]: checked }));
      } else {
        // 處理複選框（如 disabilityTypes, examAssistanceOptions 等）
        setFormData(prev => {
          const currentArray = prev[name] || [];
          if (checked) {
            return { ...prev, [name]: [...currentArray, value] };
          } else {
            return { ...prev, [name]: currentArray.filter(item => item !== value) };
          }
        });
      }
    } else {
      // 如果是郵遞區號欄位，自動填入縣市和行政區
      if (name === 'postalCode') {
        setFormData(prev => {
          const newData = { ...prev, [name]: value };
          
          // 當郵遞區號為 3 碼時，查詢對應的縣市和行政區
          if (value && value.length === 3) {
            const location = getCityDistrictByPostalCode(value);
            if (location) {
              newData.city = location.city;
              newData.district = location.district;
              
              // 清除縣市和行政區的錯誤（如果有的話）
              setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.city;
                delete newErrors.district;
                return newErrors;
              });
            }
          }
          
          return newData;
        });
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
    
    // 清除該欄位的錯誤
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e) => {
    // 如果狀態為已通過、報名成功或報名失敗，不允許修改
    if (cannotEdit) {
      return;
    }
    
    const { name } = e.target;
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [name]: file }));
      setFileInputs(prev => ({ ...prev, [name]: file }));
      
      // 如果是圖片檔案，創建預覽 URL
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setPreviewUrls(prev => {
          // 釋放舊的預覽 URL（如果有）
          if (prev[name]) {
            URL.revokeObjectURL(prev[name]);
          }
          return { ...prev, [name]: previewUrl };
        });
      } else {
        // 非圖片檔案（如 PDF），清除預覽
        setPreviewUrls(prev => {
          if (prev[name]) {
            URL.revokeObjectURL(prev[name]);
          }
          return { ...prev, [name]: null };
        });
      }
    }
  };
  
  // 清理預覽 URL（組件卸載時）
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  const validateForm = () => {
    const newErrors = {};
    const errorOrder = []; // 記錄錯誤順序，用於跳轉到第一個錯誤

    // Q1: Email 必填且格式驗證
    if (!formData.email) {
      newErrors.email = '請填寫電子郵件';
      errorOrder.push('email');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '電子郵件格式不正確';
      if (!errorOrder.includes('email')) errorOrder.push('email');
    }

    // Q2: 中文姓名必填
    if (!formData.studentNameZh) {
      newErrors.studentNameZh = '請填寫中文姓名';
      errorOrder.push('studentNameZh');
    }

    // Q3-Q4: 英文姓名必填
    if (!formData.lastNameEn) {
      newErrors.lastNameEn = '請填寫英文拼音姓';
      errorOrder.push('lastNameEn');
    }
    if (!formData.firstNameEn) {
      newErrors.firstNameEn = '請填寫英文拼音名';
      errorOrder.push('firstNameEn');
    }

    // Q5: 出生年月日必填
    if (!formData.birthDate) {
      newErrors.birthDate = '請填寫出生年月日';
      errorOrder.push('birthDate');
    }

    // Q7: 行動電話必填且格式驗證
    if (!formData.phone) {
      newErrors.phone = '請填寫行動電話';
      errorOrder.push('phone');
    } else if (!/^09\d{8}$/.test(formData.phone)) {
      newErrors.phone = '行動電話格式不正確（應為 09xxxxxxxx）';
      if (!errorOrder.includes('phone')) errorOrder.push('phone');
    }

    // Q8: 地址相關欄位必填
    if (!formData.postalCode) {
      newErrors.postalCode = '請填寫郵遞區號';
      errorOrder.push('postalCode');
    }
    if (!formData.city) {
      newErrors.city = '請填寫縣市';
      errorOrder.push('city');
    }
    if (!formData.district) {
      newErrors.district = '請填寫行政區';
      errorOrder.push('district');
    }
    if (!formData.address) {
      newErrors.address = '請填寫詳細地址';
      errorOrder.push('address');
    }

    // Q9-Q13: 學籍資料必填
    if (!formData.degreeLevel) {
      newErrors.degreeLevel = '請選擇就讀身分';
      errorOrder.push('degreeLevel');
    }
    if (!formData.grade) {
      newErrors.grade = '請選擇年級';
      errorOrder.push('grade');
    }
    if (!formData.college) {
      newErrors.college = '請選擇學院';
      errorOrder.push('college');
    }
    if (!formData.department) {
      newErrors.department = '請選擇或填寫科系';
      errorOrder.push('department');
    }

    // Q14-Q15: 特殊身分必填
    if (formData.isLowIncome === '') {
      newErrors.isLowIncome = '請選擇是否為中低收入戶';
      errorOrder.push('isLowIncome');
    }
    if (formData.hasDisabilityCard === '') {
      newErrors.hasDisabilityCard = '請選擇是否有身心障礙手冊';
      errorOrder.push('hasDisabilityCard');
    }

    // Q19: 證件照必填（如果沒有現有檔案且沒有上傳新檔案）
    if (!registration.idPhoto && !formData.idPhoto && !fileInputs.idPhoto) {
      newErrors.idPhoto = '請上傳證件照';
      errorOrder.push('idPhoto');
    }

    // Q20: 同意事項必填
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = '請同意個資與報名規範';
      errorOrder.push('agreedToTerms');
    }

    // Q21: 資訊來源必填
    if (!formData.infoSource) {
      newErrors.infoSource = '請選擇從何得知培力英檢';
      errorOrder.push('infoSource');
    }

    setErrors(newErrors);
    
    // 返回驗證結果和第一個錯誤欄位
    return {
      isValid: Object.keys(newErrors).length === 0,
      firstErrorField: errorOrder.length > 0 ? errorOrder[0] : null
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 如果狀態為已通過、報名成功或報名失敗，不允許提交
    if (cannotEdit) {
      const statusMessages = {
        'approved': '已通過審核無法進行修改',
        'success': '報名已成功無法進行修改',
        'failed': '報名已失敗無法進行修改'
      };
      alert(statusMessages[registration.status] || '此狀態無法進行修改');
      return;
    }
    
    const validationResult = validateForm();
    
    if (!validationResult.isValid) {
      // 找到第一個錯誤欄位並滾動到該位置
      const firstErrorField = validationResult.firstErrorField;
      
      // 等待狀態更新後再滾動
      setTimeout(() => {
        if (firstErrorField) {
          const fieldRef = getFieldRef(firstErrorField);
          
          if (fieldRef.current) {
            // 滾動到該欄位
            fieldRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            
            // 高亮顯示錯誤欄位（添加動畫效果）
            fieldRef.current.style.animation = 'none';
            setTimeout(() => {
              if (fieldRef.current) {
                fieldRef.current.style.animation = 'errorPulse 0.5s ease-in-out 3';
              }
            }, 10);
            
            // 聚焦到輸入框（如果是可輸入的欄位）
            const input = fieldRef.current.querySelector('input, select, textarea');
            if (input && input.type !== 'file' && input.type !== 'checkbox' && input.type !== 'radio') {
              input.focus();
            }
          }
        }
      }, 100);
      
      // 顯示錯誤提示
      const errorCount = Object.keys(errors).length;
      alert(`請修正表單錯誤後再提交\n\n發現 ${errorCount} 個必填欄位未填寫，已自動跳轉至第一個錯誤欄位`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = new FormData();
      
      // 基本資料
      submitData.append('registrationId', formData.registrationId);
      submitData.append('studentId', formData.studentId);
      submitData.append('name', formData.name);
      submitData.append('idNumber', formData.idNumber);
      submitData.append('email', formData.email);
      submitData.append('studentNameZh', formData.studentNameZh);
      submitData.append('lastNameEn', formData.lastNameEn.toUpperCase());
      submitData.append('firstNameEn', formData.firstNameEn.toUpperCase());
      submitData.append('birthDate', formData.birthDate);
      
      // 身分與學籍資料
      submitData.append('nationalId', formData.nationalId || formData.idNumber);
      submitData.append('phone', formData.phone);
      submitData.append('postalCode', formData.postalCode);
      submitData.append('city', formData.city);
      submitData.append('district', formData.district);
      submitData.append('address', formData.address);
      submitData.append('degreeLevel', formData.degreeLevel);
      submitData.append('grade', formData.grade);
      submitData.append('college', formData.college);
      submitData.append('department', formData.department);
      
      // 特殊身分與協助需求
      submitData.append('isLowIncome', formData.isLowIncome);
      submitData.append('hasDisabilityCard', formData.hasDisabilityCard);
      submitData.append('disabilityTypes', JSON.stringify(formData.disabilityTypes));
      if (fileInputs.disabilityCertFront || formData.disabilityCertFront) {
        submitData.append('disabilityCertFront', fileInputs.disabilityCertFront || formData.disabilityCertFront);
      }
      if (fileInputs.disabilityCertBack || formData.disabilityCertBack) {
        submitData.append('disabilityCertBack', fileInputs.disabilityCertBack || formData.disabilityCertBack);
      }
      submitData.append('examAssistanceOptions', JSON.stringify(formData.examAssistanceOptions));
      if (formData.examAssistanceOther) {
        submitData.append('examAssistanceOther', formData.examAssistanceOther);
      }
      
      // 照片與同意事項
      if (fileInputs.idPhoto || formData.idPhoto) {
        submitData.append('idPhoto', fileInputs.idPhoto || formData.idPhoto);
      }
      submitData.append('agreedToTerms', formData.agreedToTerms);
      submitData.append('infoSource', formData.infoSource);

      const response = await fetch('/api/english-test/registrations/update', {
        method: 'PUT',
        body: submitData
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('解析回應失敗:', e);
        alert('伺服器回應格式錯誤，請檢查後端日誌');
        return;
      }

      if (response.ok) {
        onUpdateSuccess();
      } else {
        console.error('更新失敗:', data);
        alert(data.error || data.message || '更新失敗，請稍後再試');
      }
    } catch (error) {
      console.error('更新報名資料錯誤:', error);
      alert('更新失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 學院選項
  const colleges = ['文學院', '理學院', '工學院', '管理學院', '海洋科學院', '社會科學院', '西灣學院', '醫學院'];
  
  // 年級選項
  const grades = ['一年級', '二年級', '三年級', '四年級以上'];

  // 科系選項（依學院動態顯示）
  const departmentOptions = {
    '文學院': [
      '中國文學系（Bachelor/Master/Ph.D.）',
      '外國語文學系（Bachelor/Master/Ph.D.）',
      '音樂學系（Bachelor/Master）',
      '劇場藝術學系（Bachelor/Master）'
    ],
    '理學院': [
      '生物科學系（Bachelor/Master/Ph.D.）',
      '化學系（Bachelor/Master/Ph.D.）',
      '物理學系（Bachelor/Master/Ph.D.）',
      '應用數學系（Bachelor/Master/Ph.D.）'
    ],
    '工學院': [
      '電機工程學系（Bachelor/Master/Ph.D.）',
      '機械與機電工程學系（Bachelor/Master/Ph.D.）',
      '資訊工程學系（Bachelor/Master/Ph.D.）',
      '光電工程學系（Bachelor/Master/Ph.D.）',
      '材料與光電科學學系（Bachelor/Master/Ph.D.）'
    ],
    '管理學院': [
      '企業管理學系（Bachelor/Master/Ph.D.）',
      '資訊管理學系（Bachelor/Master/Ph.D.）',
      '財務管理學系（Bachelor/Master/Ph.D.）',
      '國際經營管理全英語學士學位學程'
    ],
    '海洋科學院': [
      '海洋生物科技暨資源學系（Bachelor/Master/Ph.D.）',
      '海洋環境及工程學系（Bachelor/Master/Ph.D.）',
      '海洋科學系（Bachelor/Master/Ph.D.）'
    ],
    '社會科學院': [
      '政治經濟學系（Bachelor）',
      '社會學系（Bachelor/Master）'
    ],
    '西灣學院': [
      '人文暨科技跨領域學士學位學程',
      '原住民族專班'
    ],
    '醫學院': [
      '學士後醫學系',
      '護理學系',
      '生物醫學科技學系'
    ]
  };

  // 獲取錯誤樣式
  const getErrorStyle = (fieldName) => {
    return errors[fieldName] ? {
      border: '3px solid #dc3545',
      backgroundColor: '#fff5f5',
      boxShadow: '0 0 0 0.2rem rgba(220, 53, 69, 0.25)',
      animation: 'errorPulse 0.5s ease-in-out'
    } : {};
  };

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10003 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">檢視與修正報名資料 - {registration.name}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {/* 不可編輯狀態提示 */}
            {cannotEdit && (
              <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                <i className="fas fa-info-circle me-2" style={{ fontSize: '1.5rem' }}></i>
                <div>
                  <strong>
                    {registration.status === 'approved' || registration.status === 'success' 
                      ? '已通過審核無法進行修改' 
                      : '報名已失敗無法進行修改'}
                  </strong>
                  <p className="mb-0 mt-1">{getStatusMessage()}</p>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <style>{`
                @keyframes errorPulse {
                  0%, 100% { box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25); }
                  50% { box-shadow: 0 0 0 0.5rem rgba(220, 53, 69, 0.5); }
                }
              `}</style>
              {/* A. 基本聯絡資訊 */}
              <div className="mb-4">
                <h4 className="mb-3" style={{ color: '#FF6B6B', borderBottom: '2px solid #FF6B6B', paddingBottom: '0.5rem' }}>
                  A. 基本聯絡資訊
                </h4>
                
                <div className="mb-3" ref={getFieldRef('email')}>
                  <label className="form-label">
                    Q1. 電子郵件 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    readOnly={cannotEdit}
                    disabled={cannotEdit}
                    style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('email')}
                  />
                  {errors.email && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.email}
                    </div>
                  )}
                </div>

                <div className="mb-3" ref={getFieldRef('studentNameZh')}>
                  <label className="form-label">
                    Q2. 中文姓名 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="studentNameZh"
                    value={formData.studentNameZh}
                    onChange={handleChange}
                    readOnly={cannotEdit}
                    disabled={cannotEdit}
                    style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('studentNameZh')}
                  />
                  {errors.studentNameZh && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.studentNameZh}
                    </div>
                  )}
                </div>

                <div className="row mb-3">
                  <div className="col-md-6" ref={getFieldRef('lastNameEn')}>
                    <label className="form-label">
                      Q3. 英文拼音姓 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="lastNameEn"
                      value={formData.lastNameEn}
                      onChange={handleChange}
                      style={{ textTransform: 'uppercase', ...(cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('lastNameEn')) }}
                      placeholder="大寫英文姓氏"
                      readOnly={cannotEdit}
                      disabled={cannotEdit}
                    />
                    {errors.lastNameEn && (
                      <div className="text-danger mt-2 p-2 rounded" style={{ 
                        backgroundColor: '#f8d7da', 
                        border: '1px solid #f5c6cb',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        ⚠️ {errors.lastNameEn}
                      </div>
                    )}
                  </div>
                  <div className="col-md-6" ref={getFieldRef('firstNameEn')}>
                    <label className="form-label">
                      Q4. 英文拼音名 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="firstNameEn"
                      value={formData.firstNameEn}
                      onChange={handleChange}
                      style={{ textTransform: 'uppercase', ...(cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('firstNameEn')) }}
                      placeholder="大寫英文名字"
                      readOnly={cannotEdit}
                      disabled={cannotEdit}
                    />
                    {errors.firstNameEn && (
                      <div className="text-danger mt-2 p-2 rounded" style={{ 
                        backgroundColor: '#f8d7da', 
                        border: '1px solid #f5c6cb',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        ⚠️ {errors.firstNameEn}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3" ref={getFieldRef('birthDate')}>
                  <label className="form-label">
                    Q5. 出生年月日 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    readOnly={cannotEdit}
                    disabled={cannotEdit}
                    style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('birthDate')}
                  />
                  {errors.birthDate && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.birthDate}
                    </div>
                  )}
                </div>
              </div>

              {/* C. 身分與學籍資料 */}
              <div className="mb-4">
                <h4 className="mb-3" style={{ color: '#FF6B6B', borderBottom: '2px solid #FF6B6B', paddingBottom: '0.5rem' }}>
                  C. 身分與學籍資料
                </h4>
                
                <div className="mb-3">
                  <label className="form-label">
                    Q6. 身分證字號 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="nationalId"
                    value={formData.nationalId}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                </div>

                <div className="mb-3" ref={getFieldRef('phone')}>
                  <label className="form-label">
                    Q7. 行動電話 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="09xxxxxxxx"
                    maxLength="10"
                    readOnly={cannotEdit}
                    disabled={cannotEdit}
                    style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('phone')}
                  />
                  {errors.phone && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.phone}
                    </div>
                  )}
                </div>

                <div className="mb-3" ref={getFieldRef('postalCode')}>
                  <label className="form-label">
                    Q8. 聯絡地址 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div className="row">
                    <div className="col-md-3 mb-2">
                      <input
                        type="text"
                        className="form-control"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        placeholder="郵遞區號"
                        maxLength="3"
                        readOnly={cannotEdit}
                        disabled={cannotEdit}
                        style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('postalCode')}
                      />
                      {errors.postalCode && (
                        <div className="text-danger mt-1 small" style={{ fontWeight: 'bold' }}>
                          ⚠️ {errors.postalCode}
                        </div>
                      )}
                    </div>
                    <div className="col-md-3 mb-2" ref={getFieldRef('city')}>
                      <input
                        type="text"
                        className="form-control"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="縣市"
                        readOnly={cannotEdit}
                        disabled={cannotEdit}
                        style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('city')}
                      />
                      {errors.city && (
                        <div className="text-danger mt-1 small" style={{ fontWeight: 'bold' }}>
                          ⚠️ {errors.city}
                        </div>
                      )}
                    </div>
                    <div className="col-md-3 mb-2" ref={getFieldRef('district')}>
                      <input
                        type="text"
                        className="form-control"
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        placeholder="行政區"
                        readOnly={cannotEdit}
                        disabled={cannotEdit}
                        style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('district')}
                      />
                      {errors.district && (
                        <div className="text-danger mt-1 small" style={{ fontWeight: 'bold' }}>
                          ⚠️ {errors.district}
                        </div>
                      )}
                    </div>
                    <div className="col-md-3 mb-2" ref={getFieldRef('address')}>
                      <input
                        type="text"
                        className="form-control"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="詳細地址"
                        readOnly={cannotEdit}
                        disabled={cannotEdit}
                        style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('address')}
                      />
                      {errors.address && (
                        <div className="text-danger mt-1 small" style={{ fontWeight: 'bold' }}>
                          ⚠️ {errors.address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6" ref={getFieldRef('degreeLevel')}>
                    <label className="form-label">
                      Q9. 就讀身分 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className="form-select"
                      name="degreeLevel"
                      value={formData.degreeLevel}
                      onChange={handleChange}
                      disabled={cannotEdit}
                      style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('degreeLevel')}
                    >
                      <option value="">請選擇</option>
                      <option value="學士班">學士班</option>
                      <option value="碩士班">碩士班</option>
                      <option value="博士班">博士班</option>
                    </select>
                    {errors.degreeLevel && (
                      <div className="text-danger mt-2 p-2 rounded" style={{ 
                        backgroundColor: '#f8d7da', 
                        border: '1px solid #f5c6cb',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        ⚠️ {errors.degreeLevel}
                      </div>
                    )}
                  </div>
                  <div className="col-md-6" ref={getFieldRef('grade')}>
                    <label className="form-label">
                      Q10. 年級 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className="form-select"
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      disabled={cannotEdit}
                      style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('grade')}
                    >
                      <option value="">請選擇</option>
                      {grades.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                    {errors.grade && (
                      <div className="text-danger mt-2 p-2 rounded" style={{ 
                        backgroundColor: '#f8d7da', 
                        border: '1px solid #f5c6cb',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        ⚠️ {errors.grade}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Q11. 學號 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="studentId"
                    value={formData.studentId}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6" ref={getFieldRef('college')}>
                    <label className="form-label">
                      Q12. 學院 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className="form-select"
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      disabled={cannotEdit}
                      style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('college')}
                    >
                      <option value="">請選擇</option>
                      {colleges.map(college => (
                        <option key={college} value={college}>{college}</option>
                      ))}
                    </select>
                    {errors.college && (
                      <div className="text-danger mt-2 p-2 rounded" style={{ 
                        backgroundColor: '#f8d7da', 
                        border: '1px solid #f5c6cb',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        ⚠️ {errors.college}
                      </div>
                    )}
                  </div>
                  <div className="col-md-6" ref={getFieldRef('department')}>
                    <label className="form-label">
                      Q13. 科系 <span style={{ color: 'red' }}>*</span>
                    </label>
                    {/* 動態科系下拉選單 */}
                    {formData.college && departmentOptions[formData.college] ? (
                      <select
                        className="form-select"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        disabled={cannotEdit}
                        style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('department')}
                      >
                        <option value="">請選擇</option>
                        {departmentOptions[formData.college].map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="請填寫科系"
                        readOnly={cannotEdit}
                        disabled={cannotEdit}
                        style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('department')}
                      />
                    )}
                    {errors.department && (
                      <div className="text-danger mt-2 p-2 rounded" style={{ 
                        backgroundColor: '#f8d7da', 
                        border: '1px solid #f5c6cb',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        ⚠️ {errors.department}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* E. 特殊身分與協助需求 */}
              <div className="mb-4">
                <h4 className="mb-3" style={{ color: '#FF6B6B', borderBottom: '2px solid #FF6B6B', paddingBottom: '0.5rem' }}>
                  E. 特殊身分與協助需求
                </h4>
                
                <div className="mb-3" ref={getFieldRef('isLowIncome')}>
                  <label className="form-label">
                    Q14. 是否為中低收入戶 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={errors.isLowIncome ? { 
                    padding: '1rem', 
                    border: '3px solid #dc3545', 
                    borderRadius: '5px',
                    backgroundColor: '#fff5f5'
                  } : {}}>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="isLowIncome"
                        value="否"
                        checked={formData.isLowIncome === '否'}
                        onChange={handleChange}
                        disabled={cannotEdit}
                      />
                      <label className="form-check-label">否</label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="isLowIncome"
                        value="中低收入戶"
                        checked={formData.isLowIncome === '中低收入戶'}
                        onChange={handleChange}
                        disabled={cannotEdit}
                      />
                      <label className="form-check-label">中低收入戶</label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="isLowIncome"
                        value="低收入戶"
                        checked={formData.isLowIncome === '低收入戶'}
                        onChange={handleChange}
                        disabled={cannotEdit}
                      />
                      <label className="form-check-label">低收入戶</label>
                    </div>
                  </div>
                  {errors.isLowIncome && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.isLowIncome}
                    </div>
                  )}
                </div>

                <div className="mb-3" ref={getFieldRef('hasDisabilityCard')}>
                  <label className="form-label">
                    Q15. 是否有身心障礙手冊 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={errors.hasDisabilityCard ? { 
                    padding: '1rem', 
                    border: '3px solid #dc3545', 
                    borderRadius: '5px',
                    backgroundColor: '#fff5f5'
                  } : {}}>
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="hasDisabilityCard"
                        value="是"
                        checked={formData.hasDisabilityCard === '是'}
                        onChange={handleChange}
                        disabled={cannotEdit}
                      />
                      <label className="form-check-label">是</label>
                    </div>
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="hasDisabilityCard"
                        value="否"
                        checked={formData.hasDisabilityCard === '否'}
                        onChange={handleChange}
                        disabled={cannotEdit}
                      />
                      <label className="form-check-label">否</label>
                    </div>
                  </div>
                  {errors.hasDisabilityCard && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.hasDisabilityCard}
                    </div>
                  )}
                </div>

                {formData.hasDisabilityCard === '是' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">
                        Q16. 身心障礙類別（可複選）
                      </label>
                      <div className="row">
                        {[
                          '輕度肢障',
                          '中度肢障',
                          '重度肢障',
                          '輕度視障',
                          '中度視障',
                          '重度視障',
                          '輕度聽障',
                          '中度聽障',
                          '重度聽障',
                          '輕度平衡障',
                          '中度平衡障',
                          '重度多重障',
                          '其他'
                        ].map(type => (
                          <div key={type} className="col-md-6 mb-2">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                name="disabilityTypes"
                                value={type}
                                checked={formData.disabilityTypes.includes(type)}
                                onChange={handleChange}
                                disabled={cannotEdit}
                              />
                              <label className="form-check-label">{type}</label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Q17. 身心障礙證明正反面上傳
                      </label>
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <input
                            type="file"
                            className="form-control"
                            name="disabilityCertFront"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={cannotEdit}
                          />
                          <small className="text-muted">正面</small>
                          {registration.disabilityCertFront && !previewUrls.disabilityCertFront && (
                            <div className="mt-1">
                              <a
                                href={`/uploads/${registration.disabilityCertFront}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                查看現有檔案
                              </a>
                            </div>
                          )}
                          {previewUrls.disabilityCertFront && (
                            <div className="mt-2">
                              <small className="text-muted d-block mb-1">預覽上傳的檔案：</small>
                              <img
                                src={previewUrls.disabilityCertFront}
                                alt="身心障礙證明正面預覽"
                                style={{
                                  maxWidth: '200px',
                                  maxHeight: '200px',
                                  border: '1px solid #ddd',
                                  borderRadius: '5px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => window.open(previewUrls.disabilityCertFront, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                        <div className="col-md-6 mb-2">
                          <input
                            type="file"
                            className="form-control"
                            name="disabilityCertBack"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={cannotEdit}
                          />
                          <small className="text-muted">反面</small>
                          {registration.disabilityCertBack && !previewUrls.disabilityCertBack && (
                            <div className="mt-1">
                              <a
                                href={`/uploads/${registration.disabilityCertBack}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                查看現有檔案
                              </a>
                            </div>
                          )}
                          {previewUrls.disabilityCertBack && (
                            <div className="mt-2">
                              <small className="text-muted d-block mb-1">預覽上傳的檔案：</small>
                              <img
                                src={previewUrls.disabilityCertBack}
                                alt="身心障礙證明反面預覽"
                                style={{
                                  maxWidth: '200px',
                                  maxHeight: '200px',
                                  border: '1px solid #ddd',
                                  borderRadius: '5px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => window.open(previewUrls.disabilityCertBack, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Q18. 需要的考試協助項目（可複選）
                      </label>
                      <div className="row">
                        {[
                          '聽力 5 分鐘入場',
                          '安排在一樓教室或有電梯的大樓',
                          '聽讀測驗之座位安排靠近播音機（限聽障考生）',
                          '單獨應考或安排 6 人以下應考（單獨應考限有不自主作動或聲響之考生）',
                          '試題冊放大 1.5 倍字體（相當於題號列印 18 點字體）（限視障生）',
                          '試題冊放大 2 倍字體（相當於題號列印 23 點字體）（限重度視障生）',
                          '免除聽說測驗之聽力測驗（限聽、中、重度聽障考生）',
                          '免除口說能力測驗（限聽、中及重度聽障／語障考生）',
                          '聽讀測驗直接作答於試題冊上（限視障及書寫功能障礙考生）',
                          '延長作答時間為原時間之 1.5 倍（限閱讀及書寫功能障礙考生）',
                          '延長作答時間為原時間之 2 倍（限重度視障生）',
                          '考生自備輔具：放大鏡、擴視機',
                          '考生自備輔具：拐杖',
                          '考生自備輔具：坐輪椅應考（請於「其他」項說明輪椅尺寸，以便安排桌子）',
                          '考生自備輔具：助聽器或配戴 FM 輔聽系統、電子耳、電子耳 FM 輔聽系統（申請助聽器或電子耳之考生，請於考前 5 分鐘進場。）',
                          '考生自備醫療器具（請於「其他」項註明）',
                          '其他'
                        ].map(option => (
                          <div key={option} className="col-md-6 mb-2">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                name="examAssistanceOptions"
                                value={option}
                                checked={formData.examAssistanceOptions.includes(option)}
                                onChange={handleChange}
                                disabled={cannotEdit}
                              />
                              <label className="form-check-label" style={{ fontSize: '0.9rem' }}>{option}</label>
                            </div>
                          </div>
                        ))}
                      </div>
                      {formData.examAssistanceOptions.includes('其他') && (
                        <div className="mt-3">
                          <input
                            type="text"
                            className="form-control"
                            name="examAssistanceOther"
                            value={formData.examAssistanceOther}
                            onChange={handleChange}
                            placeholder="請填寫其他考試協助項目"
                            readOnly={cannotEdit}
                            disabled={cannotEdit}
                            style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* F. 照片與同意事項 */}
              <div className="mb-4">
                <h4 className="mb-3" style={{ color: '#FF6B6B', borderBottom: '2px solid #FF6B6B', paddingBottom: '0.5rem' }}>
                  F. 照片與同意事項
                </h4>
                
                <div className="mb-3" ref={getFieldRef('idPhoto')}>
                  <label className="form-label">
                    Q19. 上傳證件照（2 吋） <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    name="idPhoto"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png"
                    disabled={cannotEdit}
                    style={errors.idPhoto ? {
                      border: '3px solid #dc3545',
                      backgroundColor: '#fff5f5'
                    } : {}}
                  />
                  <small className="text-muted">限制：JPG/PNG、白底、3MB 以下</small>
                  
                  {/* 預覽上傳的證件照 */}
                  {previewUrls.idPhoto && (
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">預覽上傳的證件照：</small>
                      <img
                        src={previewUrls.idPhoto}
                        alt="證件照預覽"
                        style={{
                          maxWidth: '150px',
                          maxHeight: '200px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(previewUrls.idPhoto, '_blank')}
                      />
                    </div>
                  )}
                  
                  {/* 合格照片說明 */}
                  <div className="mt-3 p-3 rounded" style={{ 
                    backgroundColor: '#e7f3ff', 
                    border: '2px solid #0066cc',
                    fontSize: '0.95rem',
                    lineHeight: '1.8',
                    opacity: cannotEdit ? 0.7 : 1
                  }}>
                    <strong style={{ color: '#0066cc', fontSize: '1.1rem' }}>📸 合格證件照規範：</strong>
                    <ol style={{ marginTop: '0.5rem', marginBottom: '0', paddingLeft: '1.5rem' }}>
                      <li>應為6個月內所拍攝之正面、脫帽、露耳、五官清晰、白色或淺色背景之彩色證件照片。</li>
                      <li>臉部需佔照片面積之70%~80%，頭部或頭髮不能碰觸到照片邊框（女性長髮碰到邊框下緣情形例外）。</li>
                      <li>眼睛正視相機鏡頭拍攝，兩眼必須張開且清晰可見，表情自然不誇張，且不能有紅眼。</li>
                      <li>如配戴眼鏡，眼睛需清楚呈現，不得配戴深色鏡片眼鏡，不能有閃光反射在眼睛上，鏡框不得遮蓋眼睛任何一部分。</li>
                      <li>不得使用合成或修改之照片，亦不可使用生活照修剪。</li>
                      <li>考生上傳照片，將於一週內審核，如所上傳照片不符規定將以e-mail通知，請於通知日後三日內修正重傳；未於期限內修正者，皆以照片不符報考規定處理，恕無法受理報名。</li>
                      <li>完成上傳照片，經審核通過，不得更換。</li>
                      <li>務必上傳考生本人之照片，若測驗當日核對與上傳照片無法確認為本人，測驗結束後得要求考生再接受查驗。</li>
                    </ol>
                  </div>

                  {/* 範例圖片 */}
                  <div className="mt-3">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <div className="p-3 rounded" style={{ 
                          backgroundColor: '#d4edda', 
                          border: '2px solid #28a745',
                          textAlign: 'center',
                          opacity: cannotEdit ? 0.7 : 1
                        }}>
                          <strong style={{ color: '#155724', display: 'block', marginBottom: '0.5rem' }}>✅ 合格範例</strong>
                          <img
                            src="/正確證件照範例.png"
                            alt="合格證件照範例"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '300px',
                              border: '2px solid #28a745',
                              borderRadius: '5px',
                              cursor: cannotEdit ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => !cannotEdit && window.open('/正確證件照範例.png', '_blank')}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div style={{ display: 'none', color: '#999', marginTop: '0.5rem' }}>
                            圖片載入失敗，請確認圖片路徑正確
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <div className="p-3 rounded" style={{ 
                          backgroundColor: '#f8d7da', 
                          border: '2px solid #dc3545',
                          textAlign: 'center',
                          opacity: cannotEdit ? 0.7 : 1
                        }}>
                          <strong style={{ color: '#721c24', display: 'block', marginBottom: '0.5rem' }}>❌ 不合格範例</strong>
                          <img
                            src="/不合格證件照範例.jpg"
                            alt="不合格證件照範例"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '300px',
                              border: '2px solid #dc3545',
                              borderRadius: '5px',
                              cursor: cannotEdit ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => !cannotEdit && window.open('/不合格證件照範例.jpg', '_blank')}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div style={{ display: 'none', color: '#999', marginTop: '0.5rem' }}>
                            圖片載入失敗，請確認圖片路徑正確
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {registration.idPhoto && !previewUrls.idPhoto && (
                    <div className="mt-2">
                      <small className="text-muted">目前證件照：</small>
                      <img
                        src={`/uploads/${registration.idPhoto}`}
                        alt="證件照"
                        style={{
                          maxWidth: '150px',
                          maxHeight: '200px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          marginLeft: '10px',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          window.open(`/uploads/${registration.idPhoto}`, '_blank');
                        }}
                      />
                    </div>
                  )}
                  {errors.idPhoto && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.idPhoto}
                    </div>
                  )}
                </div>

                <div className="mb-3" ref={getFieldRef('agreedToTerms')}>
                  <div 
                    className="form-check p-4 rounded"
                    style={{
                      border: formData.agreedToTerms ? '3px solid #28a745' : errors.agreedToTerms ? '3px solid #dc3545' : '3px solid #dc3545',
                      backgroundColor: formData.agreedToTerms ? '#d4edda' : errors.agreedToTerms ? '#f8d7da' : '#f8d7da',
                      transition: 'all 0.3s ease',
                      opacity: cannotEdit ? 0.7 : 1
                    }}
                  >
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name="agreedToTerms"
                      checked={formData.agreedToTerms}
                      onChange={handleChange}
                      disabled={cannotEdit}
                      style={{ 
                        width: '1.5rem', 
                        height: '1.5rem',
                        cursor: cannotEdit ? 'not-allowed' : 'pointer',
                        marginTop: '0.25rem'
                      }}
                    />
                    <label 
                      className="form-check-label ms-3"
                      style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 'bold',
                        cursor: cannotEdit ? 'not-allowed' : 'pointer',
                        color: formData.agreedToTerms ? '#155724' : '#721c24'
                      }}
                    >
                      Q20. 個資與報名規範同意 <span style={{ color: 'red', fontSize: '1.3rem' }}>*</span>
                    </label>
                    <div className="mt-3" style={{ fontSize: '1rem', color: '#333', lineHeight: '1.8', marginLeft: '2.5rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: '#d9534f', fontSize: '1.1rem' }}>【個人資料保護聲明】</strong>
                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          <li>本人同意國立中山大學西灣學院（以下簡稱「本單位」）為辦理培力英檢報名及相關業務，得蒐集、處理及利用本人之個人資料（包括但不限於姓名、學號、身分證字號、聯絡方式、學籍資料、英語能力證明等）。</li>
                          <li>本人了解本單位將依個人資料保護法及相關法規，妥善保管及使用本人之個人資料，並僅用於培力英檢報名、考試安排、成績通知、相關行政作業及統計分析等目的。</li>
                          <li>本人了解得隨時向本單位查詢、請求閱覽、請求補充或更正、請求停止蒐集、處理或利用、請求刪除本人之個人資料，惟若因此影響報名或考試權益，由本人自行負責。</li>
                        </ul>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: '#d9534f', fontSize: '1.1rem' }}>【報名規範與注意事項】</strong>
                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          <li>報名資料一經提交，即視為完成報名程序，除因系統錯誤或不可抗力因素外，不得要求修改或取消報名。</li>
                          <li>報名時所填寫之各項資料（包括但不限於姓名、學號、聯絡方式、英語能力證明等）必須真實、正確且完整，如有虛偽不實或錯誤，本單位得取消報名資格或考試成績，且不負任何責任。</li>
                          <li>報名費用（如有）一經繳交，除因本單位取消考試或不可抗力因素外，概不退費。</li>
                          <li>考試時間、地點及相關注意事項將以電子郵件或簡訊通知，請確保聯絡方式正確且可正常接收訊息。</li>
                          <li>考試當日請攜帶有效身分證件應試，未攜帶或證件不符者，不得入場應試。</li>
                          <li>考試過程中如有違規行為（如作弊、代考等），本單位得取消考試資格及成績，並依校規處理。</li>
                        </ul>
                      </div>
                      <div style={{ 
                        marginTop: '1.5rem', 
                        padding: '1rem', 
                        backgroundColor: '#fff3cd', 
                        border: '2px solid #ffc107',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        color: '#856404'
                      }}>
                        <strong style={{ fontSize: '1.1rem' }}>【資料確認聲明】</strong>
                        <p style={{ marginTop: '0.5rem', marginBottom: '0' }}>
                          我本人已確認上述資訊（包括但不限於電子信箱、地址、英檢成績證明、個人基本資料等）核實無誤，如有錯誤、遺漏或虛偽不實，本人自行負責，並同意本單位得依相關規定處理，不得異議。
                        </p>
                      </div>
                      <div className="mt-3" style={{ fontSize: '0.95rem', color: '#666', fontStyle: 'italic' }}>
                        <strong>重要提醒：</strong>請務必仔細核對所有填寫資料，確認無誤後再勾選同意。一旦勾選同意並提交報名，即視為您已充分了解並同意遵守上述所有條款及規範。
                      </div>
                    </div>
                  </div>
                  {errors.agreedToTerms && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.agreedToTerms}
                    </div>
                  )}
                </div>
              </div>

              {/* G. 資訊來源 */}
              <div className="mb-4">
                <h4 className="mb-3" style={{ color: '#FF6B6B', borderBottom: '2px solid #FF6B6B', paddingBottom: '0.5rem' }}>
                  G. 資訊來源
                </h4>
                
                <div className="mb-3" ref={getFieldRef('infoSource')}>
                  <label className="form-label">
                    Q21. 從何得知培力英檢 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    name="infoSource"
                    value={formData.infoSource}
                    onChange={handleChange}
                    disabled={cannotEdit}
                    style={cannotEdit ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : getErrorStyle('infoSource')}
                  >
                    <option value="">請選擇</option>
                    <option value="EMI 中心官網">EMI 中心官網</option>
                    <option value="EMI 中心官方 IG">EMI 中心官方 IG</option>
                    <option value="中山大小事">中山大小事</option>
                    <option value="教師推薦">教師推薦</option>
                    <option value="其他">其他</option>
                  </select>
                  {errors.infoSource && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.infoSource}
                    </div>
                  )}
                </div>
              </div>

              {/* 按鈕 */}
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{
                    padding: '0.625rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || cannotEdit}
                  style={{
                    padding: '0.625rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: cannotEdit ? '#6c757d' : '#FF6B6B',
                    borderColor: cannotEdit ? '#6c757d' : '#FF6B6B',
                    opacity: (isSubmitting || cannotEdit) ? 0.6 : 1,
                    cursor: cannotEdit ? 'not-allowed' : 'pointer'
                  }}
                >
                  {cannotEdit 
                    ? (registration.status === 'approved' || registration.status === 'success' 
                        ? '已通過審核無法修改' 
                        : '報名已失敗無法修改')
                    : (isSubmitting ? '更新中...' : '確認更新')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
