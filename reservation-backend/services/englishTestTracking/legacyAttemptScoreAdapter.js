// LEGACY - DO NOT USE: retained only for historical English-test tracking maintenance.
'use strict';

const { getCefrRank, getCefrFromRank } = require('./cefrMappingService');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

/**
 * 舊表 et_exam_attempt_scores.skill 為 LISTENING／READING…，轉成小寫技能鍵
 */
function normalizeLegacySkillKey(skill) {
  if (skill == null) return null;
  const s = String(skill).trim().toUpperCase();
  const map = {
    LISTENING: 'listening',
    READING: 'reading',
    SPEAKING: 'speaking',
    WRITING: 'writing'
  };
  return map[s] || null;
}

function rowToPlain(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : row;
}

/**
 * 單筆 attempt（含 skillScores、scores）合併為 V2 前端可用的 skillScores 陣列（技能小寫）
 * 優先採用新表 et_exam_attempt_skill_scores，缺漏時補上舊表分數。
 */
function buildUnifiedSkillScoresForAttempt(attempt) {
  const a = rowToPlain(attempt);
  if (!a) return [];

  const bySkill = new Map();

  const newRows = Array.isArray(a.skillScores) ? a.skillScores.map(rowToPlain).filter(Boolean) : [];
  for (const row of newRows) {
    const sk = String(row.skill || '').trim().toLowerCase();
    if (!SKILLS.includes(sk)) continue;
    const cefr = row.cefr != null && String(row.cefr).trim() !== ''
      ? String(row.cefr).trim().toUpperCase()
      : null;
    let cefrRank = row.cefrRank != null && row.cefrRank !== '' ? Number(row.cefrRank) : null;
    if (!Number.isFinite(cefrRank) && cefr) {
      cefrRank = getCefrRank(cefr);
    }
    bySkill.set(sk, {
      ...row,
      skill: sk,
      cefr: cefr || null,
      cefrRank: Number.isFinite(cefrRank) ? cefrRank : null
    });
  }

  const legacyRows = Array.isArray(a.scores) ? a.scores.map(rowToPlain).filter(Boolean) : [];
  for (const row of legacyRows) {
    const sk = normalizeLegacySkillKey(row.skill);
    if (!sk || bySkill.has(sk)) continue;
    const cefr = row.cefr != null && String(row.cefr).trim() !== ''
      ? String(row.cefr).trim().toUpperCase()
      : null;
    let cefrRank = row.cefrRank != null && row.cefrRank !== '' ? Number(row.cefrRank) : null;
    if (!Number.isFinite(cefrRank) && cefr) {
      cefrRank = getCefrRank(cefr);
    }
    bySkill.set(sk, {
      id: row.id,
      attemptId: row.attemptId,
      skill: sk,
      rawScore: row.rawScore,
      rawLevel: null,
      cefr: cefr || null,
      cefrRank: Number.isFinite(cefrRank) ? cefrRank : null,
      isInferred: false,
      inferenceVersion: null
    });
  }

  return SKILLS.map((sk) => bySkill.get(sk)).filter(Boolean);
}

