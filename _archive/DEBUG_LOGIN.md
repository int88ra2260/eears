# 登入調試指南

## 問題描述
兩個帳號登入後都顯示"錯誤: 未知的用戶角色"，需要調試 userRole 傳遞問題。

## 調試步驟

### 1. 檢查瀏覽器控制台
打開瀏覽器開發者工具 (F12)，查看 Console 標籤頁中的調試信息：

**登入時應該看到：**
```
Login response: {message: "登入成功", token: "...", role: "admin"}
Login successful, role: admin
```

**進入 AdminPage 時應該看到：**
```
App component - localStorage values: {token: "...", userRole: "admin", username: "emieearsweb"}
App component - state values: {token: "...", userRole: "admin", username: "emieearsweb"}
AdminPage received props: {token: true, userRole: "admin", username: "emieearsweb"}
localStorage userRole: admin
```

### 2. 測試帳號
- **管理員帳號**: `emieearsweb` / `5808`
- **Worker帳號**: `emiptworker` / `1215`

### 3. 檢查 localStorage
在瀏覽器控制台輸入：
```javascript
console.log('localStorage:', {
  token: localStorage.getItem('token'),
  userRole: localStorage.getItem('userRole'),
  username: localStorage.getItem('username')
});
```

### 4. 手動測試
如果自動登入有問題，可以在控制台手動設置：
```javascript
localStorage.setItem('userRole', 'admin');
localStorage.setItem('token', 'test-token');
// 然後刷新頁面
```

## 可能的原因

1. **後端沒有返回 role 字段**
2. **前端沒有正確保存 role 到 localStorage**
3. **localStorage 被清除或損壞**
4. **組件狀態沒有正確更新**

## 修復方案

如果調試發現問題，可能需要：

1. **清除 localStorage 並重新登入**
2. **檢查後端 API 響應**
3. **修復前端狀態管理**

## 臨時解決方案

如果問題持續，可以暫時修改 AdminPage.js 來強制使用 localStorage 中的值：

```javascript
function AdminPage({ token, userRole, username, onLogout }) {
  // 從 localStorage 直接讀取 userRole 作為備用
  const actualUserRole = userRole || localStorage.getItem('userRole');
  
  if (actualUserRole === 'admin') {
    return <AdminDashboard token={token} onLogout={onLogout} />;
  } else if (actualUserRole === 'worker') {
    return <WorkerDashboard token={token} onLogout={onLogout} />;
  } else {
    // 顯示錯誤
  }
}
```

