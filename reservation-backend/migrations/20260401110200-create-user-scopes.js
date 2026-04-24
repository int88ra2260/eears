'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'user_scopes';
    const table = await queryInterface.describeTable(tableName).catch(() => null);
    if (!table) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'teachers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        scopeType: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'event',
        },
        scopeValue: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        updatedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        source: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }
    await queryInterface.addIndex(tableName, ['userId', 'scopeType', 'scopeValue'], {
      unique: true,
      name: 'user_scopes_user_type_value_uq',
    }).catch(() => {});
    await queryInterface.addIndex(tableName, ['scopeType', 'scopeValue'], { name: 'user_scopes_type_value_idx' }).catch(() => {});
    await queryInterface.addIndex(tableName, ['updatedBy'], { name: 'user_scopes_updated_by_idx' }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_scopes').catch(() => {});
  },
};

