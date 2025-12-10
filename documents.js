// =====================================================
// 單據管理模塊
// =====================================================

class DocumentManager {
    constructor() {
        this.currentView = 'list'; // 'list', 'create', 'edit', 'view'
        this.currentFilter = 'all'; // 'all', 'invoice', 'quotation', 'receipt', 'purchase_order'
        this.currentDocument = null;
    }

    // ==================== 主要渲染方法 ====================

    async render() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="documents-manager">
                <div class="documents-header">
                    <div class="header-left">
                        <h1>📄 單據管理</h1>
                        <div class="filter-tabs">
                            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" 
                                    onclick="documentManager.filterDocuments('all')">
                                全部
                            </button>
                            <button class="filter-tab ${this.currentFilter === 'invoice' ? 'active' : ''}" 
                                    onclick="documentManager.filterDocuments('invoice')">
                                發票
                            </button>
                            <button class="filter-tab ${this.currentFilter === 'quotation' ? 'active' : ''}" 
                                    onclick="documentManager.filterDocuments('quotation')">
                                報價單
                            </button>
                            <button class="filter-tab ${this.currentFilter === 'receipt' ? 'active' : ''}" 
                                    onclick="documentManager.filterDocuments('receipt')">
                                收據
                            </button>
                            <button class="filter-tab ${this.currentFilter === 'purchase_order' ? 'active' : ''}" 
                                    onclick="documentManager.filterDocuments('purchase_order')">
                                採購單
                            </button>
                        </div>
                    </div>
                    <div class="header-right">
                        <button class="btn-primary" onclick="documentManager.showCreateForm('invoice')">
                            ➕ 新增發票
                        </button>
                        <button class="btn-secondary" onclick="documentManager.showCreateForm('quotation')">
                            ➕ 新增報價單
                        </button>
                    </div>
                </div>

