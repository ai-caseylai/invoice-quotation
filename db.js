// =====================================================
// API 客戶端 — Cloudflare Worker API
// =====================================================

class Database {
    constructor() {
        this.baseUrl = CONFIG.API.URL;
    }

    getToken() {
        return localStorage.getItem('auth_token') || '';
    }

    headers() {
        const h = { 'Content-Type': 'application/json' };
        const t = this.getToken();
        if (t) h['Authorization'] = `Bearer ${t}`;
        return h;
    }

    async request(method, path, body) {
        const opts = { method, headers: this.headers() };
        if (body) opts.body = JSON.stringify(body);
        const resp = await fetch(`${this.baseUrl}${path}`, opts);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }
        return resp.json();
    }

    // ─── Company ───
    async getCompany() { return this.request('GET', '/api/company'); }
    async updateCompany(data) { return this.request('PUT', '/api/company', data); }

    // ─── Customers ───
    async getCustomers() { return this.request('GET', '/api/customers'); }
    async getCustomer(id) { return this.request('GET', `/api/customers/${id}`); }
    async createCustomer(data) { return this.request('POST', '/api/customers', data); }
    async updateCustomer(id, data) { return this.request('PUT', `/api/customers/${id}`, data); }
    async deleteCustomer(id) { return this.request('DELETE', `/api/customers/${id}`); }

    // ─── Suppliers ───
    async getSuppliers() { return this.request('GET', '/api/suppliers'); }
    async getSupplier(id) { return this.request('GET', `/api/suppliers/${id}`); }
    async createSupplier(data) { return this.request('POST', '/api/suppliers', data); }
    async updateSupplier(id, data) { return this.request('PUT', `/api/suppliers/${id}`, data); }
    async deleteSupplier(id) { return this.request('DELETE', `/api/suppliers/${id}`); }

    // ─── Documents ───
    async getDocuments(type) {
        const q = type ? `?type=${type}` : '';
        return this.request('GET', `/api/documents${q}`);
    }
    async getDocument(id) {
        const doc = await this.request('GET', `/api/documents/${id}`);
        return doc;
    }
    async createDocument(docData, items) {
        return this.request('POST', '/api/documents', { ...docData, items });
    }
    async getDocumentItems(docId) {
        const doc = await this.request('GET', `/api/documents/${docId}`);
        return doc.items || [];
    }
    async deleteDocument(id) {
        return this.request('DELETE', `/api/documents/${id}`);
    }

    // ─── Bank Accounts ───
    async getBankAccounts(activeOnly) {
        return this.request('GET', '/api/bank-accounts');
    }
    async getBankAccount(id) {
        return this.request('GET', `/api/bank-accounts/${id}`);
    }
    async createBankAccount(data) {
        return this.request('POST', '/api/bank-accounts', data);
    }
    async updateBankAccount(id, data) {
        return this.request('PUT', `/api/bank-accounts/${id}`, data);
    }

    // ─── Categories ───
    async getCategories(type) {
        const q = type ? `?type=${type}` : '';
        return this.request('GET', `/api/categories${q}`);
    }
    async getCategory(id) {
        const all = await this.getCategories();
        return all.find(c => c.id === id) || null;
    }

    // ─── Transactions ───
    async getTransactions(options) {
        return this.request('GET', '/api/transactions');
    }
    async getTransaction(id) {
        return this.request('GET', `/api/transactions/${id}`);
    }
    async createTransaction(data) {
        return this.request('POST', '/api/transactions', data);
    }
    async updateTransaction(id, data) {
        return this.request('PUT', `/api/transactions/${id}`, data);
    }
    async deleteTransaction(id) {
        return this.request('DELETE', `/api/transactions/${id}`);
    }

    // ─── Reports ───
    async getReceivablesSummary() { return this.request('GET', '/api/reports/receivables'); }
    async getPayablesSummary() { return this.request('GET', '/api/reports/payables'); }
    async getMonthlySummary(limit) { return this.request('GET', '/api/reports/monthly'); }
    async getBankBalanceSummary() { return this.request('GET', '/api/reports/bank-balance'); }

    // ─── PDF Settings ───
    async getPDFLayoutSettings() {
        try {
            const r = await this.request('GET', '/api/pdf/settings');
            return r || this.getDefaultLayoutSettings();
        } catch { return this.getDefaultLayoutSettings(); }
    }
    async savePDFLayoutSettings(settings) {
        return this.request('PUT', '/api/pdf/settings', settings);
    }
    async getPDFElementPositions() {
        try {
            const r = await this.request('GET', '/api/pdf/positions');
            return r || {};
        } catch { return {}; }
    }
    async savePDFElementPositions(positions) {
        return this.request('PUT', '/api/pdf/positions', positions);
    }
    getDefaultLayoutSettings() {
        return {
            margin: 20, primaryColor: '#667eea', companyNameSize: 18,
            titleSize: 28, sectionTitleSize: 14, textSize: 11, smallTextSize: 9
        };
    }

    // ─── Upload ───
    async uploadFile(file, key) {
        const form = new FormData();
        form.append('file', file);
        if (key) form.append('key', key);
        const h = {};
        const t = this.getToken();
        if (t) h['Authorization'] = `Bearer ${t}`;
        const resp = await fetch(`${this.baseUrl}/api/upload`, { method: 'POST', headers: h, body: form });
        return resp.json();
    }
}

const db = new Database();
