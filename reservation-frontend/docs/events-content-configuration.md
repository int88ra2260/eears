# Events Domain 內容配置化：第一輪整理

## 一、掃描結果

### 1. 仍為硬編碼 JSX 的內容

- **ActivityIntroModal**
  - Tab 列表在 `ActivityTypeTabs` 內以 `TABS` 常數硬寫（english-table / english-club / international-forum / job-talk）。
  - 各 Tab 內容區塊（圖片、標題、副標、特色小標等）直接在 JSX 中撰寫，但文案皆透過 `t('activities.*')` 取得。
  - Job Talk 輪播圖片路徑原本為 `/images/job_talk_1.jpg`…`_6.jpg` 的陣列常數，與 `translations` 無直接關聯。
- **EventFAQModal**
  - FAQ Tab 列表（cancel / blacklist / rules）與 label 使用的翻譯鍵（`faq.cancel` / `faq.blacklist` / `faq.rules`）硬寫在 JSX。
  - 各 Tab 內容（標題、icon、列表項目）為多段 JSX，內容皆透過 `t('faq.*')` 組成，但結構（標題 + alert + 列表）以重複的 JSX pattern 寫死。
- **EventRulesNotice**
  - 兩條規則 Alert（補蓋章、不開放現場候補）分別以兩個 `div.alert` 區塊寫死，icon、variant、使用的翻譯鍵（`home.ruleUpdate` / `home.ruleNoStamp` / `home.ruleNoWalkIn`）都在 JSX 中指定。
- **EventAlertsBanner**
  - 問卷通知 Banner 單一條，icon 類別、標題翻譯鍵（`home.notice`）、prefix / link / suffix 翻譯鍵（`home.noticeSurveyBefore` / `home.noticeSurveyLink` / `home.noticeSurveyAfter`）與連結路徑 `/survey/choice` 皆硬寫於 JSX。

### 2. 已有的相關基礎

- **translations.js** 已集中所有文案鍵（`activities.*`、`home.notice*`、`faq.*` 等），本輪不變更。
- **imagePaths.js** 已集中圖片路徑（`IMAGES.englishTable`、`IMAGES.englishClub`、`IMAGES.internationalForum`、`IMAGES.jobTalk` 陣列、`IMAGES.placeholder`），可作為活動介紹圖片與輪播的來源。

---

## 二、配置化策略（本輪）

1. **建立 eventsContentConfig 常數檔**
   - 新增 `src/constants/eventsContentConfig.js`，集中與 Event domain UI 結構相關、但不屬於文案本身的設定：
     - `ACTIVITY_TABS`：活動介紹 Tab 列表（id + labelKey）。
     - `FAQ_TABS`：FAQ Modal Tab 列表（id + labelKey）。
     - `RULES_NOTICES`：規則提示區塊設定（id、variant、iconClass、titleKey、textKey）。
     - `SURVEY_ALERT_CONFIG`：問卷通知 Banner 設定（iconClass、titleKey、prefixKey、linkKey、suffixKey、linkTo）。

2. **ActivityIntroModal / ActivityTypeTabs**
   - `ActivityTypeTabs`：改為從 `ACTIVITY_TABS` 迭代渲染 Tab，而不是在檔內定義 `TABS`。
   - `ActivityIntroModal`：
     - 將圖片路徑改為從 `IMAGES`（`imagePaths.js`）讀取：English Table / Club / Forum 使用對應欄位，Job Talk 輪播使用 `IMAGES.jobTalk` 陣列。
     - 文案仍使用原有的 `t('activities.*')` 鍵，未改。

3. **EventFAQModal**
   - 將 FAQ 之 Tab 列表改為由 `FAQ_TABS` 驅動，只負責控制 `activeFAQTab` 與 label 顯示；三個 Tab 的實際內容區塊（取消預約 / 黑名單 / 活動規定）仍各自以 JSX 撰寫，保持行為與排版完全一致。

4. **EventRulesNotice**
   - 使用 `RULES_NOTICES` 設定陣列，以 `map` 方式建立兩條 Alert。
   - 每條包含：variant（info / warning）、iconClass、titleKey（皆為 `home.ruleUpdate`）、textKey（`home.ruleNoStamp` / `home.ruleNoWalkIn`）。
   - 文案鍵與 UI 行為不變，只將 icon / variant / key 組合搬到設定中。

