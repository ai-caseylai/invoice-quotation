// ==================== 聯絡人管理系統 ====================

class ContactManager {
    constructor() {
        this.currentView = 'customers'; // 'customers' or 'suppliers'
        this.customers = [];
        this.suppliers = [];
        this.editingId = null;
    }

    // 渲染主頁面
    async render() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="contacts-manager">
                <!-- 頭部 -->
                <div class="contacts-header">
                    <div class="header-left">
                        <h1>👥 聯絡人管理</h1>
                        <div class="view-tabs">
                            <button class="view-tab active" data-view="customers">
                                👤 客戶 <span class="count" id="customersCount">0</span>
                            </button>
                            <button class="view-tab" data-view="suppliers">
                                🏢 供應商 <span class="count" id="suppliersCount">0</span>
                            </button>
                        </div>
                    </div>
                    <div class="header-right">
                        <button class="btn-primary" onclick="contactManager.showAddForm()">
                            ➕ 新增聯絡人
                        </button>
                    </div>
                </div>

                <!-- 搜尋欄 -->
                <div class="search-bar">
                    <input type="text" 
                           id="contactSearch" 
                           placeholder="🔍 搜尋名稱、電話或電郵..."
                           onkeyup="contactManager.search(this.value)">
                </div>

                <!-- 聯絡人列表 -->
                <div id="contactsContent">
                    <div class="loading">載入中...</div>
                </div>

                <!-- 新增/編輯表單（隱藏） -->
                <div id="contactFormModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="formTitle">新增客戶</h2>
                            <button class="btn-close" onclick="contactManager.closeForm()">✕</button>
                        </div>
                        <form id="contactForm" onsubmit="contactManager.saveContact(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>類型 *</label>
                                    <select id="contactType" required>
                                        <option value="customer">👤 客戶</option>
                                        <option value="supplier">🏢 供應商</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>名稱 *</label>
                                    <input type="text" id="contactName" required placeholder="公司或個人名稱">
                                </div>

                                <div class="form-group">
                                    <label>電話</label>
                                    <input type="tel" id="contactPhone" placeholder="1234-5678">
                                </div>

                                <div class="form-group">
                                    <label>電郵</label>
                                    <input type="email" id="contactEmail" placeholder="contact@example.com">
                                </div>

                                <div class="form-group full-width">
                                    <label>地址</label>
                                    <textarea id="contactAddress" rows="3" placeholder="完整地址"></textarea>
                                </div>

                                <div class="form-group full-width">
                                    <label>備註</label>
                                    <textarea id="contactNotes" rows="2" placeholder="其他備註資訊"></textarea>
                                </div>
                            </div>

                            <input type="hidden" id="editingId">

                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="contactManager.closeForm()">
                                    取消
                                </button>
                                <button type="submit" class="btn-primary">
                                    💾 儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // 設定事件監聽
        this.setupEventListeners();
        
