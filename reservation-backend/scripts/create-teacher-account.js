// scripts/create-teacher-account.js
// 建立老師帳號腳本
require('dotenv').config();
const { Teacher, sequelize } = require('../models');
const bcrypt = require('bcryptjs');

// 需要建立或更新的老師帳號清單
// teacherLevel 說明：
// - executive: 執行長
// - et_manager: English Table負責人
// - if_manager: International Forum負責人
// - jt_manager: Job Talk負責人
// - regular: 一般老師
const teacherAccounts = [
  {
    name: '王品惠',
    username: 'emiteacherPHW',
    role: 'teacher',
    teacherLevel: 'regular',
    department: null,
    phone: null
  },
  {
    name: '林毓凱',
    username: 'emiteacherYKL',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '施智閔',
    username: 'emiteacherCMS',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '洪敏秀',
    username: 'emiteacherMHH',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '紀博善',
    username: 'emiteacherDale',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '莊家雄',
    username: 'emiteacherCHC',
    role: 'admin', // 需使用問卷管理與設定
    teacherLevel: 'et_manager', // English Table負責人
    department: null,
    phone: null
  },
  {
    name: '陳美淑',
    username: 'emiteacherMSC',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '陳瑞華',
    username: 'emiteacherJHC',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '陳福仁',
    username: 'emiteacherFJC',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '傅安德',
    username: 'emiteacherAndrew',
    role: 'teacher',
    teacherLevel: 'jt_manager' // Job Talk負責人
  },
  {
    name: '曾千紋',
    username: 'emiteacherCWT',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '曾彩楣',
    username: 'emiteacherTMT',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '曾銘裕',
    username: 'emiteacherMYT',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '黃舒屏',
    username: 'emiteacherSPH',
    role: 'admin', // 指定所有權限
    teacherLevel: 'executive' // 執行長
  },
  {
    name: '溫惠珍',
    username: 'emiteacherHCW',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '劉季貞',
    username: 'emiteacherCCL',
    role: 'teacher',
    teacherLevel: 'regular'
  },
  {
    name: '戴藤懋',
    username: 'emiteacherThomas',
    role: 'teacher',
    teacherLevel: 'if_manager' // International Forum負責人
  }
];

function getRawTeacherPassword(username) {
  // 建議在 .env 設定：
  // TEACHER_PASSWORD_emiteacherPHW=xxxx
  // 由於環境變數大小寫在不同系統可能不同，這裡做多種候選鍵名嘗試。
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

async function upsertTeacherAccounts() {
  let transaction;
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功');
    transaction = await sequelize.transaction();

    let createdCount = 0;
    let updatedCount = 0;

    for (const teacherData of teacherAccounts) {
      const email = teacherData.email || `${teacherData.username}@mail.nsysu.edu.tw`;
      const payload = {
        ...teacherData,
        email,
        department: teacherData.department ?? null,
        phone: teacherData.phone ?? null,
        teacherLevel: teacherData.teacherLevel ?? 'regular',
        role: teacherData.role ?? 'teacher',
        isActive: true
      };

      console.log(`\n👉 處理帳號：${payload.username} (${payload.name})`);

      const existingTeacher = await Teacher.findOne({
        where: { username: payload.username },
        transaction
      });

      const rawPassword = getRawTeacherPassword(payload.username);
      const hashedPassword = await bcrypt.hash(rawPassword, 12);

      if (existingTeacher) {
        // 只更新密碼相關欄位，不覆蓋其他資料
        await existingTeacher.update({
          password: hashedPassword,
          mustResetPassword: true,
          passwordChangedAt: null
        }, { transaction });
        console.log('✔️  已存在，完成密碼重設');
        updatedCount += 1;
      } else {
        const teacher = await Teacher.create({
          name: payload.name,
          username: payload.username,
          email: payload.email,
          password: hashedPassword,
          department: payload.department,
          phone: payload.phone,
          role: payload.role,
          teacherLevel: payload.teacherLevel,
          isActive: true,
          mustResetPassword: true,
          passwordChangedAt: null
        }, { transaction });
        console.log('✅ 新增成功，帳號資訊如下：');
        console.log(`   ID：${teacher.id}`);
        console.log(`   帳號：${teacher.username}`);
        console.log(`   Email：${teacher.email}`);
        createdCount += 1;
      }
    }

    await transaction.commit();
    console.log('\n🎉 全部處理完成');
    console.log(`   ➕ 新增 ${createdCount} 筆`);
    console.log(`   🔄 更新 ${updatedCount} 筆`);

    process.exit(0);
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {}
    }
    console.error('❌ 建立或更新老師帳號失敗：', error);
    process.exit(1);
  }
}

upsertTeacherAccounts();

