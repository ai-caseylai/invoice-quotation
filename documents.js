// =====================================================
// 單據管理模塊
// =====================================================

class DocumentManager {
    constructor() {
        this.currentView = 'list'; // 'list', 'create', 'edit', 'view'
        this.currentFilter = 'all'; // 'all', 'invoice', 'quotation', 'receipt', 'purchase_order'
        this.currentDocument = null;
        this.fontCache = null; // 字體緩存
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
            console.log('========================================');
            console.log('🚀 開始生成 PDF');
            console.log('單據 ID:', id);
            console.log('========================================');
            
            // 載入單據完整資訊
            console.log('📄 步驟 1: 載入單據資料...');
            const doc = await db.getDocument(id);
            if (!doc) {
                console.error('❌ 找不到單據資料');
                alert('找不到單據資料');
                return;
            }
            console.log('✅ 單據資料載入成功:');
            console.table(doc);

            // 載入關聯的客戶或供應商資訊
            console.log('👤 步驟 2: 載入聯絡人資訊...');
            let contact = null;
            if (doc.customer_id) {
                contact = await db.getCustomer(doc.customer_id);
                console.log('✅ 客戶資訊:', contact);
            } else if (doc.supplier_id) {
                contact = await db.getSupplier(doc.supplier_id);
                console.log('✅ 供應商資訊:', contact);
            } else {
                console.warn('⚠️ 無客戶或供應商 ID');
            }

            // 載入項目明細（從 document_items 表）
            console.log('📦 步驟 3: 載入項目明細...');
            let items = [];
            try {
                items = await db.getDocumentItems(id);
                console.log(`✅ 載入了 ${items.length} 個項目:`);
                console.table(items);
                
                // 確保 items 是陣列
                if (!Array.isArray(items)) {
                    console.warn('⚠️ 項目明細不是陣列格式，使用空陣列');
                    items = [];
                }
            } catch (e) {
                console.error('❌ 載入項目明細失敗:', e);
                items = [];
            }

            // 載入公司資訊（包含 Logo 和銀行資料）
            console.log('🏢 步驟 4: 載入公司資訊...');
            const company = await db.getCompany();
            console.log('✅ 公司資訊:', company);

            // 生成 PDF
            console.log('📝 步驟 5: 開始生成 PDF...');

            // 嘗試使用 Cloudflare Worker API
            try {
                const workerPayload = {
                    type: doc.type,
                    invoice_no: doc.doc_number,
                    date: doc.date || new Date().toISOString().split('T')[0],
                    customer: contact?.name || '',
                    attention: contact?.contact_person || '',
                    tel: contact?.phone || '',
                    email: contact?.email || '',
                    address: contact?.address || '',
                    items: (items || []).map((item, i) => ({
                        no: i + 1,
                        description: item.description || '',
                        qty: parseFloat(item.quantity) || 1,
                        unit_price: parseFloat(item.unit_price) || 0,
                    })),
                    subtotal: parseFloat(doc.subtotal) || 0,
                    total: parseFloat(doc.total) || 0,
                    payment_terms: doc.notes || '',
                    signature_name: company?.name || 'CASEY LAI',
                };

                const resp = await fetch('https://invoice-pdf-api.ai-caseylai.workers.dev/api/pdf/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workerPayload),
                });

                if (resp.ok) {
                    const blob = await resp.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${doc.doc_number || 'document'}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    console.log('✅ PDF generated via Cloudflare Worker');
                    return;
                }
                console.warn('Worker API returned non-OK, falling back to jsPDF');
            } catch (e) {
                console.warn('Worker API unavailable, falling back to jsPDF:', e.message);
            }

            console.log('傳遞的參數:');
            console.log('  - doc:', doc ? '✓' : '✗');
            console.log('  - contact:', contact ? '✓' : '✗');
            console.log('  - items:', items.length);
            console.log('  - company:', company ? '✓' : '✗');

            await this.createPDF(doc, contact, items, company);
            
