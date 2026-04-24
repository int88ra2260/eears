// scripts/clean-demo-data.js
// 清理培力報名和班級參與概況的 DEMO 測試資料

const { sequelize } = require('../models');
const {
  Class,
  ClassMembership,
  EnglishTestRegistration,
  LearningPartnerTeam,
  LearningPartnerTeamMember,
  BestepAttendance,
  BestepExamScore,
  BestepExamSession,
  BestepTeamRanking
} = require('../models');
const path = require('path');
const fs = require('fs');

// 檔案路徑配置
const UPLOADS_BASE_DIR = path.join(__dirname, '../uploads');
const ENGLISH_TEST_DIR = path.join(UPLOADS_BASE_DIR, 'english-test');
const BESTEP_DIR = path.join(UPLOADS_BASE_DIR, 'bestep');
const CLASS_ROSTER_PATTERN = /^class-roster-/;

// 統計資訊
const stats = {
  database: {
    classes: 0,
    classMemberships: 0,
    registrations: 0,
    teams: 0,
    teamMembers: 0,
    attendance: 0,
    examScores: 0,
    examSessions: 0,
    teamRankings: 0
  },
  files: {
    englishTest: 0,
    bestep: 0,
    classRosters: 0
  }
};

/**
 * 刪除目錄下的所有檔案（保留目錄結構）
 */
function deleteFilesInDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let deletedCount = 0;
  
  function deleteRecursive(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 遞迴刪除子目錄
        deletedCount += deleteRecursive(itemPath);
        // 刪除空目錄（但保留主目錄）
        try {
          fs.rmdirSync(itemPath);
        } catch (err) {
          // 忽略非空目錄錯誤
        }
      } else {
        // 刪除檔案
        try {
          fs.unlinkSync(itemPath);
          deletedCount++;
        } catch (err) {
          console.error(`  ⚠️  無法刪除檔案: ${itemPath}`, err.message);
        }
      }
    }
    
    return deletedCount;
  }
  
  return deleteRecursive(dirPath);
}

/**
 * 清理 uploads 目錄下的班級名單檔案
 */
function cleanClassRosterFiles() {
  if (!fs.existsSync(UPLOADS_BASE_DIR)) {
    return 0;
  }

  let deletedCount = 0;
  const files = fs.readdirSync(UPLOADS_BASE_DIR);
  
  for (const file of files) {
    if (CLASS_ROSTER_PATTERN.test(file)) {
      const filePath = path.join(UPLOADS_BASE_DIR, file);
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        console.error(`  ⚠️  無法刪除檔案: ${filePath}`, err.message);
      }
    }
  }
  
  return deletedCount;
}

/**
 * 清理資料庫資料
 */
