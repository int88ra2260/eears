// scripts/check-semester-data.js
// 盤點 114-1 和 114-2 學期的資料

const { sequelize } = require('../models');

async function checkSemesterData() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    const semesters = ['114-1', '114-2'];
    
    for (const semester of semesters) {
      console.log(`\n📅 ${semester} 學期資料盤點`);
      console.log('='.repeat(50));
      
      // 1. 班級資料
      const [classes] = await sequelize.query(
        `SELECT COUNT(*) as count FROM classes WHERE semester = :semester`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\n📚 班級參與概況:`);
      console.log(`   班級數: ${classes.count}`);
      
      // 班級成員
      const [members] = await sequelize.query(
        `SELECT COUNT(*) as count FROM class_memberships WHERE semester = :semester`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`   班級成員數: ${members.count}`);
      
      // 2. 培力個人報名
      const [registrations] = await sequelize.query(
        `SELECT COUNT(*) as count FROM english_test_registrations WHERE semester = :semester`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\n📝 培力個人報名:`);
      console.log(`   報名總數: ${registrations.count}`);
      
      // 報名成功數
      const [successRegs] = await sequelize.query(
        `SELECT COUNT(*) as count FROM english_test_registrations WHERE semester = :semester AND status = 'success'`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`   報名成功數: ${successRegs.count}`);
      
      // 3. 培力團體報名（透過個人報名關聯查詢）
      const [teams] = await sequelize.query(
        `SELECT COUNT(DISTINCT lpt.id) as count 
         FROM learning_partner_teams lpt
         INNER JOIN learning_partner_team_members lptm ON lpt.id = lptm.teamId
         INNER JOIN english_test_registrations etr ON lptm.personalRegistrationId = etr.id
         WHERE etr.semester = :semester AND lpt.activeFlag = 1`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\n👫 培力團體報名:`);
      console.log(`   有效團體數: ${teams.count}`);
      
      // 團體成員數
      const [teamMembers] = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM learning_partner_team_members lptm
         INNER JOIN english_test_registrations etr ON lptm.personalRegistrationId = etr.id
         WHERE etr.semester = :semester AND lptm.activeFlag = 1`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`   團體成員數: ${teamMembers.count}`);
      
      // 4. BESTEP 出席資料
      const [attendance] = await sequelize.query(
        `SELECT COUNT(*) as count FROM bestep_attendance WHERE semester = :semester`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\n✅ BESTEP 出席資料:`);
      console.log(`   出席記錄數: ${attendance.count}`);
      
      // LR 出席
      const [lrAttendance] = await sequelize.query(
        `SELECT COUNT(*) as count FROM bestep_attendance WHERE semester = :semester AND examType = 'LR'`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`   LR 出席記錄: ${lrAttendance.count}`);
      
      // SW 出席
      const [swAttendance] = await sequelize.query(
        `SELECT COUNT(*) as count FROM bestep_attendance WHERE semester = :semester AND examType = 'SW'`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`   SW 出席記錄: ${swAttendance.count}`);
      
      // 5. BESTEP 成績資料
      const [scores] = await sequelize.query(
        `SELECT COUNT(*) as count FROM bestep_exam_scores WHERE semester = :semester`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\n📊 BESTEP 成績資料:`);
      console.log(`   成績記錄數: ${scores.count}`);
      
      // 達標人數
      const [passed] = await sequelize.query(
        `SELECT COUNT(*) as count FROM bestep_exam_scores WHERE semester = :semester AND passed = 1`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`   達標人數: ${passed.count}`);
      
      // 6. 團體名次
      const [rankings] = await sequelize.query(
        `SELECT COUNT(*) as count FROM bestep_team_rankings WHERE semester = :semester`,
        { replacements: { semester }, type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\n🏆 團體名次:`);
      console.log(`   已計算名次團體數: ${rankings.count}`);
    }
    
    console.log('\n\n✅ 盤點完成！');
    
  } catch (error) {
    console.error('❌ 盤點失敗:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkSemesterData();
}

module.exports = { checkSemesterData };
