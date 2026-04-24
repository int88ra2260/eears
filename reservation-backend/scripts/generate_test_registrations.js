// scripts/generate_test_registrations.js
// 產生測試報名資料腳本
// 用途：生成 300 筆測試報名資料，用於測試後台管理功能（搜尋/篩選/分頁/審核/匯出/批量操作等）
// 注意：所有測試資料使用 @example.com 網域和 [TEST] 前綴標記，確保不影響正式資料

require('dotenv').config();
const { EnglishTestRegistration, sequelize } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// 注意：此腳本不依賴 faker 生成資料，使用固定的台灣常見資料列表
// 如需更豐富的假資料，可以安裝並使用 @faker-js/faker，但需要調整 API 呼叫方式

// 證件照模板檔案路徑（相對於腳本目錄）
const TEMPLATE_ID_PHOTO_PATH = path.join(__dirname, 'template-id-photo.png');
const ID_PHOTO_DIR = path.join(__dirname, '../uploads/english-test/id-photos');

// B2 證書模板檔案路徑（相對於腳本目錄）
const TEMPLATE_B2_CERTIFICATE_PATH = path.join(__dirname, 'template-b2-certificate.png');
const B2_CERTIFICATE_DIR = path.join(__dirname, '../uploads/english-test/certificates');

// 障礙證明模板檔案路徑（相對於腳本目錄）
const TEMPLATE_DISABILITY_CERT_FRONT_PATH = path.join(__dirname, 'template-disability-cert-front.png');
const TEMPLATE_DISABILITY_CERT_BACK_PATH = path.join(__dirname, 'template-disability-cert-back.png');
const DISABILITY_CERT_DIR = path.join(__dirname, '../uploads/english-test/disability-certs');

// 測試資料標記
const TEST_EMAIL_DOMAIN = '@example.com';
const TEST_NAME_PREFIX = '[TEST]';
const TEST_REMARK = '測試資料 - 由 generate_test_registrations.js 生成';

// 學院列表
const COLLEGES = ['文學院', '理學院', '工學院', '管理學院', '海洋科學院', '社會科學院', '西灣學院', '醫學院'];

// 科系選項（依學院）
const DEPARTMENT_OPTIONS = {
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

// 年級選項
const GRADES = ['一年級', '二年級', '三年級', '四年級以上'];

// 就讀身分選項
const DEGREE_LEVELS = ['學士班', '碩士班', '博士班'];

// 報考項目選項
const EXAM_TYPES = ['LRSW', 'LR', 'SW', 'NON'];

// 測驗類型選項（用於成績）
const EXAM_TYPE_OPTIONS = {
  listening: ['TOEIC', 'TOEFL', 'IELTS', '其他'],
  reading: ['TOEIC', 'TOEFL', 'IELTS', '其他'],
  speaking: ['TOEIC', 'TOEFL', 'IELTS', '其他'],
  writing: ['TOEIC', 'TOEFL', 'IELTS', '其他']
};

// 資訊來源選項
const INFO_SOURCES = ['學校官網', '同學推薦', '老師告知', '其他'];

// 生成台灣身分證字號（測試用）
function generateTaiwanIdNumber() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const numbers = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return letter + numbers;
}

