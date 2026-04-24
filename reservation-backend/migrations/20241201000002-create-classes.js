// migrations/20241201000002-create-classes.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('classes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '班級名稱'
      },
      semester: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '學期，如 114-1'
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '系所'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 添加索引
    try {
      await queryInterface.addIndex('classes', ['name', 'semester'], {
        unique: true,
        name: 'classes_name_semester_unique'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('classes', ['semester'], {
        name: 'classes_semester_index'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('classes');
  }
};
