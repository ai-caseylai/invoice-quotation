// =====================================================
// 主應用程式 - 核心邏輯和路由
// =====================================================

class BookkeepingApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.company = null;
        this.init();
    }

    async init() {
        console.log('🚀 初始化記帳系統...');
        
        // 載入公司資訊
        await this.loadCompany();
        
        // 初始化導航
        this.initNavigation();
        
        // 載入首頁
        this.loadPage('dashboard');
        
        console.log('✅ 系統初始化完成！');
    }

    async loadCompany() {
        try {
            this.company = await db.getCompany();
            if (!this.company) {
                // 如果沒有公司資料，使用預設值
                this.company = {
                    name: '示例科技有限公司',
                    phone: '2123-4567',
                    address: '香港中環皇后大道中123號',
                    email: 'contact@example.com'
                };
            }
            CONFIG.APP.COMPANY_ID = this.company.id;
        } catch (error) {
            console.error('載入公司資訊失敗:', error);
        }
    }

    initNavigation() {
        const navItems = document.querySelectorAll('[data-page]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.loadPage(page);
            });
        });
    }

    loadPage(pageName) {
        this.currentPage = pageName;
        
        // 更新導航狀態
        document.querySelectorAll('[data-page]').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });

        // 載入對應頁面
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            console.error('找不到主要內容區域');
            return;
        }

        switch (pageName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'documents':
                this.loadDocuments();
                break;
            case 'finance':
                this.loadFinance();
                break;
            case 'contacts':
                this.loadContacts();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'settings':
                this.loadSettings();
                break;
            default:
                this.loadDashboard();
        }
    }

    // ==================== 頁面載入方法 ====================

    async loadDashboard() {
        console.log('載入儀表板...');
        const mainContent = document.getElementById('mainContent');
        
        try {
            // 載入統計資料
            const [receivables, payables, monthlySummary, bankBalance] = await Promise.all([
                db.getReceivablesSummary(),
                db.getPayablesSummary(),
                db.getMonthlySummary(6),
                db.getBankBalanceSummary()
            ]);

            mainContent.innerHTML = `
                <div class="dashboard">
                    <h1>📊 儀表板</h1>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">💰</div>
                            <div class="stat-info">
                                <div class="stat-label">應收帳款</div>
                                <div class="stat-value">HK$${this.formatNumber(this.sumOutstanding(receivables))}</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">💸</div>
                            <div class="stat-info">
                                <div class="stat-label">應付帳款</div>
                                <div class="stat-value">HK$${this.formatNumber(this.sumOutstanding(payables))}</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">🏦</div>
                            <div class="stat-info">
                                <div class="stat-label">銀行餘額</div>
                                <div class="stat-value">HK$${this.formatNumber(this.sumBankBalance(bankBalance))}</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">📈</div>
                            <div class="stat-info">
                                <div class="stat-label">本月收入</div>
                                <div class="stat-value">HK$${this.formatNumber(this.getMonthlyIncome(monthlySummary))}</div>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-actions">
                        <h2>快捷操作</h2>
                        <div class="action-buttons">
                            <button class="btn-action" onclick="app.createNewDocument('invoice')">
                                <span>📄</span>新增發票
                            </button>
                            <button class="btn-action" onclick="app.createNewDocument('quotation')">
                                <span>📝</span>新增報價單
                            </button>
                            <button class="btn-action" onclick="app.addTransaction('income')">
                                <span>💵</span>記錄收入
                            </button>
                            <button class="btn-action" onclick="app.addTransaction('expense')">
                                <span>💸</span>記錄支出
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('載入儀表板失敗:', error);
            mainContent.innerHTML = `
                <div class="error-message">
                    <h2>❌ 載入失敗</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    async loadDocuments() {
        console.log('載入單據管理...');
        await documentManager.render();
    }

    async loadFinance() {
        console.log('載入財務管理...');
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="finance-page">
                <h1>💰 財務管理</h1>
                <p>財務管理功能開發中...</p>
            </div>
        `;
    }

    async loadContacts() {
        console.log('載入聯絡人管理...');
        await contactManager.render();
    }

    async loadReports() {
        console.log('載入報表...');
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="reports-page">
                <h1>📊 報表</h1>
                <p>報表功能開發中...</p>
            </div>
        `;
    }

    async loadSettings() {
        console.log('載入設定...');
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="settings-page">
                <h1>⚙️ 設定</h1>
                <div class="settings-form">
                    <h2>公司資訊</h2>
                    <div class="form-group">
                        <label>公司名稱</label>
                        <input type="text" id="settingCompanyName" value="${this.company?.name || ''}">
                    </div>
                    <div class="form-group">
                        <label>聯絡電話</label>
                        <input type="text" id="settingCompanyPhone" value="${this.company?.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>公司地址</label>
                        <input type="text" id="settingCompanyAddress" value="${this.company?.address || ''}">
                    </div>
                    <div class="form-group">
                        <label>電子郵箱</label>
                        <input type="email" id="settingCompanyEmail" value="${this.company?.email || ''}">
                    </div>
                    <button class="btn-primary" onclick="app.saveSettings()">
                        💾 儲存設定
                    </button>
                </div>
            </div>
        `;
    }

    // ==================== 工具方法 ====================

    formatNumber(num) {
        return (num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    sumOutstanding(items) {
        return items.reduce((sum, item) => sum + parseFloat(item.outstanding_amount || 0), 0);
    }

    sumBankBalance(items) {
        return items.reduce((sum, item) => sum + parseFloat(item.current_balance || 0), 0);
    }

    getMonthlyIncome(monthlySummary) {
        const currentMonth = monthlySummary.find(m => m.type === 'income');
        return parseFloat(currentMonth?.total_amount || 0);
    }

    async saveSettings() {
        const data = {
            name: document.getElementById('settingCompanyName').value,
            phone: document.getElementById('settingCompanyPhone').value,
            address: document.getElementById('settingCompanyAddress').value,
            email: document.getElementById('settingCompanyEmail').value
        };

        try {
            await db.updateCompany(data);
            this.company = { ...this.company, ...data };
            alert('✅ 設定已儲存！');
        } catch (error) {
            alert('❌ 儲存失敗：' + error.message);
        }
    }

    createNewDocument(type) {
        // 暫時跳轉回舊版發票生成器
        alert(`創建 ${type} 功能開發中...`);
        // TODO: 實作新版單據創建表單
    }

    addTransaction(type) {
        alert(`新增${type === 'income' ? '收入' : '支出'}功能開發中...`);
        // TODO: 實作交易記錄表單
    }
}

// 初始化應用程式
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BookkeepingApp();
});
