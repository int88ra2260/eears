-- 手動清理資料庫
SET FOREIGN_KEY_CHECKS = 0;

-- 刪除所有相關表格
DROP TABLE IF EXISTS class_memberships;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS settings;

-- 重新啟用外鍵檢查
SET FOREIGN_KEY_CHECKS = 1;

-- 顯示清理結果
SHOW TABLES;