async function cleanDatabase(transaction) {
  console.log('\n🗑️  開始清理資料庫...\n');

  // 1. 清理 BESTEP 團體名次（需先刪除，因為有外鍵關聯）
  console.log('📊 清理 BESTEP 團體名次...');
  const rankingsCount = await BestepTeamRanking.count({ transaction });
  await BestepTeamRanking.destroy({ where: {}, transaction });
  stats.database.teamRankings = rankingsCount;
  console.log(`  ✅ 已刪除 ${rankingsCount} 筆團體名次記錄`);

  // 2. 清理 BESTEP 成績
  console.log('\n📊 清理 BESTEP 成績資料...');
  const scoresCount = await BestepExamScore.count({ transaction });
  await BestepExamScore.destroy({ where: {}, transaction });
  stats.database.examScores = scoresCount;
  console.log(`  ✅ 已刪除 ${scoresCount} 筆成績記錄`);

  // 3. 清理 BESTEP 出席資料
  console.log('\n✅ 清理 BESTEP 出席資料...');
  const attendanceCount = await BestepAttendance.count({ transaction });
  await BestepAttendance.destroy({ where: {}, transaction });
  stats.database.attendance = attendanceCount;
  console.log(`  ✅ 已刪除 ${attendanceCount} 筆出席記錄`);

  // 4. 清理 BESTEP 考試場次
  console.log('\n📅 清理 BESTEP 考試場次...');
  const sessionsCount = await BestepExamSession.count({ transaction });
  await BestepExamSession.destroy({ where: {}, transaction });
  stats.database.examSessions = sessionsCount;
  console.log(`  ✅ 已刪除 ${sessionsCount} 筆考試場次記錄`);

  // 5. 清理團體成員（需先刪除，因為有外鍵關聯）
  console.log('\n👥 清理團體成員...');
  const teamMembersCount = await LearningPartnerTeamMember.count({ transaction });
  await LearningPartnerTeamMember.destroy({ where: {}, transaction });
  stats.database.teamMembers = teamMembersCount;
  console.log(`  ✅ 已刪除 ${teamMembersCount} 筆團體成員記錄`);

  // 6. 清理團體報名
  console.log('\n👫 清理團體報名...');
  const teamsCount = await LearningPartnerTeam.count({ transaction });
  await LearningPartnerTeam.destroy({ where: {}, transaction });
  stats.database.teams = teamsCount;
  console.log(`  ✅ 已刪除 ${teamsCount} 筆團體報名記錄`);

  // 7. 清理班級成員（需先刪除，因為有外鍵關聯）
  console.log('\n📚 清理班級成員...');
  const membersCount = await ClassMembership.count({ transaction });
  await ClassMembership.destroy({ where: {}, transaction });
  stats.database.classMemberships = membersCount;
  console.log(`  ✅ 已刪除 ${membersCount} 筆班級成員記錄`);

  // 8. 清理班級
  console.log('\n📚 清理班級...');
  const classesCount = await Class.count({ transaction });
  await Class.destroy({ where: {}, transaction });
  stats.database.classes = classesCount;
  console.log(`  ✅ 已刪除 ${classesCount} 筆班級記錄`);

  // 9. 清理培力個人報名（最後刪除，因為其他表可能參考它）
  console.log('\n📝 清理培力個人報名...');
  const registrationsCount = await EnglishTestRegistration.count({ transaction });
  await EnglishTestRegistration.destroy({ where: {}, transaction });
  stats.database.registrations = registrationsCount;
  console.log(`  ✅ 已刪除 ${registrationsCount} 筆報名記錄`);

  console.log('\n✅ 資料庫清理完成！');
}

/**
 * 清理上傳檔案
 */
function cleanUploadFiles() {
  console.log('\n🗑️  開始清理上傳檔案...\n');

  // 1. 清理培力報名相關檔案（證件照、證書等）
  console.log('📁 清理培力報名檔案 (uploads/english-test/)...');
  if (fs.existsSync(ENGLISH_TEST_DIR)) {
    stats.files.englishTest = deleteFilesInDirectory(ENGLISH_TEST_DIR);
    console.log(`  ✅ 已刪除 ${stats.files.englishTest} 個檔案`);
  } else {
    console.log('  ℹ️  目錄不存在，跳過');
  }

  // 2. 清理 BESTEP 相關檔案
  console.log('\n📁 清理 BESTEP 檔案 (uploads/bestep/)...');
  if (fs.existsSync(BESTEP_DIR)) {
    stats.files.bestep = deleteFilesInDirectory(BESTEP_DIR);
    console.log(`  ✅ 已刪除 ${stats.files.bestep} 個檔案`);
  } else {
    console.log('  ℹ️  目錄不存在，跳過');
  }

  // 3. 清理班級名單檔案
  console.log('\n📁 清理班級名單檔案 (uploads/class-roster-*)...');
  stats.files.classRosters = cleanClassRosterFiles();
  console.log(`  ✅ 已刪除 ${stats.files.classRosters} 個檔案`);

  console.log('\n✅ 檔案清理完成！');
}

/**
 * 顯示統計資訊
 */