// 生成學號（測試用，格式：B/M/D/N/I/J + 9位數字）
function generateStudentId() {
  const prefixes = ['B', 'M', 'D', 'N', 'I', 'J'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const numbers = String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');
  return prefix + numbers;
}

// 生成分數（根據測驗類型和是否達B2）
function generateScore(examType, hasB2) {
  if (examType === 'TOEIC') {
    // TOEIC LR: 0-990, SW: 0-400
    if (hasB2) {
      // 達B2：高分區間
      return Math.floor(Math.random() * 200) + 800; // 800-990 (LR) 或 300-400 (SW)
    } else {
      // 未達B2：低分區間
      return Math.floor(Math.random() * 400) + 200; // 200-600 (LR) 或 100-200 (SW)
    }
  } else if (examType === 'TOEFL') {
    // TOEFL: 0-120
    if (hasB2) {
      return Math.floor(Math.random() * 30) + 80; // 80-110
    } else {
      return Math.floor(Math.random() * 50) + 30; // 30-80
    }
  } else if (examType === 'IELTS') {
    // IELTS: 0-9
    if (hasB2) {
      return (Math.random() * 2 + 6).toFixed(1); // 6.0-8.0
    } else {
      return (Math.random() * 3 + 3).toFixed(1); // 3.0-6.0
    }
  }
  return String(Math.floor(Math.random() * 100));
}

// 複製證件照檔案並返回相對路徑
function copyIdPhoto(studentId, name) {
  try {
    // 確保目標資料夾存在
    if (!fs.existsSync(ID_PHOTO_DIR)) {
      fs.mkdirSync(ID_PHOTO_DIR, { recursive: true });
    }

    // 檢查模板檔案是否存在
    if (!fs.existsSync(TEMPLATE_ID_PHOTO_PATH)) {
      console.warn(`⚠️  警告：證件照模板檔案不存在：${TEMPLATE_ID_PHOTO_PATH}`);
      console.warn('   將跳過證件照檔案生成，僅在資料庫中記錄 null');
      return null;
    }

    // 清理檔名中的特殊字符
    const cleanStudentId = String(studentId).replace(/[^A-Z0-9]/g, '');
    const cleanName = String(name).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');

    // 生成檔名：學號-姓名-證件照.png
    const fileName = `${cleanStudentId}-${cleanName}-證件照.png`;
    const targetPath = path.join(ID_PHOTO_DIR, fileName);

    // 複製檔案
    fs.copyFileSync(TEMPLATE_ID_PHOTO_PATH, targetPath);

    // 返回相對路徑（不包含 uploads 前綴，前端會自動加上 /uploads/）
    return `english-test/id-photos/${fileName}`;
  } catch (error) {
    console.error(`❌ 複製證件照失敗 (${studentId}):`, error.message);
    return null;
  }
}

// 複製 B2 證書檔案並返回相對路徑陣列（支援多檔案）
function copyB2Certificate(studentId, name, fileCount = 1) {
  try {
    // 確保目標資料夾存在
    if (!fs.existsSync(B2_CERTIFICATE_DIR)) {
      fs.mkdirSync(B2_CERTIFICATE_DIR, { recursive: true });
    }

    // 檢查模板檔案是否存在
    if (!fs.existsSync(TEMPLATE_B2_CERTIFICATE_PATH)) {
      console.warn(`⚠️  警告：B2 證書模板檔案不存在：${TEMPLATE_B2_CERTIFICATE_PATH}`);
      console.warn('   將跳過 B2 證書檔案生成，僅在資料庫中記錄 null');
      return null;
    }

    // 清理檔名中的特殊字符
    const cleanStudentId = String(studentId).replace(/[^A-Z0-9]/g, '');
    const cleanName = String(name).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');

    // 生成多個檔案（1-3 個）
    const fileCountActual = Math.min(Math.max(1, fileCount), 3);
    const filePaths = [];

    for (let i = 1; i <= fileCountActual; i++) {
      // 生成檔名：學號-姓名(序號)-B2證書.png
      const fileName = fileCountActual > 1 
        ? `${cleanStudentId}-${cleanName}(${i})-B2證書.png`
        : `${cleanStudentId}-${cleanName}-B2證書.png`;
      const targetPath = path.join(B2_CERTIFICATE_DIR, fileName);

      // 複製檔案
      fs.copyFileSync(TEMPLATE_B2_CERTIFICATE_PATH, targetPath);

      // 記錄相對路徑（不包含 uploads 前綴，前端會自動加上 /uploads/）
      filePaths.push(`english-test/certificates/${fileName}`);
    }

    // 返回 JSON 陣列字串（與資料庫格式一致）
    return JSON.stringify(filePaths);
  } catch (error) {
    console.error(`❌ 複製 B2 證書失敗 (${studentId}):`, error.message);
    return null;
  }
}

// 複製障礙證明檔案（正面和反面）並返回相對路徑物件
function copyDisabilityCertificates(studentId, name) {
  try {
    // 確保目標資料夾存在
    if (!fs.existsSync(DISABILITY_CERT_DIR)) {
      fs.mkdirSync(DISABILITY_CERT_DIR, { recursive: true });
    }

    // 檢查模板檔案是否存在
    if (!fs.existsSync(TEMPLATE_DISABILITY_CERT_FRONT_PATH) || !fs.existsSync(TEMPLATE_DISABILITY_CERT_BACK_PATH)) {
      console.warn(`⚠️  警告：障礙證明模板檔案不存在`);
      console.warn('   將跳過障礙證明檔案生成，僅在資料庫中記錄 null');
      return { front: null, back: null };
    }

    // 清理檔名中的特殊字符
    const cleanStudentId = String(studentId).replace(/[^A-Z0-9]/g, '');
    const cleanName = String(name).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');

    // 生成檔名：學號-姓名-障礙證明正面.png / 學號-姓名-障礙證明反面.png
    const frontFileName = `${cleanStudentId}-${cleanName}-障礙證明正面.png`;
    const backFileName = `${cleanStudentId}-${cleanName}-障礙證明反面.png`;
    const frontTargetPath = path.join(DISABILITY_CERT_DIR, frontFileName);
    const backTargetPath = path.join(DISABILITY_CERT_DIR, backFileName);

    // 複製檔案
    fs.copyFileSync(TEMPLATE_DISABILITY_CERT_FRONT_PATH, frontTargetPath);
    fs.copyFileSync(TEMPLATE_DISABILITY_CERT_BACK_PATH, backTargetPath);

    // 返回相對路徑（不包含 uploads 前綴，前端會自動加上 /uploads/）
    return {
      front: `english-test/disability-certs/${frontFileName}`,
      back: `english-test/disability-certs/${backFileName}`
    };
  } catch (error) {
    console.error(`❌ 複製障礙證明失敗 (${studentId}):`, error.message);
    return { front: null, back: null };
  }
}

// 生成單筆測試報名資料
function generateRegistrationData(index, totalCount) {
  // 決定報名狀態分佈：40% 待審核, 45% 已通過, 15% 已退回
  const statusRand = Math.random();
  let status;
  if (statusRand < 0.4) {
    status = 'pending';
  } else if (statusRand < 0.85) {
    status = 'approved';
  } else {
    status = 'rejected';
  }

  // 決定是否達B2（50% 有，50% 沒有）
  const hasB2 = Math.random() < 0.5;
  const hasCEFRB2 = hasB2 ? '是' : '否';

  // 決定報考項目（平均分佈）
  const examType = EXAM_TYPES[Math.floor(Math.random() * EXAM_TYPES.length)];

  // 選擇學院和科系
  const college = COLLEGES[Math.floor(Math.random() * COLLEGES.length)];
  const departments = DEPARTMENT_OPTIONS[college];
  const department = departments[Math.floor(Math.random() * departments.length)];

  // 生成基本資料
  // 使用中文姓名生成（如果 faker 不支援中文，使用英文姓名 + 中文姓氏）
  const chineseSurnames = ['王', '李', '張', '劉', '陳', '楊', '黃', '趙', '周', '吳', '徐', '孫', '馬', '朱', '胡', '林', '郭', '何', '高', '羅'];
  const chineseGivenNames = ['小明', '美華', '志強', '雅婷', '建宏', '淑芬', '文傑', '怡君', '俊傑', '雅玲', '家豪', '怡如', '志明', '雅雯', '建志', '淑娟', '文豪', '怡靜', '俊宏', '雅芳'];
  const surname = chineseSurnames[Math.floor(Math.random() * chineseSurnames.length)];
  const givenName = chineseGivenNames[Math.floor(Math.random() * chineseGivenNames.length)];
  const name = TEST_NAME_PREFIX + surname + givenName;
  const studentId = generateStudentId();
  const idNumber = generateTaiwanIdNumber();
  const email = `test${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${TEST_EMAIL_DOMAIN}`;
  
  // 生成英文姓名（大寫）
  // 使用常見的英文姓氏和名字（台灣常見拼音）
  const englishLastNames = ['CHEN', 'WANG', 'LIN', 'LIU', 'CHANG', 'WU', 'CHUANG', 'LEE', 'HUANG', 'CHENG', 'TSAI', 'HSU', 'CHOU', 'CHUNG', 'YANG'];
  const englishFirstNames = ['MING', 'WEI', 'CHUN', 'YU', 'HSIN', 'CHIEN', 'TING', 'CHEN', 'YI', 'HUNG', 'CHIA', 'SHU', 'CHENG', 'WEN', 'CHI'];
  const lastNameEn = englishLastNames[Math.floor(Math.random() * englishLastNames.length)];
  const firstNameEn = englishFirstNames[Math.floor(Math.random() * englishFirstNames.length)];

  // 生成出生日期（18-25歲）
  // 計算出生日期：當前日期減去隨機年齡
  const age = Math.floor(Math.random() * (25 - 18 + 1)) + 18;
  const birthDate = new Date();
  birthDate.setFullYear(birthDate.getFullYear() - age);
  birthDate.setMonth(Math.floor(Math.random() * 12));
  birthDate.setDate(Math.floor(Math.random() * 28) + 1); // 1-28 避免月份天數問題

  // 生成電話（09xxxxxxxx）
  const phone = '09' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

  // 生成地址（使用台灣地址）
  const postalCode = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  const taiwanCities = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '基隆市', '新竹市', '嘉義市'];
  const taiwanDistricts = ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區'];
  const city = taiwanCities[Math.floor(Math.random() * taiwanCities.length)];
  const district = taiwanDistricts[Math.floor(Math.random() * taiwanDistricts.length)];
  const streetNumbers = ['一段', '二段', '三段', '四段', '五段'];
  const taiwanStreets = ['中山路', '中正路', '民族路', '民生路', '建國路', '成功路', '自由路', '和平路', '復興路', '忠孝路', '仁愛路', '信義路', '光復路', '文化路', '大學路'];
  const streetName = taiwanStreets[Math.floor(Math.random() * taiwanStreets.length)];
  const address = `${streetName}${streetNumbers[Math.floor(Math.random() * streetNumbers.length)]}${Math.floor(Math.random() * 200) + 1}號`;

  // 選擇年級和就讀身分
  const grade = GRADES[Math.floor(Math.random() * GRADES.length)];
  const degreeLevel = DEGREE_LEVELS[Math.floor(Math.random() * DEGREE_LEVELS.length)];

  // 生成成績（如果報考項目不是 NON）
  let listeningExamType = null;
  let listeningScore = null;
  let readingExamType = null;
  let readingScore = null;
  let speakingExamType = null;
  let speakingScore = null;
  let writingExamType = null;
  let writingScore = null;

  if (examType !== 'NON') {
    if (examType === 'LRSW' || examType === 'LR') {
      // 聽讀測驗
      listeningExamType = EXAM_TYPE_OPTIONS.listening[Math.floor(Math.random() * EXAM_TYPE_OPTIONS.listening.length)];
      listeningScore = String(generateScore(listeningExamType, hasB2));
      readingExamType = EXAM_TYPE_OPTIONS.reading[Math.floor(Math.random() * EXAM_TYPE_OPTIONS.reading.length)];
      readingScore = String(generateScore(readingExamType, hasB2));
    }
    if (examType === 'LRSW' || examType === 'SW') {
      // 說寫測驗
      speakingExamType = EXAM_TYPE_OPTIONS.speaking[Math.floor(Math.random() * EXAM_TYPE_OPTIONS.speaking.length)];
      speakingScore = String(generateScore(speakingExamType, hasB2));
      writingExamType = EXAM_TYPE_OPTIONS.writing[Math.floor(Math.random() * EXAM_TYPE_OPTIONS.writing.length)];
      writingScore = String(generateScore(writingExamType, hasB2));
    }
  }

  // 生成日期（最近10天，其中20%集中在最近7天）
  const daysAgo = Math.random() < 0.2 
    ? Math.floor(Math.random() * 7)  // 20% 在最近7天
    : Math.floor(Math.random() * 10); // 80% 在最近10天
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  createdAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

  // 如果已通過，設定通過時間
  let approvedAt = null;
  let approvedSequence = null;
  if (status === 'approved') {
    approvedAt = new Date(createdAt);
    approvedAt.setDate(approvedAt.getDate() + Math.floor(Math.random() * 5) + 1); // 報名後1-5天通過
    approvedSequence = index + 1; // 簡單的序號
  }

  // 如果已退回，生成拒絕原因
  let rejectionReasons = null;
  let rejectionOther = null;
  if (status === 'rejected') {
    const reasons = ['資料不完整', '資格不符', '其他'];
    rejectionReasons = [reasons[Math.floor(Math.random() * reasons.length)]];
    if (rejectionReasons[0] === '其他') {
      rejectionOther = '測試拒絕原因說明';
    }
  }

  return {
    studentId,
    name,
    idNumber,
    email,
    studentNameZh: name,
    lastNameEn,
    firstNameEn,
    birthDate: birthDate.toISOString().split('T')[0],
    examType: examType === 'NON' ? null : examType,
    hasTakenBESTEP: Math.random() < 0.3 ? '是' : '否', // 30% 曾報考
    hasCEFRB2,
    passedExamTypes: hasB2 ? ['TOEIC', 'TOEFL'] : null,
    passedExamOther: null,
    b2CertificateFile: null, // 將在寫入資料庫前生成檔案並設定路徑（僅 hasB2 = '是' 時）
    b2SkillType: null,
    listeningExamType,
    listeningScore,
    readingExamType,
    readingScore,
    speakingExamType,
    speakingScore,
    writingExamType,
    writingScore,
    nationalId: idNumber,
    phone,
    postalCode,
    city,
    district,
    address,
    degreeLevel,
    grade,
    college,
    department,
    isLowIncome: Math.random() < 0.1 ? '是' : '否', // 10% 中低收入戶
    hasDisabilityCard: Math.random() < 0.05 ? '是' : '否', // 5% 有身心障礙
    disabilityTypes: null,
    disabilityCertFront: null, // 將在寫入資料庫前生成檔案並設定路徑（僅 hasDisabilityCard = '是' 時）
    disabilityCertBack: null, // 將在寫入資料庫前生成檔案並設定路徑（僅 hasDisabilityCard = '是' 時）
    examAssistanceOptions: null,
    examAssistanceOther: null,
    idPhoto: null, // 將在寫入資料庫前生成檔案並設定路徑
    agreedToTerms: true,
    infoSource: INFO_SOURCES[Math.floor(Math.random() * INFO_SOURCES.length)],
    status,
    notes: TEST_REMARK,
    rejectionReasons,
    rejectionOther,
    approvedAt,
    approvedSequence,
    createdAt,
    updatedAt: createdAt
  };
}

