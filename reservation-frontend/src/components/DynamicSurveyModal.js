// src/components/DynamicSurveyModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Card } from 'react-bootstrap';

// LIKERT量表選項
const LIKERT_OPTIONS = [
  { value: 1, label: '非常不同意 / Strongly Disagree' },
  { value: 2, label: '不同意 / Disagree' },
  { value: 3, label: '沒意見 / Neutral' },
  { value: 4, label: '同意 / Agree' },
  { value: 5, label: '非常同意 / Strongly Agree' }
];

const STUDENT_BASIC_INFO_FIELDS = [
  {
    id: 'studentId',
    type: 'text',
    label: '學號 / Student ID',
    placeholder: '請輸入學號 / Please enter your student ID',
  },
  {
    id: 'studentName',
    type: 'text',
    label: '姓名 / Name',
    placeholder: '請輸入姓名 / Please enter your name',
  },
  {
    id: 'studentEmail',
    type: 'email',
    label: 'Email',
    placeholder: '請輸入 Email / Please enter your email',
  },
];

export default function DynamicSurveyModal({ show, onClose, onSurveyComplete, userInfo, surveyConfig }) {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refs, setRefs] = useState({});

  // 初始化 refs 和表單數據
  useEffect(() => {
    if (show && surveyConfig) {
      const newRefs = {};
      const initialData = {};

      STUDENT_BASIC_INFO_FIELDS.forEach(field => {
        newRefs[field.id] = React.createRef();
        initialData[field.id] = userInfo?.[field.id] || '';
      });
      
      surveyConfig.questions.forEach(question => {
        newRefs[question.id] = React.createRef();
        
        // 如果有預約資料且是學生基本資料欄位，則預填資料
        if (userInfo && ['studentId', 'studentName', 'studentEmail'].includes(question.id)) {
          if (question.id === 'studentId' && userInfo.studentId) {
            initialData[question.id] = userInfo.studentId;
          } else if (question.id === 'studentName' && userInfo.studentName) {
            initialData[question.id] = userInfo.studentName;
          } else if (question.id === 'studentEmail' && userInfo.studentEmail) {
            initialData[question.id] = userInfo.studentEmail;
          } else {
            initialData[question.id] = question.type === 'checkbox' ? [] : '';
          }
        } else {
          initialData[question.id] = question.type === 'checkbox' ? [] : '';
        }
      });
      
      setRefs(newRefs);
      setFormData(initialData);
      setError('');
      setSuccess('');
    }
  }, [show, surveyConfig, userInfo]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, option, checked) => {
    setFormData(prev => {
      const currentValues = prev[field] || [];
      if (checked) {
        return { ...prev, [field]: [...currentValues, option] };
      } else {
        return { ...prev, [field]: currentValues.filter(v => v !== option) };
      }
    });
  };

  const validateForm = () => {
    console.log('validateForm called');
    console.log('surveyConfig:', surveyConfig);
    console.log('formData:', formData);
    console.log('userInfo:', userInfo);
    
    if (!surveyConfig) {
      console.log('No surveyConfig');
      return false;
    }

    // 檢查是否有預約資料
    const hasReservationData = userInfo && userInfo.studentId && userInfo.studentName && userInfo.studentEmail;
    console.log('Has reservation data:', hasReservationData);

    if (!hasReservationData) {
      for (const field of STUDENT_BASIC_INFO_FIELDS) {
        const value = formData[field.id];
        if (!value || String(value).trim() === '') {
          setError(`請填寫：${field.label} / Please fill in: ${field.label}`);
          refs[field.id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }
      }

      const studentEmail = formData.studentEmail;
      if (studentEmail && studentEmail.trim().length > 3) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentEmail)) {
          setError('Email格式不正確 / Invalid email format');
          refs.studentEmail?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }
      }
    }

    // 檢查必填欄位
    for (const question of surveyConfig.questions) {
      if (question.required) {
        const value = formData[question.id];
        console.log(`Checking required question ${question.id}:`, value);
        
        // 如果是學生基本資料且有預約資料，則跳過驗證
        if (hasReservationData && ['studentId', 'studentName', 'studentEmail'].includes(question.id)) {
          console.log(`Skipping validation for ${question.id} due to reservation data`);
          continue;
        }
        
        if (!value || (Array.isArray(value) && value.length === 0)) {
          console.log(`Missing required field: ${question.label}`);
          setError(`請填寫：${question.label} / Please fill in: ${question.label}`);
          refs[question.id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }
      }
    }

    // 檢查email格式（如果提供且長度大於3個字符）
    const emailQuestions = surveyConfig.questions.filter(q => q.type === 'email');
    for (const emailQuestion of emailQuestions) {
      const email = formData[emailQuestion.id];
      if (email && email.trim() && email.trim().length > 3) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          console.log('Invalid email format:', email);
          setError('聯絡信箱格式不正確 / Invalid email format');
          return false;
        }
      }
    }

    console.log('Form validation passed');
    return true;
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called'); // Debug: 確認函數被調用
    
    if (!validateForm()) {
      console.log('Form validation failed'); // Debug: 表單驗證失敗
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 檢查是否有預約資料
      const hasReservationData = userInfo && userInfo.studentId && userInfo.studentName && userInfo.studentEmail;
      console.log('Has reservation data:', hasReservationData);

      // 準備提交數據 - 優先使用表單中的學生資料，其次使用 userInfo
      const submitData = {
        // 從表單資料中取得學生基本資料，如果沒有則使用 userInfo
        studentId: formData.studentId || (userInfo && userInfo.studentId) || '',
        name: formData.studentName || (userInfo && userInfo.studentName) || '',
        email: formData.studentEmail || (userInfo && userInfo.studentEmail) || '',
        // 其他表單資料
        ...formData,
      };

      // Debug: 記錄 submitData
      console.log('Submit Data:', submitData);

      // 防呆：確認 studentId 存在
      if (!submitData.studentId || submitData.studentId === 'undefined' || submitData.studentId.trim() === '') {
        setError('請填寫學號 / Please fill in Student ID');
        setIsSubmitting(false);
        return;
      }

      // 防呆：確認姓名和Email存在
      if (!submitData.name || submitData.name.trim() === '') {
        setError('請填寫姓名 / Please fill in Name');
        setIsSubmitting(false);
        return;
      }

      if (!submitData.email || submitData.email.trim() === '') {
        setError('請填寫Email / Please fill in Email');
        setIsSubmitting(false);
        return;
      }

      // 檢查 email 格式（如果 email 長度大於 3 個字符）
      if (submitData.email && submitData.email.trim().length > 3) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(submitData.email)) {
          setError('Email格式不正確 / Invalid email format');
          setIsSubmitting(false);
          return;
        }
      }

      // 統一使用新版通用問卷提交 API
      const apiEndpoint = `/api/surveys/${surveyConfig.id}`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('問卷已成功送出，謝謝您的寶貴意見！ / Survey submitted successfully, thank you for your valuable feedback!');
        setTimeout(() => {
          onClose();
          if (onSurveyComplete) {
            onSurveyComplete();
          }
        }, 1500);
      } else {
        // 檢查是否是因為已經填寫過問卷
        if (response.status === 400 && data.error && data.error.includes('已填過')) {
          setError('您本學期已填寫過此問卷，無需重複填寫。 / You have already filled out this survey this semester, no need to fill it out again.');
        } else {
          setError(data.error || '問卷送出失敗，請稍後再試 / Survey submission failed, please try again later');
        }
      }
    } catch (err) {
      setError('網路錯誤，請檢查連線後再試 / Network error, please check your connection and try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question) => {
    const value = formData[question.id] || (question.type === 'checkbox' ? [] : '');

    switch (question.type) {
      case 'radio':
        return (
          <div>
            {question.options.map(option => (
              <Form.Check
                key={option}
                type="radio"
                label={option}
                name={question.id}
                value={option}
                checked={value === option}
                onChange={() => handleInputChange(question.id, option)}
                className="mb-2"
              />
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div>
            {question.options.map(option => (
              <Form.Check
                key={option}
                type="checkbox"
                label={option}
                checked={value.includes(option)}
                onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                className="mb-2"
              />
            ))}
          </div>
        );

      case 'text':
        return (
          <Form.Control
            type="text"
            placeholder={`請輸入${question.label}`}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
          />
        );

      case 'email':
        return (
          <Form.Control
            type="email"
            placeholder="請輸入聯絡信箱"
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
          />
        );

      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={`請輸入${question.label}`}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
          />
        );

      case 'likert':
        return (
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">非常不同意 / Strongly Disagree</span>
            <div className="d-flex gap-2">
              {LIKERT_OPTIONS.map(option => (
                <Form.Check
                  key={option.value}
                  type="radio"
                  inline
                  label={option.value}
                  name={question.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => handleInputChange(question.id, option.value)}
                  className="mx-1"
                  style={{ 
                    backgroundColor: value === option.value ? '#e3f2fd' : 'transparent',
                    borderRadius: '4px',
                    padding: '2px 6px'
                  }}
                />
              ))}
            </div>
            <span className="text-muted small">非常同意 / Strongly Agree</span>
          </div>
        );

      default:
        return <div>不支援的問題類型：{question.type}</div>;
    }
  };

  if (!surveyConfig) return null;

  return (
    <Modal show={show} onHide={onClose} backdrop="static" centered size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          <div>{surveyConfig.title}</div>
          {surveyConfig.subtitle ? (
            <div className="text-muted" style={{ fontSize: '0.95rem', fontWeight: 400 }}>
              {surveyConfig.subtitle}
            </div>
          ) : null}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh' }}>
        <div className="mb-4">
          <p className="text-muted">{surveyConfig.description}</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {!(userInfo && userInfo.studentId && userInfo.studentName && userInfo.studentEmail) && (
          <Card className="mb-3 border-0 shadow-sm" style={{ backgroundColor: '#fff8e1' }}>
            <Card.Body className="p-3">
              <h6 className="fw-bold text-primary mb-3">
                <i className="fas fa-id-card me-2"></i>
                學生基本資料 / Student Information
              </h6>
              <p className="text-muted small mb-3">
                問卷需使用學號判斷本學期填答狀態，請確認資料正確。
              </p>
              {STUDENT_BASIC_INFO_FIELDS.map(field => (
                <Form.Group key={field.id} ref={refs[field.id]} className="mb-3">
                  <Form.Label className="fw-bold">
                    {field.label}
                    <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                </Form.Group>
              ))}
            </Card.Body>
          </Card>
        )}

        {surveyConfig.questions.map((question, index) => {
          // 檢查是否有預約資料且是學生基本資料欄位
          const hasReservationData = userInfo && userInfo.studentId && userInfo.studentName && userInfo.studentEmail;
          const isStudentBasicInfo = ['studentId', 'studentName', 'studentEmail'].includes(question.id);
          
          // 如果有預約資料且是學生基本資料欄位，則隱藏
          if (hasReservationData && isStudentBasicInfo) {
            return null;
          }
          
          return (
            <Card key={question.id} ref={refs[question.id]} className="mb-3 border-0 shadow-sm" style={{ backgroundColor: '#f8f9fa' }}>
              <Card.Body className="p-3">
                <Form.Group>
                  <Form.Label className="fw-bold mb-3 text-primary">
                    <i className="fas fa-question-circle me-2"></i>
                    {question.label}
                    {question.required && <span className="text-danger ms-1">*</span>}
                  </Form.Label>
                  {renderQuestion(question)}
                </Form.Group>
              </Card.Body>
            </Card>
          );
        })}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          稍後填寫 / Fill Later
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? '送出中... / Submitting...' : '送出問卷 / Submit Survey'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