function showStats() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 清理統計');
  console.log('='.repeat(60));
  
  console.log('\n📚 資料庫記錄:');
  console.log(`  班級: ${stats.database.classes}`);
  console.log(`  班級成員: ${stats.database.classMemberships}`);
  console.log(`  培力個人報名: ${stats.database.registrations}`);
  console.log(`  團體報名: ${stats.database.teams}`);
  console.log(`  團體成員: ${stats.database.teamMembers}`);
  console.log(`  BESTEP 出席: ${stats.database.attendance}`);
  console.log(`  BESTEP 成績: ${stats.database.examScores}`);
  console.log(`  BESTEP 考試場次: ${stats.database.examSessions}`);
  console.log(`  BESTEP 團體名次: ${stats.database.teamRankings}`);
  
  const totalDbRecords = Object.values(stats.database).reduce((sum, val) => sum + val, 0);
  console.log(`\n  資料庫記錄總數: ${totalDbRecords}`);
  
  console.log('\n📁 檔案:');
  console.log(`  培力報名檔案: ${stats.files.englishTest}`);
  console.log(`  BESTEP 檔案: ${stats.files.bestep}`);
  console.log(`  班級名單檔案: ${stats.files.classRosters}`);
  
  const totalFiles = Object.values(stats.files).reduce((sum, val) => sum + val, 0);
  console.log(`\n  檔案總數: ${totalFiles}`);
  
  console.log('\n' + '='.repeat(60));
}

/**
 * 互動式確認（使用 readline）
 */
function confirmCleanup() {
  return new Promise((resolve, reject) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n⚠️  警告：此操作將刪除以下所有資料：');
    console.log('  - 所有班級資料 (classes, class_memberships)');
    console.log('  - 所有培力個人報名 (english_test_registrations)');
    console.log('  - 所有團體報名 (learning_partner_teams, learning_partner_team_members)');
    console.log('  - 所有 BESTEP 資料 (attendance, scores, sessions, rankings)');
    console.log('  - uploads/english-test/ 目錄下的所有檔案');
    console.log('  - uploads/bestep/ 目錄下的所有檔案');
    console.log('  - uploads/ 目錄下的班級名單檔案\n');

    rl.question('請輸入 "YES" 確認執行清理操作（輸入其他任何內容將取消）: ', (answer) => {
      rl.close();
      if (answer.trim().toUpperCase() === 'YES') {
        resolve(true);
      } else {
        console.log('\n❌ 已取消清理操作');
        resolve(false);
      }
    });
  });
}

/**
 * 主函數
 */
async function cleanDemoData() {
  try {
    console.log('🚀 開始清理 DEMO 測試資料...\n');

    // 確認機制（可透過環境變數跳過）
    if (process.env.SKIP_CONFIRM !== 'true') {
      const confirmed = await confirmCleanup();
      if (!confirmed) {
        process.exit(0);
      }
      console.log('\n✅ 確認執行清理操作\n');
    } else {
      console.log('⚠️  警告：此操作將刪除所有培力報名和班級參與概況的資料！');
      console.log('⚠️  包括資料庫記錄和 uploads 目錄下的相關檔案！\n');
    }

    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    // 使用事務確保原子性
    const transaction = await sequelize.transaction();

    try {
      // 清理資料庫
      await cleanDatabase(transaction);
      
      // 提交事務
      await transaction.commit();
      console.log('\n✅ 資料庫事務已提交');

      // 清理檔案（不在事務中，因為檔案操作不支援事務）
      cleanUploadFiles();

      // 顯示統計
      showStats();

      console.log('\n🎉 清理完成！');
      
    } catch (error) {
      // 回滾事務
      await transaction.rollback();
      console.error('\n❌ 清理失敗，已回滾資料庫變更:', error);
      throw error;
    }

  } catch (error) {
    console.error('\n❌ 清理過程發生錯誤:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// 執行清理
if (require.main === module) {
  cleanDemoData()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 錯誤:', error);
      process.exit(1);
    });
}

module.exports = { cleanDemoData };
