-- 更新公司 Logo URL 為 Supabase Storage 連結
UPDATE company 
SET logo_url = 'https://fcydqlusmtpgmwvfnopm.supabase.co/storage/v1/object/public/company-assets/test-logo-1765377503405.png',
    updated_at = NOW()
WHERE name = 'Muselabs Engineering Limited';
