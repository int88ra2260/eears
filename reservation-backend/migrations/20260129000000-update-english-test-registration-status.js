'use strict';

/**
 * 培力英檢報名狀態更新：
 * - rejected 更名為 revision（請修正）
 * - 新增狀態 success（報名成功）、failed（報名失敗）
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE english_test_registrations SET status = 'revision' WHERE status = 'rejected'`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE english_test_registrations SET status = 'rejected' WHERE status = 'revision'`
    );
    // success / failed 可選擇改回 approved / revision 或保留，此處僅還原 revision -> rejected
  }
};
