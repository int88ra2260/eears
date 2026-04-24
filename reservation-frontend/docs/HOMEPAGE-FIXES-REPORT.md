# EEARS 首頁修正與優化報告

## A. 修改檔案清單

| 檔案 | 變更內容 |
|------|----------|
| `src/constants/imagePaths.js` | 統一為 hero-visual.jpg、heroFallback: home-photo-1.jpg、home1~4、ogHome；移除 png 主視覺 |
| `src/components/home/HomeHero.js` | Hero 使用 IMAGES.hero；onError 先試 heroFallback，再失敗改顯示 .home-hero-visual-fallback 區塊；主 CTA 改為 navigate('/activities') |
| `src/components/home/home.css` | 新增 .home-hero-visual-fallback 樣式；公告區 skeleton / empty / error 樣式；RWD 註解與 1200px / 768–1199px 斷點；手機版 Hero CTA 直向堆疊、min-height 44px |
| `src/components/home/AnnouncementPreview.js` | Loading 改為 skeleton 三卡；Empty 顯示「目前尚無最新公告」+ 按鈕「返回主要功能」「查看活動」；Error 顯示「公告暫時無法載入」+ 同組按鈕 |
| `src/constants/translations.js` | noAnnouncements 改為「目前尚無最新公告」；新增 announcementsEmptyBack、announcementsEmptyActivities、announcementsError（中英） |
| `src/components/home/ContactSection.js` | 改為從 `src/config/siteContact.js` 讀取 SITE_CONTACT；僅用 translations 做區塊標題與按鈕文字 |
| `public/index.html` | canonical、og:url 改為 https://emieears-siwan.nsysu.edu.tw/ ；og:image 改為 og-home.jpg；og:title、og:description 改為指定文案 |
| `src/components/EventList.js` | 新增 useLocation；定義 isMyReservations = pathname === '/my-reservations'；註解 TODO future MyReservationsPage separation |

---

## B. 新增檔案清單

| 檔案 | 說明 |
|------|------|
| `src/config/siteContact.js` | 站點聯絡資訊 SITE_CONTACT（name, address, phone, email, hours）與 EMI_CENTER_URL |
| `docs/HOMEPAGE-FIXES-REPORT.md` | 本報告 |

**說明**：`public/images/` 下需由您自行放置實體檔案：`hero-visual.jpg`、`home-photo-1.jpg`～`home-photo-4.jpg`、`og-home.jpg`。程式僅引用路徑，未新增圖片檔。

---

## C. 變更資料結構

- **圖片路徑**：集中於 `src/constants/imagePaths.js`，Hero 主圖改為 `/images/hero-visual.jpg`，fallback 為 `/images/home-photo-1.jpg`；首頁其餘照片為 home1～home4、ogHome。
- **聯絡資訊**：由 `translations.js` 的 contact*Value 改為 **`src/config/siteContact.js`** 的 `SITE_CONTACT`。ContactSection 僅讀取 SITE_CONTACT；translations 僅保留 contactTitle、contactAddress（標籤）、contactUs、goToCenter 等 UI 文案。
- **公告區**：沿用 `useAnnouncements` 回傳 `{ items, loading, error }`，無 API 或資料結構變更。

---

## D. SEO 修改

- **Canonical**：`<link rel="canonical" href="https://emieears-siwan.nsysu.edu.tw/" />`
- **Open Graph**  
  - `og:url`：`https://emieears-siwan.nsysu.edu.tw/`  
  - `og:image`：`https://emieears-siwan.nsysu.edu.tw/images/og-home.jpg`  
  - `og:title`：`EEARS 英語增能活動預約系統`  
  - `og:description`：`NSYSU EMI Center 英語增能活動預約平台`  
- **說明**：`usePageMeta` 仍會依路由/語系動態改寫 document.title 與 meta description；index.html 為預設值，EEARS 正式網域已改為上述網址。

---

## E. Fallback 機制

- **Hero 圖片**  
  1. 先載入 `IMAGES.hero`（/images/hero-visual.jpg）。  
  2. 若 onError：改設 src 為 `IMAGES.heroFallback`（/images/home-photo-1.jpg）再試一次。  
  3. 若 fallback 也失敗：設 state `heroImageFailed`，改渲染 `.home-hero-visual-fallback` 區塊（漸層背景 + 「EEARS」文字），維持 Hero 區塊高度與版面不崩壞。

---

## F. 未來可擴充部分

- **My Reservations 獨立頁**：`EventList.js` 內已定義 `const isMyReservations = location.pathname === '/my-reservations'`，並加上註解：  
  `// TODO future MyReservationsPage separation: 可拆出 pages/MyReservationsPage.jsx 獨立頁`  
  日後可依 isMyReservations 分支或拆成獨立頁，不影響現有 /events、/activities 行為。

- **聯絡資訊**：實際電話、地址、服務時間請在 `src/config/siteContact.js` 的 `SITE_CONTACT` 中更新（目前 phone 為 placeholder）。

- **公告 API**：仍為 `GET /api/announcements?limit=3`；後端尚未提供時會顯示 Empty 或 Error UI，不影響首頁穩定度。

---

## G. 可能風險

- **圖片未放置**：若未在 `public/images/` 放置 `hero-visual.jpg`、`home-photo-1.jpg`、`og-home.jpg`，Hero 會顯示 fallback 區塊，分享預覽圖可能為破圖或預設圖；不影響預約、問卷、後台等既有功能。
- **聯絡資訊**：`siteContact.js` 內 phone 為 placeholder，請替換為正式電話。
- **網域**：若正式上線網域非 `https://emieears-siwan.nsysu.edu.tw/`，請再更新 index.html 的 canonical、og:url、og:image 絕對網址。
- **既有功能**：未改動預約流程、API、Survey、Admin、FullCalendar、登入；僅首頁 UI、圖片路徑、SEO、聯絡資料來源與公告三態 UI。
