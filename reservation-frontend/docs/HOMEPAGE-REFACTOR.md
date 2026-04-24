# EEARS 首頁重構說明

## A. 專案掃描結果

### 實際檔案結構（與您列出的可能路徑對照）

| 您提到的路徑 | 專案實際情況 |
|-------------|--------------|
| `src/pages/HomePage.jsx` | **不存在**。首頁為 `src/components/HomePage.js` |
| `src/components/...` | **存在**。首頁區塊在 `src/components/home/` 下 |
| `src/layouts/...` | **不存在**。無獨立 layouts 資料夾，Header/Footer 在 `src/components/Header.js`、`Footer.js` |
| `src/router/...` | **不存在**。路由全部在 `src/App.js` 的 `<Routes>` 內 |

### 首頁相關檔案（掃描結果）

- **入口**：`src/App.js` — 定義 `/` → `HomePage`、`/events` → `EventList`，以及公開頁顯示 Header/Footer 邏輯
- **首頁容器**：`src/components/HomePage.js` — 組裝 Hero、QuickActions、ActivityHighlights、ReservationSteps、AnnouncementPreview、FAQSection、ContactSection、HomeFooter
- **區塊元件**：`src/components/home/`  
  - `HomeHero.js`、`QuickActions.js`、`ActivityHighlights.js`、`ReservationSteps.js`  
  - `AnnouncementPreview.js`、`FAQSection.js`、`ContactSection.js`、`HomeFooter.js`  
  - `home.css` — 首頁區塊樣式
- **導覽與版型**：`src/components/Header.js`、`Header.css`；`src/components/Footer.js`、`Footer.css`
- **翻譯**：`src/constants/translations.js`（`homePage.*`、`nav.*`、`a11y.*` 等）
- **資料**：`src/data/homeActivities.js`、`src/data/homeFaqs.js`；`src/hooks/useAnnouncements.js`（公告 API）
- **SEO/語系**：`src/hooks/usePageMeta.js`；`public/index.html`（meta、title）

### 既有路由（保留）

- `/` — HomePage（新首頁）
- `/events` — EventList（活動列表/行事曆）
- `/login` — 登入
- `/admin` 及巢狀 — 後台
- `/survey/choice`、`/survey/english-table`、`/survey/:surveyId` — 問卷
- `/register/english-test`、`/register/english-test/group` 等 — 英檢報名

### 圖片路徑（掃描結果）

- 程式內引用為 **`/images/xxx`**（對應 `public/images/xxx`）
- 曾出現的檔名：`hero-visual.png`、`bg-pattern2.png`、`english_table.jpg`、`english_club.jpg`、`international_forum.jpg`、`job_talk_1.jpg`～`job_talk_6.jpg`、`placeholder.jpg`

---

## B. 問題分析

1. **Hero 文案與主視覺**：原先為「讓英語學習成為你的日常行動」/「Empower Your English Journey」，已改為您指定的「Enhancement Your English Ability」與「英語增能活動預約系統」，主 CTA 改為「立即預約活動」。
2. **視覺風格**：原先偏藍白學術風，已改為溫暖現代（米白/暖棕/暖橘 CTA），與主視覺圖與場域照片一致。
3. **圖片引用**：改為集中使用 `src/constants/imagePaths.js`，Hero 使用 `getHeroImageUrl()`，避免路徑寫死與錯誤。
4. **路由**：已補上 `/activities`、`/my-reservations`（皆導向 EventList），與既有 `/`、`/survey`、`/admin` 並存。
5. **Header 手機版**：原先無「點背景關閉」與「Esc 關閉」，已加上 drawer 背板與鍵盤關閉。

---

## C. 修改策略

