-- MySQL max_connections 設定腳本
-- 適用於：支援 250 個並發學生的報名系統
-- 伺服器規格：I5 7500 (4核心), 16GB RAM

-- ============================================
-- 方法一：臨時設定（重啟 MySQL 後失效）
-- ============================================

-- 設定 max_connections 為 350
SET GLOBAL max_connections = 350;

-- 設定 max_connect_errors（防止錯誤連接耗盡連接數）
SET GLOBAL max_connect_errors = 10000;

-- 驗證設定
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'max_connect_errors';

-- 查看當前連接數
SHOW STATUS LIKE 'Threads_connected';

-- ============================================
-- 方法二：永久設定（推薦）
-- ============================================
-- 請編輯 MySQL 配置文件（my.ini 或 my.cnf）：
-- 
-- [mysqld]
-- max_connections = 350
-- max_connect_errors = 10000
-- 
-- 然後重啟 MySQL 服務

-- ============================================
-- 監控查詢
-- ============================================

-- 查看連接使用率
SELECT 
  VARIABLE_VALUE AS 'Current Connections',
  (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections') AS 'Max Connections',
  ROUND(VARIABLE_VALUE / (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections') * 100, 2) AS 'Usage %'
FROM information_schema.GLOBAL_STATUS 
WHERE VARIABLE_NAME = 'Threads_connected';

-- 查看所有活動連接
SHOW PROCESSLIST;

-- 查看連接相關狀態
SHOW STATUS LIKE 'Connections';
SHOW STATUS LIKE 'Max_used_connections';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Threads_running';
SHOW STATUS LIKE 'Aborted_connects';
SHOW STATUS LIKE 'Aborted_clients';
