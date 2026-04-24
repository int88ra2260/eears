-- 最終修復 SQL
USE activity_reservation;

-- 1. 修復 survey_settings 表格
-- 先檢查表格結構
DESCRIBE survey_settings;

-- 如果 surveyId 欄位不存在，添加它
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `surveyId` varchar(100) NOT NULL UNIQUE;
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `isActive` tinyint(1) DEFAULT 1;
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `createdAt` datetime NOT NULL;
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `updatedAt` datetime NOT NULL;

-- 清理重複的空值
DELETE FROM `survey_settings` WHERE `surveyId` = '' OR `surveyId` IS NULL;

-- 2. 創建 User 表格
CREATE TABLE IF NOT EXISTS `User` (
  `id` int NOT NULL AUTO_INCREMENT,
  `studentId` varchar(50) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20),
  `department` varchar(100),
  `isBlacklisted` tinyint(1) DEFAULT 0,
  `blacklistUntil` datetime,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `studentId` (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. 檢查所有表格
SHOW TABLES;
