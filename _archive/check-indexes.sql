-- 檢查重複索引的 SQL 查詢
-- 這個查詢會顯示所有表格的索引信息

SELECT 
    TABLE_NAME as '表格名稱',
    INDEX_NAME as '索引名稱',
    COLUMN_NAME as '欄位名稱',
    NON_UNIQUE as '是否唯一',
    INDEX_TYPE as '索引類型'
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = 'activity_reservation'
    AND INDEX_NAME != 'PRIMARY'
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 檢查重複的 studentId 索引
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COUNT(*) as '欄位數量'
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = 'activity_reservation'
    AND INDEX_NAME LIKE 'studentId_%'
GROUP BY 
    TABLE_NAME, INDEX_NAME
ORDER BY 
    TABLE_NAME, INDEX_NAME;

-- 檢查重複的 surveyId 索引
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COUNT(*) as '欄位數量'
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = 'activity_reservation'
    AND INDEX_NAME LIKE 'surveyId_%'
GROUP BY 
    TABLE_NAME, INDEX_NAME
ORDER BY 
    TABLE_NAME, INDEX_NAME;
