-- 手動從二進位日誌恢復資料
-- 請在命令行中執行以下指令

-- 1. 先備份當前狀態
-- mysqldump -u root -p activity_reservation > backup_before_recovery.sql

-- 2. 查看二進位日誌內容（查看是否有 INSERT 語句）
-- mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO"

-- 3. 恢復到清理腳本執行前的狀態
-- mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | mysql -u root -p activity_reservation

-- 4. 如果上面的指令不行，嘗試恢復所有相關日誌
-- mysqlbinlog binlog.000048 binlog.000049 binlog.000050 | mysql -u root -p activity_reservation

-- 5. 恢復後檢查資料數量
SELECT 'Event' as table_name, COUNT(*) as record_count FROM `Event`
UNION ALL
SELECT 'Reservation', COUNT(*) FROM `Reservation`
UNION ALL
SELECT 'User', COUNT(*) FROM `User`;
