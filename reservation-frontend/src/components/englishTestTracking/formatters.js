export const SKILLS = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];

export const SKILL_LABELS = {
  LISTENING: '聽力',
  READING: '閱讀',
  SPEAKING: '口說',
  WRITING: '寫作'
};

export function formatCount(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('en-US');
}

export function formatPercent(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return `${Number(n).toFixed(1)}%`;
}

export function normalizeGradeLabel(grade) {
  if (!grade) return '';
  if (/^\d+$/.test(String(grade))) return `大${grade}`;
  return String(grade);
}

export function buildDashboardData(attainmentReport, countReport) {
  const rowsA = attainmentReport?.rows || [];
  const rowsC = countReport?.rows || [];
  const gradeRows = rowsA
    .filter((r) => r.grade !== '總計')
    .map((r) => {
      const countRow = rowsC.find((c) => c.grade === r.grade) || {};
      const perSkill = SKILLS.reduce((acc, skill) => {
        const passed = Number(r[skill] || 0);
        const total = Number(countRow[skill] || 0);
        acc[skill] = {
          passed,
          total,
          percentage: total > 0 ? (passed / total) * 100 : 0
        };
        return acc;
      }, {});

      const totalStudents = Math.max(...SKILLS.map((s) => perSkill[s].total), 0);
      return {
        gradeRaw: r.grade,
        gradeLabel: normalizeGradeLabel(r.grade),
        totalStudents,
        listening: perSkill.LISTENING,
        reading: perSkill.READING,
        speaking: perSkill.SPEAKING,
        writing: perSkill.WRITING
      };
    });

  const group1Grades = ['1', '2', '3'];
  const group2Grades = ['2', '3', '4'];

  const computeGroup = (title, grades, theme) => {
    const selected = gradeRows.filter((g) => grades.includes(g.gradeRaw));
    const total = selected.reduce((sum, g) => sum + g.totalStudents, 0);
    const items = SKILLS.map((skill) => {
      const key = skill.toLowerCase();
      const passed = selected.reduce((sum, g) => sum + (g[key]?.passed || 0), 0);
      const percentage = total > 0 ? (passed / total) * 100 : 0;
      return {
        skill,
        label: SKILL_LABELS[skill],
        percentage,
        passed,
        total
      };
    });
    return { title, theme, items };
  };

  return {
    filterDescription: '以該學期在學名冊與最佳成績資料計算；若剛完成成績匯入，請先執行重算最佳成績。',
    summaryGroups: [
      computeGroup('大一至大三 B2(含)以上 達標率', group1Grades, 'purple'),
      computeGroup('大二至大四 B2(含)以上 達標率', group2Grades, 'gold')
    ],
    gradeRows
  };
}

