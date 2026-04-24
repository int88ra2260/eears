-- 為Events表新增customReservationRule欄位的遷移腳本
-- 此欄位用於儲存自定義活動類型的預約時間規則說明

-- 新增customReservationRule欄位
ALTER TABLE Events ADD COLUMN customReservationRule TEXT NULL COMMENT '自定義活動類型的預約時間規則說明';

-- 檢查新增結果
DESCRIBE Events;
