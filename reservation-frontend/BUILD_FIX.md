# 解決 npm run build 編譯錯誤

## 錯誤訊息
```
chalk.red is not a function
```

## 原因
這是 `react-scripts` 5.0.1 的已知問題，通常與 `chalk` 套件版本衝突有關。

## 解決方法

### 方法 1：更新 browserslist 資料庫（推薦先試這個）

```bash
cd reservation-frontend
npx update-browserslist-db@latest
npm run build
```

### 方法 2：清除快取並重新安裝

```bash
cd reservation-frontend

# 刪除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 清除 npm 快取
npm cache clean --force

# 重新安裝
npm install

# 再次嘗試編譯
npm run build
```

### 方法 3：更新 react-scripts（如果方法 1 和 2 無效）

```bash
cd reservation-frontend

# 更新 react-scripts 到最新版本
npm install react-scripts@latest

# 重新安裝依賴
npm install

# 嘗試編譯
npm run build
```

### 方法 4：使用 resolutions 強制指定 chalk 版本（如果以上都無效）

在 `package.json` 中加入：

```json
{
  "resolutions": {
    "chalk": "^4.1.2"
  }
}
```

然後執行：
```bash
npm install
npm run build
```

## 注意事項

1. 如果使用 npm，可能需要安裝 `npm-force-resolutions`：
   ```bash
   npm install --save-dev npm-force-resolutions
   ```

2. 如果使用 yarn，可以直接使用 `resolutions` 欄位。

3. 建議先嘗試方法 1，這是最簡單且最常見的解決方案。
