// src/utils/validators.js
// 前端驗證工具 (與後端保持一致)

// 學號驗證：一位大寫英文(B/M/D/I/J) + 9位數字
const studentIdRegex = /^[BMDNIJ]\d{9}$/;

// 姓名驗證：只能是中文或英文(可包含空格)
const studentNameRegex = /^[\u4E00-\u9FA5A-Za-z\s]+$/;

// Email 驗證
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 驗證學號格式
 * @param {string} studentId 學號
 * @returns {boolean} 是否有效
 */
export function validateStudentId(studentId) {
  return studentIdRegex.test(studentId);
}

/**
 * 驗證姓名格式
 * @param {string} name 姓名
 * @returns {boolean} 是否有效
 */
export function validateName(name) {
  return studentNameRegex.test(name);
}

/**
 * 驗證Email格式
 * @param {string} email Email地址
 * @returns {boolean} 是否有效
 */
export function validateEmail(email) {
  return emailRegex.test(email);
}

/**
 * 驗證預約所需的基本資料
 * @param {Object} data 包含 studentId, studentName, studentEmail 的物件
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateReservationData(data) {
  const { studentId, studentName, studentEmail } = data;
  const errors = [];

  if (!studentId) {
    errors.push('學號為必填項目 Student ID is required');
  } else if (!validateStudentId(studentId)) {
    errors.push('學號格式錯誤，應為(B/M/D/I/J)+9位數字 Invalid Student ID format');
  }

  if (!studentName) {
    errors.push('姓名為必填項目 Name is required');
  } else if (String(studentName).trim().length < 2) {
    errors.push('姓名至少需 2 個字元 Name must be at least 2 characters');
  } else if (!validateName(studentName)) {
    errors.push('姓名只能包含中文或英文 Name can only contain Chinese or English characters');
  }

  if (!studentEmail) {
    errors.push('Email為必填項目 Email is required');
  } else if (!validateEmail(studentEmail)) {
    errors.push('Email格式不正確 Invalid Email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

