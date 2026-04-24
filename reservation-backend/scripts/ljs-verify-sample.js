/* eslint-disable no-console */
const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'migration';
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize } = require('../models');
const learningJourneyService = require('../services/learningJourney/learningJourneyService');

const SAMPLE_STUDENTS = ['LJSNS001', 'LJSNS002', 'LJSNS003', 'A123456789', 'B123456789'];

function printSkillBlock(title, scores = {}) {
  console.log(`${title}:`);
  for (const skill of ['listening', 'reading', 'speaking', 'writing']) {
    const row = scores[skill];
    if (!row) {
      console.log(`  ${skill}: -`);
      continue;
    }
    console.log(`  ${skill}: ${row.cefrLevel || '-'} (${row.rawScore ?? '-'}) @ ${row.examDate || '-'}`);
  }
}

async function run() {
  try {
    for (const studentId of SAMPLE_STUDENTS) {
      const profile = await learningJourneyService.getStudentProfile(studentId, {});
      if (!profile) {
        console.log(`Student: ${studentId}`);
        console.log('  not found');
        continue;
      }
      console.log(`Student: ${profile.student.studentId}`);
      console.log(`Attempts: ${profile.attemptCount}`);
      printSkillBlock('Best', profile.bestScores);
      printSkillBlock('Latest', profile.latestScores);
      console.log('---');
    }
  } catch (error) {
    console.error('[ljs-verify-sample] fatal', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
