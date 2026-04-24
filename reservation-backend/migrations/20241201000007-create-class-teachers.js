'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('class_teachers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
      teacherId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '老師 ID',
        references: {
          model: 'teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      semester: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '學期'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: '關聯是否有效'
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
      await queryInterface.addIndex('class_teachers', ['classId', 'teacherId', 'semester'], { 
        unique: true,
        name: 'class_teachers_class_id_teacher_id_semester'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name') &&
          !String(error?.message || '').includes('already exists')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('class_teachers', ['teacherId'], {
        name: 'class_teachers_teacher_id'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name') &&
          !String(error?.message || '').includes('already exists')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('class_teachers', ['semester'], {
        name: 'class_teachers_semester'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name') &&
          !String(error?.message || '').includes('already exists')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('class_teachers', ['isActive'], {
        name: 'class_teachers_is_active'
      });
    } catch (error) {
      if (!String(error?.message || '').includes('Duplicate key name') &&
          !String(error?.message || '').includes('already exists')) {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('class_teachers');
  }
};
