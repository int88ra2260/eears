// scripts/update-class-teachers.js
// 更新班級參與名單中的老師名稱，將張老師和李老師改為莊家雄老師

const { sequelize } = require('../models');
const { Class } = require('../models');

async function updateClassTeachers() {
  try {
    console.log('🔄 開始更新班級老師名稱...\n');

    // 查找需要更新的班級（張老師和李老師）
    const classesToUpdate = await Class.findAll({
      where: {
        teacherName: ['張老師', '李老師']
      }
    });

    if (classesToUpdate.length === 0) {
      console.log('ℹ️  沒有找到需要更新的班級（張老師或李老師）');
      return;
    }

    console.log(`📋 找到 ${classesToUpdate.length} 個班級需要更新：`);
    classesToUpdate.forEach(cls => {
      console.log(`  - ${cls.name} (${cls.semester}): ${cls.teacherName} → 莊家雄`);
    });

    // 更新為莊家雄老師
    const updated = await Class.update(
      { teacherName: '莊家雄' },
      {
        where: {
          teacherName: ['張老師', '李老師']
        }
      }
    );

    console.log(`\n✅ 已更新 ${updated[0]} 個班級的老師名稱為「莊家雄」`);

    // 驗證更新結果
    const updatedClasses = await Class.findAll({
      where: {
        teacherName: '莊家雄'
      }
    });

    console.log(`\n📊 目前莊家雄老師負責的班級：`);
    updatedClasses.forEach(cls => {
      console.log(`  - ${cls.name} (${cls.semester})`);
    });

    console.log('\n✅ 更新完成！');
  } catch (error) {
    console.error('❌ 更新失敗:', error);
    throw error;
  }
}

// 執行
if (require.main === module) {
  updateClassTeachers()
    .then(() => {
      console.log('\n✅ 完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 錯誤:', error);
      process.exit(1);
    });
}

module.exports = { updateClassTeachers };
