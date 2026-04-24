-- 選用：先執行 migration 20260410180000-announcements-product-module.js
-- MySQL：slug 唯一；重複執行請先刪除或改用 INSERT IGNORE。

INSERT INTO `Announcements`
(`title`,`slug`,`summary`,`content`,`coverImage`,`coverImageAlt`,`isPublished`,`status`,`publishedAt`,`scheduledPublishAt`,`unpublishedAt`,`expiresAt`,`isPinned`,`sortOrder`,`category`,`tags`,`authorId`,`authorNameSnapshot`,`seoTitle`,`seoDescription`,`ogImageUrl`,`viewCount`,`createdBy`,`updatedBy`,`lastEditedBy`,`audienceType`,`shouldSendNotification`,`shouldSendEmail`,`notificationStatus`,`emailStatus`,`createdAt`,`updatedAt`,`deletedAt`)
VALUES
('【草稿】春季活動預告','spring-events-draft',NULL,'草稿不顯示於前台。',NULL,NULL,0,'draft',NULL,NULL,NULL,NULL,0,0,'activity',JSON_ARRAY('預告'),NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'all',0,0,NULL,NULL,NOW(),NOW(),NULL),
('【已排程】維護通知','scheduled-maintenance-sample','排程測試','未到期前不顯示。',NULL,NULL,0,'scheduled',NULL,DATE_ADD(NOW(), INTERVAL 7 DAY),NULL,NULL,0,0,'system',JSON_ARRAY('維護'),NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'all',0,0,NULL,NULL,NOW(),NOW(),NULL),
('【已發布】歡迎使用 EEARS','welcome-eears-system','系統已上線。','歡迎使用 EEARS。',NULL,NULL,1,'published','2025-01-10 09:00:00',NULL,NULL,NULL,1,0,'general',JSON_ARRAY('EEARS'),NULL,NULL,'歡迎使用 EEARS','英語增能活動預約',NULL,0,NULL,NULL,NULL,'all',0,0,NULL,NULL,NOW(),NOW(),NULL),
('【已下架】舊規則','legacy-reservation-rules','已下架','內容略',NULL,NULL,0,'unpublished','2024-08-01 12:00:00',NULL,'2024-09-01 12:00:00',NULL,0,0,'policy',JSON_ARRAY('歷史'),NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'all',0,0,NULL,NULL,NOW(),NOW(),NULL),
('【已封存】2023 彙整','archived-2023-bulletin','封存','僅後台',NULL,NULL,0,'archived','2023-12-01 10:00:00',NULL,NULL,NULL,0,0,'general',JSON_ARRAY(),NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'all',0,0,NULL,NULL,NOW(),NOW(),NULL)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`), `status`=VALUES(`status`);
