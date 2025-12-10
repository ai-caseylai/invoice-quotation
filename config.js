// =====================================================
// 配置檔案 - Supabase 和應用程式設定
// =====================================================

const CONFIG = {
    // Supabase 設定
    SUPABASE: {
        URL: 'https://fcydqlusmtpgmwvfnopm.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeWRxbHVzbXRwZ213dmZub3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjA0NDUsImV4cCI6MjA4MDkzNjQ0NX0.bk605O6ELQ3jIkzMXhByCLBrISxrtWB6BnTpsFNBIZ8'
    },
    
    // 應用程式設定
    APP: {
        NAME: '簡易記帳系統',
        VERSION: '2.0.0',
        DEFAULT_CURRENCY: 'HKD',
        DATE_FORMAT: 'zh-HK',
        COMPANY_ID: null // 將在初始化時設定
    },
    
    // 單據類型
    DOCUMENT_TYPES: {
        INVOICE: 'invoice',
        QUOTATION: 'quotation',
        RECEIPT: 'receipt',
        PURCHASE_ORDER: 'purchase_order'
    },
    
    // 單據狀態
    DOCUMENT_STATUS: {
        DRAFT: 'draft',
        SENT: 'sent',
        PAID: 'paid',
        OVERDUE: 'overdue',
        CANCELLED: 'cancelled'
    },
    
    // 交易類型
    TRANSACTION_TYPES: {
        INCOME: 'income',
        EXPENSE: 'expense',
        TRANSFER: 'transfer'
    },
    
    // 支援的幣種
    CURRENCIES: ['HKD', 'USD', 'CNY', 'EUR', 'GBP'],
    
    // 預設單據編號格式
    DOC_NUMBER_FORMAT: {
        invoice: 'INV',
        quotation: 'QUO',
        receipt: 'REC',
        purchase_order: 'PO'
    }
};

// 導出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
