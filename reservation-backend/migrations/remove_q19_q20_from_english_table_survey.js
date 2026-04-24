// migrations/remove_q19_q20_from_english_table_survey.js
const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 檢查欄位是否存在，然後刪除 q19 和 q20 欄位
    const tableDescription = await queryInterface.describeTable('english_table_survey_responses');
    
    if (tableDescription.q19) {
      await queryInterface.removeColumn('english_table_survey_responses', 'q19');
    }
    
    if (tableDescription.q20) {
      await queryInterface.removeColumn('english_table_survey_responses', 'q20');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 如果需要回滾，重新添加 q19 和 q20 欄位
    await queryInterface.addColumn('english_table_survey_responses', 'q19', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('english_table_survey_responses', 'q20', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }
};
