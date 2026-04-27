const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const CourseOutcomeMapping = sequelize.define('CourseOutcomeMapping', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  courseId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'course_id' },
  outcomeKey: { type: DataTypes.STRING(64), allowNull: false, field: 'outcome_key' },
  outcomeLabel: { type: DataTypes.STRING(200), allowNull: false, field: 'outcome_label' },
  outcomeType: {
    type: DataTypes.ENUM('competency', 'cefr', 'program', 'other'),
    allowNull: false,
    defaultValue: 'other',
    field: 'outcome_type'
  },
  targetLevel: { type: DataTypes.STRING(40), allowNull: true, field: 'target_level' },
  weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  metaJson: { type: DataTypes.JSON, allowNull: true, field: 'meta_json' }
}, {
  tableName: 'course_outcome_mappings',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['course_id', 'outcome_key'], name: 'uk_course_outcomes_course_key' },
    { fields: ['outcome_type', 'outcome_key'], name: 'idx_course_outcomes_type_key' }
  ]
});

module.exports = CourseOutcomeMapping;
