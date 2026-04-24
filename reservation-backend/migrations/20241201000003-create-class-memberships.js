// migrations/20241201000003-create-class-memberships.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('class_memberships', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      semester: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '學期，如 114-1'
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '班級 ID',
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      studentId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '學號'
      },
      studentName: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '學生姓名'
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '系所'
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '電子郵件'
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
      await queryInterface.addIndex('class_memberships', ['semester', 'classId', 'studentId'], {
        unique: true,
        name: 'class_memberships_unique'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('class_memberships', ['semester', 'classId'], {
        name: 'class_memberships_semester_class_index'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('class_memberships', ['studentId'], {
        name: 'class_memberships_student_id_index'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 先刪除外鍵約束
    await queryInterface.removeConstraint('class_memberships', 'class_memberships_classId_foreign_idx');
    // 然後刪除表格
    await queryInterface.dropTable('class_memberships');
  }
};
