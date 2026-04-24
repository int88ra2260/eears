# Lighthouse 檢查（Phase 3）

## 建議檢查方式

1. 建置生產版本：`npm run build`
2. 以 production build 或部署後網址執行 [Lighthouse](https://developer.chrome.com/docs/lighthouse)（Chrome DevTools > Lighthouse）
3. 建議項目：Performance、Accessibility、Best Practices、SEO

## 已實作優化

- **SEO**：`<title>`、`meta description`、`og:title` / `og:description` / `og:image`、`canonical`、首頁依語系動態更新
- **Accessibility**：跳過連結、`<main id="main-content">`、彈窗 `role="dialog"`、Esc 關閉、焦點陷阱、按鈕 `:focus-visible`、FAQ `aria-expanded`
- **Performance**：Hero 圖片設 `width`/`height`、`fetchPriority="high"`，移除開發用 `console.log`
- **Best Practices**：避免主控台輸出、語意化標籤

## 若分數未達標可再檢查

- 第三方腳本（Bootstrap CDN）是否影響 LCP
- 圖片是否使用適當格式（如 WebP）與壓縮
- 是否需 `loading="lazy"` 於首屏外圖片
