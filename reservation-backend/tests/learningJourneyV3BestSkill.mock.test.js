/**
 * bestSkillService：mock ORM（不依賴實際 DB）
 */
jest.mock('../models', () => ({
  EtExamAttempt: {
    findAll: jest.fn().mockResolvedValue([
      {
        skillScores: [
          {
            skill: 'listening',
            cefr: 'B2',
            cefrRank: 4,
            toJSON() {
              return { skill: 'listening', cefr: 'B2', cefrRank: 4 };
            }
          },
          {
            skill: 'listening',
            cefr: 'C1',
            cefrRank: 5,
            toJSON() {
              return { skill: 'listening', cefr: 'C1', cefrRank: 5 };
            }
          }
        ]
      }
    ])
  },
  EtExamAttemptSkillScore: {}
}));

const { EtExamAttempt } = require('../models');
const { getStudentBestSkills } = require('../services/learningJourney/bestSkillService');

describe('bestSkillService (mocked EtExamAttempt)', () => {
  test('listening 取最高 rank', async () => {
    const best = await getStudentBestSkills('A123456');
    expect(best.listening).toMatchObject({ cefr: 'C1', rank: 5 });
    expect(EtExamAttempt.findAll).toHaveBeenCalled();
  });
});