        // 載入資料
        await this.loadContacts();
    }

    // 設定事件監聽器
    setupEventListeners() {
        const tabs = document.querySelectorAll('.view-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderContactsList();
            });
        });
    }

    // 載入聯絡人
    async loadContacts() {
        try {
            // 載入客戶
            this.customers = await db.getCustomers();
            document.getElementById('customersCount').textContent = this.customers.length;

            // 載入供應商
            this.suppliers = await db.getSuppliers();
            document.getElementById('suppliersCount').textContent = this.suppliers.length;

            // 渲染列表
            this.renderContactsList();
        } catch (error) {
            console.error('載入聯絡人失敗:', error);
            document.getElementById('contactsContent').innerHTML = `
                <div class="error-message">
                    ❌ 載入失敗：${error.message}
                </div>
            `;
        }
    }

    // 渲染聯絡人列表
    renderContactsList(filteredContacts = null) {
        const container = document.getElementById('contactsContent');
        const contacts = filteredContacts || (this.currentView === 'customers' ? this.customers : this.suppliers);

        if (contacts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${this.currentView === 'customers' ? '👤' : '🏢'}</div>
                    <h2>尚無${this.currentView === 'customers' ? '客戶' : '供應商'}資料</h2>
                    <p>點擊上方「新增聯絡人」按鈕開始添加</p>
                </div>
            `;
            return;
        }

        const contactsHTML = contacts.map(contact => this.renderContactCard(contact)).join('');
        
        container.innerHTML = `
            <div class="contacts-grid">
                ${contactsHTML}
            </div>
        `;
    }

    // 渲染單個聯絡人卡片
    renderContactCard(contact) {
        const isCustomer = this.currentView === 'customers';
        const icon = isCustomer ? '👤' : '🏢';
        
        return `
            <div class="contact-card">
                <div class="contact-header">
                    <div class="contact-icon">${icon}</div>
                    <div class="contact-name">
                        <h3>${contact.name}</h3>
                        <span class="contact-type">${isCustomer ? '客戶' : '供應商'}</span>
                    </div>
                </div>
                
                <div class="contact-info">
                    ${contact.phone ? `
                        <div class="info-row">
                            <span class="info-icon">📞</span>
                            <span>${contact.phone}</span>
                        </div>
                    ` : ''}
                    
                    ${contact.email ? `
                        <div class="info-row">
                            <span class="info-icon">📧</span>
                            <span>${contact.email}</span>
                        </div>
                    ` : ''}
                    
                    ${contact.address ? `
                        <div class="info-row">
                            <span class="info-icon">📍</span>
                            <span>${contact.address}</span>
                        </div>
                    ` : ''}
                    
                    ${contact.notes ? `
                        <div class="info-row notes">
                            <span class="info-icon">📝</span>
                            <span>${contact.notes}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="contact-stats">
                    <div class="stat">
                        <span class="stat-value">${contact.total_documents || 0}</span>
                        <span class="stat-label">單據</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">$${this.formatAmount(contact.total_amount || 0)}</span>
                        <span class="stat-label">總額</span>
                    </div>
                </div>

                <div class="contact-actions">
                    <button class="btn-icon" onclick="contactManager.editContact(${contact.id})" title="編輯">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="contactManager.viewHistory(${contact.id})" title="查看記錄">
                        📊
                    </button>
                    <button class="btn-icon danger" onclick="contactManager.deleteContact(${contact.id}, '${contact.name}')" title="刪除">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    // 搜尋功能
    search(query) {
        if (!query.trim()) {
            this.renderContactsList();
            return;
        }

        const contacts = this.currentView === 'customers' ? this.customers : this.suppliers;
        const filtered = contacts.filter(contact => 
            contact.name.toLowerCase().includes(query.toLowerCase()) ||
            (contact.phone && contact.phone.includes(query)) ||
            (contact.email && contact.email.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderContactsList(filtered);
    }

    // 顯示新增表單
    showAddForm() {
        this.editingId = null;
        document.getElementById('formTitle').textContent = `新增${this.currentView === 'customers' ? '客戶' : '供應商'}`;
        document.getElementById('contactType').value = this.currentView === 'customers' ? 'customer' : 'supplier';
        document.getElementById('contactForm').reset();
        document.getElementById('editingId').value = '';
        document.getElementById('contactFormModal').style.display = 'flex';
    }

    // 編輯聯絡人
    async editContact(id) {
        const contact = this.currentView === 'customers' 
            ? this.customers.find(c => c.id === id)
            : this.suppliers.find(s => s.id === id);

        if (!contact) return;

        this.editingId = id;
        document.getElementById('formTitle').textContent = `編輯${this.currentView === 'customers' ? '客戶' : '供應商'}`;
        document.getElementById('contactType').value = this.currentView === 'customers' ? 'customer' : 'supplier';
        document.getElementById('contactName').value = contact.name || '';
        document.getElementById('contactPhone').value = contact.phone || '';
        document.getElementById('contactEmail').value = contact.email || '';
        document.getElementById('contactAddress').value = contact.address || '';
        document.getElementById('contactNotes').value = contact.notes || '';
        document.getElementById('editingId').value = id;
        document.getElementById('contactFormModal').style.display = 'flex';
    }

    // 儲存聯絡人
    async saveContact(event) {
        event.preventDefault();

        const type = document.getElementById('contactType').value;
        const contactData = {
            name: document.getElementById('contactName').value,
            phone: document.getElementById('contactPhone').value || null,
            email: document.getElementById('contactEmail').value || null,
            address: document.getElementById('contactAddress').value || null,
            notes: document.getElementById('contactNotes').value || null
        };

        try {
            const editingId = document.getElementById('editingId').value;

            if (editingId) {
                // 更新
                if (type === 'customer') {
                    await db.updateCustomer(parseInt(editingId), contactData);
                } else {
                    await db.updateSupplier(parseInt(editingId), contactData);
                }
                console.log('聯絡人更新成功');
            } else {
                // 新增
                if (type === 'customer') {
                    await db.createCustomer(contactData);
                } else {
                    await db.createSupplier(contactData);
                }
                console.log('聯絡人新增成功');
            }

            this.closeForm();
            await this.loadContacts();
        } catch (error) {
            console.error('儲存聯絡人失敗:', error);
            alert('儲存失敗：' + error.message);
        }
    }

    // 刪除聯絡人
    async deleteContact(id, name) {
        if (!confirm(`確定要刪除「${name}」嗎？\n\n⚠️ 注意：關聯的單據不會被刪除，但會失去聯絡人資訊。`)) {
            return;
        }

        try {
            if (this.currentView === 'customers') {
                await db.deleteCustomer(id);
            } else {
                await db.deleteSupplier(id);
            }
            
            console.log('聯絡人刪除成功');
            await this.loadContacts();
        } catch (error) {
            console.error('刪除聯絡人失敗:', error);
            alert('刪除失敗：' + error.message);
        }
    }

    // 查看歷史記錄
    viewHistory(id) {
        alert('查看歷史記錄功能開發中...\n\n這會顯示該聯絡人的所有單據和交易記錄。');
    }

    // 關閉表單
    closeForm() {
        document.getElementById('contactFormModal').style.display = 'none';
        document.getElementById('contactForm').reset();
        this.editingId = null;
    }

    // 格式化金額
    formatAmount(amount) {
        return new Intl.NumberFormat('zh-HK').format(amount);
    }
}

// 全局實例
const contactManager = new ContactManager();
