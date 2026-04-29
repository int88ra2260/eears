'use strict';

/**
 * importExamService 單元測試：mock models + transaction（無實際 DB）
 */

const XLSX = require('xlsx');

const mockTransaction = {};

jest.mock('../models', () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn(mockTransaction))
  },
  Student: {
    findAll: jest.fn()
  },
  EtExamAttempt: {
    findOne: jest.fn(),
    create: jest.fn()
  },
  EtExamAttemptSkillScore: {
    create: jest.fn()
  }
}));

const { sequelize, Student, EtExamAttempt, EtExamAttemptSkillScore } = require('../models');
const { importExam } = require('../services/learningJourney/importExamService');

function bufferFromMatrix(rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/** 產生至少 16 欄（A–P）的資料列 */
function dataRow({
  department = '資工系',
  college = '電資學院',
  classSection = 'A班',
  grade = '3',
  studentId = 'B10901001',
  studentName = '王小明',
  examType = 'GEPT',
  examDate = '2024-06-01',
  listening = [85, 'B2'],
  reading = [80, 'B2'],
  speaking = [75, 'B2'],
  writing = [70, 'B2']
}) {
  const r = new Array(16).fill('');
  r[0] = department;
  r[1] = college;
  r[2] = classSection;
  r[3] = grade;
  r[4] = studentId;
  r[5] = studentName;
  r[6] = examType;
  r[7] = examDate;
  r[8] = listening[0];
  r[9] = listening[1];
  r[10] = reading[0];
  r[11] = reading[1];
  r[12] = speaking[0];
  r[13] = speaking[1];
  r[14] = writing[0];
  r[15] = writing[1];
  return r;
}

function skillScoreStub(skill, cefr, cefrRank) {
  return {
    skill,
    cefr,
    cefrRank,
    toJSON() {
      return { skill, cefr: String(cefr), cefrRank };
    }
  };
}

describe('importExamService', () => {
  let attemptSeq;

  beforeEach(() => {
    jest.clearAllMocks();
    attemptSeq = 1;
    Student.findAll.mockResolvedValue([]);
    EtExamAttempt.findOne.mockResolvedValue(null);
    EtExamAttempt.create.mockImplementation(async (attrs) => {
      const id = attemptSeq;
      attemptSeq += 1;
      return { id, ...attrs };
    });
    EtExamAttemptSkillScore.create.mockResolvedValue({});
  });

  test('1. 正常匯入（完整 A–P）→ 建立 attempt 與四科 skill rows', async () => {
    const buf = bufferFromMatrix([dataRow({})]);
    const res = await importExam(buf);

    expect(res.ok).toBe(true);
    expect(res.inserted).toBe(1);
    expect(res.skipped).toBe(0);
    expect(EtExamAttempt.create).toHaveBeenCalledTimes(1);
    expect(EtExamAttemptSkillScore.create).toHaveBeenCalledTimes(4);
    const skills = EtExamAttemptSkillScore.create.mock.calls.map((c) => c[0].skill).sort();
    expect(skills).toEqual(['listening', 'reading', 'speaking', 'writing']);
    expect(sequelize.transaction).toHaveBeenCalled();
  });

  test('2. CEFR 空白 → 不建立該技能列', async () => {
    const buf = bufferFromMatrix([
      dataRow({
        listening: [85, ''],
        reading: [80, 'B2'],
        speaking: [75, ''],
        writing: [70, 'B2']
      })
    ]);
    const res = await importExam(buf);

    expect(res.inserted).toBe(1);
    expect(EtExamAttemptSkillScore.create).toHaveBeenCalledTimes(2);
    const created = EtExamAttemptSkillScore.create.mock.calls.map((c) => c[0].skill).sort();
    expect(created).toEqual(['reading', 'writing']);
  });

  test('3. CEFR 非法（B3、無效字串）→ warning 且不建立該技能', async () => {
    const buf = bufferFromMatrix([
      dataRow({
        listening: [85, 'B3'],
        reading: [80, 'XX'],
        speaking: [75, 'B2'],
        writing: [70, 'B2']
      })
    ]);
    const res = await importExam(buf);

    expect(res.inserted).toBe(1);
    expect(res.warnings.some((w) => w.includes('listening') && w.includes('B3'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('reading') && w.includes('XX'))).toBe(true);
    expect(EtExamAttemptSkillScore.create).toHaveBeenCalledTimes(2);
    const created = EtExamAttemptSkillScore.create.mock.calls.map((c) => c[0].skill).sort();
    expect(created).toEqual(['speaking', 'writing']);
  });

  test('4. duplicate attempt（技能內容完全相同）→ skipped', async () => {
    EtExamAttempt.findOne.mockResolvedValue({
      skillScores: [
        skillScoreStub('listening', 'B2', 4),
        skillScoreStub('reading', 'B2', 4),
        skillScoreStub('speaking', 'B2', 4),
        skillScoreStub('writing', 'B2', 4)
      ]
    });
    const buf = bufferFromMatrix([dataRow({})]);
    const res = await importExam(buf);

    expect(res.inserted).toBe(0);
    expect(res.skipped).toBe(1);
    expect(EtExamAttempt.create).not.toHaveBeenCalled();
    expect(EtExamAttemptSkillScore.create).not.toHaveBeenCalled();
  });

  test('5. duplicate attempt（鍵相同、技能內容不同）→ conflict', async () => {
    EtExamAttempt.findOne.mockResolvedValue({
      skillScores: [
        skillScoreStub('listening', 'B2', 4),
        skillScoreStub('reading', 'B2', 4),
        skillScoreStub('speaking', 'B2', 4),
        skillScoreStub('writing', 'B2', 4)
      ]
    });
    const buf = bufferFromMatrix([
      dataRow({
        listening: [85, 'B1']
      })
    ]);
    const res = await importExam(buf);

    expect(res.inserted).toBe(0);
    expect(res.skipped).toBe(0);
    expect(res.conflicts).toHaveLength(1);
    expect(res.conflicts[0].message).toMatch(/未覆寫/);
    expect(EtExamAttempt.create).not.toHaveBeenCalled();
  });

  test('6. 同 studentId 不同姓名 → quarantine', async () => {
    const buf = bufferFromMatrix([
      dataRow({ studentId: 'C001', studentName: '甲' }),
      dataRow({ studentId: 'C001', studentName: '乙', examDate: '2024-06-02' })
    ]);
    const res = await importExam(buf);

    expect(res.quarantine.length).toBeGreaterThanOrEqual(1);
    expect(res.quarantine.every((q) => q.studentId === 'C001')).toBe(true);
    expect(res.inserted).toBe(0);
    expect(EtExamAttempt.create).not.toHaveBeenCalled();
  });

  test('7. 同姓名不同 studentId → 皆正常匯入', async () => {
    const buf = bufferFromMatrix([
      dataRow({ studentId: 'D001', studentName: '同名' }),
      dataRow({ studentId: 'D002', studentName: '同名', examDate: '2024-06-02' })
    ]);
    const res = await importExam(buf);

    expect(res.quarantine).toHaveLength(0);
    expect(res.inserted).toBe(2);
    expect(EtExamAttempt.create).toHaveBeenCalledTimes(2);
  });

  test('8. examType 或 examDate 空白 → 略過整列', async () => {
    const buf = bufferFromMatrix([
      dataRow({ studentId: 'E001', examType: '', examDate: '2024-01-01' }),
      dataRow({ studentId: 'E002', examType: 'GEPT', examDate: '' })
    ]);
    const res = await importExam(buf);

    expect(res.inserted).toBe(0);
    expect(res.warnings.length).toBe(2);
    expect(res.warnings.every((w) => w.includes('缺少 G') || w.includes('H'))).toBe(true);
    expect(EtExamAttempt.create).not.toHaveBeenCalled();
  });
});
