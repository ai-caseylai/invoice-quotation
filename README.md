# 📄 發票 & 報價單生成器

一個簡單易用的發票和報價單 PDF 生成工具，支援繁體中文（香港格式）。

## ✨ 功能特點

- ✅ **雙模式支援**：發票 / 報價單
- ✅ **完美中文支援**：使用 Noto Sans SC 專業字體
- ✅ **動態項目管理**：新增/刪除項目明細
- ✅ **自動計算**：即時計算總金額
- ✅ **香港本地化**：港幣（HK$）、香港電話格式、香港地址
- ✅ **雲端字體**：從 Supabase CDN 載入字體，快速且穩定
- ✅ **現代化 UI**：漸變紫色主題，響應式設計

## 🚀 線上使用

訪問：https://your-project-name.pages.dev

## 💻 本地開發

### 啟動方式

**Mac 用戶**：
```bash
雙擊 start.command
```

**命令行**：
```bash
python3 -m http.server 8000
```

然後訪問：http://localhost:8000

## 📝 使用說明

1. **選擇類型**：點擊頂部標籤切換「發票」或「報價單」
2. **填寫資訊**：輸入公司資訊和客戶資訊
3. **新增項目**：點擊「+ 新增項目」按鈕，填寫項目明細
4. **填寫備註**：在備註欄填寫付款方式、有效期等資訊
5. **生成 PDF**：點擊「生成PDF」按鈕，自動下載

## 🛠️ 技術架構

- **前端**：純 HTML/CSS/JavaScript
- **PDF 生成**：jsPDF
- **字體**：Noto Sans SC（託管於 Supabase Storage）
- **部署**：Cloudflare Pages
- **CDN**：Cloudflare 全球加速

## 📦 專案結構

```
invoice&quotation/
├── index.html          # 主頁面
├── style.css           # 樣式表
├── script.js           # 核心邏輯
├── font.js             # 字體配置
└── README.md           # 說明文件
```

## 🌐 瀏覽器支援

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ❌ IE（不支援）

## 📄 License

MIT License

## 🙏 鳴謝

- [jsPDF](https://github.com/parallax/jsPDF) - PDF 生成庫
- [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC) - Google 字體
- [Supabase](https://supabase.com) - 雲端儲存
- [Cloudflare Pages](https://pages.cloudflare.com) - 網站託管

---

**最後更新**：2025-12-10
