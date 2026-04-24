-- 為 english_test_registrations 表格添加 approvedAt 欄位
-- 如果欄位已存在，則不會報錯（使用錯誤處理）

-- 檢查並添加 approvedAt 欄位
SET @dbname = DATABASE();
SET @tablename = 'english_test_registrations';
SET @columnname = 'approvedAt';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1', -- 欄位已存在，不做任何事
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` DATETIME NULL COMMENT ''被標記為「已通過」的時間'' AFTER `rejectionOther`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 為已通過的記錄設定 approvedAt（如果為 null）
-- 使用 updatedAt 作為預設值（假設更新時間就是通過時間）
UPDATE `english_test_registrations` 
SET `approvedAt` = `updatedAt` 
WHERE `status` = 'approved' AND `approvedAt` IS NULL;
