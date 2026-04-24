'use strict';

/** 培力英檢抵免審核欄位（綁在 english_test_registrations） */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'english_test_registrations';
    await queryInterface.addColumn(table, 'exemption_review_status', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: '抵免審核狀態：pending/approved/rejected/revision，未送審為 null'
    });
    await queryInterface.addColumn(table, 'exemption_verified_type', {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: '審核通過後之抵免項目：LRSW/LR/SW/NONE'
    });
    await queryInterface.addColumn(table, 'exemption_review_note', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '抵免審核備註'
    });
    await queryInterface.addColumn(table, 'exemption_reviewed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: '抵免審核時間'
    });
    await queryInterface.addColumn(table, 'exemption_reviewed_by', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: '抵免審核者（帳號）'
    });
  },

  async down(queryInterface) {
    const table = 'english_test_registrations';
    await queryInterface.removeColumn(table, 'exemption_reviewed_by');
    await queryInterface.removeColumn(table, 'exemption_reviewed_at');
    await queryInterface.removeColumn(table, 'exemption_review_note');
    await queryInterface.removeColumn(table, 'exemption_verified_type');
    await queryInterface.removeColumn(table, 'exemption_review_status');
  }
};
