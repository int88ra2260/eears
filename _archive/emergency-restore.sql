-- 緊急恢復資料庫結構
USE activity_reservation;

-- 1. 修復 Event 表格
CREATE TABLE IF NOT EXISTS `Event` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `date` date NOT NULL,
  `startTime` time NOT NULL,
  `endTime` time NOT NULL,
  `location` varchar(255) NOT NULL,
  `maxParticipants` int DEFAULT 0,
  `currentParticipants` int DEFAULT 0,
  `eventType` varchar(100) NOT NULL,
  `maxCapacity` int DEFAULT 0,
  `customReservationRule` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 添加缺失的欄位到 Event 表格
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `name` varchar(255) NOT NULL;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `description` text;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `date` date NOT NULL;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `startTime` time NOT NULL;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `endTime` time NOT NULL;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `location` varchar(255) NOT NULL;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `maxParticipants` int DEFAULT 0;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `currentParticipants` int DEFAULT 0;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `eventType` varchar(100) NOT NULL;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `maxCapacity` int DEFAULT 0;
ALTER TABLE `Event` ADD COLUMN IF NOT EXISTS `customReservationRule` text;

-- 2. 修復 Reservation 表格
CREATE TABLE IF NOT EXISTS `Reservation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eventId` int NOT NULL,
  `userId` int NOT NULL,
  `studentId` varchar(50) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `studentEmail` varchar(255) NOT NULL,
  `phone` varchar(20),
  `department` varchar(100),
  `timestamp` datetime NOT NULL,
  `checkinStatus` varchar(50) DEFAULT '未報到',
  `checkinTime` datetime,
  `group` varchar(50),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `reservations_event_id` (`eventId`),
  KEY `reservations_user_id` (`userId`),
  KEY `reservations_student_id` (`studentId`),
  UNIQUE KEY `unique_event_student` (`eventId`, `studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. 修復 survey_settings 表格
CREATE TABLE IF NOT EXISTS `survey_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `surveyId` varchar(100) NOT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `surveyId` (`surveyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 清理 survey_settings 中的空值
DELETE FROM `survey_settings` WHERE `surveyId` = '' OR `surveyId` IS NULL;

-- 4. 修復 User 表格
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

-- 5. 修復 Settings 表格
CREATE TABLE IF NOT EXISTS `Settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL UNIQUE,
  `value` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
