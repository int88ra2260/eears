-- 為Events表新增eventType欄位的遷移腳本
-- 執行此腳本前請先備份資料庫

-- 新增eventType欄位
ALTER TABLE Events ADD COLUMN eventType VARCHAR(255) NOT NULL DEFAULT 'English Table';

-- 為現有的活動設置適當的活動類型
-- 根據活動名稱推測活動類型
UPDATE Events SET eventType = 'English Table' WHERE name LIKE '%English Table%' OR name LIKE '%ET%';
UPDATE Events SET eventType = 'Job Talk' WHERE name LIKE '%Job Talk%' OR name LIKE '%求職%' OR name LIKE '%職場%';
UPDATE Events SET eventType = 'English Club' WHERE name LIKE '%English Club%' OR name LIKE '%英語俱樂部%';
UPDATE Events SET eventType = 'International Forum' WHERE name LIKE '%International Forum%' OR name LIKE '%國際論壇%' OR name LIKE '%國際沙龍%';

-- 檢查更新結果
SELECT id, name, eventType FROM Events;
