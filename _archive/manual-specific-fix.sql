-- 手動修復特定問題
USE activity_reservation;

-- 1. 修復 survey_settings 表格
-- 先檢查現有結構
DESCRIBE survey_settings;

-- 添加 surveyId 欄位（允許 NULL）
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `surveyId` varchar(100);

-- 為現有記錄設置預設值
UPDATE `survey_settings` SET `surveyId` = CONCAT('survey_', `id`) WHERE `surveyId` IS NULL;

-- 設置為 NOT NULL
ALTER TABLE `survey_settings` MODIFY COLUMN `surveyId` varchar(100) NOT NULL;

-- 添加唯一約束
ALTER TABLE `survey_settings` ADD UNIQUE KEY `unique_survey_id` (`surveyId`);

-- 添加其他缺失的欄位
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `isActive` tinyint(1) DEFAULT 1;
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. 修復 User 表格
-- 先刪除可能存在的 User 表格
DROP TABLE IF EXISTS `User`;

-- 重新創建 User 表格
CREATE TABLE `User` (
  `id` int NOT NULL AUTO_INCREMENT,
  `studentId` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20),
  `department` varchar(100),
  `isBlacklisted` tinyint(1) DEFAULT 0,
  `blacklistUntil` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_id` (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. 檢查所有表格
SHOW TABLES;
DESCRIBE survey_settings;
DESCRIBE User;
