-- Invoice System - D1 SQLite Schema

CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    email TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    bank_name TEXT DEFAULT '',
    bank_account TEXT DEFAULT '',
    bank_code TEXT DEFAULT '',
    bank_swift TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    doc_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id),
    supplier_id TEXT REFERENCES suppliers(id),
    date TEXT NOT NULL DEFAULT (date('now')),
    due_date TEXT,
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT DEFAULT '',
    pdf_url TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE document_items (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE bank_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bank_name TEXT DEFAULT '',
    account_number TEXT DEFAULT '',
    currency TEXT DEFAULT 'HKD',
    balance REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_id TEXT,
    color TEXT DEFAULT '#667eea',
    icon TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL DEFAULT (date('now')),
    type TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id),
    amount REAL NOT NULL,
    bank_account_id TEXT REFERENCES bank_accounts(id),
    customer_id TEXT REFERENCES customers(id),
    supplier_id TEXT REFERENCES suppliers(id),
    document_id TEXT REFERENCES documents(id),
    description TEXT NOT NULL,
    reference TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    is_reconciled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE bank_statements (
    id TEXT PRIMARY KEY,
    bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    statement_date TEXT NOT NULL,
    upload_date TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'pending',
    total_transactions INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
);

CREATE TABLE pdf_settings (
    id TEXT PRIMARY KEY,
    settings TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE pdf_element_positions (
    id TEXT PRIMARY KEY,
    positions TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
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

-- Views
CREATE VIEW receivables_summary AS
SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    COUNT(d.id) AS invoice_count,
    SUM(CASE WHEN d.status != 'paid' THEN d.total ELSE 0 END) AS outstanding_amount,
    SUM(d.total) AS total_amount
FROM customers c
LEFT JOIN documents d ON c.id = d.customer_id AND d.type = 'invoice'
GROUP BY c.id, c.name;

CREATE VIEW payables_summary AS
SELECT
    s.id AS supplier_id,
    s.name AS supplier_name,
    COUNT(d.id) AS purchase_order_count,
    SUM(CASE WHEN d.status != 'paid' THEN d.total ELSE 0 END) AS outstanding_amount,
    SUM(d.total) AS total_amount
FROM suppliers s
LEFT JOIN documents d ON s.id = d.supplier_id AND d.type = 'purchase_order'
GROUP BY s.id, s.name;

CREATE VIEW monthly_summary AS
SELECT
    strftime('%Y-%m-01', date) AS month,
    type,
    SUM(amount) AS total_amount,
    COUNT(*) AS transaction_count
FROM transactions
GROUP BY strftime('%Y-%m-01', date), type
ORDER BY month DESC, type;

CREATE VIEW bank_balance_summary AS
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
WHERE ba.is_active = 1
GROUP BY ba.id, ba.name, ba.bank_name, ba.currency, ba.balance;

-- Seed data
INSERT INTO categories (id, name, type, color, icon) VALUES
('cat_income_01', '銷售收入', 'income', '#10b981', '💰'),
('cat_income_02', '服務收入', 'income', '#3b82f6', '🛠️'),
('cat_income_03', '利息收入', 'income', '#8b5cf6', '💵'),
('cat_income_04', '其他收入', 'income', '#6366f1', '📈'),
('cat_expense_01', '租金', 'expense', '#ef4444', '🏢'),
('cat_expense_02', '薪資', 'expense', '#f59e0b', '👥'),
('cat_expense_03', '水電費', 'expense', '#06b6d4', '💡'),
('cat_expense_04', '辦公用品', 'expense', '#8b5cf6', '📝'),
('cat_expense_05', '交通費', 'expense', '#ec4899', '🚗'),
('cat_expense_06', '餐費', 'expense', '#f97316', '🍽️'),
('cat_expense_07', '稅費', 'expense', '#dc2626', '📄'),
('cat_expense_08', '其他支出', 'expense', '#6b7280', '📤');

INSERT INTO companies (id, name, phone, address, email) VALUES
('default', '示例科技有限公司', '2123-4567', '香港中環皇后大道中123號', 'contact@example.com');
