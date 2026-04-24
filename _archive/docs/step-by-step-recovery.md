# 資料恢復步驟指南

## 🚨 緊急資料恢復步驟

### 步驟 1: 檢查當前狀況
```bash
cd F:\backend
mysql -u root -p activity_reservation -e "SELECT 'Event' as table_name, COUNT(*) as count FROM Event UNION ALL SELECT 'Reservation', COUNT(*) FROM Reservation UNION ALL SELECT 'User', COUNT(*) FROM User;"
```

### 步驟 2: 備份當前狀態
```bash
mysqldump -u root -p activity_reservation > backup_before_recovery_$(date +%Y%m%d_%H%M%S).sql
```

### 步驟 3: 檢查二進位日誌內容
```bash
# 查看最新的二進位日誌中是否有 INSERT 語句
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO" | head -20
```

### 步驟 4: 檢查特定表格的 INSERT 語句
```bash
# 檢查 Event 表格的 INSERT 語句
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO.*Event"

# 檢查 Reservation 表格的 INSERT 語句
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO.*Reservation"

# 檢查 User 表格的 INSERT 語句
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO.*User"
```

### 步驟 5: 如果找到 INSERT 語句，執行恢復
```bash
# 恢復到清理腳本執行前的狀態
mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | mysql -u root -p activity_reservation
```

### 步驟 6: 如果上面不行，嘗試恢復所有相關日誌
```bash
# 恢復所有相關的二進位日誌
mysqlbinlog binlog.000048 binlog.000049 binlog.000050 | mysql -u root -p activity_reservation
```

### 步驟 7: 檢查恢復結果
```bash
mysql -u root -p activity_reservation -e "SELECT 'Event' as table_name, COUNT(*) as count FROM Event UNION ALL SELECT 'Reservation', COUNT(*) FROM Reservation UNION ALL SELECT 'User', COUNT(*) FROM User;"
```

## 🔍 替代恢復方案

### 方案 A: 檢查系統備份
- 檢查是否有 Windows 系統還原點
- 檢查是否有資料庫備份檔案 (.sql, .dump)
- 檢查是否有雲端備份

### 方案 B: 重新創建基本資料
如果無法從二進位日誌恢復，可以重新創建基本的測試資料：

```sql
-- 創建測試活動
INSERT INTO `Event` (`name`, `description`, `date`, `startTime`, `endTime`, `location`, `maxParticipants`, `currentParticipants`, `eventType`, `maxCapacity`, `createdAt`, `updatedAt`) VALUES
('English Table Session 1', 'English conversation practice', '2024-12-15', '14:00:00', '15:00:00', 'Room A101', 20, 0, 'English Table', 20, NOW(), NOW()),
('English Table Session 2', 'English conversation practice', '2024-12-16', '14:00:00', '15:00:00', 'Room A102', 20, 0, 'English Table', 20, NOW(), NOW()),
('English Club Meeting', 'Weekly English club gathering', '2024-12-17', '16:00:00', '17:00:00', 'Room B202', 30, 0, 'English Club', 30, NOW(), NOW());

-- 創建測試用戶
INSERT INTO `User` (`studentId`, `name`, `email`, `phone`, `department`, `isBlacklisted`, `createdAt`, `updatedAt`) VALUES
('B123456789', '張小明', 'zhang@example.com', '0912345678', '資訊工程系', 0, NOW(), NOW()),
('B987654321', '李美華', 'li@example.com', '0987654321', '外語系', 0, NOW(), NOW()),
('B111222333', '王大華', 'wang@example.com', '0911111111', '商學院', 0, NOW(), NOW());
```

## ⚠️ 重要提醒

1. **先備份**: 執行任何恢復操作前都要先備份
2. **按順序執行**: 不要跳過任何步驟
3. **檢查結果**: 每個步驟後都要檢查結果
4. **如果失敗**: 立即停止並尋求幫助

## 📞 緊急聯繫

如果所有方法都失敗，請立即聯繫系統管理員或資料庫專家。
