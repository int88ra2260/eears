// services/bestepRankingService.js
const {
  LearningPartnerTeam,
  LearningPartnerTeamMember,
  BestepExamScore,
  BestepTeamRanking,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// 獎勵金額對照表
const REWARD_AMOUNTS = {
  1: 5000,
  2: 4000,
  3: 3000,
  4: 2500,
  5: 2000,
  6: 1500,  // 6-10名
  10: 1500,
  11: 1000, // 11-20名
  20: 1000
};

/**
 * 取得獎勵金額
 * @param {number} rank - 名次
 * @returns {number} 獎勵金額
 */
function getRewardAmount(rank) {
  if (rank <= 0) return 0;
  if (rank === 1) return REWARD_AMOUNTS[1];
  if (rank === 2) return REWARD_AMOUNTS[2];
  if (rank === 3) return REWARD_AMOUNTS[3];
  if (rank === 4) return REWARD_AMOUNTS[4];
  if (rank === 5) return REWARD_AMOUNTS[5];
  if (rank >= 6 && rank <= 10) return REWARD_AMOUNTS[6];
  if (rank >= 11 && rank <= 20) return REWARD_AMOUNTS[11];
  return 0;
}

/**
 * 計算團體名次
 * @param {string} semester - 學期
 * @returns {Promise<object>}
 */
async function calculateTeamRanking(semester) {
  const transaction = await sequelize.transaction();

  try {
    // 1. 取得所有已完成的團體
    const teams = await LearningPartnerTeam.findAll({
      where: {
        status: 'approved',
        activeFlag: 1
      },
      include: [{
        model: LearningPartnerTeamMember,
        as: 'members',
        where: {
          activeFlag: 1,
          approvalStatus: 'approved'
        },
        required: true
      }],
      transaction
    });

    // 2. 計算每個隊伍的平均分
    const teamMetrics = [];

    for (const team of teams) {
      const memberStudentIds = team.members.map(m => m.studentId);

      // 取得成員的成績
      const scores = await BestepExamScore.findAll({
        where: {
          studentId: { [Op.in]: memberStudentIds },
          semester
        },
        transaction
      });

      // 過濾有效成績（至少要有總分或四項分數）
      const validScores = scores.filter(s => 
        (s.totalScore !== null && s.totalScore !== undefined) ||
        (s.listeningScore !== null && 
         s.readingScore !== null && 
         s.speakingScore !== null && 
         s.writingScore !== null)
      );

      if (validScores.length === 0) {
        continue; // 跳過沒有成績的隊伍
      }

      // 建立學號到成績的映射
      const scoreMap = {};
      validScores.forEach(s => {
        scoreMap[s.studentId] = s;
      });

      // 計算每個成員的總分
      const memberScores = team.members
        .map(m => {
          const score = scoreMap[m.studentId];
          if (!score) return null;
          return {
            studentId: m.studentId,
            name: m.name,
            totalScore: parseFloat(score.totalScore) || 
              (parseFloat(score.listeningScore || 0) + 
               parseFloat(score.readingScore || 0) + 
               parseFloat(score.speakingScore || 0) + 
               parseFloat(score.writingScore || 0)),
            passed: score.passed || false
          };
        })
        .filter(m => m !== null);

      if (memberScores.length === 0) {
        continue; // 跳過沒有成績的隊伍
      }

      // 計算平均分
      const totalScores = memberScores.map(m => m.totalScore);
      const avgScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;

      teamMetrics.push({
        teamId: team.id,
        teamName: team.teamName || `隊伍${team.id}`,
        avgScore: parseFloat(avgScore.toFixed(2)),
        members: memberScores
      });
    }

    // 3. 依平均分降序排序
    teamMetrics.sort((a, b) => b.avgScore - a.avgScore);

    // 4. 計算名次（處理並列規則）
    let currentRank = 1;
    for (let i = 0; i < teamMetrics.length; i++) {
      if (i > 0 && Math.abs(teamMetrics[i].avgScore - teamMetrics[i - 1].avgScore) > 0.01) {
        // 分數不同（考慮浮點數誤差），計算跳過的名次數
        // 找出前一個名次有多少隊伍並列
        let tiedCount = 1;
        for (let j = i - 2; j >= 0; j--) {
          if (Math.abs(teamMetrics[j].avgScore - teamMetrics[i - 1].avgScore) <= 0.01) {
            tiedCount++;
          } else {
            break;
          }
        }
        currentRank = currentRank + tiedCount;
      }
      teamMetrics[i].rank = currentRank;
      teamMetrics[i].rewardAmount = getRewardAmount(currentRank);
    }

    // 5. 儲存到資料庫
    const calculatedAt = new Date();
    for (const metric of teamMetrics) {
      await BestepTeamRanking.upsert({
        teamId: metric.teamId,
        semester,
        avgScore: metric.avgScore,
        rank: metric.rank,
        rewardAmount: metric.rewardAmount,
        calculatedAt
      }, {
        transaction
      });
    }

    await transaction.commit();

    return {
      semester,
      teams: teamMetrics,
      calculatedAt
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 取得團體名次列表
 * @param {string} semester - 學期
 * @returns {Promise<array>}
 */
async function getTeamRanking(semester) {
  const rankings = await BestepTeamRanking.findAll({
    where: { semester },
    include: [{
      model: LearningPartnerTeam,
      as: 'team',
      include: [{
        model: LearningPartnerTeamMember,
        as: 'members',
        where: {
          activeFlag: 1
        },
        required: false
      }]
    }],
    order: [['rank', 'ASC']]
  });

  return rankings.map(r => ({
    teamId: r.teamId,
    teamName: r.team.teamName || `隊伍${r.teamId}`,
    avgScore: parseFloat(r.avgScore),
    rank: r.rank,
    rewardAmount: r.rewardAmount,
    members: r.team.members.map(m => ({
      studentId: m.studentId,
      name: m.name,
      isRepresentative: m.isRepresentative
    }))
  }));
}

module.exports = {
  calculateTeamRanking,
  getTeamRanking
};
