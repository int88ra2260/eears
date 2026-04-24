/* eslint-disable no-console */
const {
  deriveExamScopeFromSkills,
  deriveExamScopeFromSkillRows
} = require('../services/learningJourney/utils/examScopeRules');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected=${expected} actual=${actual}`);
  }
}

function run() {
  const cases = [
    {
      label: 'A LR',
      inputSkills: ['listening', 'reading'],
      expectedScope: 'LR'
    },
    {
      label: 'B SW',
      inputSkills: ['speaking', 'writing'],
      expectedScope: 'SW'
    },
    {
      label: 'C ALL',
      inputSkills: ['listening', 'reading', 'speaking', 'writing'],
      expectedScope: 'ALL'
    },
    {
      label: 'D non-standard',
      inputSkills: ['listening'],
      expectedScope: null
    }
  ];

  for (const testCase of cases) {
    const result = deriveExamScopeFromSkills(testCase.inputSkills);
    assertEqual(result.scope, testCase.expectedScope, testCase.label);
  }

  const mismatchCase = deriveExamScopeFromSkillRows([
    { skill: 'listening' },
    { skill: 'reading' }
  ]);
  assertEqual(mismatchCase.scope, 'LR', 'E source ALL but skills LR uses derived scope');

  console.log(JSON.stringify({
    success: true,
    checkedCases: cases.length + 1,
    note: 'Non-standard skill set resolves to null scope.'
  }, null, 2));
}

run();
