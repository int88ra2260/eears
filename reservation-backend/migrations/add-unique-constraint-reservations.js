// migrations/add-unique-constraint-reservations.js
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 添加唯一約束：同一個活動中，同一個學號或同一個email只能預約一次
    try {
      await queryInterface.addConstraint('Reservations', {
        fields: ['eventId', 'studentId'],
        type: 'unique',
        name: 'unique_event_student'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addConstraint('Reservations', {
        fields: ['eventId', 'studentEmail'],
        type: 'unique',
        name: 'unique_event_email'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 移除約束
    await queryInterface.removeConstraint('Reservations', 'unique_event_student');
    await queryInterface.removeConstraint('Reservations', 'unique_event_email');
  }
};