                <div id="documentsContent">
                    <div class="loading">
                        <div class="loader"></div>
                        <p>載入中...</p>
                    </div>
                </div>
            </div>
        `;

        // 載入單據列表
        await this.loadDocumentsList();
    }

    // ==================== 單據列表 ====================

    async loadDocumentsList() {
        const container = document.getElementById('documentsContent');
        
        try {
            // 從資料庫載入單據
            const type = this.currentFilter === 'all' ? null : this.currentFilter;
            const documents = await db.getDocuments(type);

            if (documents.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h2>尚無單據</h2>
                        <p>點擊上方按鈕新增您的第一個${this.getTypeName(this.currentFilter)}</p>
                    </div>
                `;
                return;
            }

            // 渲染單據列表
            container.innerHTML = `
                <div class="documents-table-container">
                    <table class="documents-table">
                        <thead>
                            <tr>
                                <th>類型</th>
                                <th>單據編號</th>
                                <th>客戶/供應商</th>
                                <th>日期</th>
                                <th>金額</th>
                                <th>狀態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${await this.renderDocumentRows(documents)}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('載入單據失敗:', error);
            container.innerHTML = `
                <div class="error-message">
                    <h2>❌ 載入失敗</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    async renderDocumentRows(documents) {
        const rows = await Promise.all(documents.map(async doc => {
            const customer = doc.customer_id ? await db.getCustomer(doc.customer_id) : null;
            const supplier = doc.supplier_id ? await db.getSupplier(doc.supplier_id) : null;
            const contactName = customer?.name || supplier?.name || '-';

            return `
                <tr>
                    <td><span class="doc-type-badge ${doc.type}">${this.getTypeIcon(doc.type)} ${this.getTypeName(doc.type)}</span></td>
                    <td><strong>${doc.doc_number}</strong></td>
                    <td>${contactName}</td>
                    <td>${this.formatDate(doc.date)}</td>
                    <td class="amount">HK$${this.formatNumber(doc.total)}</td>
                    <td><span class="status-badge ${doc.status}">${this.getStatusName(doc.status)}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="documentManager.viewDocument('${doc.id}')" title="查看">
                                👁️
                            </button>
                            <button class="btn-icon" onclick="documentManager.editDocument('${doc.id}')" title="編輯">
                                ✏️
                            </button>
                            <button class="btn-icon" onclick="documentManager.generatePDF('${doc.id}')" title="下載PDF">
                                📄
                            </button>
                            <button class="btn-icon danger" onclick="documentManager.deleteDocument('${doc.id}')" title="刪除">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }));

        return rows.join('');
    }

    // ==================== 創建表單 ====================

    async showCreateForm(type = 'invoice') {
        const container = document.getElementById('documentsContent');
        
        // 載入客戶和分類
        const customers = await db.getCustomers();
        const suppliers = await db.getSuppliers();

        // 檢查是否有聯絡人
        const needsCustomer = (type === 'invoice' || type === 'quotation' || type === 'receipt');
        const needsSupplier = (type === 'purchase_order');
        
        if (needsCustomer && customers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👤</div>
                    <h2>尚無客戶資料</h2>
                    <p>建立${this.getTypeName(type)}前，請先新增客戶資訊</p>
                    <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
                        <button class="btn-primary" onclick="app.navigate('contacts')">
                            👥 前往聯絡人管理
                        </button>
                        <button class="btn-secondary" onclick="documentManager.loadDocumentsList()">
                            ← 返回列表
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        if (needsSupplier && suppliers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏢</div>
                    <h2>尚無供應商資料</h2>
                    <p>建立採購單前，請先新增供應商資訊</p>
                    <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
                        <button class="btn-primary" onclick="app.navigate('contacts')">
                            👥 前往聯絡人管理
                        </button>
                        <button class="btn-secondary" onclick="documentManager.loadDocumentsList()">
                            ← 返回列表
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="document-form">
                <div class="form-header">
                    <h2>${this.getTypeIcon(type)} 新增${this.getTypeName(type)}</h2>
                    <button class="btn-secondary" onclick="documentManager.loadDocumentsList()">
                        ← 返回列表
                    </button>
                </div>

                <form id="documentForm" onsubmit="documentManager.saveDocument(event, '${type}')">
                    <div class="form-grid">
                        <div class="form-section">
                            <h3>基本資訊</h3>
                            
                            <div class="form-group">
                                <label>單據編號 *</label>
                                <input type="text" id="docNumber" value="${await this.generateDocNumber(type)}" required>
                            </div>

                            <div class="form-group">
                                <label>日期 *</label>
                                <input type="date" id="docDate" value="${this.getTodayDate()}" required>
                            </label>
                            </div>

                            ${type === 'invoice' || type === 'quotation' ? `
                                <div class="form-group">
                                    <label>到期日</label>
                                    <input type="date" id="docDueDate" value="${this.getDefaultDueDate()}">
                                </div>
                            ` : ''}

                            <div class="form-group">
                                <label>狀態 *</label>
                                <select id="docStatus" required>
                                    <option value="draft">草稿</option>
                                    <option value="sent">已發送</option>
                                    <option value="paid">已付款</option>
                                    <option value="overdue">逾期</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h3>${type === 'purchase_order' ? '供應商' : '客戶'}資訊</h3>
                            
                            <div class="form-group">
                                <label>${type === 'purchase_order' ? '選擇供應商' : '選擇客戶'} *</label>
                                <select id="docContact" required>
                                    <option value="">-- 請選擇 --</option>
                                    ${type === 'purchase_order' 
                                        ? suppliers.map(s => `<option value="supplier:${s.id}">${s.name}</option>`).join('')
                                        : customers.map(c => `<option value="customer:${c.id}">${c.name}</option>`).join('')
                                    }
                                </select>
                                <a href="#" class="btn-link" onclick="event.preventDefault(); app.navigate('contacts');">
                                    ➕ 新增${type === 'purchase_order' ? '供應商' : '客戶'}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>項目明細</h3>
                        <div id="itemsContainer">
                            <div class="item-row">
                                <input type="text" placeholder="項目名稱" class="item-name" required>
                                <input type="number" placeholder="數量" class="item-quantity" value="1" step="0.01" required>
                                <input type="number" placeholder="單價" class="item-price" value="0" step="0.01" required>
                                <input type="text" class="item-amount" value="0.00" readonly>
                                <button type="button" class="btn-icon danger" onclick="documentManager.removeItem(this)">🗑️</button>
                            </div>
                        </div>
                        <button type="button" class="btn-secondary" onclick="documentManager.addItem()">
                            ➕ 新增項目
                        </button>

                        <div class="totals-section">
                            <div class="total-row">
                                <span>小計：</span>
                                <span id="subtotal">HK$0.00</span>
                            </div>
                            <div class="total-row">
                                <span>稅額：</span>
                                <input type="number" id="docTax" value="0" step="0.01" style="width: 150px;">
                            </div>
                            <div class="total-row grand-total">
                                <span>總計：</span>
                                <span id="grandTotal">HK$0.00</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>備註</h3>
                        <div class="form-group">
                            <textarea id="docNotes" rows="4" placeholder="請填寫備註資訊..."></textarea>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            💾 儲存${this.getTypeName(type)}
                        </button>
                        <button type="button" class="btn-secondary" onclick="documentManager.loadDocumentsList()">
                            取消
                        </button>
                    </div>
                </form>
            </div>
        `;

        // 綁定事件
        this.bindFormEvents();
    }

    bindFormEvents() {
        const container = document.getElementById('itemsContainer');
        container.addEventListener('input', () => this.calculateTotals());
        document.getElementById('docTax').addEventListener('input', () => this.calculateTotals());
    }

    addItem() {
        const container = document.getElementById('itemsContainer');
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `
            <input type="text" placeholder="項目名稱" class="item-name" required>
            <input type="number" placeholder="數量" class="item-quantity" value="1" step="0.01" required>
            <input type="number" placeholder="單價" class="item-price" value="0" step="0.01" required>
            <input type="text" class="item-amount" value="0.00" readonly>
            <button type="button" class="btn-icon danger" onclick="documentManager.removeItem(this)">🗑️</button>
        `;
        container.appendChild(itemRow);
    }

    removeItem(btn) {
        const container = document.getElementById('itemsContainer');
        if (container.children.length > 1) {
            btn.closest('.item-row').remove();
            this.calculateTotals();
        } else {
            alert('至少需要保留一個項目！');
        }
    }

    calculateTotals() {
        const rows = document.querySelectorAll('.item-row');
        let subtotal = 0;

        rows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const amount = quantity * price;
            
            row.querySelector('.item-amount').value = amount.toFixed(2);
            subtotal += amount;
        });

        const tax = parseFloat(document.getElementById('docTax').value) || 0;
        const total = subtotal + tax;

        document.getElementById('subtotal').textContent = `HK$${this.formatNumber(subtotal)}`;
        document.getElementById('grandTotal').textContent = `HK$${this.formatNumber(total)}`;
    }

    // ==================== 儲存單據 ====================

    async saveDocument(event, type) {
        event.preventDefault();

        try {
            // 收集表單資料
            const docNumber = document.getElementById('docNumber').value;
            const docDate = document.getElementById('docDate').value;
            const docDueDate = document.getElementById('docDueDate')?.value || null;
            const docStatus = document.getElementById('docStatus').value;
            const docContact = document.getElementById('docContact').value;
            const docNotes = document.getElementById('docNotes').value;
            const docTax = parseFloat(document.getElementById('docTax').value) || 0;

            // 解析聯絡人
            const [contactType, contactId] = docContact.split(':');

            // 收集項目
            const items = [];
            const rows = document.querySelectorAll('.item-row');
            rows.forEach(row => {
                items.push({
                    name: row.querySelector('.item-name').value,
                    quantity: parseFloat(row.querySelector('.item-quantity').value),
                    price: parseFloat(row.querySelector('.item-price').value)
                });
            });

            // 計算金額
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const total = subtotal + docTax;

            // 構建單據資料
            const documentData = {
                type: type,
                doc_number: docNumber,
                date: docDate,
                due_date: docDueDate,
                customer_id: contactType === 'customer' ? contactId : null,
                supplier_id: contactType === 'supplier' ? contactId : null,
                subtotal: subtotal,
                tax: docTax,
                total: total,
                status: docStatus,
                notes: docNotes
            };

            // 儲存到資料庫
            await db.createDocument(documentData, items);

            alert('✅ 單據已成功儲存！');
            await this.loadDocumentsList();

        } catch (error) {
            console.error('儲存單據失敗:', error);
            alert('❌ 儲存失敗：' + error.message);
        }
    }

    // ==================== 其他操作 ====================

    async viewDocument(id) {
        alert(`查看單據 ${id} 功能開發中...`);
        // TODO: 實作單據查看
    }

    async editDocument(id) {
        alert(`編輯單據 ${id} 功能開發中...`);
        // TODO: 實作單據編輯
    }

    async generatePDF(id) {
        try {
            // 載入單據完整資訊
            const doc = await db.getDocument(id);
            if (!doc) {
                alert('找不到單據資料');
                return;
            }

            // 載入關聯的客戶或供應商資訊
            let contact = null;
            if (doc.customer_id) {
                contact = await db.getCustomer(doc.customer_id);
            } else if (doc.supplier_id) {
                contact = await db.getSupplier(doc.supplier_id);
            }

            // 解析項目明細
            let items = [];
            try {
                items = typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items;
            } catch (e) {
                console.error('解析項目明細失敗:', e);
                items = [];
            }

            // 生成 PDF
            await this.createPDF(doc, contact, items);
            
        } catch (error) {
            console.error('生成PDF失敗:', error);
            alert('生成PDF失敗：' + error.message);
        }
    }

    async createPDF(doc, contact, items) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        try {
            // 載入中文字體（如果失敗會降級到內建字體）
            console.log('正在載入字體...');
            const fontLoaded = await this.loadFont(pdf);
            
            if (fontLoaded) {
                // 中文字體載入成功
                pdf.setFont("NotoSans", "normal");
            } else {
                // 降級到內建字體
                console.warn('⚠️ 使用內建字體，中文可能顯示為方塊');
                pdf.setFont("helvetica");
            }
            
            // 繪製 PDF 內容
            this.drawPDFContent(pdf, doc, contact, items);
            
            // 下載檔案
            const fileName = `${doc.doc_number}.pdf`;
            pdf.save(fileName);
            
            if (!fontLoaded) {
                alert('⚠️ PDF 已生成，但中文字體載入失敗\n\n建議：\n1. 檢查字體檔案是否存在\n2. 或上傳字體到 Supabase Storage');
            } else {
                console.log('✅ PDF 生成成功！');
            }
            
        } catch (error) {
            console.error('❌ PDF 生成失敗:', error);
            throw error;
        }
    }

    async loadFont(pdf) {
        try {
            // 嘗試從 Supabase 載入字體
            console.log('從 Supabase 載入字體...');
            let response = await fetch(`${window.supabaseConfig.url}/storage/v1/object/public/fonts/NotoSansSC-Regular.ttf`);
            
            // 如果失敗，嘗試本地字體
            if (!response.ok) {
                console.log('Supabase 失敗，嘗試本地字體...');
                response = await fetch('./NotoSansSC-Regular.ttf');
            }
            
            if (!response.ok) {
                console.warn('字體載入失敗，使用內建字體');
                // 使用 jsPDF 內建的基本字體，雖然不支援中文但至少能生成 PDF
                pdf.setFont("helvetica");
                return false;
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // 轉換為 Base64
            const fontBase64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            // 新增字體到 PDF
            pdf.addFileToVFS("NotoSansSC.ttf", fontBase64);
            pdf.addFont("NotoSansSC.ttf", "NotoSans", "normal");
            
            console.log('✅ 字體載入成功');
            return true;
            
        } catch (error) {
            console.error('❌ 字體載入失敗:', error);
            console.warn('使用內建字體繼續生成 PDF');
            // 降級到內建字體
            pdf.setFont("helvetica");
            return false;
        }
    }

    drawPDFContent(pdf, doc, contact, items) {
        const pageWidth = 210; // A4 寬度 mm
        const margin = 20;
        let y = 20;

        // ==================== 標題 ====================
        pdf.setFontSize(24);
        const title = this.getTypeName(doc.type);
        pdf.text(title, pageWidth / 2, y, { align: 'center' });
        
        y += 15;
        
        // ==================== 單據編號和日期 ====================
        pdf.setFontSize(10);
        
        // 左側：單據編號
        pdf.text(`單據編號: ${doc.doc_number}`, margin, y);
        
        // 右側：日期
        pdf.text(`日期: ${this.formatDate(doc.doc_date)}`, pageWidth - margin - 60, y);
        y += 7;
        
        // 到期日（如果有）
        if (doc.due_date) {
            pdf.text(`到期日: ${this.formatDate(doc.due_date)}`, pageWidth - margin - 60, y);
            y += 7;
        }
        
        y += 5;
        
        // ==================== 分隔線 ====================
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 10;
        
        // ==================== 客戶/供應商資訊 ====================
        pdf.setFontSize(12);
        pdf.text(doc.type === 'purchase_order' ? '供應商資訊' : '客戶資訊', margin, y);
        y += 7;
        
        pdf.setFontSize(10);
        
        if (contact) {
            pdf.text(`名稱: ${contact.name || ''}`, margin, y);
            y += 6;
            
            if (contact.phone) {
                pdf.text(`電話: ${contact.phone}`, margin, y);
                y += 6;
            }
            
            if (contact.email) {
                pdf.text(`電郵: ${contact.email}`, margin, y);
                y += 6;
            }
            
            if (contact.address) {
                pdf.text(`地址: ${contact.address}`, margin, y);
                y += 6;
            }
        } else {
            pdf.text('未提供聯絡資訊', margin, y);
            y += 6;
        }
        
        y += 5;
        
        // ==================== 項目明細表格 ====================
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 7;
        
        // 表頭
        pdf.setFontSize(10);
        
        const colX = {
            name: margin + 5,
            quantity: margin + 90,
            price: margin + 120,
            amount: margin + 150
        };
        
        pdf.text('項目名稱', colX.name, y);
        pdf.text('數量', colX.quantity, y);
        pdf.text('單價', colX.price, y);
        pdf.text('金額', colX.amount, y);
        
        y += 5;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 7;
        
        // 項目列表
        let subtotal = 0;
        
        items.forEach((item, index) => {
            const itemAmount = (item.quantity || 0) * (item.price || 0);
            subtotal += itemAmount;
            
            // 檢查是否需要換頁
            if (y > 250) {
                pdf.addPage();
                y = 20;
            }
            
            pdf.text(item.name || '', colX.name, y);
            pdf.text(String(item.quantity || 0), colX.quantity, y);
            pdf.text(`HK$${this.formatNumber(item.price || 0)}`, colX.price, y);
            pdf.text(`HK$${this.formatNumber(itemAmount)}`, colX.amount, y);
            
            y += 7;
        });
        
        y += 3;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 7;
        
        // ==================== 總計 ====================
        pdf.setFontSize(11);
        
        // 小計
        pdf.text('小計:', margin + 120, y);
        pdf.text(`HK$${this.formatNumber(subtotal)}`, colX.amount, y);
        y += 7;
        
        // 稅額（如果有）
        if (doc.tax && doc.tax > 0) {
            pdf.text('稅額:', margin + 120, y);
            pdf.text(`HK$${this.formatNumber(doc.tax)}`, colX.amount, y);
            y += 7;
        }
        
        // 總計
        pdf.setFontSize(12);
        const total = subtotal + (doc.tax || 0);
        pdf.text('總計:', margin + 120, y);
        pdf.text(`HK$${this.formatNumber(total)}`, colX.amount, y);
        
        y += 10;
        
        // ==================== 備註 ====================
        if (doc.notes) {
            y += 5;
            pdf.setFontSize(10);
            pdf.text('備註:', margin, y);
            y += 6;
            
            const noteLines = pdf.splitTextToSize(doc.notes, pageWidth - margin * 2);
            pdf.text(noteLines, margin, y);
        }
        
        // ==================== 頁尾 ====================
        pdf.setFontSize(8);
        pdf.text('本單據由記帳系統自動生成', pageWidth / 2, 285, { align: 'center' });
    }

    async deleteDocument(id) {
        if (!confirm('確定要刪除此單據嗎？此操作無法復原。')) {
            return;
        }

        try {
            await db.delete('documents', id);
            alert('✅ 單據已刪除');
            await this.loadDocumentsList();
        } catch (error) {
            alert('❌ 刪除失敗：' + error.message);
        }
    }

    filterDocuments(type) {
        this.currentFilter = type;
        this.render();
    }

    // ==================== 工具方法 ====================

    async generateDocNumber(type) {
        const prefix = CONFIG.DOC_NUMBER_FORMAT[type];
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // 查詢最新單據號碼
        const documents = await db.getDocuments(type, { limit: 1 });
        const lastNumber = documents.length > 0 ? parseInt(documents[0].doc_number.split('-').pop()) : 0;
        const newNumber = String(lastNumber + 1).padStart(3, '0');
        
        return `${prefix}-${year}${month}-${newNumber}`;
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    getDefaultDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-HK');
    }

    formatNumber(num) {
        return (num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    getTypeIcon(type) {
        const icons = {
            invoice: '📄',
            quotation: '📝',
            receipt: '🧾',
            purchase_order: '📦'
        };
        return icons[type] || '📄';
    }

    getTypeName(type) {
        const names = {
            all: '單據',
            invoice: '發票',
            quotation: '報價單',
            receipt: '收據',
            purchase_order: '採購單'
        };
        return names[type] || '單據';
    }

    getStatusName(status) {
        const names = {
            draft: '草稿',
            sent: '已發送',
            paid: '已付款',
            overdue: '逾期',
            cancelled: '已取消'
        };
        return names[status] || status;
    }
}

// 創建全域實例
const documentManager = new DocumentManager();
