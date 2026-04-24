'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('teachers');

    if (!tableDefinition.role) {
      await queryInterface.addColumn('teachers', 'role', {
        type: Sequelize.ENUM('admin', 'worker', 'teacher'),
        allowNull: false,
        defaultValue: 'teacher'
      });
    }

    if (!tableDefinition.mustResetPassword) {
      await queryInterface.addColumn('teachers', 'mustResetPassword', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }

    if (!tableDefinition.passwordChangedAt) {
      await queryInterface.addColumn('teachers', 'passwordChangedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!tableDefinition.lastLoginAt) {
      await queryInterface.addColumn('teachers', 'lastLoginAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!tableDefinition.createdBy) {
      await queryInterface.addColumn('teachers', 'createdBy', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    try {
      await queryInterface.addIndex('teachers', ['role'], {
        name: 'teachers_role_idx'
      });
    } catch (error) {
      const msg = String(error?.message || '');
      if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
        throw error;
      }
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      const [adminRows] = await queryInterface.sequelize.query(
        "SELECT id FROM teachers WHERE username = 'emieearsweb' LIMIT 1",
        { transaction }
      );

      if (!adminRows.length) {
        const adminPassword = await bcrypt.hash('5808', 12);
        await queryInterface.bulkInsert('teachers', [{
          name: '系統管理員',
          email: 'admin@emicenter.nsysu.edu.tw',
          username: 'emieearsweb',
          password: adminPassword,
          role: 'admin',
          mustResetPassword: false,
          passwordChangedAt: now,
          lastLoginAt: null,
          createdBy: 'migration',
          isActive: true,
          department: null,
          phone: null,
          createdAt: now,
          updatedAt: now
        }], { transaction });
      }

      const [workerRows] = await queryInterface.sequelize.query(
        "SELECT id FROM teachers WHERE username = 'emiptworker' LIMIT 1",
        { transaction }
      );

      if (!workerRows.length) {
        const workerPassword = await bcrypt.hash('1215', 12);
        await queryInterface.bulkInsert('teachers', [{
          name: '工讀生帳號',
          email: 'worker@emicenter.nsysu.edu.tw',
          username: 'emiptworker',
          password: workerPassword,
          role: 'worker',
          mustResetPassword: false,
          passwordChangedAt: now,
          lastLoginAt: null,
          createdBy: 'migration',
          isActive: true,
          department: null,
          phone: null,
          createdAt: now,
          updatedAt: now
        }], { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('teachers');

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkDelete('teachers', { username: 'emieearsweb' }, { transaction });
      await queryInterface.bulkDelete('teachers', { username: 'emiptworker' }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    try {
      await queryInterface.removeIndex('teachers', 'teachers_role_idx');
    } catch (error) {
      const msg = String(error?.message || '');
      if (!msg.includes('does not exist')) {
        throw error;
      }
    }

    if (tableDefinition.createdBy) {
      await queryInterface.removeColumn('teachers', 'createdBy');
    }
    if (tableDefinition.lastLoginAt) {
      await queryInterface.removeColumn('teachers', 'lastLoginAt');
    }
    if (tableDefinition.passwordChangedAt) {
      await queryInterface.removeColumn('teachers', 'passwordChangedAt');
    }
    if (tableDefinition.mustResetPassword) {
      await queryInterface.removeColumn('teachers', 'mustResetPassword');
    }
    if (tableDefinition.role) {
      await queryInterface.removeColumn('teachers', 'role');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_teachers_role";');
    }
  }
};


