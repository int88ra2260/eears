-- 手動修復剩餘問題
USE activity_reservation;

-- 1. 修復 Event 表格缺失的欄位
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `description` text;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `maxParticipants` int DEFAULT 0;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `currentParticipants` int DEFAULT 0;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `createdAt` datetime NOT NULL;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `updatedAt` datetime NOT NULL;

-- 2. 修復 survey_settings 重複鍵問題
-- 先清理重複的空值
DELETE FROM `survey_settings` WHERE `surveyId` = '' OR `surveyId` IS NULL;

-- 添加缺失的欄位
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `surveyId` varchar(100) NOT NULL UNIQUE;
ALTER TABLE `survey_settings` ADD COLUMN IF NOT EXISTS `isActive` tinyint(1) DEFAULT 1;

-- 3. 檢查並修復 Reservation 表格
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `eventId` int NOT NULL;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `userId` int NOT NULL;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `studentId` varchar(50) NOT NULL;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `studentName` varchar(255) NOT NULL;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `studentEmail` varchar(255) NOT NULL;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `phone` varchar(20);
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `department` varchar(100);
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `timestamp` datetime NOT NULL;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `checkinStatus` varchar(50) DEFAULT '未報到';
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `checkinTime` datetime;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `group` varchar(50);
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `createdAt` datetime NOT NULL;
ALTER TABLE `Reservation` ADD COLUMN IF NOT EXISTS `updatedAt` datetime NOT NULL;

-- 4. 檢查並修復 User 表格
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `studentId` varchar(50) NOT NULL UNIQUE;
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `name` varchar(255) NOT NULL;
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `email` varchar(255) NOT NULL;
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `phone` varchar(20);
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `department` varchar(100);
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `isBlacklisted` tinyint(1) DEFAULT 0;
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `blacklistUntil` datetime;
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `createdAt` datetime NOT NULL;
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `updatedAt` datetime NOT NULL;
