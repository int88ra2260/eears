-- 新增 location 欄位到 events 表格
ALTER TABLE events ADD COLUMN location VARCHAR(255) NULL COMMENT '活動地點';

-- 為現有活動設定預設地點
UPDATE events SET location = CASE 
  WHEN eventType = 'English Table' THEN '圖資１０樓 西灣廣場'
  WHEN eventType = 'English Club' THEN '綜合大樓 3樓 - GE3013教室'
  WHEN eventType = 'International Forum' THEN '綜合大樓 - GE3013教室'
  WHEN eventType = 'Job Talk' THEN '中山貨櫃創業基地 1樓 角落會議室'
  ELSE '待定'
END 
WHERE location IS NULL OR location = '';
