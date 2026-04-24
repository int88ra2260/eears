const { runStage } = require('./migrationCommonService');

async function migrateRegistrations(batchContext) {
  return runStage('exam_registrations', batchContext, async (ctx) => {
    if (ctx.options && ctx.options.simulateFailureStage === 'exam_registrations') {
      throw new Error('Simulated failure in exam_registrations stage');
    }
    return {
      stats: {
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        duplicate: 0,
        quarantined: 0,
        errors: 0,
        warnings: 0
      },
      message: 'exam registrations migration skeleton executed',
      payload: {
        todo: 'Map english_test_registrations to exam_registrations'
      }
    };
  });
}

module.exports = {
  migrateRegistrations
};