5. **EventAlertsBanner**
   - 使用 `SURVEY_ALERT_CONFIG` 提供 iconClass、titleKey、prefixKey、linkKey、suffixKey 與 linkTo。
   - JSX 使用設定中的鍵搭配 `t()`，以及設定中的 `linkTo` 做 Link 目的地；原先的顯示條件（`enabledSurveys.length > 0`）與整體結構不變。

---

## 三、新增 / 修改檔案清單

| 類型 | 路徑 |
|------|------|
| 新增 | `src/constants/eventsContentConfig.js` |
| 修改 | `src/components/events/ActivityTypeTabs.js`（改用 `ACTIVITY_TABS`） |
| 修改 | `src/components/events/ActivityIntroModal.js`（改用 `IMAGES` 取得活動圖片與 Job Talk 輪播圖） |
| 修改 | `src/components/events/EventFAQModal.js`（FAQ Tab 列表改由 `FAQ_TABS` 驅動） |
| 修改 | `src/components/events/EventRulesNotice.js`（使用 `RULES_NOTICES` 產生 Alert） |
| 修改 | `src/components/events/EventAlertsBanner.js`（使用 `SURVEY_ALERT_CONFIG` 產生 Banner） |
| 新增 | `docs/events-content-configuration.md`（本文件） |

---

## 四、已改由設定驅動的內容

- **活動介紹 Tab 列表**
  - 由 `ACTIVITY_TABS` 控制 id 與 labelKey，`ActivityTypeTabs` 僅負責迭代與樣式。
- **活動介紹圖片**
  - ActivityIntroModal 內 English Table / Club / Forum 圖片改由 `IMAGES.englishTable` / `IMAGES.englishClub` / `IMAGES.internationalForum` 取得。
  - Job Talk 輪播使用 `IMAGES.jobTalk` 陣列，圖片數量與路徑集中在 `imagePaths.js`。
- **FAQ Tab 列表**
  - 由 `FAQ_TABS` 控制 id 與 labelKey，EventFAQModal 僅依 id 控制 `activeFAQTab` 與 label 顯示。
- **規則說明區塊**
  - 由 `RULES_NOTICES` 控制 Alert variant、icon 類別與使用的翻譯鍵，EventRulesNotice 僅負責迭代渲染。
- **問卷通知 Banner**
  - 由 `SURVEY_ALERT_CONFIG` 控制 icon 類別、標題鍵、前後文鍵與 Link 目的地，EventAlertsBanner 僅負責判斷是否顯示與套用設定。

---

## 五、仍保留在元件內的內容與原因

- **ActivityIntroModal 各 Tab 詳細內容**
  - 每個 Tab 的排版（圖片在左／文案在右、特色段落、星號標示等）具高度結構性，且目前變動頻率不高；本輪僅將圖片路徑配置化，避免一次將大段 JSX 抽象成資料結構而增加風險。
- **EventFAQModal 的各 Tab 內容區塊**
  - 雖然使用的文案鍵皆集中在 `translations.js`，但每個區塊的組合（標題 + alert + 列表）在 JSX 中相對清晰，本輪僅將 Tab 列表配置化，保留內容區塊為直觀的 JSX，降低 refactor 風險。
- **EventRulesNotice / EventAlertsBanner 的外層結構**
  - 雖然 icon / 文案鍵已由設定驅動，整體 Alert / Banner 的結構（className、dismiss 行為）仍在元件內，保持閱讀性與排版控制簡單。

---

## 六、下一輪可再抽成 hooks 或後台設定的部分

- **Activity 介紹內容設定**
  - 可建立 `activitiesIntroConfig`，以資料結構描述每個活動類型的圖片 key、標題 key、副標 key、特色區塊 key 陣列，ActivityIntroModal 依設定渲染，未來新增活動類型時僅增一筆設定。
- **FAQ 內容設定**
  - 可將 FAQ 的每個 Tab 內容拆為「段落型設定」（icon 類別、titleKey、listItemKeys / paragraphKeys），讓 EventFAQModal 單純依設定組裝 UI。
- **規則與通知設定來源**
  - `RULES_NOTICES` 與 `SURVEY_ALERT_CONFIG` 可改由後台 API 或設定檔載入，例如依學期或活動類型顯示不同規則，EventRulesNotice / EventAlertsBanner 則讀取載入結果。
- **共用 hooks**
  - 若未來在其他頁面也需要顯示活動介紹或 FAQ，可抽出 hooks（如 `useActivityIntroConfig`、`useFaqConfig`）統一提供結構化設定與行為（例如預設開啟 Tab、追蹤最近瀏覽的活動介紹類型）。 

