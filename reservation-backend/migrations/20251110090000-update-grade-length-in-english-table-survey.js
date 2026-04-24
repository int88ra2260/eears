// migrations/20251110090000-update-grade-length-in-english-table-survey.js

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('english_table_survey_responses', 'grade', {
      type: Sequelize.STRING(191),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('english_table_survey_responses', 'grade', {
      type: Sequelize.STRING(30),
      allowNull: false
    });
  }
};

