'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 檢查表格是否已存在
    const tables = await queryInterface.showAllTables();
    
    // 1. 創建 classes 表格
    if (!tables.includes('classes')) {
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
    }

    // 2. 創建 class_memberships 表格
    if (!tables.includes('class_memberships')) {
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
          table: 'classes',
          field: 'id'
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
      grade: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '年級'
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
    }

    // 3. 添加索引
    try {
      await queryInterface.addIndex('classes', ['name', 'semester'], {
        unique: true,
        name: 'classes_name_semester_unique'
      });
    } catch (error) {
      const msg = String(error?.message || '');
      if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('classes', ['semester'], {
        name: 'classes_semester_index'
      });
    } catch (error) {
      const msg = String(error?.message || '');
      if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('class_memberships', ['semester', 'classId', 'studentId'], {
        unique: true,
        name: 'class_memberships_unique'
      });
    } catch (error) {
      const msg = String(error?.message || '');
      if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('class_memberships', ['semester', 'classId'], {
        name: 'class_memberships_semester_class_index'
      });
    } catch (error) {
      const msg = String(error?.message || '');
      if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('class_memberships', ['studentId'], {
        name: 'class_memberships_student_id_index'
      });
    } catch (error) {
      const msg = String(error?.message || '');
      if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.dropTable('class_memberships');
    } catch (error) {
      if (!error.message.includes("doesn't exist")) {
        throw error;
      }
    }
    
    try {
      await queryInterface.dropTable('classes');
    } catch (error) {
      if (!error.message.includes("doesn't exist")) {
        throw error;
      }
    }
  }
};
