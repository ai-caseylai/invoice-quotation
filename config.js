// =====================================================
// 配置檔案 - Cloudflare Worker API
// =====================================================

const CONFIG = {
    // Worker API 設定
    API: {
        URL: 'https://invoice-pdf-api.ai-caseylai.workers.dev',
    },

    // 應用程式設定
    APP: {
        NAME: '簡易記帳系統',
        VERSION: '3.0.0',
        DEFAULT_CURRENCY: 'HKD',
        DATE_FORMAT: 'zh-HK',
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
