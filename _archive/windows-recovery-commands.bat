@echo off
echo 🚨 Windows 資料恢復指令
echo.

echo 📋 步驟 1: 檢查當前資料狀況
mysql -u root -p activity_reservation -e "SELECT 'Event' as table_name, COUNT(*) as count FROM Event UNION ALL SELECT 'Reservation', COUNT(*) FROM Reservation UNION ALL SELECT 'User', COUNT(*) FROM User;"

echo.
echo 📋 步驟 2: 備份當前狀態
mysqldump -u root -p activity_reservation > backup_before_recovery_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql

echo.
echo 📋 步驟 3: 檢查二進位日誌內容 (使用 findstr 替代 grep)
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | findstr /i "INSERT INTO" | more

echo.
echo 📋 步驟 4: 檢查特定表格的 INSERT 語句
echo 檢查 Event 表格:
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | findstr /i "INSERT INTO.*Event"

echo 檢查 Reservation 表格:
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | findstr /i "INSERT INTO.*Reservation"

echo 檢查 User 表格:
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | findstr /i "INSERT INTO.*User"

echo.
echo 📋 步驟 5: 如果找到 INSERT 語句，執行恢復
echo 請手動執行: mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 ^| mysql -u root -p activity_reservation

echo.
echo 📋 步驟 6: 檢查恢復結果
mysql -u root -p activity_reservation -e "SELECT 'Event' as table_name, COUNT(*) as count FROM Event UNION ALL SELECT 'Reservation', COUNT(*) FROM Reservation UNION ALL SELECT 'User', COUNT(*) FROM User;"

pause