- **不刪除、不取代既有功能**：活動預約、FullCalendar、問卷、後台、黑名單、登入、API 維持不變。
- **只改首頁與導覽**：HomePage 與 home/* 的文案、樣式、圖片路徑；Header 行為與樣式微調。
- **路由擴充**：新增 `/activities`、`/my-reservations` 為 EventList 的別名，不影響原有 `/events`。
- **風格統一**：首頁專用 CSS 變數（`--home-cream`、`--home-wood`、`--home-cta` 等），與主視覺、場域照片一致。

---

## D. 實際修改檔案清單

| 檔案 | 變更類型 | 說明 |
|------|----------|------|
| `src/constants/translations.js` | 修改 | Hero 中英文主副標、主 CTA 改為「Enhancement Your English Ability」/「英語增能活動預約系統」/「立即預約活動」 |
| `src/constants/imagePaths.js` | **新增** | 集中管理 `/images/` 路徑，Hero、背景、活動圖、placeholder |
| `src/components/home/HomeHero.js` | 修改 | 使用 `getHeroImageUrl()`、`IMAGES.heroFallback`，onError 時 fallback 到 jpg |
| `src/components/home/home.css` | 修改 | 改為 warm/wood/beige 變數與區塊層次，section 交替背景、卡片邊框與陰影 |
| `src/components/home/QuickActions.js` | 修改 | 「查詢我的預約」改連到 `/my-reservations`；規則卡按鈕樣式改為 home 變數 |
| `src/components/Header.js` | 修改 | 新增 useEffect 監聽 Esc 關閉選單；手機版選單開啟時顯示 backdrop，點擊關閉 |
| `src/components/Header.css` | 修改 | 新增 `.header-drawer-backdrop`；`.header-nav-mobile` 的 z-index、背景 |
| `src/App.js` | 修改 | 新增路由 `<Route path="/activities" element={<EventList />} />`、`<Route path="/my-reservations" element={<EventList />} />` |

---

## E. 主要程式碼摘要

### Hero 文案（translations）

- **zh**：`heroTitle: '英語增能活動預約系統'`，`heroSubtitle: 'Enhancement Your English Ability'`，`heroCtaBook: '立即預約活動'`
- **en**：`heroTitle: 'Enhancement Your English Ability'`，`heroSubtitle: 'English Enhancement Activity Reservation System'`，`heroCtaBook: 'Book Activity Now'`

### 圖片路徑常數（imagePaths.js）

```js
const BASE = '/images';
export const IMAGES = {
  hero: `${BASE}/hero-visual.png`,
  heroFallback: `${BASE}/hero-visual.jpg`,
  bgPattern: `${BASE}/bg-pattern2.png`,
  englishTable: `${BASE}/english_table.jpg`,
  // ...
};
export function getHeroImageUrl() { return IMAGES.hero; }
```

### 新增路由（App.js）

```jsx
<Route path="/activities" element={<EventList />} />
<Route path="/my-reservations" element={<EventList />} />
```

### 首頁色彩變數（home.css）

```css
:root {
  --home-cream: #faf8f5;
  --home-beige: #f5f0e8;
  --home-warm: #ebe4d9;
  --home-wood: #8b7355;
  --home-wood-dark: #5c4a38;
  --home-text: #2c2419;
  --home-text-soft: #5a5045;
  --home-cta: #c2410c;
  --home-cta-light: #ea580c;
}
```

---

## F. 尚待您確認的項目

1. **主視覺與素材實際路徑**  
   - 請將主視覺與首頁用照片放到 `public/images/`。  
   - 目前程式預期：**Hero** 使用 `hero-visual.png`（若載入失敗會試 `hero-visual.jpg`）。  
   - 若檔名或路徑不同，請改 `src/constants/imagePaths.js` 中的 `IMAGES.hero` / `IMAGES.heroFallback`。

2. **公告 API**  
   - 首頁「最新公告」使用 `useAnnouncements.js` 呼叫 `GET /api/announcements?limit=3`。  
   - 若後端尚未提供，畫面上會顯示「目前無最新公告」；待 API 就緒後會自動顯示。

3. **聯絡資訊**  
   - 地址/電話/服務時間目前為翻譯鍵（如 `contactAddressValue`、`contactPhoneValue`）。  
   - 若需寫死或改為後台設定，請在 `ContactSection.js` 與 `translations.js` 中調整。

4. **Canonical / OG 網址**  
   - `public/index.html` 內 canonical 與 og:image 目前以 `https://emicenter.siwan.nsysu.edu.tw/` 為例。  
   - 若正式網域不同，請替換為實際網址。

---

## G. 風險與注意事項

- **既有功能**：未改動 EventList、預約流程、問卷、後台、登入、API；僅首頁與導覽、路由別名與樣式調整。
- **相容性**：`/events`、`/activities`、`/my-reservations` 皆渲染同一 `EventList`；若未來要讓「我的預約」有獨立頁或預設打開查詢 modal，可再於 EventList 依 `location.pathname === '/my-reservations'` 做分支。
- **回滾**：若需還原，只要還原上述修改/新增檔案即可；未刪除既有路由或功能檔案。
- **圖片缺失**：若 `public/images/hero-visual.png` 與 `hero-visual.jpg` 都不存在，Hero 右側圖片區會隱藏（onError 已處理），不影響排版與 CTA。
