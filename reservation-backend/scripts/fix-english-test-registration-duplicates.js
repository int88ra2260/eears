// scripts/fix-english-test-registration-duplicates.js
// 修復 english_test_registrations 的 (studentId, semester) 重複資料（預設 dry-run，不會刪除）
//
// 使用方式：
// 1) 乾跑預覽（預設）
//    node scripts/fix-english-test-registration-duplicates.js
// 2) 真正執行刪除（需要 --apply）
//    node scripts/fix-english-test-registration-duplicates.js --apply
//
// 保留策略（同一 studentId + semester）：
// 1) updatedAt 最新者保留
// 2) updatedAt 相近時：抵免審核資訊較完整者保留
//    - exemption_review_status / exemption_verified_type / exemption_review_note 任一存在皆加分
// 3) 再次相近時：附件較完整者保留
//    - b2CertificateFile / disabilityCertFront / disabilityCertBack / idPhoto

require('dotenv').config();
const { sequelize, EnglishTestRegistration } = require('../models');

const APPLY = process.argv.includes('--apply');

function countNonEmpty(v) {
  return v != null && String(v).trim() !== '' ? 1 : 0;
}

async function run() {
  const mode = APPLY ? 'APPLY(真正執行刪除)' : 'DRY_RUN(僅列出，不刪除)';
  console.log(`🛠️  修復 English Test 報名重複資料：${mode}\n`);

  // 先找出重複群組（只處理 semester 非空的狀況，避免 unique key 無法有效運作）
  const groups = await sequelize.query(
    `
    SELECT
      studentId,
      semester,
      COUNT(*) AS count
    FROM english_test_registrations
    WHERE studentId IS NOT NULL
      AND semester IS NOT NULL
      AND semester <> ''
    GROUP BY studentId, semester
    HAVING COUNT(*) > 1
    ORDER BY count DESC;
    `,
    { type: sequelize.QueryTypes.SELECT }
  );

  if (!groups || groups.length === 0) {
    console.log('✅ 未發現需要修復的重複資料。\n');
    return;
  }

  let totalDeleted = 0;
  let totalGroups = 0;

  for (const g of groups) {
    totalGroups += 1;
    const studentId = g.studentId;
    const semester = g.semester;

    const rows = await EnglishTestRegistration.findAll({
      where: { studentId, semester },
      order: [['updatedAt', 'DESC'], ['id', 'DESC']]
    });

    // 依策略排序：updatedAt desc -> audit info desc -> attachment desc -> id desc
    const scored = rows.map((r) => {
      const auditScore =
        countNonEmpty(r.exemption_review_status) +
        countNonEmpty(r.exemption_verified_type) +
        countNonEmpty(r.exemption_review_note);

      const attachmentScore =
        countNonEmpty(r.b2CertificateFile) +
        countNonEmpty(r.disabilityCertFront) +
        countNonEmpty(r.disabilityCertBack) +
        countNonEmpty(r.idPhoto);

      const updatedAtTs = r.updatedAt ? r.updatedAt.getTime() : 0;

      return {
        row: r,
        auditScore,
        attachmentScore,
        updatedAtTs
      };
    });

    scored.sort((a, b) => {
      if (b.updatedAtTs !== a.updatedAtTs) return b.updatedAtTs - a.updatedAtTs;
      if (b.auditScore !== a.auditScore) return b.auditScore - a.auditScore;
      if (b.attachmentScore !== a.attachmentScore) return b.attachmentScore - a.attachmentScore;
      return b.row.id - a.row.id;
    });

    const keep = scored[0].row;
    const deleteRows = scored.slice(1).map((s) => s.row);

    console.log(`- 群組：studentId=${studentId}, semester=${semester}`);
    console.log(`  保留 id=${keep.id}`);
    if (deleteRows.length === 0) {
      console.log('  無需刪除。\n');
      continue;
    }

    console.log(`  刪除 idList=[${deleteRows.map((r) => r.id).join(', ')}]`);

    if (APPLY) {
      await sequelize.transaction(async (t) => {
        const ids = deleteRows.map((r) => r.id);
        await EnglishTestRegistration.destroy({ where: { id: ids }, transaction: t });
      });
      totalDeleted += deleteRows.length;
      console.log('  已刪除。\n');
    } else {
      console.log('  Dry-run 模式：尚未刪除。\n');
    }
  }

  console.log(
    `📌 完成：groups=${totalGroups}, deleted=${totalDeleted}（apply=${APPLY}）\n`
  );
}

run()
  .catch((e) => {
    console.error('❌ 執行失敗：', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });

