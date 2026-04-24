/* eslint-disable no-console */
const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'migration';
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, Student, BestepExamScore } = require('../models');

const FIXTURE_ROWS = [
  {
    studentId: 'LJSNS001',
    semester: '199-1',
    examDate: '2026-04-20',
    listeningScore: 72,
    listeningLevel: 'B2',
    sourceFile: 'nonstandard-fixture-listening-only.xlsx'
  },
  {
    studentId: 'LJSNS002',
    semester: '199-1',
    examDate: '2026-04-20',
    readingScore: 69,
    speakingScore: 63,
    readingLevel: 'B1',
    speakingLevel: 'B1',
    sourceFile: 'nonstandard-fixture-speaking-reading.xlsx'
  },
  {
    studentId: 'LJSNS003',
    semester: '199-1',
    examDate: '2026-04-20',
    listeningScore: 75,
    readingScore: 70,
    speakingScore: 65,
    listeningLevel: 'B2',
    readingLevel: 'B2',
    speakingLevel: 'B1',
    sourceFile: 'nonstandard-fixture-missing-writing.xlsx'
  }
];

async function upsertStudent(studentId) {
  const [student] = await Student.findOrCreate({
    where: { studentId },
    defaults: {
      studentId,
      nameZh: `測試_${studentId}`,
      status: 'active'
    }
  });
  return student;
}

async function upsertBestepRow(row) {
  await BestepExamScore.upsert({
    studentId: row.studentId,
    semester: row.semester,
    examDate: row.examDate,
    listeningScore: row.listeningScore || null,
    readingScore: row.readingScore || null,
    speakingScore: row.speakingScore || null,
    writingScore: row.writingScore || null,
    listeningLevel: row.listeningLevel || null,
    readingLevel: row.readingLevel || null,
    speakingLevel: row.speakingLevel || null,
    writingLevel: row.writingLevel || null,
    totalScore: null,
    overallLevel: null,
    passed: false,
    importedAt: new Date(),
    sourceFile: row.sourceFile
  });
}

async function run() {
  try {
    for (const row of FIXTURE_ROWS) {
      await upsertStudent(row.studentId);
      await upsertBestepRow(row);
    }
    console.log('[seed-nonstandard-bestep] done', {
      rows: FIXTURE_ROWS.length,
      studentIds: FIXTURE_ROWS.map((r) => r.studentId)
    });
  } catch (error) {
    console.error('[seed-nonstandard-bestep] fatal', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
