# Job Talk 圖片輪播功能說明

## 功能概述

已成功將「活動介紹」頁面中的 Job Talk 部分升級為圖片輪播功能，支援六張照片的切換顯示。

## 主要改進

### 1. 圖片更新
- **原本**：單張靜態圖片 `/images/Job Talk.jpg`
- **現在**：六張輪播圖片陣列
  ```javascript
  const jobTalkImages = [
    '/images/job_talk_1.jpg',  // 第一張照片
    '/images/job_talk_2.jpg',  // 第二張照片
    '/images/job_talk_3.jpg',  // 第三張照片
    '/images/job_talk_4.jpg',  // 第四張照片
    '/images/job_talk_5.jpg',  // 第五張照片
    '/images/job_talk_6.jpg'   // 第六張照片
  ];
  ```

### 2. 視窗比例調整
- **圖片顯示區域**：從 `col-md-6` 調整為 `col-lg-7 col-md-6`
- **圖片高度**：固定為 400px，確保清晰顯示
- **響應式設計**：
  - 桌面版：400px 高度
  - 平板版：300px 高度
  - 手機版：250px 高度

### 3. 使用者體驗優化

#### 切換功能
- **左右切換按鈕**：圓形按鈕，位於圖片左右兩側
- **小點點指示器**：底部顯示當前圖片位置，可直接點擊跳轉
- **圖片計數器**：顯示「當前圖片 / 總圖片數」

#### 過渡動畫
- **淡入淡出效果**：300ms 的平滑過渡
- **按鈕懸停效果**：按鈕放大和顏色變化
- **載入動畫**：圖片載入時的淡入效果

## 技術實現

### 狀態管理
```javascript
const [currentImageIndex, setCurrentImageIndex] = useState(0);
const [isTransitioning, setIsTransitioning] = useState(false);
```

### 核心函數
- `nextImage()`: 下一張圖片
- `prevImage()`: 上一張圖片
- `goToImage(index)`: 跳轉到指定圖片
- `handleTabChange(tabName)`: 切換標籤時重置圖片索引

### CSS 樣式
- 新增 `EventList.css` 文件
- 包含響應式設計和動畫效果
- 支援不同螢幕尺寸的優化顯示

## 使用方式

1. **點擊「活動介紹」按鈕**開啟模態視窗
2. **選擇「Job Talk」標籤**查看圖片輪播
3. **使用切換功能**：
   - 點擊左右箭頭按鈕
   - 點擊底部小點點指示器
   - 查看圖片計數器了解當前位置

## 圖片檔案要求

請將六張 Job Talk 活動照片放置於以下路徑：
```
reservation-frontend/public/images/
├── job_talk_1.jpg
├── job_talk_2.jpg
├── job_talk_3.jpg
├── job_talk_4.jpg
├── job_talk_5.jpg
└── job_talk_6.jpg
```

## 備用圖片

如果圖片載入失敗，系統會自動顯示備用圖片：
```
/images/placeholder.jpg
```

## 瀏覽器相容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ 行動裝置瀏覽器

## 注意事項

1. **圖片格式**：建議使用 JPG 或 PNG 格式
2. **圖片大小**：建議寬高比為 16:9 或 4:3
3. **檔案大小**：建議每張圖片不超過 2MB
4. **命名規範**：必須按照 `job_talk_1.jpg` 到 `job_talk_6.jpg` 的格式命名

## 未來擴展

此輪播功能可以輕鬆擴展到其他活動類型：
- English Table
- English Club  
- International Forum

只需要複製相同的結構並修改圖片陣列即可。
