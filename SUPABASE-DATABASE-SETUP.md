# 🗄️ Supabase 資料庫設定指南

## 📋 目標
為記帳系統建立完整的 Supabase 資料庫

---

## 🚀 快速設定（10 分鐘）

### 步驟 1：登入 Supabase

1. 訪問：https://supabase.com/dashboard
2. 登入你的帳號（如果還沒有，請免費註冊）
3. 找到你的專案：`fcydqlusmtpgmwvfnopm`

---

### 步驟 2：執行 SQL 腳本

1. **進入 SQL Editor**
   - 在左側選單點擊 `SQL Editor`
   - 或點擊 `Database` → `SQL Editor`

2. **創建新查詢**
   - 點擊 `New query` 按鈕

3. **複製貼上 SQL**
   - 打開專案資料夾中的 `database-schema.sql`
   - 複製全部內容
   - 貼到 Supabase SQL Editor

4. **執行腳本**
   - 點擊右下角的 `Run` 按鈕
   - 或按 `Cmd + Enter` (Mac) / `Ctrl + Enter` (Windows)

5. **確認成功**
   - 看到綠色的 "Success" 訊息
   - 沒有紅色錯誤訊息

---

### 步驟 3：驗證資料表

1. **查看資料表**
   - 左側選單點擊 `Table Editor`
   - 你應該看到以下資料表：
     ```
     ✅ companies (公司設定)
     ✅ customers (客戶)
     ✅ suppliers (供應商)
     ✅ documents (單據)
     ✅ document_items (單據項目)
     ✅ bank_accounts (銀行帳戶)
     ✅ categories (交易分類)
     ✅ transactions (交易記錄)
     ✅ bank_statements (銀行對帳單)
     ```

2. **檢查預設資料**
   - 點擊 `categories` 資料表
   - 應該看到 12 個預設分類（收入 4 個 + 支出 8 個）
   - 點擊 `companies` 資料表
   - 應該看到 1 筆公司資料

---

## 📊 資料表說明

### 1. companies - 公司設定
儲存你的公司基本資訊
```
欄位：name, phone, address, email, logo_url
```

### 2. customers - 客戶
管理所有客戶資料
```
欄位：name, contact_person, phone, email, address, notes
```

### 3. suppliers - 供應商
管理所有供應商資料
```
欄位：name, contact_person, phone, email, address, notes
```

### 4. documents - 單據
儲存所有單據（發票、報價單、收據、採購單）
```
類型：invoice, quotation, receipt, purchase_order
狀態：draft, sent, paid, overdue, cancelled
```

### 5. document_items - 單據項目明細
每個單據的項目清單
```
欄位：description, quantity, unit_price, amount
```

### 6. bank_accounts - 銀行帳戶
管理多個銀行帳戶
```
支援幣種：HKD, USD, CNY, EUR, GBP
```

### 7. categories - 交易分類
收入和支出的分類
```
預設包含：銷售收入、薪資、租金、水電費等
```

### 8. transactions - 交易記錄
所有收支記錄
```
類型：income (收入), expense (支出), transfer (轉帳)
```

### 9. bank_statements - 銀行對帳單
上傳的銀行對帳單檔案記錄

---

## 🔧 實用查詢視圖

系統自動創建了 4 個實用視圖：

### 1. receivables_summary - 應收帳款總計
```sql
SELECT * FROM receivables_summary;
```
顯示每個客戶的未收款項

### 2. payables_summary - 應付帳款總計
```sql
SELECT * FROM payables_summary;
```
顯示每個供應商的未付款項

### 3. monthly_summary - 月度收支統計
```sql
SELECT * FROM monthly_summary;
```
顯示每月的收入和支出總計

### 4. bank_balance_summary - 銀行餘額
```sql
SELECT * FROM bank_balance_summary;
```
顯示所有銀行帳戶的即時餘額

---

## ✅ 測試資料庫

在 SQL Editor 執行以下查詢測試：

```sql
-- 1. 查看公司資料
SELECT * FROM companies;

-- 2. 查看交易分類
SELECT * FROM categories ORDER BY type, name;

-- 3. 查看所有資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 4. 測試插入客戶
INSERT INTO customers (name, phone, email) 
VALUES ('測試客戶', '1234-5678', 'test@example.com');

SELECT * FROM customers;
```

---

## 🎯 下一步

資料庫設定完成後，接下來的工作：

1. ✅ 更新前端程式碼連接資料庫
2. ✅ 建立資料 CRUD 功能
3. ✅ 實作單據保存功能
4. ✅ 實作銀行對帳單上傳
5. ✅ 建立報表功能

---

## ❓ 常見問題

### Q: 執行 SQL 時出現錯誤？
**A**: 確保：
- 你在正確的專案中
- 沒有重複執行（資料表已存在）
- 如果需要重新開始，先刪除所有資料表

### Q: 如何刪除所有資料表重新開始？
**A**: 在 SQL Editor 執行：
```sql
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS document_items CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

DROP VIEW IF EXISTS receivables_summary;
DROP VIEW IF EXISTS payables_summary;
DROP VIEW IF EXISTS monthly_summary;
DROP VIEW IF EXISTS bank_balance_summary;
```

然後重新執行 `database-schema.sql`

### Q: 如何備份資料庫？
**A**: 
1. 進入 `Database` → `Backups`
2. 點擊 `Create backup`
3. Supabase 也有自動備份功能

---

## 🎉 完成！

資料庫設定完成！現在可以開始開發記帳系統的前端功能了。

需要幫助？查看 `BOOKKEEPING-PLAN.md` 了解完整開發計劃。
