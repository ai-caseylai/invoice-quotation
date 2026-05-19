-- =====================================================
-- 更新 companies 表 - 添加銀行資料欄位
-- =====================================================
-- 執行此腳本以在現有資料庫中添加銀行資料欄位

-- 添加銀行名稱欄位
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- 添加銀行帳號欄位
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- 添加銀行代碼欄位
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS bank_code TEXT;

-- 添加 SWIFT Code 欄位
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS bank_swift TEXT;

-- 驗證欄位已添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies'
ORDER BY ordinal_position;
