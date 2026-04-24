# 架構重構：分離管理員和Worker組件

## 重構原因

原本的AdminPage.js已經超過1200行，包含了管理員和Worker的所有功能，導致：
- 代碼難以維護
- 權限邏輯混雜在業務邏輯中
- 測試複雜度高
- 未來擴展困難

## 新架構設計

### 文件結構
```
src/components/
├── AdminPage.js              // 主路由組件 (25行)
├── admin/
│   ├── AdminDashboard.js     // 管理員完整功能 (800+行)
│   └── WorkerDashboard.js    // Worker簡化功能 (200+行)
└── shared/                   // 未來可擴展共享組件
    ├── ActivityTable.js
    ├── ReservationModal.js
    └── hooks/
        └── useActivityData.js
```

### 組件職責分離

#### 1. AdminPage.js (路由組件)
- **職責**：根據用戶角色路由到對應的面板
- **功能**：
  - 接收用戶角色資訊
  - 條件渲染對應的組件
  - 處理未知角色的錯誤情況
- **代碼量**：25行

#### 2. AdminDashboard.js (管理員面板)
- **職責**：提供管理員的完整功能
- **功能**：
  - 活動報表（含新增、修改、刪除、匯出）
  - 違規管理（單筆、批次、CSV匯入）
  - 問卷回饋（統計圖表、匯出）
  - 所有Modal和表單
- **代碼量**：800+行

#### 3. WorkerDashboard.js (Worker面板)
- **職責**：提供Worker的簡化功能
- **功能**：
  - 活動報表（僅查看）
  - 查看預約詳情
  - 學期和活動類別篩選
- **代碼量**：200+行

## 權限控制對比

### 管理員 (AdminDashboard)
- ✅ 顯示 "Admin管理員" 標籤
- ✅ 三個標籤頁：活動報表、違規管理、問卷回饋
- ✅ 完整的新增活動表單
- ✅ 所有操作按鈕：匯出、查看預約、修改、刪除
- ✅ 匯出總覽報表功能
- ✅ 違規管理功能
- ✅ 問卷管理功能

### Worker (WorkerDashboard)
- ✅ 顯示 "Worker工讀生" 標籤
- ✅ 只有活動報表頁面（無標籤頁切換）
- ❌ 無新增活動表單
- ✅ 只有查看預約按鈕
- ❌ 無匯出功能
- ❌ 無違規管理
- ❌ 無問卷管理

## 技術優勢

### 1. 代碼可維護性
- **分離前**：1200+行單一文件，難以維護
- **分離後**：三個專注的文件，職責清晰

### 2. 權限管理
- **分離前**：條件渲染邏輯散佈在各處
- **分離後**：權限控制集中在路由層

### 3. 測試友好
- **分離前**：需要模擬複雜的權限狀態
- **分離後**：每個組件可以獨立測試

### 4. 未來擴展
- **分離前**：添加新角色需要修改大量條件邏輯
- **分離後**：只需創建新的Dashboard組件

## 實現細節

### 路由邏輯
```javascript
function AdminPage({ token, userRole, username, onLogout }) {
  if (userRole === 'admin') {
    return <AdminDashboard token={token} onLogout={onLogout} />;
  } else if (userRole === 'worker') {
    return <WorkerDashboard token={token} onLogout={onLogout} />;
  } else {
    return <ErrorComponent onLogout={onLogout} />;
  }
}
```

### 共享邏輯處理
- 學期判斷函數：複製到兩個Dashboard中
- 活動數據獲取：各自實現，避免耦合
- 預約查看Modal：各自實現，保持獨立

## 性能優化

### 1. 代碼分割
- 每個Dashboard可以獨立載入
- 減少初始載入的JavaScript大小

### 2. 條件渲染
- 只渲染當前角色需要的組件
- 避免不必要的DOM元素

### 3. 狀態隔離
- 每個Dashboard管理自己的狀態
- 避免狀態污染

## 未來擴展計劃

### 1. 共享組件提取
```javascript
// 未來可以提取共享組件
import ActivityTable from '../shared/ActivityTable';
import ReservationModal from '../shared/ReservationModal';
```

### 2. 自定義Hook
```javascript
// 提取共享邏輯
import { useActivityData } from '../shared/hooks/useActivityData';
```

### 3. 新角色支持
```javascript
// 添加新角色只需創建新組件
if (userRole === 'supervisor') {
  return <SupervisorDashboard token={token} onLogout={onLogout} />;
}
```

## 遷移指南

### 1. 文件變更
- ✅ AdminPage.js：重構為路由組件
- ✅ 新增：admin/AdminDashboard.js
- ✅ 新增：admin/WorkerDashboard.js

### 2. 導入變更
- 無需修改其他文件的導入
- AdminPage的接口保持不變

### 3. 功能驗證
- 管理員功能：完全保持不變
- Worker功能：簡化但保持核心功能
- 權限控制：更加嚴格和清晰

## 總結

這次重構實現了：
1. **職責分離**：每個組件專注於特定角色
2. **代碼簡化**：從1200+行減少到三個專注的文件
3. **權限清晰**：權限控制集中在路由層
4. **維護友好**：每個組件可以獨立維護和測試
5. **擴展性強**：未來添加新角色或功能更容易

這是一個更好的架構設計，符合單一職責原則和開閉原則。
