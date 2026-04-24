/**
 * 英檢長期追蹤種子資料（可 dry-run）
 * 使用方式：node scripts/seedEnglishTestTracking.js [--dry-run] [--small]
 * --dry-run: 只輸出將執行的動作，不寫入 DB
 * --small: 每學期約 50 人、每生 1~3 筆 attempt（預設為 200 人、1~5 筆）
 */
require('dotenv').config();
const path = require('path');
const { sequelize, EtSemester, EtStudentMaster, EtEnrollmentSnapshot, EtExamAttempt, EtExamAttemptScore, EtSemesterStudentBestSkill } = require(path.join(__dirname, '../models'));
const { recomputeBestSkills } = require(path.join(__dirname, '../services/englishTestTracking/bestSkillRecomputeService'));

const DRY_RUN = process.argv.includes('--dry-run');
const SMALL = process.argv.includes('--small');

const SEMESTERS = ['113-2', '114-1', '114-2'];
const GRADES = ['1', '2', '3', '4', '碩一', '碩二'];
const SKILLS = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  const perSemester = SMALL ? 50 : 200;
  const maxAttemptsPerStudent = SMALL ? 3 : 5;

  console.log(DRY_RUN ? '[DRY-RUN]' : '[SEED]', SMALL ? 'small' : 'full', '- semesters:', SEMESTERS.length, ', students per semester:', perSemester);

  if (DRY_RUN) {
    console.log('Would create:', SEMESTERS.length, 'semesters,', SEMESTERS.length * perSemester, 'unique students (with overlap), enrollments, attempts, scores, then recompute best-skills.');
    return;
  }

  await sequelize.authenticate();

  for (const sid of SEMESTERS) {
    await EtSemester.findOrCreate({ where: { id: sid }, defaults: { startDate: null, endDate: null, snapshotDate: null } });
  }

  const allStudentIds = new Set();
  for (let s = 0; s < SEMESTERS.length; s++) {
    for (let i = 0; i < perSemester; i++) {
      const studentId = `S${100000 + s * 10000 + i}`;
      allStudentIds.add(studentId);
    }
  }

  for (const studentId of allStudentIds) {
    await EtStudentMaster.findOrCreate({
      where: { studentId },
      defaults: { name: `學生${studentId}`, college: '文學院', dept: '英文系' }
    });
  }

  for (const semesterId of SEMESTERS) {
    const studentIds = [];
    for (let i = 0; i < perSemester; i++) {
      studentIds.push(Array.from(allStudentIds)[Math.floor(Math.random() * allStudentIds.size)]);
    }
    const uniqueIds = [...new Set(studentIds)];
    for (const studentId of uniqueIds) {
      await EtEnrollmentSnapshot.findOrCreate({
        where: { semesterId, studentId },
        defaults: {
          semesterId,
          studentId,
          grade: randomChoice(GRADES),
          status: '在學',
          isActive: true,
          importBatchId: `seed-${Date.now()}`
        }
      });
    }
    console.log('Enrollments for', semesterId, ':', uniqueIds.length);
  }

  let attemptId = 0;
  for (const studentId of allStudentIds) {
    const nAttempts = randomInt(1, maxAttemptsPerStudent);
    for (let a = 0; a < nAttempts; a++) {
      attemptId++;
      const testDate = new Date(2023 + Math.floor(a / 2), (a % 2) * 6, 1 + a * 5);
      const attempt = await EtExamAttempt.create({
        studentId,
        testType: 'BESTEP',
        testDate: testDate.toISOString().slice(0, 10),
        source: 'manual_import',
        importBatchId: 'seed-attempts',
        status: 'valid'
      });
      for (const skill of SKILLS) {
        const cefr = randomChoice(CEFR_LEVELS);
        const rawScore = 50 + Math.floor(Math.random() * 100);
        await EtExamAttemptScore.create({
          attemptId: attempt.id,
          skill,
          rawScore,
          cefr
        });
      }
    }
  }
  console.log('Attempts and scores created.');

  for (const semesterId of SEMESTERS) {
    const { studentsProcessed, recomputed } = await recomputeBestSkills(semesterId, { fullRecompute: true });
    console.log('Recomputed', semesterId, '- students:', studentsProcessed, ', best-skills updated:', recomputed);
  }

  console.log('Seed done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