function getAttemptSortDateMs(attempt) {
  const a = rowToPlain(attempt);
  if (!a) return 0;
  const d = a.examDate || a.testDate;
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * API 回傳用：補齊 examType／examDate，skillScores 為合併後陣列
 */
function toV2AttemptJson(attempt) {
  const a = rowToPlain(attempt);
  if (!a) return a;
  return {
    ...a,
    examType: a.examType || a.testType || null,
    examDate: a.examDate || a.testDate || null,
    skillScores: buildUnifiedSkillScoresForAttempt(a)
  };
}

/**
 * 將快取列（或 null）補上可由 rank 反查的 CEFR 字串，利於列表／詳細頁顯示
 */
function enrichBestSkillsCacheRow(best) {
  if (!best) return null;
  const b = rowToPlain(best);
  const out = { ...b };
  const pairs = [
    ['bestListeningCefr', 'bestListeningCefrRank'],
    ['bestReadingCefr', 'bestReadingCefrRank'],
    ['bestSpeakingCefr', 'bestSpeakingCefrRank'],
    ['bestWritingCefr', 'bestWritingCefrRank']
  ];
  for (const [cefrField, rankField] of pairs) {
    const hasCefr = out[cefrField] != null && String(out[cefrField]).trim() !== '';
    if (!hasCefr && out[rankField] != null) {
      const fromRank = getCefrFromRank(out[rankField]);
      if (fromRank) out[cefrField] = fromRank;
    }
  }
  return out;
}

function compareSkillCandidate(a, b) {
  if (a.cefrRank !== b.cefrRank) return b.cefrRank - a.cefrRank;
  const aDate = a.examDate ? new Date(a.examDate).getTime() : 0;
  const bDate = b.examDate ? new Date(b.examDate).getTime() : 0;
  if (aDate !== bDate) return bDate - aDate;
  return (b.attemptId || 0) - (a.attemptId || 0);
}

/**
 * 依目前畫面上的 attempts（已含合併後 skillScores）計算四技能最佳，與 rebuild 快取邏輯一致
 */
function computeBestSkillsFromAttemptsJson(attemptsJson) {
  const best = {
    listening: null,
    reading: null,
    speaking: null,
    writing: null
  };
  for (const attempt of attemptsJson || []) {
    const examDate = attempt.examDate || attempt.testDate || null;
    const skillScores = attempt.skillScores || [];
    for (const score of skillScores) {
      if (score.cefrRank == null || !Number.isFinite(Number(score.cefrRank))) continue;
      const skill = String(score.skill || '').trim().toLowerCase();
      if (!SKILLS.includes(skill)) continue;
      const candidate = {
        attemptId: attempt.id,
        examDate,
        cefr: score.cefr != null && String(score.cefr).trim() !== '' ? String(score.cefr).trim().toUpperCase() : null,
        cefrRank: Number(score.cefrRank)
      };
      const current = best[skill];
      if (!current || compareSkillCandidate(current, candidate) > 0) {
        best[skill] = candidate;
      }
    }
  }
  const row = {
    bestListeningCefr: best.listening ? best.listening.cefr : null,
    bestListeningCefrRank: best.listening ? best.listening.cefrRank : null,
    bestReadingCefr: best.reading ? best.reading.cefr : null,
    bestReadingCefrRank: best.reading ? best.reading.cefrRank : null,
    bestSpeakingCefr: best.speaking ? best.speaking.cefr : null,
    bestSpeakingCefrRank: best.speaking ? best.speaking.cefrRank : null,
    bestWritingCefr: best.writing ? best.writing.cefr : null,
    bestWritingCefrRank: best.writing ? best.writing.cefrRank : null
  };
  return enrichBestSkillsCacheRow(row);
}

const SKILL_FIELDS = [
  ['bestListeningCefr', 'bestListeningCefrRank'],
  ['bestReadingCefr', 'bestReadingCefrRank'],
  ['bestSpeakingCefr', 'bestSpeakingCefrRank'],
  ['bestWritingCefr', 'bestWritingCefrRank']
];

function rankOrNegOne(row, rankField) {
  if (!row || row[rankField] == null || row[rankField] === '') return -1;
  const n = Number(row[rankField]);
  return Number.isFinite(n) ? n : -1;
}

/**
 * 學期快取與「由 attempts 即時計算」取每技能較高 cefrRank；同分時優先採用 attempts 結果以與下方表格一致
 */
function mergeBestSkillsCacheAndComputed(cachedEnriched, computedFromAttempts) {
  if (!computedFromAttempts && !cachedEnriched) return null;
  if (!cachedEnriched) return computedFromAttempts;
  if (!computedFromAttempts) return cachedEnriched;

  const out = { ...cachedEnriched };
  for (const [cefrF, rankF] of SKILL_FIELDS) {
    const rc = rankOrNegOne(cachedEnriched, rankF);
    const rp = rankOrNegOne(computedFromAttempts, rankF);
    const pick =
      rp > rc
        ? computedFromAttempts
        : rc > rp
          ? cachedEnriched
          : rp >= 0
            ? computedFromAttempts
            : cachedEnriched;
    out[cefrF] = pick ? pick[cefrF] : null;
    out[rankF] = pick && pick[rankF] != null && pick[rankF] !== '' ? pick[rankF] : null;
  }
  return enrichBestSkillsCacheRow(out);
}

/**
 * 同一學生、同日、同考試類型之多筆重複 attempt（常見於重複匯入）只保留 id 較大一筆，避免列表重複
 */
function dedupeAttemptsForDisplay(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) return attempts;
  const map = new Map();
  for (const att of attempts) {
    const a = rowToPlain(att);
    if (!a) continue;
    const sid = String(a.studentId || '').trim();
    const d = String(a.examDate || a.testDate || '').trim();
    const typ = String(a.examType || a.testType || '').trim().toUpperCase();
    const key = `${sid}|${d}|${typ}`;
    const prev = map.get(key);
    const prevId = prev ? (rowToPlain(prev).id || 0) : -1;
    const curId = a.id || 0;
    if (!prev || curId > prevId) {
      map.set(key, att);
    }
  }
  return Array.from(map.values());
}

module.exports = {
  SKILLS,
  normalizeLegacySkillKey,
  buildUnifiedSkillScoresForAttempt,
  getAttemptSortDateMs,
  toV2AttemptJson,
  enrichBestSkillsCacheRow,
  computeBestSkillsFromAttemptsJson,
  mergeBestSkillsCacheAndComputed,
  dedupeAttemptsForDisplay
};
