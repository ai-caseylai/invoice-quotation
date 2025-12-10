# 🚀 部署到 Cloudflare Pages

## 📋 部署步驟

### 1️⃣ 準備 GitHub 倉庫

**選項 A：使用 GitHub Desktop（推薦，最簡單）**

1. 下載並安裝 [GitHub Desktop](https://desktop.github.com)
2. 打開 GitHub Desktop
3. 選擇 `File` → `Add Local Repository`
4. 選擇專案資料夾：`/Users/apple/Desktop/development/invoice&quotation`
5. 點擊 `Publish repository`
6. 輸入倉庫名稱（如：`invoice-generator`）
7. **取消勾選** "Keep this code private"（使用免費公開倉庫）
8. 點擊 `Publish Repository`

**選項 B：使用命令行**

```bash
# 在專案目錄下執行
cd /Users/apple/Desktop/development/invoice\&quotation

# 在 GitHub 上創建新倉庫（需先登入 GitHub CLI）
gh repo create invoice-generator --public --source=. --remote=origin --push
```

**選項 C：手動上傳**

1. 訪問 https://github.com/new
2. 創建新倉庫：`invoice-generator`
3. 設為 Public
4. **不要** 勾選任何初始化選項
5. 點擊 `Create repository`
6. 按照頁面提示執行命令：

```bash
cd /Users/apple/Desktop/development/invoice\&quotation
git remote add origin https://github.com/你的用戶名/invoice-generator.git
git branch -M main
git push -u origin main
```

---

### 2️⃣ 連接 Cloudflare Pages

1. **登入 Cloudflare**
   - 訪問：https://dash.cloudflare.com
   - 如果沒有帳號，免費註冊一個

2. **進入 Pages**
   - 點擊左側選單的 `Workers & Pages`
   - 點擊 `Create application`
   - 選擇 `Pages` 標籤
   - 點擊 `Connect to Git`

3. **連接 GitHub**
   - 點擊 `Connect GitHub`
   - 授權 Cloudflare 存取你的 GitHub
   - 選擇 `invoice-generator` 倉庫

4. **設定部署**
   - **Project name**: `invoice-generator`（或你喜歡的名稱）
   - **Production branch**: `main`
   - **Build settings**:
     - Framework preset: `None`
     - Build command: 留空
     - Build output directory: `/`
   - 點擊 `Save and Deploy`

5. **等待部署完成**（約 1-2 分鐘）

6. **完成！** 🎉
   - 你會獲得一個 URL：`https://invoice-generator-xxx.pages.dev`
   - 訪問這個 URL 就能使用你的應用程式了！

---

## 🌐 自訂網域（可選）

### 如果你有自己的網域：

1. 在 Cloudflare Pages 專案頁面
2. 點擊 `Custom domains`
3. 點擊 `Set up a custom domain`
4. 輸入你的網域（如：`invoice.yourdomain.com`）
5. 按照指示設定 DNS 記錄
6. 等待 DNS 生效（通常幾分鐘）
7. 自動獲得免費 SSL 證書

---

## 🔄 更新部署

當你修改程式碼後：

**使用 GitHub Desktop**：
1. 打開 GitHub Desktop
2. 查看變更
3. 填寫 Commit message
4. 點擊 `Commit to main`
5. 點擊 `Push origin`
6. Cloudflare Pages 會自動重新部署！

**使用命令行**：
```bash
cd /Users/apple/Desktop/development/invoice\&quotation
git add .
git commit -m "更新描述"
git push
```

---

## 🎯 測試檢查清單

部署完成後，請測試：

- [ ] 頁面能正常打開
- [ ] 標籤切換正常（發票/報價單）
- [ ] 表單能正常填寫
- [ ] 能新增/刪除項目
- [ ] 點擊「生成PDF」能下載
- [ ] PDF 中的中文顯示正常
- [ ] 手機端顯示正常

---

## 🛠️ 故障排除

### 問題 1：字體無法載入

**症狀**：PDF 中文顯示為方框
**解決**：確認 Supabase Storage 中的字體檔案是 public

1. 訪問：https://supabase.com/dashboard
2. Storage → fonts bucket
3. 確認 bucket 設定為 Public
4. 測試 URL 能否訪問：
   ```
   https://fcydqlusmtpgmwvfnopm.supabase.co/storage/v1/object/public/fonts/NotoSansSC-Regular.ttf
   ```

### 問題 2：部署失敗

**症狀**：Cloudflare Pages 顯示錯誤
**解決**：
- 確認 GitHub 倉庫是公開的
- 確認所有必要檔案都已推送
- 檢查 Build settings 是否正確

### 問題 3：HTTPS 證書錯誤

**症狀**：瀏覽器顯示不安全連接
**解決**：等待幾分鐘，SSL 證書需要時間生效

---

## 📊 效能優化

部署完成後，你的應用程式會自動獲得：

✅ **Cloudflare CDN** - 全球 200+ 節點加速
✅ **自動 HTTPS** - 免費 SSL/TLS 證書
✅ **HTTP/2 支援** - 更快的載入速度
✅ **Brotli 壓縮** - 減少傳輸大小
✅ **無限頻寬** - 不計流量費用
✅ **DDoS 防護** - 自動防禦攻擊

---

## 🎉 部署完成後

分享你的應用程式：
```
https://your-project-name.pages.dev
```

享受全球加速的 HTTPS 服務！🚀
