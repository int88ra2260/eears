# 班級參與概況功能說明

## 功能概述

本功能提供班級層級的 EMI 活動參與統計與分析，支援名單匯入、統計查詢、圖表展示和 Excel 匯出。

## 主要功能

### 1. 名單匯入
- **路徑**: 後台 → 班級參與概況 → 匯入名單
- **支援格式**: Excel (.xlsx, .xls)
- **必要欄位**: 班級名稱、學號、姓名
- **可選欄位**: 系所、Email
- **特性**: 
  - 支援中英文欄位名稱
  - 自動清洗資料（去除空白、學號轉大寫）
  - 重複上傳只更新不重複
  - 詳細的匯入結果報告

### 2. 班級總覽
- **路徑**: 後台 → 班級參與概況
- **功能**:
  - 顯示各班級參與統計
  - 支援學期篩選（114-1, 113-2, 114-2）
  - 支援活動類型篩選（所有活動、English Table、English Club、Job Talk、International Forum）
  - 支援班級名稱/系所搜尋
  - 支援多種排序方式（參與率、簽到總次數、班級名稱）
  - 分頁顯示

### 3. 統計指標
- **班級層級**:
  - 名冊人數
  - 至少參與人數
  - 參與率 (%)
  - 簽到總次數
  - 平均參與次數
  - No-shows 總數
  - 各活動類型參與次數

- **學生層級**:
  - 預約數
  - 簽到數
  - No-shows 數
  - 各活動類型參與次數
  - 最後簽到日期
  - 黑名單狀態

### 4. 圖表展示
- **參與率長條圖**: 顯示各班級參與率對比
- **活動類型圓餅圖**: 顯示各活動類型參與次數分布

### 5. 班級明細
- **路徑**: 班級總覽 → 查看明細
- **功能**:
  - 顯示班級內所有學生明細
  - 支援學號/姓名/系所/Email 搜尋
  - 支援多種排序方式
  - 分頁顯示
  - 包含 0 參與學生

### 6. Excel 匯出
- **總覽匯出**: 匯出所有班級統計資料
- **明細匯出**: 匯出特定班級學生明細
- **包含資訊**: 所有統計指標 + 匯出時間 + 篩選條件

## 技術架構

### 後端
- **數據模型**:
  - `Classes`: 班級基本資訊
  - `ClassMemberships`: 班級成員關係
- **API 端點**:
  - `POST /api/admin/classes/roster/import`: 匯入名單
  - `GET /api/admin/classes/overview`: 班級總覽
  - `GET /api/admin/classes/:classId/overview`: 班級明細
  - `GET /api/admin/classes/overview/export`: 匯出總覽
  - `GET /api/admin/classes/:classId/overview/export`: 匯出明細

### 前端
- **組件**:
  - `ClassOverview`: 班級總覽頁面
  - `ClassDetail`: 班級明細頁面
- **圖表**: 使用 Recharts 套件
- **路由**: 整合到現有管理員頁面

## 權限控制

- 所有功能僅限管理員使用
- 檔案上傳限制 10MB
- 支援的檔案格式: .xlsx, .xls
- 排序欄位白名單驗證
- 搜尋防 SQL 注入

## 資料庫設計

### Classes 表
```sql
CREATE TABLE Classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  department VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_class_semester (name, semester)
);
```

### ClassMemberships 表
```sql
CREATE TABLE ClassMemberships (
  id INT PRIMARY KEY AUTO_INCREMENT,
  semester VARCHAR(20) NOT NULL,
  classId INT NOT NULL,
  studentId VARCHAR(50) NOT NULL,
  studentName VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  email VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_membership (semester, classId, studentId),
  FOREIGN KEY (classId) REFERENCES Classes(id) ON DELETE CASCADE
);
```

## 使用流程

1. **匯入名單**: 準備 Excel 檔案，包含班級名稱、學號、姓名等欄位
2. **查看總覽**: 在班級參與概況頁面查看各班級統計
3. **深入分析**: 點擊「查看明細」進入班級明細頁面
4. **匯出報告**: 使用匯出功能產生 Excel 報告

## 注意事項

- 學期日期範圍已預設，可根據需要調整
- 支援多學期資料，建議定期清理舊資料
- 匯入時會自動處理重複資料
- 統計資料基於現有的預約和簽到記錄
- 建議定期備份匯入的名單資料

## 效能考量

- 對常用查詢欄位建立索引
- 支援分頁查詢，避免大量資料載入
- 可考慮加入快取機制提升查詢效能
- 建議對大量資料進行定期清理

## 未來擴展

- 支援更多學期
- 加入更多統計維度
- 支援批次操作
- 加入資料驗證規則
- 支援資料匯入範本下載
