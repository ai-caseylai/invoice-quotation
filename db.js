// =====================================================
// 資料庫操作層 - Supabase API 封裝
// =====================================================

class Database {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE.URL;
        this.supabaseKey = CONFIG.SUPABASE.ANON_KEY;
        this.headers = {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    // ==================== 通用方法 ====================

    async query(table, options = {}) {
        try {
            let url = `${this.supabaseUrl}/rest/v1/${table}`;
            const params = new URLSearchParams();

            if (options.select) params.append('select', options.select);
            if (options.filter) {
                Object.keys(options.filter).forEach(key => {
                    params.append(key, `eq.${options.filter[key]}`);
                });
            }
            if (options.order) params.append('order', options.order);
            if (options.limit) params.append('limit', options.limit);

            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) throw new Error(`查詢失敗: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('查詢錯誤:', error);
            throw error;
        }
    }

    async insert(table, data) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error(`插入失敗: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('插入錯誤:', error);
            throw error;
        }
    }

    async update(table, id, data) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error(`更新失敗: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('更新錯誤:', error);
            throw error;
        }
    }

    async delete(table, id) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
                method: 'DELETE',
                headers: this.headers
            });

            if (!response.ok) throw new Error(`刪除失敗: ${response.statusText}`);
            return true;
        } catch (error) {
            console.error('刪除錯誤:', error);
            throw error;
        }
    }

    // ==================== 公司 ====================

    async getCompany() {
        const companies = await this.query('companies', { limit: 1 });
        return companies[0] || null;
    }

    async updateCompany(data) {
        const company = await this.getCompany();
        if (company) {
            return await this.update('companies', company.id, data);
        } else {
            return await this.insert('companies', data);
        }
    }

    // ==================== 客戶 ====================

    async getCustomers(options = {}) {
        return await this.query('customers', {
            select: '*',
            order: 'name.asc',
            ...options
        });
    }

    async getCustomer(id) {
        const customers = await this.query('customers', {
            filter: { id }
        });
        return customers[0] || null;
    }

    async createCustomer(data) {
        return await this.insert('customers', data);
    }

    async updateCustomer(id, data) {
        return await this.update('customers', id, data);
    }

    async deleteCustomer(id) {
        return await this.delete('customers', id);
    }

    // ==================== 供應商 ====================

    async getSuppliers(options = {}) {
        return await this.query('suppliers', {
            select: '*',
            order: 'name.asc',
            ...options
        });
    }

    async getSupplier(id) {
        const suppliers = await this.query('suppliers', {
            filter: { id }
        });
        return suppliers[0] || null;
    }

    async createSupplier(data) {
        return await this.insert('suppliers', data);
    }

    async updateSupplier(id, data) {
        return await this.update('suppliers', id, data);
    }

    async deleteSupplier(id) {
        return await this.delete('suppliers', id);
    }

    // ==================== 單據 ====================

    async getDocuments(type = null, options = {}) {
        const filter = type ? { type } : {};
        return await this.query('documents', {
            select: '*',
            filter: { ...filter, ...options.filter },
            order: 'date.desc',
            ...options
        });
    }

    async getDocument(id) {
        const documents = await this.query('documents', {
            filter: { id }
        });
        return documents[0] || null;
    }

    async createDocument(documentData, items) {
        // 創建單據
        const document = await this.insert('documents', documentData);
        const docId = document[0].id;

        // 創建單據項目
        const itemsWithDocId = items.map((item, index) => ({
            document_id: docId,
            description: item.name || item.description,
            quantity: item.quantity,
            unit_price: item.price || item.unit_price,
            amount: item.quantity * (item.price || item.unit_price),
            sort_order: index
        }));

        await this.insert('document_items', itemsWithDocId);

        return document[0];
    }

    async getDocumentItems(documentId) {
        return await this.query('document_items', {
            filter: { document_id: documentId },
            order: 'sort_order.asc'
        });
    }

    // ==================== 交易分類 ====================

    async getCategories(type = null) {
        const filter = type ? { type } : {};
        return await this.query('categories', {
            select: '*',
            filter,
            order: 'name.asc'
        });
    }

    async getCategory(id) {
        const categories = await this.query('categories', {
            filter: { id }
        });
        return categories[0] || null;
    }

    // ==================== 銀行帳戶 ====================

    async getBankAccounts(activeOnly = true) {
        const filter = activeOnly ? { is_active: true } : {};
        return await this.query('bank_accounts', {
            select: '*',
            filter,
            order: 'name.asc'
        });
    }

    async getBankAccount(id) {
        const accounts = await this.query('bank_accounts', {
            filter: { id }
        });
        return accounts[0] || null;
    }

    async createBankAccount(data) {
        return await this.insert('bank_accounts', data);
    }

    async updateBankAccount(id, data) {
        return await this.update('bank_accounts', id, data);
    }

    // ==================== 交易記錄 ====================

    async getTransactions(options = {}) {
        return await this.query('transactions', {
            select: '*',
            order: 'date.desc',
            ...options
        });
    }

    async getTransaction(id) {
        const transactions = await this.query('transactions', {
            filter: { id }
        });
        return transactions[0] || null;
    }

    async createTransaction(data) {
        return await this.insert('transactions', data);
    }

    async updateTransaction(id, data) {
        return await this.update('transactions', id, data);
    }

    async deleteTransaction(id) {
        return await this.delete('transactions', id);
    }

    // ==================== 報表視圖 ====================

    async getReceivablesSummary() {
        return await this.query('receivables_summary', {
            select: '*',
            order: 'outstanding_amount.desc'
        });
    }

    async getPayablesSummary() {
        return await this.query('payables_summary', {
            select: '*',
            order: 'outstanding_amount.desc'
        });
    }

    async getMonthlySummary(limit = 12) {
        return await this.query('monthly_summary', {
            select: '*',
            limit
        });
    }

    async getBankBalanceSummary() {
        return await this.query('bank_balance_summary', {
            select: '*'
        });
    }
}

// 創建全域資料庫實例
const db = new Database();
