/**
 * 培力英檢抵免：顯示用映射與計算（與 bestepClassService、抵免審核 API 共用）
 */

const EXEMPTION_VERIFIED_CODES = ['LRSW', 'LR', 'SW', 'NONE'];

/**
 * 將資料庫代碼轉為四種中文顯示
 */
function mapVerifiedTypeToZh(code) {
  if (!code || code === 'NONE') return '無';
  const m = {
    LRSW: '聽讀說寫',
    LR: '聽讀',
    SW: '說寫',
    NONE: '無'
  };
  return m[code] || '無';
}

/**
 * 班級統計：抵免「有效通過」— approved 且 verified 類型非 NONE
 */
function isCountedExemptionApproval(reg) {
  return !!(
    reg &&
    reg.exemption_review_status === 'approved' &&
    reg.exemption_verified_type &&
    String(reg.exemption_verified_type).toUpperCase() !== 'NONE'
  );
}

/**
 * 僅在 exemption_review_status === 'approved' 時顯示實際抵免，否則一律「無」
 */
function computeExemptionDisplayType(reg) {
  if (!reg || reg.exemption_review_status !== 'approved') {
    return '無';
  }
  return mapVerifiedTypeToZh(reg.exemption_verified_type);
}

function nonEmpty(v) {
  return v != null && String(v).trim() !== '';
}

/**
 * 是否「有填寫 B2 成績」：至少一項聽讀說寫有成績欄位（與測驗類別併存）
 */
function hasB2ScoresFilled(reg) {
  if (!reg) return false;
  // 抵免審核「有填寫 B2 成績」的定義：
  // 1) 必須先勾選 hasCEFRB2 === '是'
  // 2) 並且至少一項分數欄位要有值
  //
  // 這可避免出現：
  // - UI 實際沒勾 B2，但後續資料殘留/預設值導致分數欄位非空而被誤列入。
  const hasCEFRB2 = String(reg.hasCEFRB2 || '').trim();
  const hasB2Qualified =
    hasCEFRB2 === '是' ||
    hasCEFRB2.toLowerCase() === 'yes' ||
    hasCEFRB2.toLowerCase() === 'true';

  if (!hasB2Qualified) return false;

  return [
    reg.listeningScore,
    reg.readingScore,
    reg.speakingScore,
    reg.writingScore
  ].some((s) => nonEmpty(s));
}

/**
 * 依已填成績推估學生申請抵免面向（列表／Modal 左側「原始抵免」參考）
 */
function inferStudentRequestedExemptionLabel(reg) {
  if (!reg) return '—';
  const hasL = nonEmpty(reg.listeningScore);
  const hasR = nonEmpty(reg.readingScore);
  const hasS = nonEmpty(reg.speakingScore);
  const hasW = nonEmpty(reg.writingScore);
  if (hasL && hasR && hasS && hasW) return '聽讀說寫';
  if (hasL && hasR && !hasS && !hasW) return '聽讀';
  if (!hasL && !hasR && hasS && hasW) return '說寫';
  if (hasL || hasR || hasS || hasW) return '聽讀說寫';
  return '—';
}

/**
 * 同一學號多筆報名：取 updatedAt 最新一筆
 */
function pickLatestRegistrationPerStudent(registrations) {
  const byStudent = {};
  const sorted = [...registrations].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
  sorted.forEach((reg) => {
    const sid = reg.studentId;
    if (!sid) return;
    if (!byStudent[sid]) {
      byStudent[sid] = reg;
    }
  });
  return byStudent;
}

function formatExamTypeLabel(examType) {
  if (!examType) return '—';
  const m = {
    LRSW: '聽讀說寫',
    LR: '聽讀',
    SW: '說寫',
    NON: '不報考'
  };
  return m[examType] || examType;
}

module.exports = {
  EXEMPTION_VERIFIED_CODES,
  mapVerifiedTypeToZh,
  isCountedExemptionApproval,
  computeExemptionDisplayType,
  hasB2ScoresFilled,
  inferStudentRequestedExemptionLabel,
  pickLatestRegistrationPerStudent,
  formatExamTypeLabel
};
