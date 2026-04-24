// services/englishTestRegistrationService.js
const { EnglishTestRegistration } = require('../models');

const REVIEW_FIELDS = [
  // 抵免審核相關欄位：一般學生不得覆蓋，僅管理端（且 payload 明確帶入）可以更新
  'exemption_review_status',
  'exemption_verified_type',
  'exemption_review_note',
  'exemption_reviewed_at',
  'exemption_reviewed_by'
];

const STUDENT_BLOCKED_FIELDS = new Set(REVIEW_FIELDS);

function buildStudentFriendlyError({ code, message, status }) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function computeSubmissionStatus(examType) {
  // 如果 examType 為 'NON'，status 設為 'revision'（不報名），否則為 'pending'（審核中）
  return examType === 'NON' ? 'revision' : 'pending';
}

async function findExistingRegistration(studentId, semester, { transaction } = {}) {
  if (!studentId) return null;
  if (!semester) return null;
  return EnglishTestRegistration.findOne({
    where: { studentId, semester },
    transaction
  });
}

/**
 * createOrUpdateRegistration
 *
 * 欄位覆蓋規則（重點保護審核資料）：
 * 1) 一般學生重新送件（actor='student'）
 *    - 可覆蓋：報名表單中的基本/考試選項/分數/聯絡資訊/檔案路徑
 *    - 不可覆蓋（強制保留既有）：REVIEW_FIELDS（抵免審核相關欄位）
 *    - 若 payload 沒有提供檔案（payload 欄位為 null），會保留既有檔案，避免誤刪附件
 *
 * 2) 管理端匯入或編修（actor='admin'）
 *    - 優先使用 upsert（保留既有 id）
 *    - 只有當 payload 明確帶入 REVIEW_FIELDS 才會更新；未帶入則保留既有值
 */
async function createOrUpdateRegistration(payload, { transaction, actor = 'student' } = {}) {
  const studentId = payload?.studentId;
  const semester = payload?.semester;

  if (!studentId) {
    throw buildStudentFriendlyError({
      code: 'INVALID_PAYLOAD',
      message: '缺少必要欄位：studentId',
      status: 400
    });
  }

  // 依 Phase 1 規則：一律以 (studentId, semester) 作為唯一 key
  // 若 semester 為 null，可能導致唯一鍵無法有效去重，因此直接拒絕寫入。
  if (!semester) {
    throw buildStudentFriendlyError({
      code: 'SEMESTER_REQUIRED',
      message: '無法判斷本學期，請聯絡管理員後再進行處理',
      status: 400
    });
  }

  const existing = await findExistingRegistration(studentId, semester, { transaction });
  const statusFromPayload = computeSubmissionStatus(payload.examType);

  if (existing) {
    if (actor === 'student') {
      // 已通過/報名成功/報名失敗都只能檢視，不能重新送件覆蓋（沿用既有 canEdit 邏輯）
      if (['approved', 'success', 'failed'].includes(existing.status)) {
        throw buildStudentFriendlyError({
          code: 'DUPLICATE_REGISTRATION_NOT_ALLOWED',
          status: 409,
          message: '你本學期已提交培力英檢報名資料，如需修改請聯絡管理員或使用修改功能'
        });
      }
    }

    const updateData = { ...payload };

    // 学生：抵免審核欄位一律移除（保留既有審核資訊）
    if (actor === 'student') {
      for (const f of STUDENT_BLOCKED_FIELDS) {
        delete updateData[f];
      }

      // 学生重新送件時，若未提供檔案（null），保留既有附件
      const preserveFileFields = ['b2CertificateFile', 'disabilityCertFront', 'disabilityCertBack', 'idPhoto'];
      for (const f of preserveFileFields) {
        if (updateData[f] === null && existing[f] != null) {
          updateData[f] = existing[f];
        }
      }

      // 確保 status 與本次 examType 一致
      updateData.status = statusFromPayload;
    } else {
      // 管理端：只有當 payload 明確帶入 REVIEW_FIELDS 才更新
      for (const f of REVIEW_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(payload, f)) {
          delete updateData[f];
        }
      }
      if (!Object.prototype.hasOwnProperty.call(updateData, 'status') && payload.examType) {
        updateData.status = statusFromPayload;
      }
    }

    // 避免覆蓋 semester（unique key 使用語意一致的 semester）
    updateData.semester = semester;

    await existing.update(updateData, { transaction });
    return { registration: existing, action: 'updated' };
  }

  // 不存在：create
  const createData = { ...payload };

  // 学生：create 時也要確保審核欄位不被意外寫入
  if (actor === 'student') {
    for (const f of STUDENT_BLOCKED_FIELDS) delete createData[f];
    createData.status = statusFromPayload;
  }

  try {
    const registration = await EnglishTestRegistration.create(createData, { transaction });
    return { registration, action: 'created' };
  } catch (e) {
    // 可能存在競態：另一個請求剛剛 create 成功。
    // 若唯一鍵（studentId+semester）衝突，改為更新既有資料。
    if (e?.name === 'SequelizeUniqueConstraintError') {
      const latest = await findExistingRegistration(studentId, semester, { transaction });
      if (latest) {
        const updateData = { ...createData };
        if (actor === 'student') {
          for (const f of STUDENT_BLOCKED_FIELDS) delete updateData[f];
          updateData.status = statusFromPayload;
        }
        await latest.update(updateData, { transaction });
        return { registration: latest, action: 'updated' };
      }
    }
    throw e;
  }
}

module.exports = {
  findExistingRegistration,
  createOrUpdateRegistration
};

