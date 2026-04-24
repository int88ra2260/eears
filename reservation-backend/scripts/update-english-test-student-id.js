/**
 * 報名培力英檢學號修正腳本
 * 將學號為 B125090018 的其中一筆報名資料改為學號 B125090017
 *
 * 使用方式（在 reservation-backend 目錄下執行）：
 *   node scripts/update-english-test-student-id.js
 */

const { sequelize, EnglishTestRegistration } = require('../models');

const FROM_STUDENT_ID = 'B125090018';
const TO_STUDENT_ID = 'B125090017';

async function main() {
  console.log('報名培力英檢學號修正腳本');
  console.log(`目標：將學號 ${FROM_STUDENT_ID} 的其中一筆改為 ${TO_STUDENT_ID}\n`);

  try {
    await sequelize.authenticate();
    console.log('已連線至資料庫\n');

    // 檢查目標學號 B125090017 是否已存在（學號有唯一約束）
    const existingTo = await EnglishTestRegistration.findOne({
      where: { studentId: TO_STUDENT_ID }
    });
    if (existingTo) {
      console.error(`錯誤：學號 ${TO_STUDENT_ID} 已存在（報名編號: ${existingTo.id}），無法重複寫入。`);
      console.error('請先確認是否要合併或刪除既有資料後再執行。');
      process.exit(1);
    }

    // 找出學號為 B125090018 的報名資料（取其中一筆）
    const registration = await EnglishTestRegistration.findOne({
      where: { studentId: FROM_STUDENT_ID },
      order: [['id', 'ASC']] // 取 id 最小的一筆
    });

    if (!registration) {
      console.log(`找不到學號為 ${FROM_STUDENT_ID} 的報名資料，無需更新。`);
      process.exit(0);
    }

    const before = {
      id: registration.id,
      studentId: registration.studentId,
      name: registration.name,
      status: registration.status,
      semester: registration.semester
    };

    console.log('找到以下一筆報名資料將被更新：');
    console.log(`  報名編號: ${before.id}`);
    console.log(`  學號: ${before.studentId} → ${TO_STUDENT_ID}`);
    console.log(`  姓名: ${before.name}`);
    console.log(`  狀態: ${before.status}`);
    console.log(`  學期: ${before.semester || '(未填)'}\n`);

    await registration.update({ studentId: TO_STUDENT_ID });

    console.log('更新成功。');
    console.log(`報名編號 ${before.id} 的學號已由 ${FROM_STUDENT_ID} 改為 ${TO_STUDENT_ID}。`);
  } catch (err) {
    console.error('執行失敗:', err.message);
    if (err.name === 'SequelizeUniqueConstraintError') {
      console.error('（學號具唯一約束，請確認目標學號尚未被使用）');
    }
    process.exit(1);
  }
  // 不呼叫 sequelize.close()，避免與 models/index.js 的 sync() 衝突；程序結束時連線會自動釋放
  process.exit(0);
}

main();
