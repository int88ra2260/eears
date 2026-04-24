'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('teachers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '老師姓名'
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: '老師電子郵件'
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '老師帳號名稱'
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '密碼（加密）'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: '帳號是否啟用'
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '所屬系所'
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '聯絡電話'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 添加索引
    try {
      await queryInterface.addIndex('teachers', ['email'], { unique: true });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('teachers', ['username'], { unique: true });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('teachers', ['isActive']);
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('teachers');
  }
};
