# 📊 簡易記帳系統升級計劃

## 🎯 目標
將現有的發票/報價單生成器升級為功能完整的記帳系統（對標 MYOB）

---

## 📋 功能模塊

### 1. 單據管理 📄
**現有功能：**
- ✅ 發票生成 (Invoice)
- ✅ 報價單生成 (Quotation)
- ✅ PDF 下載
- ✅ 中文支援

**新增功能：**
- 📝 收據 (Receipt)
- 📝 採購單 (Purchase Order)
- 💾 單據保存（Supabase Database）
- 🔍 單據查詢和編輯
- 📊 單據統計

---

### 2. 財務管理 💰
- 💵 銀行對帳單上傳（CSV/Excel）
- 📥 收入記錄
- 📤 支出記錄
- 🏦 多帳戶管理
- 💱 現金流追蹤
- 📊 收支分類

---

### 3. 客戶/供應商管理 👥
- 👤 客戶資料庫
- 🏢 供應商資料庫
- 💰 應收帳款 (Accounts Receivable)
- 💸 應付帳款 (Accounts Payable)
- 📞 聯絡資訊管理

---

### 4. 報表系統 📈
- 📊 儀表板 (Dashboard)
- 💹 損益表 (P&L Statement)
- 🏦 資產負債表 (Balance Sheet)
- 💰 現金流量表 (Cash Flow Statement)
- 📅 月度/季度/年度報表
- 📈 圖表視覺化

---

## 🗄️ 資料庫架構 (Supabase)

### Tables

```sql
-- 1. 公司設定
companies
├── id (uuid, PK)
├── name (text)
├── phone (text)
├── address (text)
├── email (text)
├── logo_url (text)
└── created_at (timestamp)

-- 2. 客戶
customers
├── id (uuid, PK)
├── name (text)
├── contact_person (text)
├── phone (text)
├── email (text)
├── address (text)
├── notes (text)
└── created_at (timestamp)

-- 3. 供應商
suppliers
├── id (uuid, PK)
├── name (text)
├── contact_person (text)
├── phone (text)
├── email (text)
├── address (text)
├── notes (text)
└── created_at (timestamp)

-- 4. 單據（發票、報價單、收據等）
documents
├── id (uuid, PK)
├── type (text) -- 'invoice', 'quotation', 'receipt', 'purchase_order'
├── doc_number (text)
├── customer_id (uuid, FK)
├── date (date)
├── due_date (date)
├── subtotal (numeric)
├── tax (numeric)
├── total (numeric)
├── status (text) -- 'draft', 'sent', 'paid', 'overdue'
├── notes (text)
├── pdf_url (text)
└── created_at (timestamp)

-- 5. 單據項目明細
document_items
├── id (uuid, PK)
├── document_id (uuid, FK)
├── description (text)
├── quantity (numeric)
├── unit_price (numeric)
├── amount (numeric)
└── sort_order (int)

-- 6. 銀行帳戶
bank_accounts
├── id (uuid, PK)
├── name (text)
├── bank_name (text)
├── account_number (text)
├── currency (text)
├── balance (numeric)
└── created_at (timestamp)

-- 7. 交易記錄
transactions
├── id (uuid, PK)
├── date (date)
├── type (text) -- 'income', 'expense'
├── category (text)
├── amount (numeric)
├── bank_account_id (uuid, FK)
├── customer_id (uuid, FK, nullable)
├── supplier_id (uuid, FK, nullable)
├── document_id (uuid, FK, nullable)
├── description (text)
├── reference (text)
└── created_at (timestamp)

-- 8. 交易分類
categories
├── id (uuid, PK)
├── name (text)
├── type (text) -- 'income', 'expense'
├── parent_id (uuid, FK, nullable)
└── created_at (timestamp)

-- 9. 銀行對帳單上傳
bank_statements
├── id (uuid, PK)
├── bank_account_id (uuid, FK)
├── file_name (text)
├── file_url (text)
├── statement_date (date)
├── upload_date (timestamp)
└── status (text)
```

---

## 🎨 介面設計

