# Worker權限限制最終版本

## 概述
已成功實現嚴格的Worker權限限制，確保Worker只能進行最基本的查看預約操作。

## 權限對比

### Admin管理員 - 完整權限
- ✅ 顯示 "Admin管理員" 標籤
- ✅ 可以訪問所有標籤頁：活動報表、違規管理、問卷回饋
- ✅ 可以新增活動
- ✅ 可以修改活動
- ✅ 可以刪除活動
- ✅ 可以查看預約
- ✅ 可以匯出單個活動報表
- ✅ 可以匯出總覽報表
- ✅ 可以管理違規
- ✅ 可以管理問卷

### Worker工讀生 - 極簡權限
- ✅ 顯示 "Worker工讀生" 標籤
- ❌ 只能看到活動報表標籤頁（其他標籤頁完全隱藏）
- ❌ 不能新增活動
- ❌ 不能修改活動
- ❌ 不能刪除活動
- ✅ 只能查看預約
- ❌ 不能匯出單個活動報表
- ❌ 不能匯出總覽報表
- ❌ 不能管理違規
- ❌ 不能管理問卷

## 界面變化

### 標籤頁限制
**管理員界面**：
```
[活動報表] [違規管理] [問卷回饋]
```

**Worker界面**：
```
[活動報表]
```
（其他標籤頁完全不可見）

### 活動報表頁面功能對比

**管理員**：
- 可以看到新增活動表單
- 可以看到匯出總覽報表按鈕
- 每個活動的操作按鈕：匯出、查看預約、修改、刪除

**Worker**：
- 看不到新增活動表單
- 看不到匯出總覽報表按鈕
- 每個活動的操作按鈕：只有查看預約

## 技術實現

### 1. 標籤頁限制
```javascript
{/* 只有管理員才能看到違規管理和問卷回饋標籤頁 */}
{userRole === 'admin' && (
  <>
    <li className="nav-item">
      <button className={`nav-link ${activeTab === 'violation' ? 'active' : ''}`} onClick={() => setActiveTab('violation')}>違規管理</button>
    </li>
    <li className="nav-item">
      <button className={`nav-link ${activeTab === 'survey' ? 'active' : ''}`} onClick={() => setActiveTab('survey')}>問卷回饋</button>
    </li>
  </>
)}
```

### 2. 操作按鈕限制
```javascript
{/* Worker只能看到查看預約按鈕 */}
{userRole === 'worker' ? (
  <button className="btn btn-sm btn-outline-success" onClick={() => handleViewReservations(evt.eventId, evt.name)}>查看預約</button>
) : (
  /* 管理員可以看到所有按鈕 */
  <>
    <button className="btn btn-sm btn-outline-info me-1" onClick={() => handleExport(evt.eventId)}>匯出</button>
    <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleViewReservations(evt.eventId, evt.name)}>查看預約</button>
    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEditModal(evt)}>修改</button>
    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(evt.eventId, evt.name)}>刪除</button>
  </>
)}
```

### 3. 強制標籤頁限制
```javascript
// 確保Worker用戶只能停留在活動報表標籤頁
useEffect(() => {
  if (userRole === 'worker' && activeTab !== 'report') {
    setActiveTab('report');
  }
}, [userRole, activeTab]);
```

## 安全性保障

### 前端限制
- 界面層面的功能完全隱藏
- 使用條件渲染確保Worker看不到任何管理功能
- 強制限制標籤頁切換

### 後端保護
- 所有API都有相應的權限檢查
- Worker無法通過API調用管理功能
- 雙重保護確保系統安全

## 測試方法

### 1. 測試管理員帳號
```
帳號：emieearsweb
密碼：5808
```
預期結果：
- 顯示 "Admin管理員" 標籤
- 可以看到所有三個標籤頁
- 所有功能都可用

### 2. 測試Worker帳號
```
帳號：emiptworker
密碼：1215
```
預期結果：
- 顯示 "Worker工讀生" 標籤
- 只能看到活動報表標籤頁
- 只能使用查看預約功能

## 角色識別調試

如果角色顯示為"未知角色"，請檢查：
1. 瀏覽器控制台是否有調試信息顯示當前userRole
2. localStorage中是否正確保存了userRole
3. 登入API是否正確返回role字段

## 注意事項

1. Worker的權限被嚴格限制，只能進行最基本的查看預約操作
2. 所有管理功能對Worker完全不可見
3. 即使Worker嘗試手動切換標籤頁，系統也會強制回到活動報表頁面
4. 前端限制配合後端API權限檢查，確保系統安全
