// scripts/reset-teacher-password.js
// 重設老師密碼腳本（僅更新密碼，不修改其他資料）
require('dotenv').config();
const { Teacher, sequelize } = require('../models');
const bcrypt = require('bcryptjs');

// 需要重設密碼的老師帳號清單
// 密碼改由環境變數提供：TEACHER_PASSWORD_<username>
const teacherUsernames = [
  'emiteacherPHW',
  'emiteacherYKL',
  'emiteacherCMS',
  'emiteacherMHH',
  'emiteacherDale',
  'emiteacherCHC',
  'emiteacherMSC',
  'emiteacherJHC',
  'emiteacherFJC',
  'emiteacherAndrew',
  'emiteacherCWT',
  'emiteacherTMT',
  'emiteacherMYT',
  'emiteacherSPH',
  'emiteacherHCW',
  'emiteacherCCL',
  'emiteacherThomas'
];

function getRawTeacherPassword(username) {
  // 建議在 .env 設定：
  // TEACHER_PASSWORD_emiteacherPHW=xxxx
  const candidates = [
    `TEACHER_PASSWORD_${username}`,
    `TEACHER_PASSWORD_${username.toUpperCase()}`,
    `TEACHER_PASSWORD_${username.toLowerCase()}`,
  ];

  for (const key of candidates) {
    if (process.env[key]) return process.env[key];
  }

  throw new Error(`缺少老師密碼環境變數：TEACHER_PASSWORD_${username}`);
}

async function resetTeacherPasswords() {
  let transaction;
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');
    transaction = await sequelize.transaction();

    let successCount = 0;
    let notFoundCount = 0;
    const notFoundAccounts = [];

    for (const username of teacherUsernames) {
      console.log(`👉 處理帳號：${username}`);

      const existingTeacher = await Teacher.findOne({
        where: { username },
        transaction
      });

      if (!existingTeacher) {
        console.log(`❌ 帳號不存在：${username}`);
        notFoundCount += 1;
        notFoundAccounts.push(username);
        continue;
      }

      const rawPassword = getRawTeacherPassword(username);
      const hashedPassword = await bcrypt.hash(rawPassword, 12);

      // 只更新密碼相關欄位，不修改其他資料
      await existingTeacher.update({
        password: hashedPassword,
        mustResetPassword: true,
        passwordChangedAt: null
      }, { transaction });

      console.log(`✅ 密碼重設成功：${existingTeacher.name} (${username})`);
      successCount += 1;
    }

    await transaction.commit();
    console.log('\n🎉 全部處理完成');
    console.log(`   ✅ 成功重設 ${successCount} 筆密碼`);
    if (notFoundCount > 0) {
      console.log(`   ❌ 找不到 ${notFoundCount} 筆帳號：`);
      notFoundAccounts.forEach(username => {
        console.log(`      - ${username}`);
      });
    }

    process.exit(0);
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {}
    }
    console.error('❌ 重設密碼失敗：', error);
    process.exit(1);
  }
}

resetTeacherPasswords();

