const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtAttemptImportHistory = sequelize.define('EtAttemptImportHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  importBatchId: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true
  },
  importName: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  semesterId: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  importedAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  operatorId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  importedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  skippedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  errorCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  beforeStats: {
    type: DataTypes.JSON,
    allowNull: false
  },
  afterStats: {
    type: DataTypes.JSON,
    allowNull: false
  },
  deltaStats: {
    type: DataTypes.JSON,
    allowNull: false
  },
  newB2BySkill: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  tableName: 'et_attempt_import_histories',
  timestamps: true,
  indexes: [
    { fields: ['semesterId', 'importedAt'], name: 'idx_et_import_histories_semester_imported_at' },
    { fields: ['importBatchId'], unique: true, name: 'uk_et_import_histories_batch' }
  ]
});

module.exports = EtAttemptImportHistory;