### 導航選單
```
┌─────────────────────────────────────────┐
│  🏠 首頁  📄 單據  💰 財務  👥 客戶  📊 報表  │
└─────────────────────────────────────────┘
```

### 主要頁面

1. **儀表板** (Dashboard)
   - 今日收支概覽
   - 待收/待付款項
   - 近期交易
   - 快捷操作

2. **單據管理** (Documents)
   - 發票列表
   - 報價單列表
   - 收據列表
   - 新增單據按鈕

3. **財務** (Finance)
   - 銀行帳戶列表
   - 上傳對帳單
   - 收支記錄
   - 現金流報表

4. **客戶/供應商** (Contacts)
   - 客戶列表
   - 供應商列表
   - 應收/應付帳款

5. **報表** (Reports)
   - 損益表
   - 資產負債表
   - 現金流量表
   - 圖表分析

---

## 🛠️ 技術架構

### 前端
- **框架**: HTML5 + CSS3 + Vanilla JavaScript
- **PDF 生成**: jsPDF
- **圖表**: Chart.js
- **表格**: ag-Grid (輕量級版本) 或自製
- **檔案上傳**: Supabase Storage
- **Excel 解析**: SheetJS (xlsx)

### 後端/資料庫
- **資料庫**: Supabase PostgreSQL
- **認證**: Supabase Auth（可選，暫時使用本地存儲）
- **儲存**: Supabase Storage（PDF、對帳單檔案）
- **API**: Supabase REST API

### 部署
- **託管**: Cloudflare Pages
- **CDN**: Cloudflare
- **字體**: Supabase Storage

---

## 📅 開發階段

### Phase 1: 資料庫設計（1-2天）
- ✅ 設計完整資料庫架構
- ✅ 在 Supabase 建立 Tables
- ✅ 設定 Row Level Security (RLS)
- ✅ 建立測試資料

### Phase 2: 核心功能重構（2-3天）
- 📝 重構現有單據系統
- 📝 建立資料持久化（保存到 Supabase）
- 📝 建立單據列表頁面
- 📝 建立單據編輯功能

### Phase 3: 銀行/財務模塊（2-3天）
- 💰 銀行帳戶管理
- 💰 上傳銀行對帳單（CSV/Excel）
- 💰 自動解析交易記錄
- 💰 手動新增收支記錄

### Phase 4: 客戶/供應商管理（1-2天）
- 👥 客戶CRUD
- 👥 供應商CRUD
- 👥 應收/應付帳款統計

### Phase 5: 報表系統（2-3天）
- 📊 儀表板首頁
- 📊 損益表
- 📊 資產負債表
- 📊 現金流報表
- 📊 圖表視覺化

### Phase 6: 整合測試（1天）
- 🧪 全功能測試
- 🧪 資料完整性測試
- 🧪 使用者體驗優化

---

## 🎯 核心功能優先級

### P0 (必須有)
1. ✅ 單據生成和保存
2. ✅ 銀行對帳單上傳
3. ✅ 收支記錄
4. ✅ 基本報表

### P1 (重要)
1. 📝 客戶/供應商管理
2. 📝 單據編輯/刪除
3. 📝 進階報表

### P2 (可選)
1. 🔒 使用者認證
2. 📧 郵件發送
3. 📱 手機 App

---

## 💡 特色功能

1. **智慧分類**
   - 自動識別銀行交易類別
   - 機器學習分類建議

2. **一鍵對帳**
   - 自動匹配發票和銀行記錄
   - 標記已付款/未付款

3. **多幣種支援**
   - HKD, USD, CNY
   - 即時匯率轉換

4. **數據導出**
   - Excel 導出
   - CSV 導出
   - PDF 報表

---

## 🚀 開始開發

準備好開始了嗎？我會按照以下順序進行：

1. ✅ 建立 Supabase 資料庫架構
2. ✅ 重構現有程式碼
3. ✅ 建立新功能模塊
4. ✅ 整合測試

---

**預計完成時間**: 10-14 天（全職開發）
**專案類型**: Web-based 記帳系統
**對標產品**: MYOB, QuickBooks, Xero
