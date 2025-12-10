-- =====================================================
-- 簡易記帳系統 - Supabase 資料庫架構
-- =====================================================

-- 1. 公司設定
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    email TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 客戶
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 供應商
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 單據（發票、報價單、收據等）
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('invoice', 'quotation', 'receipt', 'purchase_order')),
    doc_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    tax NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 單據項目明細
CREATE TABLE document_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 銀行帳戶
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    currency TEXT DEFAULT 'HKD' CHECK (currency IN ('HKD', 'USD', 'CNY', 'EUR', 'GBP')),
    balance NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 交易分類
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    parent_id UUID REFERENCES categories(id),
    color TEXT DEFAULT '#667eea',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 交易記錄
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES categories(id),
    amount NUMERIC(12, 2) NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id),
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    document_id UUID REFERENCES documents(id),
    description TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    is_reconciled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 銀行對帳單上傳
CREATE TABLE bank_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    statement_date DATE NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
    total_transactions INTEGER DEFAULT 0,
    notes TEXT
);

-- =====================================================
-- 索引 (提升查詢效能)
-- =====================================================

CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_date ON documents(date);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_items_document ON document_items(document_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_bank_account ON transactions(bank_account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_categories_type ON categories(type);

-- =====================================================
-- 觸發器 (自動更新 updated_at)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 預設資料 - 交易分類
-- =====================================================

-- 收入分類
INSERT INTO categories (name, type, color, icon) VALUES
('銷售收入', 'income', '#10b981', '💰'),
('服務收入', 'income', '#3b82f6', '🛠️'),
('利息收入', 'income', '#8b5cf6', '💵'),
('其他收入', 'income', '#6366f1', '📈');

-- 支出分類
INSERT INTO categories (name, type, color, icon) VALUES
('租金', 'expense', '#ef4444', '🏢'),
('薪資', 'expense', '#f59e0b', '👥'),
('水電費', 'expense', '#06b6d4', '💡'),
('辦公用品', 'expense', '#8b5cf6', '📝'),
('交通費', 'expense', '#ec4899', '🚗'),
('餐費', 'expense', '#f97316', '🍽️'),
('稅費', 'expense', '#dc2626', '📄'),
('其他支出', 'expense', '#6b7280', '📤');

-- =====================================================
-- 預設資料 - 公司設定
-- =====================================================

INSERT INTO companies (name, phone, address, email) VALUES
('示例科技有限公司', '2123-4567', '香港中環皇后大道中123號', 'contact@example.com');

-- =====================================================
-- Row Level Security (RLS) - 暫時禁用，後續啟用
-- =====================================================

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 實用查詢視圖
-- =====================================================

-- 應收帳款總計
CREATE OR REPLACE VIEW receivables_summary AS
SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    COUNT(d.id) AS invoice_count,
    SUM(CASE WHEN d.status != 'paid' THEN d.total ELSE 0 END) AS outstanding_amount,
    SUM(d.total) AS total_amount
FROM customers c
LEFT JOIN documents d ON c.id = d.customer_id AND d.type = 'invoice'
GROUP BY c.id, c.name;

-- 應付帳款總計
CREATE OR REPLACE VIEW payables_summary AS
SELECT 
    s.id AS supplier_id,
    s.name AS supplier_name,
    COUNT(d.id) AS purchase_order_count,
    SUM(CASE WHEN d.status != 'paid' THEN d.total ELSE 0 END) AS outstanding_amount,
    SUM(d.total) AS total_amount
FROM suppliers s
LEFT JOIN documents d ON s.id = d.supplier_id AND d.type = 'purchase_order'
GROUP BY s.id, s.name;

-- 月度收支統計
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
    DATE_TRUNC('month', date) AS month,
    type,
    SUM(amount) AS total_amount,
    COUNT(*) AS transaction_count
FROM transactions
GROUP BY DATE_TRUNC('month', date), type
ORDER BY month DESC, type;

-- 銀行帳戶餘額
CREATE OR REPLACE VIEW bank_balance_summary AS
SELECT 
    ba.id,
    ba.name,
    ba.bank_name,
    ba.currency,
    ba.balance AS initial_balance,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS transactions_total,
    ba.balance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS current_balance
FROM bank_accounts ba
LEFT JOIN transactions t ON ba.id = t.bank_account_id
WHERE ba.is_active = TRUE
GROUP BY ba.id, ba.name, ba.bank_name, ba.currency, ba.balance;

-- =====================================================
-- 完成！
-- =====================================================

-- 查詢範例：
-- SELECT * FROM receivables_summary;
-- SELECT * FROM payables_summary;
-- SELECT * FROM monthly_summary;
-- SELECT * FROM bank_balance_summary;