// 主函數
async function generateTestRegistrations(count = 300) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 開始生成測試報名資料...\n');
    console.log(`📊 目標數量：${count} 筆\n`);

    // 先檢查是否已有測試資料
    const existingTestCount = await EnglishTestRegistration.count({
      where: {
        [Op.or]: [
          { email: { [Op.like]: `%${TEST_EMAIL_DOMAIN}` } },
          { name: { [Op.like]: `${TEST_NAME_PREFIX}%` } },
          { notes: TEST_REMARK }
        ]
      },
      transaction
    });

    if (existingTestCount > 0) {
      console.log(`⚠️  發現 ${existingTestCount} 筆現有測試資料`);
      console.log('💡 提示：執行 reset 模式可清除所有測試資料\n');
    }

    // 生成資料
    const registrations = [];
    const errors = [];
    
    console.log('📝 正在生成資料...');
    for (let i = 0; i < count; i++) {
      try {
        const data = generateRegistrationData(i, count);
        
        // 檢查學號是否已存在（避免重複）
        const existing = await EnglishTestRegistration.findOne({
          where: { studentId: data.studentId },
          transaction
        });
        
        if (existing) {
          // 如果學號已存在，重新生成
          data.studentId = generateStudentId();
        }
        
        registrations.push(data);
        
        if ((i + 1) % 50 === 0) {
          console.log(`  ✅ 已生成 ${i + 1}/${count} 筆`);
        }
      } catch (error) {
        errors.push({ index: i, error: error.message });
        console.error(`  ❌ 第 ${i + 1} 筆資料生成失敗:`, error.message);
      }
    }

    console.log(`\n📸 正在生成證件照檔案...`);
    
    // 為每筆資料生成證件照檔案
    let photoCount = 0;
    for (let i = 0; i < registrations.length; i++) {
      const data = registrations[i];
      const photoPath = copyIdPhoto(data.studentId, data.name);
      if (photoPath) {
        data.idPhoto = photoPath;
        photoCount++;
      }
      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ 已生成 ${i + 1}/${registrations.length} 筆證件照`);
      }
    }
    console.log(`  ✅ 證件照生成完成：${photoCount}/${registrations.length} 筆\n`);

    console.log(`📜 正在生成 B2 證書檔案...`);
    
    // 為有 B2 證書的資料生成 B2 證書檔案（hasCEFRB2 = '是'）
    let b2CertificateCount = 0;
    for (let i = 0; i < registrations.length; i++) {
      const data = registrations[i];
      if (data.hasCEFRB2 === '是') {
        // 隨機生成 1-3 個檔案（模擬多檔案上傳）
        const fileCount = Math.floor(Math.random() * 3) + 1;
        const b2CertificatePath = copyB2Certificate(data.studentId, data.name, fileCount);
        if (b2CertificatePath) {
          data.b2CertificateFile = b2CertificatePath;
          b2CertificateCount++;
        }
      }
      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ 已生成 ${i + 1}/${registrations.length} 筆 B2 證書`);
      }
    }
    console.log(`  ✅ B2 證書生成完成：${b2CertificateCount} 筆（僅 hasCEFRB2 = '是' 的資料）\n`);

    console.log(`🪪 正在生成障礙證明檔案...`);
    
    // 為有身心障礙的資料生成障礙證明檔案（hasDisabilityCard = '是'）
    let disabilityCertCount = 0;
    for (let i = 0; i < registrations.length; i++) {
      const data = registrations[i];
      if (data.hasDisabilityCard === '是') {
        const certPaths = copyDisabilityCertificates(data.studentId, data.name);
        if (certPaths.front && certPaths.back) {
          data.disabilityCertFront = certPaths.front;
          data.disabilityCertBack = certPaths.back;
          disabilityCertCount++;
        }
      }
      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ 已生成 ${i + 1}/${registrations.length} 筆障礙證明`);
      }
    }
    console.log(`  ✅ 障礙證明生成完成：${disabilityCertCount} 筆（僅 hasDisabilityCard = '是' 的資料）\n`);

    console.log(`💾 正在寫入資料庫...`);
    
    // 批量寫入（每批50筆）
    const batchSize = 50;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < registrations.length; i += batchSize) {
      const batch = registrations.slice(i, i + batchSize);
      try {
        await EnglishTestRegistration.bulkCreate(batch, {
          transaction,
          ignoreDuplicates: true
        });
        successCount += batch.length;
        console.log(`  ✅ 已寫入 ${Math.min(i + batchSize, registrations.length)}/${registrations.length} 筆`);
      } catch (error) {
        failCount += batch.length;
        console.error(`  ❌ 批次 ${Math.floor(i / batchSize) + 1} 寫入失敗:`, error.message);
        
        // 如果批量寫入失敗，嘗試逐筆寫入以找出問題資料
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
          console.log('  🔍 嘗試逐筆寫入以找出問題...');
          for (const data of batch) {
            try {
              await EnglishTestRegistration.create(data, { transaction });
              successCount++;
            } catch (singleError) {
              failCount++;
              console.error(`    ❌ 失敗資料:`, {
                studentId: data.studentId,
                name: data.name,
                error: singleError.message
              });
            }
          }
        }
      }
    }

    await transaction.commit();

    console.log('\n' + '='.repeat(60));
    console.log('📊 生成結果統計');
    console.log('='.repeat(60));
    console.log(`✅ 成功：${successCount} 筆`);
    console.log(`❌ 失敗：${failCount} 筆`);
    console.log(`📝 總計：${successCount + failCount} 筆\n`);

    // 統計狀態分佈
    const stats = await EnglishTestRegistration.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: `%${TEST_EMAIL_DOMAIN}` } },
          { name: { [Op.like]: `${TEST_NAME_PREFIX}%` } },
          { notes: TEST_REMARK }
        ]
      },
      attributes: ['status', 'examType', 'hasCEFRB2'],
      raw: true
    });

    const statusStats = {
      pending: stats.filter(s => s.status === 'pending').length,
      approved: stats.filter(s => s.status === 'approved').length,
      rejected: stats.filter(s => s.status === 'rejected').length
    };

    const examTypeStats = {
      LRSW: stats.filter(s => s.examType === 'LRSW').length,
      LR: stats.filter(s => s.examType === 'LR').length,
      SW: stats.filter(s => s.examType === 'SW').length,
      NON: stats.filter(s => s.examType === 'NON' || !s.examType).length
    };

    const b2Stats = {
      yes: stats.filter(s => s.hasCEFRB2 === '是').length,
      no: stats.filter(s => s.hasCEFRB2 === '否').length
    };

    console.log('📈 狀態分佈：');
    console.log(`  待審核：${statusStats.pending} 筆 (${((statusStats.pending / stats.length) * 100).toFixed(1)}%)`);
    console.log(`  已通過：${statusStats.approved} 筆 (${((statusStats.approved / stats.length) * 100).toFixed(1)}%)`);
    console.log(`  已退回：${statusStats.rejected} 筆 (${((statusStats.rejected / stats.length) * 100).toFixed(1)}%)\n`);

    console.log('📈 報考項目分佈：');
    console.log(`  四項全考 (LRSW)：${examTypeStats.LRSW} 筆`);
    console.log(`  聽讀 (LR)：${examTypeStats.LR} 筆`);
    console.log(`  說寫 (SW)：${examTypeStats.SW} 筆`);
    console.log(`  不報考 (NON)：${examTypeStats.NON} 筆\n`);

    console.log('📈 B2 以上分佈：');
    console.log(`  是：${b2Stats.yes} 筆 (${((b2Stats.yes / stats.length) * 100).toFixed(1)}%)`);
    console.log(`  否：${b2Stats.no} 筆 (${((b2Stats.no / stats.length) * 100).toFixed(1)}%)\n`);

    console.log('✅ 測試資料生成完成！\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ 發生錯誤，已回滾所有變更：');
    console.error(error);
    process.exit(1);
  }
}

// Reset 函數：刪除所有測試資料
async function resetTestRegistrations() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🗑️  開始清除測試資料...\n');

    // 先查詢所有測試資料，以便刪除對應的檔案
    const testRegistrations = await EnglishTestRegistration.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: `%${TEST_EMAIL_DOMAIN}` } },
          { name: { [Op.like]: `${TEST_NAME_PREFIX}%` } },
          { notes: TEST_REMARK }
        ]
      },
      attributes: ['idPhoto', 'b2CertificateFile', 'disabilityCertFront', 'disabilityCertBack'],
      transaction
    });

    // 刪除證件照、B2 證書和障礙證明檔案
    let deletedPhotoCount = 0;
    let deletedB2Count = 0;
    let deletedDisabilityCertCount = 0;
    const baseUploadPath = path.join(__dirname, '../uploads');
    
    // 刪除單一檔案的輔助函數
    // 注意：資料庫中的路徑格式可能是：
    // 1. english-test/id-photos/... (正確格式，不包含 uploads/ 前綴，與 API 一致)
    // 2. uploads/english-test/id-photos/... (舊格式，需要兼容處理)
    const deleteFile = (filePath, fileType) => {
      try {
        // 處理相對路徑和絕對路徑
        let fullPath;
        if (path.isAbsolute(filePath)) {
          fullPath = filePath;
        } else {
          // 統一處理：移除 uploads/ 前綴（如果有的話），然後加上 uploads 目錄
          // 這樣可以兼容新舊兩種格式
          const normalizedPath = filePath.startsWith('uploads/') 
            ? filePath.replace(/^uploads\//, '') 
            : filePath;
          fullPath = path.join(baseUploadPath, normalizedPath);
        }
        
        fullPath = path.normalize(fullPath);
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️  刪除${fileType}檔案失敗: ${filePath}`, error.message);
      }
      return false;
    };
    
    for (const reg of testRegistrations) {
      // 刪除證件照
      if (reg.idPhoto) {
        if (deleteFile(reg.idPhoto, '證件照')) {
          deletedPhotoCount++;
        }
      }
      
      // 刪除 B2 證書（可能是多檔案，儲存為 JSON 陣列字串）
      if (reg.b2CertificateFile) {
        try {
          const b2Files = JSON.parse(reg.b2CertificateFile);
          if (Array.isArray(b2Files)) {
            for (const b2File of b2Files) {
              if (deleteFile(b2File, 'B2證書')) {
                deletedB2Count++;
              }
            }
          } else {
            // 如果不是陣列，當作單一檔案處理
            if (deleteFile(reg.b2CertificateFile, 'B2證書')) {
              deletedB2Count++;
            }
          }
        } catch (error) {
          // 如果不是 JSON 格式，當作單一檔案處理
          if (deleteFile(reg.b2CertificateFile, 'B2證書')) {
            deletedB2Count++;
          }
        }
      }
      
      // 刪除障礙證明（正面和反面）
      if (reg.disabilityCertFront) {
        if (deleteFile(reg.disabilityCertFront, '障礙證明正面')) {
          deletedDisabilityCertCount++;
        }
      }
      if (reg.disabilityCertBack) {
        if (deleteFile(reg.disabilityCertBack, '障礙證明反面')) {
          deletedDisabilityCertCount++;
        }
      }
    }

    // 刪除資料庫記錄
    const deletedCount = await EnglishTestRegistration.destroy({
      where: {
        [Op.or]: [
          { email: { [Op.like]: `%${TEST_EMAIL_DOMAIN}` } },
          { name: { [Op.like]: `${TEST_NAME_PREFIX}%` } },
          { notes: TEST_REMARK }
        ]
      },
      transaction
    });

    await transaction.commit();

    console.log(`✅ 已清除 ${deletedCount} 筆測試資料`);
    if (deletedPhotoCount > 0 || deletedB2Count > 0 || deletedDisabilityCertCount > 0) {
      if (deletedPhotoCount > 0) {
        console.log(`✅ 已刪除 ${deletedPhotoCount} 個證件照檔案`);
      }
      if (deletedB2Count > 0) {
        console.log(`✅ 已刪除 ${deletedB2Count} 個 B2 證書檔案`);
      }
      if (deletedDisabilityCertCount > 0) {
        console.log(`✅ 已刪除 ${deletedDisabilityCertCount} 個障礙證明檔案`);
      }
      console.log('');
    } else {
      console.log('');
    }
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ 清除測試資料時發生錯誤：');
    console.error(error);
    process.exit(1);
  }
}

// 主程式
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'reset') {
      await resetTestRegistrations();
    } else {
      const count = parseInt(args[0]) || 300;
      await generateTestRegistrations(count);
    }
  } catch (error) {
    console.error('❌ 執行失敗：', error);
    process.exit(1);
  } finally {
    // 不關閉 sequelize，讓 models/index.js 中的 sync 正常執行
    // 腳本結束時 Node.js 會自動清理
    process.exit(0);
  }
}

// 執行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 執行失敗：', error);
    process.exit(1);
  });
}

module.exports = { generateTestRegistrations, resetTestRegistrations };