            console.log('========================================');
            console.log('✅ PDF 生成流程結束');
            console.log('========================================');
            
        } catch (error) {
            console.error('========================================');
            console.error('❌ PDF 生成失敗');
            console.error('錯誤:', error);
            console.error('堆疊:', error.stack);
            console.error('========================================');
            alert('生成PDF失敗：' + error.message);
        }
    }

    async createPDF(doc, contact, items, company) {
        console.log('createPDF 被調用');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        try {
            // 載入中文字體（如果失敗會降級到內建字體）
            console.log('正在載入字體...');
            const fontLoaded = await this.loadFont(pdf);
            
            if (fontLoaded) {
                // 中文字體載入成功 - 只使用 normal 樣式
                pdf.setFont("NotoSans", "normal");
                console.log('✅ 使用中文字體');
            } else {
                // 降級到內建字體
                console.warn('⚠️ 使用內建字體，中文可能顯示為方塊');
                pdf.setFont("helvetica", "normal");
            }
            
            // 繪製 PDF 內容
            console.log('開始繪製 PDF 內容...');
            await this.drawPDFContent(pdf, doc, contact, items, company);
            
            // 下載檔案
            const fileName = `${doc.doc_number || 'invoice'}.pdf`;
            console.log('準備下載 PDF:', fileName);
            pdf.save(fileName);
            
            console.log('✅ PDF 生成成功！');
            
        } catch (error) {
            console.error('❌ PDF 生成失敗:', error);
            throw error;
        }
    }

    async loadFont(pdf) {
        try {
            // 如果已有緩存,直接使用
            if (this.fontCache) {
                console.log('✅ 使用緩存的字體');
                pdf.addFileToVFS("NotoSansSC.ttf", this.fontCache);
                pdf.addFont("NotoSansSC.ttf", "NotoSans", "normal");
                return true;
            }
            
            // 嘗試從 Supabase 載入字體
            console.log('📥 從 Supabase 載入字體...');
            const supabaseUrl = CONFIG.SUPABASE.URL;
            let response = await fetch(`${supabaseUrl}/storage/v1/object/public/fonts/NotoSansSC-Regular.ttf`);
            
            // 如果失敗，嘗試本地字體
            if (!response.ok) {
                console.log('⚠️ Supabase 失敗，嘗試本地字體...');
                response = await fetch('./NotoSansSC-Regular.ttf');
            }
            
            if (!response.ok) {
                console.warn('❌ 字體載入失敗，使用內建字體');
                return false;
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // 轉換為 Base64
            const fontBase64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            // 緩存字體
            this.fontCache = fontBase64;
            console.log('💾 字體已緩存 (大小:', (fontBase64.length / 1024 / 1024).toFixed(2), 'MB)');
            
            // 新增字體到 PDF
            pdf.addFileToVFS("NotoSansSC.ttf", fontBase64);
            pdf.addFont("NotoSansSC.ttf", "NotoSans", "normal");
            
            console.log('✅ 字體載入成功');
            return true;
            
        } catch (error) {
            console.error('❌ 字體載入失敗:', error);
            console.warn('⚠️ 使用內建字體繼續生成 PDF');
            return false;
        }
    }

    async drawPDFContent(pdf, doc, contact, items, company) {
        console.log('🆕🆕🆕 documents.js 版本: 2025-12-11-SUPABASE 🆕🆕🆕');
        
        // 從 Supabase 載入排版設定和位置
        console.log('📥 從 Supabase 載入 PDF 設定...');
        const settings = await this.loadLayoutSettings();
        const positions = await this.loadElementPositions();
        
        console.log('\n🔍 ==== drawPDFContent 收到的 positions ====');
        console.log('typeof positions:', typeof positions);
        console.log('positions 是否為空:', Object.keys(positions).length === 0);
        console.log('positions.logo:', positions.logo);
        console.log('positions 完整內容:');
        console.log(JSON.stringify(positions, null, 2));
        console.log('========================================\n');
        
        const pageWidth = 210; // A4 寬度 mm
        const pageHeight = 297; // A4 高度 mm
        const pdfWidth = 595.28; // PDF 標準寬度 (points) = 210mm
        const pdfHeight = 841.89; // PDF 標準高度 (points) = 297mm
        const margin = settings.margin;
        const primaryColor = this.hexToRgb(settings.primaryColor);
        
        // 改進的像素轉毫米轉換函數
        // jsPDF 使用 points 作為內部單位，1 point = 1/72 inch = 0.3527777778 mm
        // 但 jsPDF 的 addImage 和 text 方法接受 mm 作為參數
        // 預覽器使用 CSS pixels (px)
        // 轉換公式：mm = (px / 預覽器寬度) * A4實際寬度
        const pxToMm = (px) => {
            const mm = (px / pdfWidth) * pageWidth;
            return mm;
        };
        const pyToMm = (py) => {
            const mm = (py / pdfHeight) * pageHeight;
            return mm;
        };
        
        // 改進的字體大小轉換（預覽器 px → PDF pt）
        const fontSizePxToPt = (pxSize) => {
            // CSS px 到 PDF points 的轉換
            // 在 72 DPI 下，1px ≈ 0.75pt
            // 但我們需要根據預覽器縮放調整
            return pxSize * 0.75;
        };
        
        console.log('\n🔧 ==== 改進的 PDF 轉換參數 ====');
        console.log('預覽器尺寸 (px):', { width: pdfWidth, height: pdfHeight });
        console.log('PDF 頁面尺寸 (mm):', { width: pageWidth, height: pageHeight });
        console.log('X 軸轉換比例:', (pageWidth / pdfWidth).toFixed(8), 'mm/px');
        console.log('Y 軸轉換比例:', (pageHeight / pdfHeight).toFixed(8), 'mm/px');
        console.log('字體轉換係數:', 0.75, 'pt/px');
        console.log('頁面邊距 (mm):', margin);
        console.log('主題顏色 (RGB):', primaryColor);

        // 確保必要資料存在
        if (!doc) {
            throw new Error('單據資料不存在');
        }
        
        // 確保 items 是陣列
        if (!Array.isArray(items)) {
            items = [];
        }
        
        console.log('\n📊 ==== 載入的資料摘要 ====');
        console.log('單據:', { 
            id: doc.id, 
            type: doc.type, 
            doc_number: doc.doc_number, 
            date: doc.date,
            tax: doc.tax,
            notes: doc.notes ? '有備註' : '無備註'
        });
        console.log('客戶:', contact ? { name: contact.name, address: contact.address } : '無客戶');
        console.log('項目數量:', items.length);
        console.log('公司:', company ? { 
            name: company.name, 
            hasLogo: !!company.logo_url,
            phone: company.phone,
            email: company.email
        } : '無公司');
        
        console.log('\n🎨 ==== 元件位置設定（原始）====');
        console.table(positions);
        
        // ==================== 底部對齊算法（在 px 空間中計算）====================
        console.log('\n🧮 ==== 應用底部對齊算法 ====');
        const separatorLineY = positions['separator-line']?.top || 140; // 藍線（黃線）的 Y 座標 (px)
        const alignBottomY = separatorLineY - 5; // 對齊基準線：藍線上方 5px
        
        console.log('📐 基準線設定 (px 空間):');
        console.log('  - 藍線（黃線）位置 (px):', separatorLineY);
        console.log('  - 底部對齊線 (px):', alignBottomY);
        
        // 🔧 動態計算公司地址塊的實際高度 (px 空間)
        // 讓地址的最後一行底部對齊到黃線
        console.log('\n🔍 ==== 計算公司地址塊實際高度 ====');
        let companyInfoActualHeight = 0;
        
        // 公司名稱：11pt 字體 ≈ 11 * 1.333 = 14.66px
        const companyNameHeight = 11 * 1.333;
        companyInfoActualHeight += companyNameHeight;
        console.log('  - 公司名稱高度 (px):', companyNameHeight.toFixed(2));
        
        // 名稱後間距：6px (轉換自 mm)
        const nameSpacing = 6 / pyToMm(1); // 反向轉換：mm → px
        companyInfoActualHeight += nameSpacing;
        console.log('  - 名稱後間距 (px):', nameSpacing.toFixed(2));
        
        // 電話：9pt 字體 ≈ 9 * 1.333 = 12px
        if (company?.phone) {
            const phoneHeight = 9 * 1.333;
            const phoneSpacing = 4 / pyToMm(1);
            companyInfoActualHeight += phoneHeight + phoneSpacing;
            console.log('  - 電話行高度 + 間距 (px):', (phoneHeight + phoneSpacing).toFixed(2));
        }
        
        // 郵箱：9pt 字體 ≈ 12px
        if (company?.email) {
            const emailHeight = 9 * 1.333;
            const emailSpacing = 4 / pyToMm(1);
            companyInfoActualHeight += emailHeight + emailSpacing;
            console.log('  - 郵箱行高度 + 間距 (px):', (emailHeight + emailSpacing).toFixed(2));
        }
        
        // 地址：9pt 字體，多行，lineHeightFactor: 1.3
        if (company?.address) {
            // 創建臨時 PDF 來計算地址行數
            const tempPdf = new jspdf.jsPDF();
            tempPdf.setFont('NotoSansSC');
            tempPdf.setFontSize(9);
            const addressLines = tempPdf.splitTextToSize(company.address, 70);
            const addressLineCount = addressLines.length;
            const addressLineHeight = 9 * 1.333 * 1.3; // 9pt * 1.333 * lineHeightFactor
            const totalAddressHeight = addressLineHeight * addressLineCount;
            companyInfoActualHeight += totalAddressHeight;
            console.log('  - 地址行數:', addressLineCount);
            console.log('  - 每行高度 (px):', addressLineHeight.toFixed(2));
            console.log('  - 地址總高度 (px):', totalAddressHeight.toFixed(2));
        }
        
        console.log('  ✅ 公司地址塊實際總高度 (px):', companyInfoActualHeight.toFixed(2));
        
        // 更新 positions 中的高度和位置
        if (!positions['company-info']) {
            positions['company-info'] = { left: 555, width: 250 };
        }
        positions['company-info'].height = companyInfoActualHeight;
        
        // 🎯 讓地址的底部對齊到黃線下方三行的位置
        // 每行高度約為 9pt * 1.333 * 1.3 ≈ 15.6px
        const lineHeight = 9 * 1.333 * 1.3;
        const threeLineOffset = lineHeight * 3;
        positions['company-info'].top = (alignBottomY + threeLineOffset) - companyInfoActualHeight;
        console.log(`  ✅ 公司地址塊: top = ${positions['company-info'].top} (地址底部對齊黃線下方3行，偏移 ${threeLineOffset.toFixed(2)}px)`);
        
        // 自動計算頂部兩個元件的 top 值，使其底部對齊（Logo 和標題）
        if (positions.logo && positions.logo.height) {
            const originalTop = positions.logo.top;
            positions.logo.top = alignBottomY - positions.logo.height;
            const calculatedBottom = positions.logo.top + positions.logo.height;
            console.log(`  ✅ Logo: top ${originalTop} → ${positions.logo.top} (高度 ${positions.logo.height}, 底部 ${calculatedBottom})`);
        }
        
        if (positions.title && positions.title.height) {
            const originalTop = positions.title.top;
            positions.title.top = alignBottomY - positions.title.height;
            const calculatedBottom = positions.title.top + positions.title.height;
            console.log(`  ✅ 標題: top ${originalTop} → ${positions.title.top} (高度 ${positions.title.height}, 底部 ${calculatedBottom})`);
        }
        
        console.log('\n🎯 底部對齊驗證 (px 空間):');
        const logoBottom = positions.logo ? positions.logo.top + positions.logo.height : null;
        const titleBottom = positions.title ? positions.title.top + positions.title.height : null;
        const companyBottom = positions['company-info'] ? positions['company-info'].top + positions['company-info'].height : null;
        const threeLineOffset = 9 * 1.333 * 1.3 * 3;
        const addressTargetY = alignBottomY + threeLineOffset;
        
        console.log(`  - Logo 底部 (px): ${logoBottom}`);
        console.log(`  - 標題底部 (px): ${titleBottom}`);
        console.log(`  - 公司地址底部 (px): ${companyBottom}`);
        console.log(`  - 黃線位置 (px): ${alignBottomY}`);
        console.log(`  - 地址目標位置（黃線下方3行）(px): ${addressTargetY.toFixed(2)}`);
        console.log(`  - Logo & 標題對齊: ${logoBottom === titleBottom ? '✅ 完美對齊' : '❌ 未對齊'}`);
        console.log(`  - 地址底部對齊目標: ${Math.abs(companyBottom - addressTargetY) < 1 ? '✅ 完美對齊' : '❌ 未對齊 (差距: ' + (companyBottom - addressTargetY).toFixed(2) + 'px)'}`);
        
        console.log('\n🎯 底部對齊後的位置 (px 空間):');
        console.table({
            'Logo': positions.logo,
            '標題': positions.title,
            '公司地址（地址底部對齊黃線下方3行）': positions['company-info']
        });
        
        // 🔧 轉換到 mm 空間並顯示
        console.log('\n📏 轉換到 PDF mm 空間:');
        console.log(`  - Logo top: ${positions.logo.top}px → ${pyToMm(positions.logo.top).toFixed(2)}mm`);
        console.log(`  - 標題 top: ${positions.title.top}px → ${pyToMm(positions.title.top).toFixed(2)}mm`);
        console.log(`  - 公司地址 top: ${positions['company-info'].top}px → ${pyToMm(positions['company-info'].top).toFixed(2)}mm`);
        console.log(`  - 公司地址高度: ${positions['company-info'].height}px`);
        console.log(`  - 黃線 top: ${separatorLineY}px → ${pyToMm(separatorLineY).toFixed(2)}mm`);
        console.log(`  - 地址底部目標: ${addressTargetY.toFixed(2)}px → ${pyToMm(addressTargetY).toFixed(2)}mm`);
        console.log('========================================\n');
        
        console.log('\n========================================');
        console.log('🚀 開始繪製 PDF 各個區域...');
        console.log('========================================');
        
        // 定義最小邊距
        const minMargin = 10; // 最小左邊距 10mm
        
        // 輔助函數:確保座標不小於最小邊距
        const ensureMinMargin = (x, elementName) => {
            const originalX = x;
            if (x < minMargin) {
                console.warn(`⚠️ ${elementName} X 座標太小 (${x.toFixed(2)}mm), 調整為 ${minMargin}mm`);
                return minMargin;
            }
            console.log(`✅ ${elementName} X 座標: ${originalX.toFixed(2)}mm (符合最小邊距 ${minMargin}mm)`);
            return x;
        };

        // ==================== Logo ====================
        console.log('\n📷 ==== 處理 Logo ====');
        if (company?.logo_url) {
            try {
                const logoPos = positions.logo || { left: 40, top: 45, width: 150, height: 90 };  // 底部對齊: 135-90=45
                console.log('1️⃣ Logo 原始位置 (px):', logoPos);
                console.log('   - Left (px):', logoPos.left);
                console.log('   - Top (px):', logoPos.top);
                console.log('   - Width (px):', logoPos.width);
                console.log('   - Height (px):', logoPos.height);
                
                let logoX = pxToMm(logoPos.left);
                const logoY = pyToMm(logoPos.top);
                const logoW = pxToMm(logoPos.width);
                const logoH = pyToMm(logoPos.height);
                
                console.log('2️⃣ Logo 轉換前位置 (mm):', { x: logoX.toFixed(2), y: logoY.toFixed(2), w: logoW.toFixed(2), h: logoH.toFixed(2) });
                
                // 確保不溢出左邊界
                logoX = ensureMinMargin(logoX, 'Logo');
                
                console.log('3️⃣ Logo 最終位置 (mm):', { x: logoX.toFixed(2), y: logoY.toFixed(2), w: logoW.toFixed(2), h: logoH.toFixed(2) });
                console.log('4️⃣ Logo URL:', company.logo_url.substring(0, 50) + '...');
                
                pdf.addImage(company.logo_url, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
                console.log('✅ Logo 已成功添加到 PDF');
            } catch (e) {
                console.error('❌ Logo 添加失敗:', e);
                console.error('   錯誤堆疊:', e.stack);
            }
        } else {
            console.log('⚠️ 沒有 Logo URL，跳過 Logo 繪製');
        }
        
        // ==================== 公司資訊 ====================
        console.log('\n🏢 ==== 處理公司資訊 ====');
        // 🎯 使用底部對齊算法計算的位置，讓地址的最後一行底部對齊黃線下方3行
        const companyPos = positions['company-info'] || { left: 555, top: 40 };
        let companyX = pxToMm(companyPos.left);
        let companyY = pyToMm(companyPos.top);
        
        console.log('1️⃣ 公司資訊位置 (px):', companyPos, '(地址底部對齊黃線下方3行)');
        console.log('2️⃣ 公司資訊轉換位置 (mm):', { x: companyX.toFixed(2), y: companyY.toFixed(2) });
        console.log('   - 公司資訊高度 (px):', positions['company-info']?.height);
        console.log('   - 黃線位置 (px):', separatorLineY);
        
        // 設置統一的右對齊 X 座標（在右側區域使用右對齊更美觀）
        const rightAlignX = companyX;
        console.log('3️⃣ 公司資訊右對齊 X 座標 (mm):', rightAlignX.toFixed(2));
        
        pdf.setFontSize(11);
        pdf.setTextColor(51, 51, 51);
        
        if (company?.name) {
            console.log('   - 公司名稱:', company.name, '@ X:', rightAlignX.toFixed(2), 'Y:', companyY.toFixed(2));
            pdf.text(company.name, rightAlignX, companyY, { align: 'right', maxWidth: 70 });
        }
        
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        companyY += 6;
        
        if (company?.phone) {
            console.log('   - 電話:', company.phone, '@ X:', rightAlignX.toFixed(2), 'Y:', companyY.toFixed(2));
            pdf.text(`Tel: ${company.phone}`, rightAlignX, companyY, { align: 'right' });
            companyY += 4;
        }
        if (company?.email) {
            console.log('   - Email:', company.email, '@ X:', rightAlignX.toFixed(2), 'Y:', companyY.toFixed(2));
            pdf.text(`Email: ${company.email}`, rightAlignX, companyY, { align: 'right' });
            companyY += 4;
        }
        if (company?.address) {
            console.log('   - 地址:', company.address, '@ X:', rightAlignX.toFixed(2), 'Y:', companyY.toFixed(2));
            const addressLines = pdf.splitTextToSize(company.address, 70);
            pdf.text(addressLines, rightAlignX, companyY, { align: 'right', lineHeightFactor: 1.3 });
        }
        console.log('✅ 公司資訊已繪製（地址底部對齊黃線下方3行）');

        // ==================== 標題 ====================
        console.log('\n📝 ==== 處理標題 ====');
        const titlePos = positions.title || { left: 307.5, top: 110, width: 100, height: 25 };
        const titleX = pxToMm(titlePos.left);
        const titleY = pyToMm(titlePos.top);
        
        console.log('1️⃣ 標題原始位置 (px):', titlePos);
        console.log('2️⃣ 標題轉換位置 (mm):', { x: titleX.toFixed(2), y: titleY.toFixed(2) });
        console.log('3️⃣ 標題字體大小:', settings.titleSize);
        
        pdf.setFontSize(settings.titleSize);
        pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        const title = this.getTypeName(doc.type) || '報價單';
        console.log('4️⃣ 標題文字:', title);
        
        // 計算標題中心 X 座標
        const titleWidth = pxToMm(titlePos.width || 100);
        const titleCenterX = titleX + (titleWidth / 2);
        console.log('5️⃣ 標題中心 X 座標 (mm):', titleCenterX.toFixed(2));
        
        // 🎯 計算標題的 Y 座標（文本基線）
        // jsPDF 的 text() 方法，Y 座標是文本的基線位置
        // 對於大字體，基線大約在容器底部向上 20% 的位置
        const titleHeight = pyToMm(titlePos.height || 25);
        // 文本基線 = 容器頂部 + 容器高度 * 0.8（經驗值）
        const titleTextY = titleY + (titleHeight * 0.8);
        
        console.log('6️⃣ 標題容器高度 (mm):', titleHeight.toFixed(2));
        console.log('7️⃣ 標題文本基線 Y (mm):', titleTextY.toFixed(2), '(容器 top:', titleY.toFixed(2), ')');
        
        pdf.text(title, titleCenterX, titleTextY, { align: 'center' });
        console.log('✅ 標題已繪製');
        
        // ==================== 分隔線 ====================
        console.log('\n📏 ==== 處理分隔線 ====');
        // 分隔線在 Logo 下方 10px：40(logo top) + 90(logo height) + 10 = 140
        const separatorPos = positions['separator-line'] || { left: 40, top: 140, width: 515 };
        console.log('1️⃣ 分隔線原始位置 (px):', separatorPos);
        console.log('   - Left (px):', separatorPos.left);
        console.log('   - Top (px):', separatorPos.top);
        console.log('   - Width (px):', separatorPos.width);
        
        let separatorX = pxToMm(separatorPos.left);
        const separatorY = pyToMm(separatorPos.top);
        const separatorWidth = separatorPos.width ? pxToMm(separatorPos.width) : (pageWidth - 2 * minMargin);
        
        console.log('2️⃣ 分隔線轉換前位置 (mm):', { x: separatorX.toFixed(2), y: separatorY.toFixed(2), width: separatorWidth.toFixed(2) });
        
        separatorX = ensureMinMargin(separatorX, 'Separator Line');
        
        console.log('3️⃣ 分隔線最終位置 (mm):', { x: separatorX.toFixed(2), y: separatorY.toFixed(2), width: separatorWidth.toFixed(2) });
        console.log('4️⃣ 分隔線結束點 X (mm):', (separatorX + separatorWidth).toFixed(2));
        
        pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
        pdf.setLineWidth(0.5);
        pdf.line(separatorX, separatorY, separatorX + separatorWidth, separatorY);
        
        console.log('✅ 分隔線已繪製');
        
        pdf.setTextColor(0, 0, 0);
        
        // ==================== 發票信息 ====================
        console.log('\n📄 ==== 處理發票信息 ====');
        const invoicePos = positions['invoice-info'] || { left: 40, top: 148 };  // 更靠近藍線：橫線下方 8px
        console.log('1️⃣ 發票信息原始位置 (px):', invoicePos);
        
        let invoiceX = pxToMm(invoicePos.left);
        let invoiceY = pyToMm(invoicePos.top);
        
        console.log('2️⃣ 發票信息轉換前位置 (mm):', { x: invoiceX.toFixed(2), y: invoiceY.toFixed(2) });
        
        invoiceX = ensureMinMargin(invoiceX, 'Invoice Info');
        
        console.log('3️⃣ 發票信息最終位置 (mm):', { x: invoiceX.toFixed(2), y: invoiceY.toFixed(2) });
        
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        
        console.log('   - Invoice No:', doc.doc_number, '(位置 X:', (invoiceX + 25).toFixed(2), 'mm)');
        pdf.text('Invoice No:', invoiceX, invoiceY + 3);
        pdf.setTextColor(0, 0, 0);
        pdf.text(doc.doc_number, invoiceX + 25, invoiceY + 3);
        
        invoiceY += 6;
        const formattedDate = this.formatDate(doc.date);
        console.log('   - Date:', formattedDate, '(位置 X:', (invoiceX + 25).toFixed(2), 'mm)');
        pdf.setTextColor(100, 100, 100);
        pdf.text('Date:', invoiceX, invoiceY + 3);
        pdf.setTextColor(0, 0, 0);
        pdf.text(formattedDate, invoiceX + 25, invoiceY + 3);
        
        console.log('✅ 發票信息已繪製');
        
        // ==================== 客戶信息（藍線下方右側）====================
        console.log('\n👤 ==== 處理客戶信息（藍線下方右側）====');
        const customerPos = positions['customer-info'] || { left: 555, top: 148 };
        let customerX = pxToMm(customerPos.left);
        let customerY = pyToMm(customerPos.top);
        
        console.log('1️⃣ 客戶信息位置 (px):', customerPos);
        console.log('2️⃣ 客戶信息轉換位置 (mm):', { x: customerX.toFixed(2), y: customerY.toFixed(2) });
        
        pdf.setFontSize(10);
        
        if (contact) {
            console.log('   - 客戶名稱:', contact.name);
            pdf.setTextColor(100, 100, 100);
            pdf.text('Customer:', customerX - 25, customerY + 3, { align: 'right' });
            pdf.setTextColor(0, 0, 0);
            pdf.text(contact.name || '', customerX, customerY + 3, { align: 'right' });
            
            if (doc.due_date) {
                customerY += 6;
                const dueDate = this.formatDate(doc.due_date);
                console.log('   - Due Date:', dueDate);
                pdf.setTextColor(100, 100, 100);
                pdf.text('Due Date:', customerX - 25, customerY + 3, { align: 'right' });
                pdf.setTextColor(0, 0, 0);
                pdf.text(dueDate, customerX, customerY + 3, { align: 'right' });
            }
            console.log('✅ 客戶信息已繪製（藍線下方右側）');
        } else {
            console.log('⚠️ 沒有客戶信息');
        }
        
        // ==================== 客戶詳細信息 ====================
        console.log('\n📋 ==== 處理客戶詳細信息 ====');
        const customerDetailPos = positions['customer-detail'] || { left: 40, top: 220 };
        console.log('1️⃣ 客戶詳細信息原始位置 (px):', customerDetailPos);
        
        let detailX = pxToMm(customerDetailPos.left);
        let detailY = pyToMm(customerDetailPos.top);
        
        console.log('2️⃣ 客戶詳細信息轉換前位置 (mm):', { x: detailX.toFixed(2), y: detailY.toFixed(2) });
        
        detailX = ensureMinMargin(detailX, 'Customer Detail');
        
        console.log('3️⃣ 客戶詳細信息最終位置 (mm):', { x: detailX.toFixed(2), y: detailY.toFixed(2) });
        
        if (contact && contact.name) {
            console.log('   - 繪製左側藍色線條');
            pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
            pdf.setLineWidth(1);
            pdf.line(detailX, detailY, detailX, detailY + 20);
            
            console.log('   - 繪製 "Customer Information" 標籤');
            pdf.setFontSize(11);
            pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
            pdf.text('Customer Information', detailX + 3, detailY + 4);
            
            console.log('   - 客戶名稱:', contact.name);
            pdf.setFontSize(10);
            pdf.setTextColor(51, 51, 51);
            pdf.text(contact.name, detailX + 3, detailY + 10);
            
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            if (contact.address) {
                console.log('   - 客戶地址:', contact.address);
                pdf.text(`Address: ${contact.address}`, detailX + 3, detailY + 15);
            }
            console.log('✅ 客戶詳細信息已繪製');
        } else {
            console.log('⚠️ 沒有客戶詳細信息，跳過繪製');
        }
        
        pdf.setTextColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0);
        
        // ==================== 項目表格 ====================
        console.log('\n📊 ==== 處理項目表格 ====');
        const tablePos = positions['items-table'] || { left: 40, top: 320, width: 515 };
        console.log('1️⃣ 表格原始位置 (px):', tablePos);
        console.log('   - Left (px):', tablePos.left);
        console.log('   - Top (px):', tablePos.top);
        console.log('   - Width (px):', tablePos.width);
        
        let tableX = pxToMm(tablePos.left);
        let tableY = pyToMm(tablePos.top);
        const tableWidth = tablePos.width ? pxToMm(tablePos.width) : (pageWidth - pxToMm(80));
        
        console.log('2️⃣ 表格轉換前位置 (mm):', { x: tableX.toFixed(2), y: tableY.toFixed(2), width: tableWidth.toFixed(2) });
        
        tableX = ensureMinMargin(tableX, 'Items Table');
        
        console.log('3️⃣ 表格最終位置 (mm):', { x: tableX.toFixed(2), y: tableY.toFixed(2), width: tableWidth.toFixed(2) });
        console.log('4️⃣ 表格右邊界 (mm):', (tableX + tableWidth).toFixed(2));
        
        // 表頭
        console.log('5️⃣ 開始繪製表頭...');
        pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
        pdf.rect(tableX, tableY, tableWidth, 8, 'F');
        
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        
        const colX = {
            no: tableX + 3,
            desc: tableX + 12,
            qty: tableX + tableWidth - 80,     // 從 -65 改為 -80，增加間距
            price: tableX + tableWidth - 52,   // 從 -45 改為 -52，增加間距
            amount: tableX + tableWidth - 3
        };
        
        console.log('6️⃣ 表格欄位 X 座標 (mm):', {
            no: colX.no.toFixed(2),
            desc: colX.desc.toFixed(2),
            qty: colX.qty.toFixed(2),
            price: colX.price.toFixed(2),
            amount: colX.amount.toFixed(2)
        });
        
        pdf.text('No', colX.no, tableY + 5.5);
        pdf.text('Description', colX.desc, tableY + 5.5);
        pdf.text('Qty', colX.qty, tableY + 5.5, { align: 'right' });
        pdf.text('Unit Price', colX.price, tableY + 5.5, { align: 'right' });
        pdf.text('Subtotal', colX.amount, tableY + 5.5, { align: 'right' });
        
        tableY += 8;
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(0, 0, 0);
        
        console.log('✅ 表頭已繪製');
        
        // 項目列表
        console.log('7️⃣ 開始繪製項目列表，共', items.length, '個項目');
        let subtotal = 0;
        
        if (items && items.length > 0) {
            items.forEach((item, index) => {
                const unitPrice = item.unit_price || item.price || 0;
                const itemAmount = (item.quantity || 0) * unitPrice;
                subtotal += itemAmount;
                
                console.log(`   項目 ${index + 1}:`, {
                    description: item.description || item.name,
                    quantity: item.quantity,
                    unitPrice: unitPrice,
                    amount: itemAmount
                });
                
                // 背景色 (交替)
                if (index % 2 === 0) {
                    pdf.setFillColor(250, 250, 250);
                    pdf.rect(tableX, tableY, tableWidth, 8, 'F');
                }
                
                pdf.setFontSize(10);
                
                const itemName = item.description || item.name || '';
                pdf.text(String(index + 1), colX.no, tableY + 5.5);
                
                // 處理長描述
                const descLines = pdf.splitTextToSize(itemName, colX.qty - colX.desc - 5);
                pdf.text(descLines[0], colX.desc, tableY + 5.5);
                
                pdf.text(String(item.quantity || 0), colX.qty, tableY + 5.5, { align: 'right' });
                pdf.text(`HK$${this.formatNumber(unitPrice)}`, colX.price, tableY + 5.5, { align: 'right' });
                pdf.text(`HK$${this.formatNumber(itemAmount)}`, colX.amount, tableY + 5.5, { align: 'right' });
                
                tableY += 8;
            });
            console.log('✅ 所有項目已繪製，小計:', subtotal);
        } else {
            console.log('⚠️ 沒有項目，跳過項目列表繪製');
        }
        
        // ==================== 總計 ====================
        console.log('\n💰 ==== 處理總計區域 ====');
        const totalPos = positions.total || { left: 555, top: 420 };  // 右對齊: 595-40=555
        let totalX = pxToMm(totalPos.left);
        let totalY = pyToMm(totalPos.top);
        
        console.log('1️⃣ 總計原始位置 (px):', totalPos);
        console.log('2️⃣ 總計轉換位置 (mm):', { x: totalX.toFixed(2), y: totalY.toFixed(2) });
        
        const totalWidth = 60;
        console.log('3️⃣ 總計框寬度 (mm):', totalWidth);
        console.log('4️⃣ 總計框左邊界 (mm):', (totalX - totalWidth).toFixed(2));
        console.log('5️⃣ 總計框右邊界 (mm):', totalX.toFixed(2));
        
        pdf.setFillColor(248, 249, 250);
        pdf.roundedRect(totalX - totalWidth, totalY, totalWidth, 25, 2, 2, 'F');
        
        console.log('6️⃣ 小計金額:', subtotal);
        
        pdf.setFontSize(11);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Subtotal:', totalX - totalWidth + 3, totalY + 6);
        pdf.text(`HK$${this.formatNumber(subtotal)}`, totalX - 3, totalY + 6, { align: 'right' });
        console.log('   - Subtotal 已繪製: HK$' + this.formatNumber(subtotal));
        
        if (doc.tax && doc.tax > 0) {
            totalY += 6;
            pdf.text('Tax:', totalX - totalWidth + 3, totalY);
            pdf.text(`HK$${this.formatNumber(doc.tax)}`, totalX - 3, totalY, { align: 'right' });
            console.log('   - Tax 已繪製: HK$' + this.formatNumber(doc.tax));
        }
        
        totalY += 7;
        pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
        pdf.setLineWidth(0.5);
        pdf.line(totalX - totalWidth, totalY - 1, totalX, totalY - 1);
        console.log('   - 分隔線已繪製');
        
        const total = subtotal + (doc.tax || 0);
        console.log('7️⃣ 最終總計:', total);
        pdf.setFontSize(13);
        pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        pdf.text('Total:', totalX - totalWidth + 3, totalY + 5);
        pdf.text(`HK$${this.formatNumber(total)}`, totalX - 3, totalY + 5, { align: 'right' });
        
        console.log('✅ 總計區域已完成');
        
        pdf.setTextColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0);
        
        // ==================== 備註 ====================
        console.log('\n📝 ==== 處理備註區域 ====');
        if (doc.notes) {
            const notesPos = positions.notes || { left: 40, top: pdfHeight - 80 };
            console.log('1️⃣ 備註原始位置 (px):', notesPos);
            
            let notesX = pxToMm(notesPos.left);
            const notesY = pyToMm(notesPos.top);
            
            console.log('2️⃣ 備註轉換前位置 (mm):', { x: notesX.toFixed(2), y: notesY.toFixed(2) });
            
            notesX = ensureMinMargin(notesX, 'Notes');
            
            console.log('3️⃣ 備註最終位置 (mm):', { x: notesX.toFixed(2), y: notesY.toFixed(2) });
            console.log('4️⃣ 備註內容:', doc.notes);
            
            pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
            pdf.setLineWidth(1);
            pdf.line(notesX, notesY, notesX, notesY + 12);
            
            pdf.setFontSize(10);
            pdf.setTextColor(51, 51, 51);
            pdf.text('備註', notesX + 3, notesY + 4);
            
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            const noteLines = pdf.splitTextToSize(doc.notes, 80);
            pdf.text(noteLines, notesX + 3, notesY + 9);
            console.log('✅ 備註已繪製，共', noteLines.length, '行');
        } else {
            console.log('⚠️ 沒有備註內容，跳過備註繪製');
        }
        
        // ==================== 頁腳（銀行資料）====================
        console.log('\n🏦 ==== 處理頁腳（銀行資料）====');
        const footerY = pageHeight - 15;
        console.log('1️⃣ 頁腳 Y 座標 (mm):', footerY);
        
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        
        let footerText = '';
        if (company?.name) footerText += company.name;
        if (company?.bank_name) footerText += ` • Bank: ${company.bank_name}`;
        
        if (footerText) {
            console.log('2️⃣ 頁腳內容:', footerText);
            console.log('3️⃣ 頁腳 X 座標 (margin):', margin);
            pdf.text(footerText, margin, footerY);
            console.log('✅ 頁腳已繪製');
        } else {
            console.log('⚠️ 沒有頁腳內容');
        }
        
        console.log('\n========================================');
        console.log('🎉 PDF 內容繪製完成！');
        console.log('========================================\n');
    }
    
    // 載入元件位置（從 Supabase）
    async loadElementPositions() {
        try {
            console.log('\n🔍 ==== 載入元件位置 (從 Supabase) ====');
            const positions = await db.getPDFElementPositions();
            
            if (positions && Object.keys(positions).length > 0) {
                console.log('✅ 成功從 Supabase 載入', Object.keys(positions).length, '個元件');
                console.log('元件列表:', Object.keys(positions).join(', '));
                return positions;
            } else {
                console.warn('⚠️ Supabase 中沒有元件位置數據，將使用預設位置');
            }
        } catch (e) {
            console.error('❌ 從 Supabase 載入元件位置失敗:', e);
            console.error('錯誤堆疊:', e.stack);
        }
        console.log('返回空物件 {}');
        return {};
    }
    
    // 載入排版設定（從 Supabase）
    async loadLayoutSettings() {
        try {
            console.log('\n⚙️ ==== 載入排版設定 (從 Supabase) ====');
            const settings = await db.getPDFLayoutSettings();
            console.log('✅ 排版設定載入成功:', settings);
            return settings;
        } catch (e) {
            console.error('❌ 從 Supabase 載入排版設定失敗:', e);
            return db.getDefaultLayoutSettings();
        }
    }
    
    // 將 HEX 顏色轉換為 RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 102, g: 126, b: 234 };
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
window.documentManager = documentManager;
