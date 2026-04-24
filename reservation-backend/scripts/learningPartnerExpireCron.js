// scripts/learningPartnerExpireCron.js
// 定時任務：掃描過期的學習有伴團體並標記為失效

require('dotenv').config();
const { LearningPartnerTeam, LearningPartnerTeamMember } = require('../models');
const emailQueue = require('../utils/emailQueue');
const auditLogService = require('../services/auditLogService');

async function expireLearningPartnerTeams() {
  const transaction = await LearningPartnerTeam.sequelize.transaction();
  const requestId = `cron-learningPartnerExpire:${Date.now()}`;
  
  try {
    const now = new Date();
    
    // 找出所有 pending_approval 且已過期的團體
    const expiredTeams = await LearningPartnerTeam.findAll({
      where: {
        status: 'pending_approval',
        expiresAt: {
          [require('sequelize').Op.lt]: now
        }
      },
      include: [{
        model: LearningPartnerTeamMember,
        as: 'members',
        where: {
          approvalStatus: { [require('sequelize').Op.in]: ['pending', 'approved'] }
        },
        required: false
      }],
      transaction,
      lock: require('sequelize').Transaction.LOCK.UPDATE
    });

    if (expiredTeams.length === 0) {
      await transaction.commit();
      console.log(`[${new Date().toISOString()}] ✅ 沒有過期的團體需要處理`);
      return { expired: 0, notified: 0 };
    }

    console.log(`[${new Date().toISOString()}] 🔍 找到 ${expiredTeams.length} 個過期的團體`);

    let expiredCount = 0;
    let notifiedCount = 0;

    for (const team of expiredTeams) {
      let notifiedPerTeam = 0;
      // 更新團體狀態為 expired
      await team.update({
        status: 'expired',
        activeFlag: 0
      }, { transaction });

      // 更新所有仍為 pending 的成員為 expired
      await LearningPartnerTeamMember.update(
        {
          approvalStatus: 'expired',
          activeFlag: 0
        },
        {
          where: {
            teamId: team.id,
            approvalStatus: 'pending'
          },
          transaction
        }
      );

      expiredCount++;

      // 發送失效通知給已同意的成員（可選）
      const approvedMembers = team.members.filter(m => m.approvalStatus === 'approved');
      if (approvedMembers.length > 0) {
        try {
          for (const member of approvedMembers) {
            await emailQueue.enqueue('learningPartnerExpired', {
              email: member.email,
              name: member.name,
              studentId: member.studentId,
              teamId: team.id,
              teamName: team.teamName || `團體 #${team.id}`
            }, {
              requestId,
              relatedEntityType: 'learning_partner',
              relatedEntityId: team.id,
            });
            notifiedCount++;
            notifiedPerTeam++;
          }
        } catch (error) {
          console.error(`發送失效通知失敗 (teamId: ${team.id}):`, error);
        }
      }

      // 稽核：learning partner 過期處理（含通知送出結果摘要）
      auditLogService.logAuditAsync({
        module: 'learning_partner',
        action: 'expire',
        entityType: 'LearningPartnerTeam',
        entityId: team.id,
        targetSummary: `teamId=${team.id}`,
        beforeData: {
          status: 'pending_approval',
          activeFlag: 1,
        },
        afterData: {
          status: 'expired',
          activeFlag: 0,
          notifiedPerTeam,
        },
        requestId,
      });
    }

    await transaction.commit();
    console.log(`[${new Date().toISOString()}] ✅ 已處理 ${expiredCount} 個過期團體，發送 ${notifiedCount} 封通知郵件`);

    return { expired: expiredCount, notified: notifiedCount };

  } catch (error) {
    await transaction.rollback();
    console.error(`[${new Date().toISOString()}] ❌ 處理過期團體時發生錯誤:`, error);
    throw error;
  }
}

// 如果直接執行此腳本（非 require），則執行一次
if (require.main === module) {
  expireLearningPartnerTeams()
    .then(result => {
      console.log('處理完成:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('處理失敗:', error);
      process.exit(1);
    });
}

module.exports = { expireLearningPartnerTeams };
