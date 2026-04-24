const LR_SKILLS = new Set(['listening', 'reading']);
const SW_SKILLS = new Set(['speaking', 'writing']);
const ALL_SKILLS = new Set(['listening', 'reading', 'speaking', 'writing']);

function normalizeSkillName(skill) {
  if (!skill) return '';
  return String(skill).trim().toLowerCase();
}

function deriveExamScopeFromSkills(skills = []) {
  const normalizedSkills = Array.from(new Set((skills || []).map(normalizeSkillName).filter(Boolean)));
  if (!normalizedSkills.length) {
    return { scope: null, reason: 'NO_SKILLS' };
  }

  const skillSet = new Set(normalizedSkills);
  const hasLR = Array.from(LR_SKILLS).every((skill) => skillSet.has(skill));
  const hasSW = Array.from(SW_SKILLS).every((skill) => skillSet.has(skill));

  if (hasLR && hasSW && skillSet.size === ALL_SKILLS.size) {
    return { scope: 'ALL', reason: null };
  }
  if (hasLR && !hasSW && skillSet.size === LR_SKILLS.size) {
    return { scope: 'LR', reason: null };
  }
  if (hasSW && !hasLR && skillSet.size === SW_SKILLS.size) {
    return { scope: 'SW', reason: null };
  }

  return {
    scope: null,
    reason: `NON_STANDARD_SKILL_SET:${normalizedSkills.sort().join(',')}`
  };
}

function deriveExamScopeFromSkillRows(skillRows = []) {
  return deriveExamScopeFromSkills((skillRows || []).map((row) => row && row.skill));
}

module.exports = {
  deriveExamScopeFromSkills,
  deriveExamScopeFromSkillRows
};
