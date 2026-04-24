'use strict';

const { Op, literal } = require('sequelize');

/**
 * 與 DB 去重、匯入、migration 一致：
 * studentId + COALESCE(examDate, testDate) + UPPER(TRIM(COALESCE(examType, testType, '')))
 *
 * @param {import('sequelize').Model} EtExamAttemptModel - EtExamAttempt model（需有 .sequelize）
 * @param {string} studentId
 * @param {string|null|undefined} normalizedTestDate - YYYY-MM-DD 或 null（與 normalizeDateOnlyForDb 一致）
 * @param {string|null|undefined} testTypeRaw - 檢定類別字串（BESTEP 等）
 */
function buildCanonicalAttemptWhere(EtExamAttemptModel, studentId, normalizedTestDate, testTypeRaw) {
  const seq = EtExamAttemptModel.sequelize;
  const typeUpper = String(testTypeRaw || '').trim().toUpperCase();
  const dateSql =
    normalizedTestDate == null || normalizedTestDate === ''
      ? '(COALESCE(`examDate`, `testDate`) IS NULL)'
      : `(COALESCE(\`examDate\`, \`testDate\`) = ${seq.escape(normalizedTestDate)})`;
  return {
    studentId,
    [Op.and]: [
      literal(`UPPER(TRIM(COALESCE(\`examType\`, \`testType\`, ''))) = ${seq.escape(typeUpper)}`),
      literal(dateSql)
    ]
  };
}

module.exports = {
  buildCanonicalAttemptWhere
};
