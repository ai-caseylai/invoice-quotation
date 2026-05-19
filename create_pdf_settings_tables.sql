-- =====================================================
-- PDF 排版設定資料表
-- =====================================================
-- 用於儲存 PDF 的排版設定和元件位置

-- 1. PDF 排版設定表
CREATE TABLE IF NOT EXISTS pdf_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 添加註解
COMMENT ON TABLE pdf_settings IS 'PDF 排版設定表';
COMMENT ON COLUMN pdf_settings.settings IS '排版設定 JSON 對象（margin, primaryColor, fontSize 等）';

-- 2. PDF 元件位置表
CREATE TABLE IF NOT EXISTS pdf_element_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    positions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 添加註解
COMMENT ON TABLE pdf_element_positions IS 'PDF 元件位置表';
COMMENT ON COLUMN pdf_element_positions.positions IS '元件位置 JSON 對象（logo, title, table 等的 left, top, width, height）';

-- 插入預設的排版設定
INSERT INTO pdf_settings (settings) VALUES (
    '{
        "margin": 20,
        "primaryColor": "#667eea",
        "companyNameSize": 18,
        "titleSize": 28,
        "sectionTitleSize": 14,
        "textSize": 11,
        "smallTextSize": 9
    }'::jsonb
) ON CONFLICT DO NOTHING;

-- 如果您想從 localStorage 遷移現有數據，可以手動插入：
-- INSERT INTO pdf_element_positions (positions) VALUES (
--     '您的 localStorage pdfElementPositions 數據'::jsonb
-- );

-- =====================================================
-- 權限設定（根據您的需求調整）
-- =====================================================

-- 允許匿名用戶讀取和修改（開發環境）
ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_element_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許所有操作 pdf_settings"
ON pdf_settings FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "允許所有操作 pdf_element_positions"
ON pdf_element_positions FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- 索引（提升查詢效能）
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pdf_settings_updated_at 
ON pdf_settings(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_element_positions_updated_at 
ON pdf_element_positions(updated_at DESC);

-- =====================================================
-- 完成！
-- =====================================================

-- 驗證查詢
-- SELECT * FROM pdf_settings ORDER BY updated_at DESC LIMIT 1;
-- SELECT * FROM pdf_element_positions ORDER BY updated_at DESC LIMIT 1;
