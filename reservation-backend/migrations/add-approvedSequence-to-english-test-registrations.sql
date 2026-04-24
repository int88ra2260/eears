-- 為 english_test_registrations 表格添加 approvedSequence 欄位
-- 如果欄位已存在，則不會報錯（使用錯誤處理）

SET @dbname = DATABASE();
SET @tablename = 'english_test_registrations';
SET @columnname = 'approvedSequence';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1', -- 欄位已存在，不做任何事
  CONCAT(
    'ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` INT NULL COMMENT ''已通過的順序編號（依設定為已通過的時間）'' AFTER `approvedAt`'
  )
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 為已通過且尚未有 approvedSequence 的記錄依通過時間建立順序
SET @seq := (SELECT IFNULL(MAX(`approvedSequence`), 0) FROM `english_test_registrations`);
UPDATE `english_test_registrations` r
JOIN (
  SELECT id, (@seq := @seq + 1) AS seq
  FROM `english_test_registrations`
  WHERE `status` = 'approved' AND `approvedSequence` IS NULL
  ORDER BY COALESCE(`approvedAt`, `updatedAt`, `createdAt`) ASC, `id` ASC
) t ON r.id = t.id
SET r.`approvedSequence` = t.seq
WHERE r.`status` = 'approved' AND r.`approvedSequence` IS NULL;

