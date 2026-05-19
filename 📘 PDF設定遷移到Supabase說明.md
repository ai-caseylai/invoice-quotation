# 📘 PDF 設定遷移到 Supabase 說明

## 🎯 目標

將 PDF 排版設定和元件位置從 localStorage 遷移到 Supabase 數據庫，實現：
- ✅ 跨裝置同步
- ✅ 數據持久化
- ✅ 更好的數據管理
- ✅ 多用戶支援（未來）

---

## 📋 實施步驟

### 步驟 1: 創建 Supabase 資料表

1. 登入您的 **Supabase 控制台**
2. 選擇您的專案
3. 點擊左側 **SQL Editor**
4. 複製 `create_pdf_settings_tables.sql` 的內容
5. 貼上並執行 SQL

**SQL 會創建兩個表：**
- `pdf_settings` - 儲存排版設定（顏色、字體大小等）
- `pdf_element_positions` - 儲存元件位置（logo, title, table 等）

### 步驟 2: 遷移現有數據

#### 方法 A: 使用遷移工具（推薦）

1. 在瀏覽器中打開：
   ```
   http://localhost:8000/migrate-to-supabase.html
   ```

2. 按照頁面上的 4 個步驟操作：
   - ✅ 步驟 1: 檢查 localStorage 數據
   - ✅ 步驟 2: 檢查 Supabase 連接
   - ✅ 步驟 3: 執行遷移（點擊「遷移全部」）
   - ✅ 步驟 4: 驗證遷移結果

#### 方法 B: 手動遷移

1. 在瀏覽器 Console 中執行：
   ```javascript
   // 讀取 localStorage
   const settings = JSON.parse(localStorage.getItem('pdfLayoutSettings'));
   const positions = JSON.parse(localStorage.getItem('pdfElementPositions'));
   
   // 保存到 Supabase
   await db.savePDFLayoutSettings(settings);
   await db.savePDFElementPositions(positions);
   
   console.log('✅ 遷移完成');
   ```

### 步驟 3: 驗證系統運作

1. 重新整理頁面（Cmd/Ctrl + Shift + R）
2. 生成一個 PDF
3. 查看 Console 輸出，應該看到：
   ```
   🆕🆕🆕 documents.js 版本: 2025-12-11-SUPABASE 🆕🆕🆕
   📥 從 Supabase 讀取 PDF 排版設定...
   ✅ PDF 排版設定讀取成功
   📥 從 Supabase 讀取 PDF 元件位置...
   ✅ PDF 元件位置讀取成功，共 10 個元件
   ```

---

## 📊 資料表結構

### pdf_settings 表
```sql
{
  id: UUID,
  settings: JSONB {
    margin: 20,
    primaryColor: "#667eea",
    companyNameSize: 18,
    titleSize: 28,
    sectionTitleSize: 14,
    textSize: 11,
    smallTextSize: 9
  },
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### pdf_element_positions 表
```sql
{
  id: UUID,
  positions: JSONB {
    logo: { left: 31, top: 319, width: 150, height: 120 },
    title: { left: 430, top: 36, width: 112, height: 55 },
    ... (其他 8 個元件)
  },
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

---

## 🔧 已修改的檔案

### 1. `db.js`
新增 4 個方法：
- `getPDFLayoutSettings()` - 讀取排版設定
- `savePDFLayoutSettings(settings)` - 保存排版設定
- `getPDFElementPositions()` - 讀取元件位置
- `savePDFElementPositions(positions)` - 保存元件位置

### 2. `documents.js`
修改 3 個方法：
- `drawPDFContent()` - 改用 `await` 載入設定
- `loadElementPositions()` - 從 Supabase 讀取
- `loadLayoutSettings()` - 從 Supabase 讀取

### 3. 新增檔案
- `create_pdf_settings_tables.sql` - 資料表創建腳本
- `migrate-to-supabase.html` - 遷移工具
- 本說明文件

---

## ⚠️ 注意事項

### 1. localStorage 數據保留
遷移完成後，localStorage 的數據**不會被刪除**，仍然保留作為備份。

### 2. 優先順序
系統會優先使用 Supabase 的數據。如果 Supabase 沒有數據，會使用預設值。

### 3. 未來更新 PDF 設定
以後在 `pdf-preview.html` 中調整排版時，數據會**自動保存到 Supabase**（需要更新 `pdf-preview.html` 的保存邏輯）。

### 4. 多用戶考量
當前實作是「單一設定」模式，所有用戶共用同一套設定。如果需要多用戶各自的設定，需要：
- 添加 `user_id` 欄位
- 修改查詢邏輯
- 實作用戶登入系統

---

## 🐛 故障排除

### 問題 1: Supabase 連接失敗
**症狀：** 遷移工具顯示「連接失敗」

**解決方法：**
1. 檢查 `config.js` 中的 Supabase URL 和 Key
2. 確認網路連接正常
3. 查看瀏覽器 Console 的詳細錯誤

### 問題 2: 找不到資料表
**症狀：** 錯誤訊息：`relation "pdf_settings" does not exist`

**解決方法：**
1. 確認已執行 `create_pdf_settings_tables.sql`
2. 在 Supabase 控制台檢查表是否存在
3. 檢查資料表權限設定

### 問題 3: PDF 生成時使用預設位置
**症狀：** Logo 位置不對，使用了預設的 40,40

**解決方法：**
1. 確認已執行遷移
2. 在 Console 查看是否有「從 Supabase 讀取」的訊息
3. 驗證 Supabase 中有正確的數據：
   ```sql
   SELECT * FROM pdf_element_positions ORDER BY updated_at DESC LIMIT 1;
   ```

### 問題 4: 瀏覽器快取問題
**症狀：** 看不到新的調試訊息

**解決方法：**
1. 硬重新整理：`Cmd/Ctrl + Shift + R`
2. 或清除瀏覽器快取
3. 確認 Console 顯示：`🆕🆕🆕 documents.js 版本: 2025-12-11-SUPABASE`

---

## 📝 驗證清單

遷移完成後，請確認：

- [ ] Supabase 中有 `pdf_settings` 和 `pdf_element_positions` 兩個表
- [ ] `pdf_element_positions` 表中有 10 個元件的位置數據
- [ ] `pdf_settings` 表中有排版設定
- [ ] 生成 PDF 時 Console 顯示「從 Supabase 讀取」
- [ ] PDF 的元件位置與預覽一致
- [ ] Logo 顯示在正確位置（不是左上角）

---

## 🚀 下一步

遷移完成後，建議：

1. **更新 pdf-preview.html**：讓拖放編輯器保存到 Supabase
2. **移除 localStorage 依賴**：逐步淘汰 localStorage 的使用
3. **實作用戶系統**：支援多用戶各自的 PDF 設定
4. **添加版本控制**：記錄設定的歷史版本

---

## 📞 需要幫助？

如果遇到問題，請提供：
1. 瀏覽器 Console 的完整錯誤訊息
2. Supabase 查詢的結果截圖
3. 遷移工具的執行結果

---

✅ 遷移完成後，您的 PDF 設定將安全地儲存在 Supabase 中！
