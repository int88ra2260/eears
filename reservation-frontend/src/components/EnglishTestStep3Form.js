// components/EnglishTestStep3Form.js
// 步驟三：英語能力與培力資格相關
import React, { useState, useRef } from 'react';
import useToast from './ui/useToast';
import useConfirm from './ui/useConfirm';

export default function EnglishTestStep3Form({ basicInfo, initialData, onNext, onClose, onSubmitNonExam }) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [formData, setFormData] = useState({
    // Q1: 報考項目
    examType: '', // 'LRSW', 'LR', 'SW', 'NON'
    // Q2: 是否曾取得 CEFR B2
    hasCEFRB2: '',
    // Q3: 各項成績（整合原 Q3 和 Q4）
    listeningExamType: '',
    listeningScore: '',
    readingExamType: '',
    readingScore: '',
    speakingExamType: '',
    speakingScore: '',
    writingExamType: '',
    writingScore: '',
    // Q4: B2 成績證明（支援多檔案）
    b2CertificateFiles: []
  });

  const [errors, setErrors] = useState({});
  const fieldRefs = useRef({});

  const getFieldRef = (fieldName) => {
    if (!fieldRefs.current[fieldName]) {
      fieldRefs.current[fieldName] = React.createRef();
    }
    return fieldRefs.current[fieldName];
  };

  const getErrorStyle = (fieldName) => {
    return errors[fieldName] ? {
      border: '3px solid #dc3545',
      backgroundColor: '#fff5f5',
      boxShadow: '0 0 0 0.2rem rgba(220, 53, 69, 0.25)',
      animation: 'errorPulse 0.5s ease-in-out'
    } : {};
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => {
        const currentArray = prev[name] || [];
        if (checked) {
          return { ...prev, [name]: [...currentArray, value] };
        } else {
          return { ...prev, [name]: currentArray.filter(item => item !== value) };
        }
      });
    } else {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        
        // 當測驗類別改變時，重新驗證對應的成績
        if (name === 'listeningExamType' && newData.listeningScore) {
          const formatCheck = validateScoreFormat(value, newData.listeningScore, 'listening');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, listeningScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.listeningScore && (newErrors.listeningScore.includes('格式') || newErrors.listeningScore.includes('範圍'))) {
                delete newErrors.listeningScore;
              }
              return newErrors;
            });
          }
        } else if (name === 'readingExamType' && newData.readingScore) {
          const formatCheck = validateScoreFormat(value, newData.readingScore, 'reading');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, readingScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.readingScore && (newErrors.readingScore.includes('格式') || newErrors.readingScore.includes('範圍'))) {
                delete newErrors.readingScore;
              }
              return newErrors;
            });
          }
        } else if (name === 'speakingExamType' && newData.speakingScore) {
          const formatCheck = validateScoreFormat(value, newData.speakingScore, 'speaking');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, speakingScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.speakingScore && (newErrors.speakingScore.includes('格式') || newErrors.speakingScore.includes('範圍'))) {
                delete newErrors.speakingScore;
              }
              return newErrors;
            });
          }
        } else if (name === 'writingExamType' && newData.writingScore) {
          const formatCheck = validateScoreFormat(value, newData.writingScore, 'writing');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, writingScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.writingScore && (newErrors.writingScore.includes('格式') || newErrors.writingScore.includes('範圍'))) {
                delete newErrors.writingScore;
              }
              return newErrors;
            });
          }
        }
        
        // 即時驗證成績格式（當成績欄位有值且測驗類別已選擇時）
        if (name === 'listeningScore' && newData.listeningExamType && value) {
          const formatCheck = validateScoreFormat(newData.listeningExamType, value, 'listening');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, listeningScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.listeningScore && (newErrors.listeningScore.includes('格式') || newErrors.listeningScore.includes('範圍'))) {
                delete newErrors.listeningScore;
              }
              return newErrors;
            });
          }
        } else if (name === 'readingScore' && newData.readingExamType && value) {
          const formatCheck = validateScoreFormat(newData.readingExamType, value, 'reading');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, readingScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.readingScore && (newErrors.readingScore.includes('格式') || newErrors.readingScore.includes('範圍'))) {
                delete newErrors.readingScore;
              }
              return newErrors;
            });
          }
        } else if (name === 'speakingScore' && newData.speakingExamType && value) {
          const formatCheck = validateScoreFormat(newData.speakingExamType, value, 'speaking');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, speakingScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.speakingScore && (newErrors.speakingScore.includes('格式') || newErrors.speakingScore.includes('範圍'))) {
                delete newErrors.speakingScore;
              }
              return newErrors;
            });
          }
        } else if (name === 'writingScore' && newData.writingExamType && value) {
          const formatCheck = validateScoreFormat(newData.writingExamType, value, 'writing');
          if (!formatCheck.isValid) {
            setErrors(prev => ({ ...prev, writingScore: formatCheck.error }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.writingScore && (newErrors.writingScore.includes('格式') || newErrors.writingScore.includes('範圍'))) {
                delete newErrors.writingScore;
              }
              return newErrors;
            });
          }
        }
        
        return newData;
      });
    }
    
    // 清除錯誤（僅限非格式錯誤）
    if (errors[name] && !errors[name].includes('格式') && !errors[name].includes('範圍')) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 驗證成績格式和範圍（上限和格式驗證）
  const validateScoreFormat = (examType, score, skill) => {
    if (!examType || !score) return { isValid: true, error: null }; // 未填寫，不驗證
    
    const scoreStr = String(score).trim();
    const scoreStrUpper = scoreStr.toUpperCase();
    
    switch (examType) {
      case 'TOEIC Listening & Reading':
        // 多益聽讀：聽力/閱讀 10-495分（整數），口說/寫作不適用
        if (skill === 'listening' || skill === 'reading') {
          const numScore = parseFloat(score);
          if (isNaN(numScore)) {
            return { isValid: false, error: '請輸入有效的數字' };
          }
          if (!Number.isInteger(numScore)) {
            return { isValid: false, error: '多益聽讀成績必須為整數' };
          }
          if (numScore < 10 || numScore > 495) {
            return { isValid: false, error: '多益聽讀成績範圍為 10-495 分' };
          }
        }
        return { isValid: true, error: null };
      
      case 'TOEIC Speaking & Writing':
        // 多益說寫：口說/寫作 0-200分（整數），聽力/閱讀不適用
        if (skill === 'speaking' || skill === 'writing') {
          const numScore = parseFloat(score);
          if (isNaN(numScore)) {
            return { isValid: false, error: '請輸入有效的數字' };
          }
          if (!Number.isInteger(numScore)) {
            return { isValid: false, error: '多益說寫成績必須為整數' };
          }
          if (numScore < 0 || numScore > 200) {
            return { isValid: false, error: '多益說寫成績範圍為 0-200 分' };
          }
        }
        return { isValid: true, error: null };
      
      case 'IELTS':
        // IELTS 雅思：所有項目 0-9分（可以是整數或半數，如 5.0, 5.5, 6.0, 6.5）
        const ieltsScore = parseFloat(score);
        if (isNaN(ieltsScore)) {
          return { isValid: false, error: '請輸入有效的數字' };
        }
        if (ieltsScore < 0 || ieltsScore > 9) {
          return { isValid: false, error: 'IELTS 成績範圍為 0-9 分' };
        }
        // 檢查是否為整數或半數（0.5的倍數）
        const decimalPart = ieltsScore % 1;
        if (decimalPart !== 0 && decimalPart !== 0.5) {
          return { isValid: false, error: 'IELTS 成績必須為整數或半數（如 5.0, 5.5, 6.0, 6.5）' };
        }
        return { isValid: true, error: null };
      
      case 'TOEFL':
        // TOEFL iBT 托福：聽力/閱讀/口說/寫作 0-30分（整數）
        // 注意：2026年後改為1-6分制，但目前先以舊制0-30分為準
        const toeflScore = parseFloat(score);
        if (isNaN(toeflScore)) {
          return { isValid: false, error: '請輸入有效的數字' };
        }
        if (!Number.isInteger(toeflScore)) {
          return { isValid: false, error: 'TOEFL 成績必須為整數' };
        }
        if (toeflScore < 0 || toeflScore > 30) {
          return { isValid: false, error: 'TOEFL 成績範圍為 0-30 分' };
        }
        return { isValid: true, error: null };
      
      case 'GEPT':
        // GEPT 全民英檢：僅接受「中高級」、「高級」、「優級」三種文字格式，不接受數字
        const validGeptLevels = ['中高級', '高級', '優級'];
        if (validGeptLevels.includes(scoreStr)) {
          return { isValid: true, error: null };
        }
        return { isValid: false, error: 'GEPT 成績格式僅接受「中高級」、「高級」、「優級」，不接受數字格式' };
      
      case 'BESTEP':
        // BESTEP 培力英檢：聽力/閱讀下限100分（上限待確認），口說/寫作 0-360分（整數）
        const bestepScore = parseFloat(score);
        if (isNaN(bestepScore)) {
          return { isValid: false, error: '請輸入有效的數字' };
        }
        if (!Number.isInteger(bestepScore)) {
          return { isValid: false, error: 'BESTEP 成績必須為整數' };
        }
        if (skill === 'listening' || skill === 'reading') {
          if (bestepScore < 100) {
            return { isValid: false, error: 'BESTEP 聽力/閱讀成績範圍為 0-140 分' };
          }
          // 上限待確認，暫時不限制上限
        } else if (skill === 'speaking' || skill === 'writing') {
          if (bestepScore < 0 || bestepScore > 360) {
            return { isValid: false, error: 'BESTEP 口說/寫作成績範圍為 280-360 分' };
          }
        }
        return { isValid: true, error: null };
      
      case 'FLPT':
        // FLPT 外語能力測驗：聽力/閱讀 195-300分（整數），口說 S-2+到S-5（文字），寫作 B+或A（文字）
        if (skill === 'listening' || skill === 'reading') {
          const flptScore = parseFloat(score);
          if (isNaN(flptScore)) {
            return { isValid: false, error: '請輸入有效的數字' };
          }
          if (!Number.isInteger(flptScore)) {
            return { isValid: false, error: 'FLPT 聽力/閱讀成績必須為整數' };
          }
          if (flptScore < 195 || flptScore > 300) {
            return { isValid: false, error: 'FLPT 聽力/閱讀成績範圍為 195-300 分' };
          }
        } else if (skill === 'speaking') {
          // 口說：需是 S-2+, S-3, S-3+, S-4, S-4+, S-5
          const validLevels = ['S-2+', 'S-3', 'S-3+', 'S-4', 'S-4+', 'S-5'];
          if (!validLevels.includes(scoreStrUpper)) {
            return { isValid: false, error: 'FLPT 口說成績格式為：S-2+, S-3, S-3+, S-4, S-4+, S-5' };
          }
        } else if (skill === 'writing') {
          // 寫作：需是 B+, A（精確匹配）
          if (scoreStrUpper !== 'B+' && scoreStrUpper !== 'A') {
            return { isValid: false, error: 'FLPT 寫作成績格式為：B+ 或 A' };
          }
        }
        return { isValid: true, error: null };
      
      case 'Cambridge Assessment English':
        // Cambridge 劍橋：所有項目 160-230分（整數）
        const cambridgeScore = parseFloat(score);
        if (isNaN(cambridgeScore)) {
          return { isValid: false, error: '請輸入有效的數字' };
        }
        if (!Number.isInteger(cambridgeScore)) {
          return { isValid: false, error: 'Cambridge 成績必須為整數' };
        }
        if (cambridgeScore < 160 || cambridgeScore > 230) {
          return { isValid: false, error: 'Cambridge 成績範圍為 160-230 分' };
        }
        return { isValid: true, error: null };
      
      default:
        return { isValid: true, error: null };
    }
  };

  // 驗證成績是否達到 B2
  const checkB2Level = (examType, score, skill) => {
    if (!examType || !score) return null; // 未填寫，不驗證
    
    const scoreStr = String(score).trim().toUpperCase();
    
    switch (examType) {
      case 'TOEIC Listening & Reading':
        // 多益聽讀：聽力 400+, 閱讀 385+，口說/寫作不適用
        if (skill === 'listening') {
          const numScore = parseFloat(score);
          return !isNaN(numScore) && numScore >= 400;
        }
        if (skill === 'reading') {
          const numScore = parseFloat(score);
          return !isNaN(numScore) && numScore >= 385;
        }
        return null; // 口說/寫作不適用此測驗
      
      case 'TOEIC Speaking & Writing':
        // 多益說寫：口說 160+, 寫作 150+，聽力/閱讀不適用
        if (skill === 'speaking') {
          const numScore = parseFloat(score);
          return !isNaN(numScore) && numScore >= 160;
        }
        if (skill === 'writing') {
          const numScore = parseFloat(score);
          return !isNaN(numScore) && numScore >= 150;
        }
        return null; // 聽力/閱讀不適用此測驗
      
      case 'IELTS':
        // IELTS 雅思：所有項目 5.5+
        const ieltsScore = parseFloat(score);
        return !isNaN(ieltsScore) && ieltsScore >= 5.5;
      
      case 'TOEFL':
        // TOEFL iBT 托福網路測驗：聽力 17+, 閱讀 18+, 口說 20+, 寫作 17+
        const toeflScore = parseFloat(score);
        if (isNaN(toeflScore)) return null;
        if (skill === 'listening') return toeflScore >= 17;
        if (skill === 'reading') return toeflScore >= 18;
        if (skill === 'speaking') return toeflScore >= 20;
        if (skill === 'writing') return toeflScore >= 17;
        return null;
      
      case 'GEPT':
        // GEPT 全民英檢：所有項目需為「中高級」、「高級」或「優級」
        const geptLevels = ['中高級', '高級', '優級'];
        return geptLevels.includes(scoreStr);
      
      case 'BESTEP':
        // BESTEP 培力英檢：聽力/閱讀 100+, 口說/寫作 280+
        const bestepScore = parseFloat(score);
        if (isNaN(bestepScore)) return null;
        if (skill === 'listening' || skill === 'reading') {
          return bestepScore >= 100;
        }
        if (skill === 'speaking' || skill === 'writing') {
          return bestepScore >= 280;
        }
        return null;
      
      case 'FLPT':
        // FLPT 外語能力測驗：聽力/閱讀 195+, 口說 S-2+, 寫作 B+
        if (skill === 'listening' || skill === 'reading') {
          const flptScore = parseFloat(score);
          return !isNaN(flptScore) && flptScore >= 195;
        }
        if (skill === 'speaking') {
          // 口說：需是 S-2+, S-3, S-3+, S-4, S-4+, S-5
          const validLevels = ['S-2+', 'S-3', 'S-3+', 'S-4', 'S-4+', 'S-5'];
          // 先檢查精確匹配
          if (validLevels.includes(scoreStr)) {
            return true;
          }
          // 檢查是否包含有效等級（但要避免誤匹配）
          // 先檢查帶 + 的等級（避免 S-3 匹配到 S-3+）
          if (scoreStr.includes('S-2+') || scoreStr.includes('S-3+') || scoreStr.includes('S-4+')) {
            return true;
          }
          // 再檢查不帶 + 的等級（但要確保不是帶 + 的）
          if ((scoreStr.includes('S-3') && !scoreStr.includes('S-3+')) ||
              (scoreStr.includes('S-4') && !scoreStr.includes('S-4+')) ||
              scoreStr.includes('S-5')) {
            return true;
          }
          return false;
        }
        if (skill === 'writing') {
          // 寫作：需是 B+, A（精確匹配）
          return scoreStr === 'B+' || scoreStr === 'A';
        }
        return null;
      
      case 'Cambridge Assessment English':
        // Cambridge 劍橋：所有項目 160+
        const cambridgeScore = parseFloat(score);
        return !isNaN(cambridgeScore) && cambridgeScore >= 160;
      
      default:
        return null;
    }
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      if (name === 'b2CertificateFiles') {
        // 多檔案上傳
        setFormData(prev => ({ 
          ...prev, 
          [name]: files 
        }));
      } else {
        // 單檔案上傳
        setFormData(prev => ({ ...prev, [name]: files[0] }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const errorOrder = [];

    // Q1: 報考項目必填
    if (!formData.examType) {
      newErrors.examType = '請選擇報考項目';
      errorOrder.push('examType');
    }

    // Q2: 是否曾取得 CEFR B2 必填
    if (formData.hasCEFRB2 === '') {
      newErrors.hasCEFRB2 = '請選擇是否曾取得 CEFR B2 以上成績';
      errorOrder.push('hasCEFRB2');
    }

    // 如果選擇「不報考」且 Q2=否，可以直接送出
    if (formData.examType === 'NON' && formData.hasCEFRB2 === '否') {
      setErrors(newErrors);
      return {
        isValid: Object.keys(newErrors).length === 0,
        firstErrorField: errorOrder.length > 0 ? errorOrder[0] : null,
        shouldExit: true // 標記需要結束報名流程
      };
    }

    // Q3: 條件式必填（如果 Q2=是）
    if (formData.hasCEFRB2 === '是') {
      // 檢查至少有一項成績已填寫
      const hasAnyScore = formData.listeningExamType || formData.readingExamType || 
                          formData.speakingExamType || formData.writingExamType;
      
      if (!hasAnyScore) {
        newErrors.listeningExamType = '請至少填寫一項成績';
        errorOrder.push('listeningExamType');
      } else {
        // 驗證已填寫的成績
        if (formData.listeningExamType && !formData.listeningScore) {
          newErrors.listeningScore = '請填寫聽力成績';
          if (!errorOrder.includes('listeningScore')) errorOrder.push('listeningScore');
        } else if (formData.listeningExamType && formData.listeningScore) {
          // 驗證聽力成績格式和範圍
          const formatCheck = validateScoreFormat(formData.listeningExamType, formData.listeningScore, 'listening');
          if (!formatCheck.isValid) {
            newErrors.listeningScore = formatCheck.error;
            if (!errorOrder.includes('listeningScore')) errorOrder.push('listeningScore');
          }
        }
        
        if (formData.readingExamType && !formData.readingScore) {
          newErrors.readingScore = '請填寫閱讀成績';
          if (!errorOrder.includes('readingScore')) errorOrder.push('readingScore');
        } else if (formData.readingExamType && formData.readingScore) {
          // 驗證閱讀成績格式和範圍
          const formatCheck = validateScoreFormat(formData.readingExamType, formData.readingScore, 'reading');
          if (!formatCheck.isValid) {
            newErrors.readingScore = formatCheck.error;
            if (!errorOrder.includes('readingScore')) errorOrder.push('readingScore');
          }
        }
        
        if (formData.speakingExamType && !formData.speakingScore) {
          newErrors.speakingScore = '請填寫口說成績';
          if (!errorOrder.includes('speakingScore')) errorOrder.push('speakingScore');
        } else if (formData.speakingExamType && formData.speakingScore) {
          // 驗證口說成績格式和範圍
          const formatCheck = validateScoreFormat(formData.speakingExamType, formData.speakingScore, 'speaking');
          if (!formatCheck.isValid) {
            newErrors.speakingScore = formatCheck.error;
            if (!errorOrder.includes('speakingScore')) errorOrder.push('speakingScore');
          }
        }
        
        if (formData.writingExamType && !formData.writingScore) {
          newErrors.writingScore = '請填寫寫作成績';
          if (!errorOrder.includes('writingScore')) errorOrder.push('writingScore');
        } else if (formData.writingExamType && formData.writingScore) {
          // 驗證寫作成績格式和範圍
          const formatCheck = validateScoreFormat(formData.writingExamType, formData.writingScore, 'writing');
          if (!formatCheck.isValid) {
            newErrors.writingScore = formatCheck.error;
            if (!errorOrder.includes('writingScore')) errorOrder.push('writingScore');
          }
        }
      }
    }

    // Q4: 條件式必填（如果 Q2=是）
    if (formData.hasCEFRB2 === '是' && (!formData.b2CertificateFiles || formData.b2CertificateFiles.length === 0)) {
      newErrors.b2CertificateFiles = '請上傳 B2 成績證明';
      errorOrder.push('b2CertificateFiles');
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      firstErrorField: errorOrder.length > 0 ? errorOrder[0] : null,
      shouldExit: false
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationResult = validateForm();
    
    if (!validationResult.isValid) {
      const firstErrorField = validationResult.firstErrorField;
      
      if (firstErrorField) {
        const fieldRef = getFieldRef(firstErrorField);
        
        setTimeout(() => {
          if (fieldRef.current) {
            fieldRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            
            fieldRef.current.style.animation = 'none';
            setTimeout(() => {
              if (fieldRef.current) {
                fieldRef.current.style.animation = 'errorPulse 0.5s ease-in-out 3';
              }
            }, 10);
            
            const input = fieldRef.current.querySelector('input, select, textarea');
            if (input && input.type !== 'file' && input.type !== 'checkbox' && input.type !== 'radio') {
              input.focus();
            }
          }
        }, 100);
      }
      
      const errorCount = Object.keys(errors).length;
      toast.warning(`請修正表單錯誤後再提交（共 ${errorCount} 個欄位）`);
      return;
    }

    // 如果選擇「不報考」且 Q2=否，直接提交報名資料並結束流程
    if (validationResult.shouldExit) {
      const nonExamData = {
        ...formData
      };
      
      confirm({
        title: '確認結束報名流程？',
        description: '您選擇不報考且未取得 CEFR B2 以上成績，確定要結束報名流程嗎？',
        confirmText: '結束報名',
        cancelText: '返回',
        variant: 'warning',
      }).then((ok) => {
        if (!ok) return;
        // 如果有提交函數，調用它
        if (onSubmitNonExam) {
          onSubmitNonExam(nonExamData);
        } else {
          // 否則進入下一步（但實際上應該不會到這裡）
          onNext(nonExamData);
          setTimeout(() => {
            onClose();
          }, 100);
        }
      });
      return;
    }

    // 如果選擇「不報考」但 Q2=是，完成 Q3 和 Q4 後直接結束報名
    if (formData.examType === 'NON' && formData.hasCEFRB2 === '是') {
      // 驗證已通過，直接提交並結束報名
      confirm({
        title: '確認結束報名流程？',
        description: '您選擇不報考且已取得 CEFR B2 以上成績，確定要結束報名流程嗎？',
        confirmText: '結束報名',
        cancelText: '返回',
        variant: 'warning',
      }).then((ok) => {
        if (!ok) return;
        // 如果有提交函數，調用它
        if (onSubmitNonExam) {
          onSubmitNonExam(formData);
        } else {
          // 否則進入下一步（但實際上應該不會到這裡）
          onNext(formData);
          setTimeout(() => {
            onClose();
          }, 100);
        }
      });
      return;
    }

    // 進入下一步（步驟四）- 只有非「不報考」的情況才會到這裡
    // 顯示警示訊息，提醒學生關於英文課程成績的影響
    confirm({
      title: '送出前提醒',
      description: '提醒您，若您是此學期有修習英文課程之學生，此部分將影響部分的學期總成績，請確認資料正確及選考項目正確再行送出。',
      confirmText: '確認並下一步',
      cancelText: '返回檢查',
      variant: 'primary',
    }).then((ok) => {
      if (!ok) return;
      onNext(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <style>{`
        @keyframes errorPulse {
          0%, 100% { box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25); }
          50% { box-shadow: 0 0 0 0.5rem rgba(220, 53, 69, 0.5); }
        }
      `}</style>
      
      {/* B. 英語能力與培力資格相關 */}
      <div className="mb-4">
        <h4 className="mb-3" style={{ color: '#FF6B6B', borderBottom: '2px solid #FF6B6B', paddingBottom: '0.5rem' }}>
          英語能力與培力資格相關
        </h4>
        
        <div className="mb-3" ref={getFieldRef('examType')}>
          <label className="form-label">
            Q1. 報考項目 <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={errors.examType ? { 
            padding: '1rem', 
            border: '3px solid #dc3545', 
            borderRadius: '5px',
            backgroundColor: '#fff5f5'
          } : {}}>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="examType"
                value="LRSW"
                checked={formData.examType === 'LRSW'}
                onChange={handleChange}
              />
              <label className="form-check-label">聽說讀寫（LRSW）</label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="examType"
                value="LR"
                checked={formData.examType === 'LR'}
                onChange={handleChange}
              />
              <label className="form-check-label">聽讀（LR）</label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="examType"
                value="SW"
                checked={formData.examType === 'SW'}
                onChange={handleChange}
              />
              <label className="form-check-label">說寫（SW）</label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="examType"
                value="NON"
                checked={formData.examType === 'NON'}
                onChange={handleChange}
              />
              <label className="form-check-label" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                不報考（NON）- 作答完前四題即可送出表單。
              </label>
            </div>
          </div>
          {errors.examType && (
            <div className="text-danger mt-2 p-2 rounded" style={{ 
              backgroundColor: '#f8d7da', 
              border: '1px solid #f5c6cb',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              ⚠️ {errors.examType}
            </div>
          )}
        </div>

        {/* Q2: 是否曾取得 CEFR B2（一開始就顯示） */}
        <div className="mb-3" ref={getFieldRef('hasCEFRB2')}>
          <label className="form-label">
            Q2. 是否曾取得 CEFR B2（含）以上成績 <span style={{ color: 'red' }}>*</span>
          </label>
              <div style={errors.hasCEFRB2 ? { 
                padding: '1rem', 
                border: '3px solid #dc3545', 
                borderRadius: '5px',
                backgroundColor: '#fff5f5'
              } : {}}>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="hasCEFRB2"
                    value="是"
                    checked={formData.hasCEFRB2 === '是'}
                    onChange={handleChange}
                  />
                  <label className="form-check-label">是</label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="hasCEFRB2"
                    value="否"
                    checked={formData.hasCEFRB2 === '否'}
                    onChange={handleChange}
                  />
                  <label className="form-check-label">否</label>
                </div>
              </div>
              {errors.hasCEFRB2 && (
                <div className="text-danger mt-2 p-2 rounded" style={{ 
                  backgroundColor: '#f8d7da', 
                  border: '1px solid #f5c6cb',
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}>
                  ⚠️ {errors.hasCEFRB2}
                </div>
              )}
        </div>

        {/* 如果選擇「不報考」，顯示特殊提示 */}
        {formData.examType === 'NON' && (
          <div className="alert alert-warning mb-3">
            <strong>注意：</strong>您選擇不報考，若本學期有修習英語文課程且無提出英語檢定達CEFR B2以上相關證明，將會影響您的課堂成績。
          </div>
        )}

        {/* Q3 和 Q4：只在 Q2=是 時顯示 */}
        {formData.hasCEFRB2 === '是' && (
          <>
                <div className="mb-3" ref={getFieldRef('listeningExamType')}>
                  <label className="form-label">
                    Q3. 各項成績 <span style={{ color: 'red' }}>*</span>
                  </label>
                  
                  {/* 聽力成績 */}
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">聽力成績</label>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        name="listeningExamType"
                        value={formData.listeningExamType}
                        onChange={handleChange}
                        style={getErrorStyle('listeningExamType')}
                      >
                        <option value="">請選擇測驗類別</option>
                        <option value="TOEIC Listening & Reading">TOEIC Listening & Reading 多益聽讀</option>
                        <option value="TOEIC Speaking & Writing">TOEIC Speaking & Writing 多益說寫</option>
                        <option value="IELTS">IELTS 雅思</option>
                        <option value="TOEFL">TOEFL 托福</option>
                        <option value="GEPT">GEPT 全民英檢</option>
                        <option value="BESTEP">BESTEP 培力英檢</option>
                        <option value="FLPT">FLPT 外語能力測驗</option>
                        <option value="Cambridge Assessment English">Cambridge Assessment English 劍橋國際英語認證</option>
                      </select>
                    </div>
                    <div className="col-md-5">
                      <input
                        type="text"
                        className="form-control"
                        name="listeningScore"
                        value={formData.listeningScore}
                        onChange={handleChange}
                        placeholder="請輸入成績"
                        style={getErrorStyle('listeningScore')}
                      />
                    </div>
                  </div>
                  {errors.listeningScore && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      ⚠️ {errors.listeningScore}
                    </div>
                  )}
                  {formData.listeningExamType && formData.listeningScore && 
                   !errors.listeningScore &&
                   checkB2Level(formData.listeningExamType, formData.listeningScore, 'listening') === false && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      此成績未達B2，若是這學期有修習英文課將無法獲得課堂成績5%
                    </div>
                  )}

                  {/* 閱讀成績 */}
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">閱讀成績</label>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        name="readingExamType"
                        value={formData.readingExamType}
                        onChange={handleChange}
                        style={getErrorStyle('readingExamType')}
                      >
                        <option value="">請選擇測驗類別</option>
                        <option value="TOEIC Listening & Reading">TOEIC Listening & Reading 多益聽讀</option>
                        <option value="TOEIC Speaking & Writing">TOEIC Speaking & Writing 多益說寫</option>
                        <option value="IELTS">IELTS 雅思</option>
                        <option value="TOEFL">TOEFL 托福</option>
                        <option value="GEPT">GEPT 全民英檢</option>
                        <option value="BESTEP">BESTEP 培力英檢</option>
                        <option value="FLPT">FLPT 外語能力測驗</option>
                        <option value="Cambridge Assessment English">Cambridge Assessment English 劍橋國際英語認證</option>
                      </select>
                    </div>
                    <div className="col-md-5">
                      <input
                        type="text"
                        className="form-control"
                        name="readingScore"
                        value={formData.readingScore}
                        onChange={handleChange}
                        placeholder="請輸入成績"
                        style={getErrorStyle('readingScore')}
                      />
                    </div>
                  </div>
                  {errors.readingScore && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      ⚠️ {errors.readingScore}
                    </div>
                  )}
                  {formData.readingExamType && formData.readingScore && 
                   !errors.readingScore &&
                   checkB2Level(formData.readingExamType, formData.readingScore, 'reading') === false && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      此成績未達B2，若是這學期有修習英文課將無法獲得課堂成績5%
                    </div>
                  )}

                  {/* 口說成績 */}
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">口說成績</label>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        name="speakingExamType"
                        value={formData.speakingExamType}
                        onChange={handleChange}
                        style={getErrorStyle('speakingExamType')}
                      >
                        <option value="">請選擇測驗類別</option>
                        <option value="TOEIC Listening & Reading">TOEIC Listening & Reading 多益聽讀</option>
                        <option value="TOEIC Speaking & Writing">TOEIC Speaking & Writing 多益說寫</option>
                        <option value="IELTS">IELTS 雅思</option>
                        <option value="TOEFL">TOEFL 托福</option>
                        <option value="GEPT">GEPT 全民英檢</option>
                        <option value="BESTEP">BESTEP 培力英檢</option>
                        <option value="FLPT">FLPT 外語能力測驗</option>
                        <option value="Cambridge Assessment English">Cambridge Assessment English 劍橋國際英語認證</option>
                      </select>
                    </div>
                    <div className="col-md-5">
                      <input
                        type="text"
                        className="form-control"
                        name="speakingScore"
                        value={formData.speakingScore}
                        onChange={handleChange}
                        placeholder="請輸入成績"
                        style={getErrorStyle('speakingScore')}
                      />
                    </div>
                  </div>
                  {errors.speakingScore && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      ⚠️ {errors.speakingScore}
                    </div>
                  )}
                  {formData.speakingExamType && formData.speakingScore && 
                   !errors.speakingScore &&
                   checkB2Level(formData.speakingExamType, formData.speakingScore, 'speaking') === false && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      此成績未達B2，若是這學期有修習英文課將無法獲得課堂成績5%
                    </div>
                  )}

                  {/* 寫作成績 */}
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">寫作成績</label>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        name="writingExamType"
                        value={formData.writingExamType}
                        onChange={handleChange}
                        style={getErrorStyle('writingExamType')}
                      >
                        <option value="">請選擇測驗類別</option>
                        <option value="TOEIC Listening & Reading">TOEIC Listening & Reading 多益聽讀</option>
                        <option value="TOEIC Speaking & Writing">TOEIC Speaking & Writing 多益說寫</option>
                        <option value="IELTS">IELTS 雅思</option>
                        <option value="TOEFL">TOEFL 托福</option>
                        <option value="GEPT">GEPT 全民英檢</option>
                        <option value="BESTEP">BESTEP 培力英檢</option>
                        <option value="FLPT">FLPT 外語能力測驗</option>
                        <option value="Cambridge Assessment English">Cambridge Assessment English 劍橋國際英語認證</option>
                      </select>
                    </div>
                    <div className="col-md-5">
                      <input
                        type="text"
                        className="form-control"
                        name="writingScore"
                        value={formData.writingScore}
                        onChange={handleChange}
                        placeholder="請輸入成績"
                        style={getErrorStyle('writingScore')}
                      />
                    </div>
                  </div>
                  {errors.writingScore && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      ⚠️ {errors.writingScore}
                    </div>
                  )}
                  {formData.writingExamType && formData.writingScore && 
                   !errors.writingScore &&
                   checkB2Level(formData.writingExamType, formData.writingScore, 'writing') === false && (
                    <div className="text-danger mb-2" style={{ fontSize: '0.9rem', marginLeft: '15%' }}>
                      此成績未達B2，若是這學期有修習英文課將無法獲得課堂成績5%
                    </div>
                  )}

                  {(errors.listeningExamType || errors.listeningScore || errors.readingExamType || 
                    errors.readingScore || errors.speakingExamType || errors.speakingScore || 
                    errors.writingExamType || errors.writingScore) && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.listeningExamType || errors.listeningScore || errors.readingExamType || 
                           errors.readingScore || errors.speakingExamType || errors.speakingScore || 
                           errors.writingExamType || errors.writingScore}
                    </div>
                  )}
                </div>

                <div className="mb-3" ref={getFieldRef('b2CertificateFiles')}>
                  <label className="form-label">
                    Q4. 請上傳 B2 成績證明（可上傳多張） <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    name="b2CertificateFiles"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    style={errors.b2CertificateFiles ? {
                      border: '3px solid #dc3545',
                      backgroundColor: '#fff5f5'
                    } : {}}
                  />
                  <small className="text-muted">支援格式：PDF, JPG, PNG（可選擇多個檔案）</small>
                  {formData.b2CertificateFiles && formData.b2CertificateFiles.length > 0 && (
                    <div className="mt-2">
                      <small className="text-muted">已選擇 {formData.b2CertificateFiles.length} 個檔案：</small>
                      <ul className="list-unstyled mt-1">
                        {formData.b2CertificateFiles.map((file, index) => (
                          <li key={index} className="text-muted small">
                            • {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {errors.b2CertificateFiles && (
                    <div className="text-danger mt-2 p-2 rounded" style={{ 
                      backgroundColor: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      ⚠️ {errors.b2CertificateFiles}
                    </div>
                  )}
                </div>
              </>
            )}
      </div>

      {/* 按鈕 */}
      <div className="d-flex justify-content-between gap-2">
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
          style={{
            padding: '0.625rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: '#FF6B6B',
            borderColor: '#FF6B6B'
          }}
        >
          {formData.examType === 'NON' && formData.hasCEFRB2 === '否' 
            ? '送出表單' 
            : formData.examType === 'NON' 
            ? '結束報名' 
            : '下一步'}
        </button>
      </div>
    </form>
  );
}
