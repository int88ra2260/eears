// scripts/clearEnglishTestData.js
// 清除培力英檢報名測試紀錄的腳本
const { EnglishTestRegistration } = require('../models');
const fs = require('fs');
const path = require('path');

async function clearTestData() {
  try {
    console.log('開始清除培力英檢報名測試紀錄...');
    
    // 查詢所有報名資料（只查詢必要的欄位，避免查詢不存在的欄位）
    const allRegistrations = await EnglishTestRegistration.findAll({
      attributes: ['id', 'idPhoto', 'b2CertificateFile', 'disabilityCertFront', 'disabilityCertBack']
    });
    console.log(`找到 ${allRegistrations.length} 筆報名資料`);
    
    if (allRegistrations.length === 0) {
      console.log('沒有資料需要清除');
      return;
    }
    
    // 確認是否要清除
    console.log('\n警告：此操作將刪除所有報名資料及相關檔案！');
    console.log('如果確定要清除，請在腳本中將 confirmClear 設為 true');
    
    const confirmClear = false; // 改為 true 以執行清除
    
    if (!confirmClear) {
      console.log('清除操作已取消（請將 confirmClear 設為 true 以執行）');
      return;
    }
    
    let deletedCount = 0;
    let fileDeletedCount = 0;
    let fileErrorCount = 0;
    
    // 刪除每筆報名資料及其檔案
    for (const registration of allRegistrations) {
      try {
        // 刪除相關檔案
        const baseUploadPath = path.join(__dirname, '../uploads');
        const filesToDelete = [
          registration.idPhoto,
          registration.b2CertificateFile,
          registration.disabilityCertFront,
          registration.disabilityCertBack
        ].filter(Boolean);
        
        for (const filePath of filesToDelete) {
          const fullPath = path.join(baseUploadPath, filePath);
          try {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              fileDeletedCount++;
              console.log(`已刪除檔案: ${filePath}`);
            }
          } catch (fileError) {
            console.error(`刪除檔案失敗: ${filePath}`, fileError.message);
            fileErrorCount++;
          }
        }
        
        // 刪除資料庫記錄
        await registration.destroy();
        deletedCount++;
        console.log(`已刪除報名資料 ID: ${registration.id}`);
      } catch (error) {
        console.error(`刪除報名資料 ID ${registration.id} 失敗:`, error.message);
      }
    }
    
    console.log('\n清除完成！');
    console.log(`- 已刪除報名資料: ${deletedCount} 筆`);
    console.log(`- 已刪除檔案: ${fileDeletedCount} 個`);
    if (fileErrorCount > 0) {
      console.log(`- 檔案刪除錯誤: ${fileErrorCount} 個`);
    }
    
  } catch (error) {
    console.error('清除資料時發生錯誤:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 執行清除
clearTestData();
