-- 檢查資料恢復狀況
USE activity_reservation;

-- 1. 檢查各表格資料數量
SELECT 'Event' as table_name, COUNT(*) as record_count FROM `Event`
UNION ALL
SELECT 'Reservation', COUNT(*) FROM `Reservation`
UNION ALL
SELECT 'User', COUNT(*) FROM `User`
UNION ALL
SELECT 'survey_settings', COUNT(*) FROM `survey_settings`
UNION ALL
SELECT 'Settings', COUNT(*) FROM `Settings`
UNION ALL
SELECT 'EnglishTableSurveyResponse', COUNT(*) FROM `EnglishTableSurveyResponse`;

-- 2. 檢查是否有備份資料庫
SHOW DATABASES LIKE '%activity%';
SHOW DATABASES LIKE '%reservation%';
SHOW DATABASES LIKE '%backup%';

-- 3. 檢查 MySQL 二進位日誌
SHOW BINARY LOGS;

-- 4. 如果沒有資料，創建測試資料
-- 創建測試活動
INSERT IGNORE INTO `Event` (`name`, `description`, `date`, `startTime`, `endTime`, `location`, `maxParticipants`, `currentParticipants`, `eventType`, `maxCapacity`, `createdAt`, `updatedAt`) VALUES
('English Table Session 1', 'English conversation practice', '2024-12-15', '14:00:00', '15:00:00', 'Room A101', 20, 0, 'English Table', 20, NOW(), NOW()),
('English Club Meeting', 'Weekly English club gathering', '2024-12-16', '16:00:00', '17:00:00', 'Room B202', 30, 0, 'English Club', 30, NOW(), NOW());

-- 創建測試用戶
INSERT IGNORE INTO `User` (`studentId`, `name`, `email`, `phone`, `department`, `isBlacklisted`, `createdAt`, `updatedAt`) VALUES
('B123456789', '張小明', 'zhang@example.com', '0912345678', '資訊工程系', 0, NOW(), NOW()),
('B987654321', '李美華', 'li@example.com', '0987654321', '外語系', 0, NOW(), NOW());

-- 創建基本設定
INSERT IGNORE INTO `Settings` (`key`, `value`, `createdAt`, `updatedAt`) VALUES
('system_name', 'English Activity Reservation System', NOW(), NOW()),
('max_reservations_per_user', '5', NOW(), NOW()),
('reservation_deadline_hours', '24', NOW(), NOW());
