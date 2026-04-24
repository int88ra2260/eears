const { runStage } = require('./migrationCommonService');

async function migrateActivities(batchContext) {
  return runStage('activity_participations', batchContext, async (ctx) => {
    if (ctx.options && ctx.options.simulateFailureStage === 'activity_participations') {
      throw new Error('Simulated failure in activity_participations stage');
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
      message: 'activity participation migration skeleton executed',
      payload: {
        todo: 'Map reservation/event attendance data to activity_participations'
      }
    };
  });
}

module.exports = {
  migrateActivities
};
