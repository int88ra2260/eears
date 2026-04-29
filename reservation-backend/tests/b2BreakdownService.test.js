'use strict';

jest.mock('../models', () => ({
  EtEnrollmentSnapshot: {
    findAll: jest.fn()
  }
}));

jest.mock('../services/learningJourney/bestSkillService', () => ({
  SKILLS: ['listening', 'reading', 'speaking', 'writing'],
  getStudentsBestSkillsMap: jest.fn()
}));

const { EtEnrollmentSnapshot } = require('../models');
const { getStudentsBestSkillsMap } = require('../services/learningJourney/bestSkillService');
const { getSemesterBreakdownReport } = require('../services/learningJourney/b2ReportService');

describe('getSemesterBreakdownReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('grade breakdown uses active enrollment as denominator', async () => {
    EtEnrollmentSnapshot.findAll.mockResolvedValue([
      { studentId: 's1', grade: '1', department: '資工' },
      { studentId: 's2', grade: '1', department: '資工' },
      { studentId: 's3', grade: '2', department: '電機' }
    ]);
    getStudentsBestSkillsMap.mockResolvedValue(
      new Map([
        ['S1', { listening: { rank: 4 }, reading: { rank: 3 }, speaking: null, writing: null }],
        ['S2', { listening: null, reading: { rank: 4 }, speaking: { rank: 4 }, writing: null }],
        ['S3', { listening: { rank: 5 }, reading: { rank: 5 }, speaking: { rank: 5 }, writing: { rank: 5 } }]
      ])
    );

    const rows = await getSemesterBreakdownReport('114-1', 'grade');
    expect(rows).toHaveLength(2);
    const g1 = rows.find((r) => r.group === '1');
    expect(g1.totalStudents).toBe(2);
    expect(g1.skills.listening).toMatchObject({ count: 1, rate: 0.5 });
    expect(g1.skills.reading).toMatchObject({ count: 1, rate: 0.5 });
  });
});
