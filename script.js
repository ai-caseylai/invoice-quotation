
// currentTab and switchTab are defined inline in index.html

// 從 D1 載入公司資訊
async function loadCompanyInfo() {
    try {
        const resp = await fetch('/api/company');
        if (resp.ok) {
            const data = await resp.json();
            if (data.name) document.getElementById('companyName').value = data.name;
            if (data.phone) document.getElementById('companyPhone').value = data.phone;
            if (data.address) document.getElementById('companyAddress').value = data.address;
            if (data.email) document.getElementById('companyEmail').value = data.email;
        }
    } catch(e) {}
}

// 儲存公司資訊到 D1
async function saveCompanyInfo() {
    try {
        await fetch('/api/save-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName: document.getElementById('companyName').value,
                companyPhone: document.getElementById('companyPhone').value,
                companyAddress: document.getElementById('companyAddress').value,
                companyEmail: document.getElementById('companyEmail').value,
            }),
        });
    } catch(e) {}
}

// 載入記錄列表
async function loadRecords(type) {
    const listId = type === 'invoice' ? 'invRecordsList' : 'quoRecordsList';
    const list = document.getElementById(listId);
    try {
        const resp = await fetch(`/api/documents?type=${type}`);
        const docs = await resp.json();
        if (!docs.length) { list.innerHTML = '<p style="color:#888">暫無記錄</p>'; return; }
        list.innerHTML = docs.map(d => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid #eee;border-radius:8px;margin-bottom:8px">
                <div>
                    <strong>${d.doc_number}</strong>
                    <span style="color:#888;margin-left:12px;font-size:13px">${d.date || ''}</span>
                    <span style="margin-left:12px;font-size:13px">HKD ${Number(d.total).toLocaleString('en-US')}</span>
                </div>
                <button onclick="downloadPDF('${d.doc_number}','${d.id}')" style="padding:6px 16px;background:#667eea;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">下載PDF</button>
            </div>
        `).join('');
    } catch(e) { list.innerHTML = '<p style="color:#e53e3e">載入失敗</p>'; }
}

// 儲存生成的單據到 D1
async function saveDocument(type, docNumber, date, customer, total, items, notes) {
    try {
        await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type, doc_number: docNumber, date, customer_id: null,
                subtotal: total, total, notes,
                items: items.map((it, i) => ({ description: it.name, quantity: it.quantity, unit_price: it.price, sort_order: i })),
            }),
        });
    } catch(e) { console.warn('Save document failed:', e); }
}

// 重新下載 PDF
async function downloadPDF(docNumber, docId) {
    try {
        const resp = await fetch(`/api/documents/${docId}`);
        const doc = await resp.json();
        const items = doc.items || [];
        const payload = {
            type: doc.type, invoice_no: doc.doc_number, date: doc.date,
            customer: doc.customer_id || '', attention: '', tel: '', email: '', address: '',
            items: items.map((it, i) => ({ no: i+1, description: it.description, qty: it.quantity, unit_price: it.unit_price })),
            subtotal: doc.subtotal, total: doc.total,
            payment_terms: doc.notes || '',
            signature_name: 'CASEY LAI',
            logo: 'logo2-removebg-preview.png', chop: 'musleabs eng chop.png', signature: 'signiture.png',
        };
        const pdfResp = await fetch('/api/pdf/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        if (pdfResp.ok) {
            const blob = await pdfResp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${docNumber}.pdf`;
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }
    } catch(e) { alert('下載失敗: ' + e.message); }
}

// switchTab is defined inline in index.html

// 載入常見問題
async function loadQA() {
    const el = document.getElementById('qaContent');
    try {
        const resp = await fetch('/QA-100.md');
        if (!resp.ok) throw new Error('Not found');
        const md = await resp.text();
        // Simple markdown to HTML conversion
        let html = md
            .replace(/### (.+)/g, '<h4>$1</h4>')
            .replace(/## (\d+\. .+)/g, '<h3 style="color:#667eea;margin-top:20px">$1</h3>')
            .replace(/# (.+)/g, '<h2>$1</h2>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- (.+)/gm, '<li>$1</li>')
            .replace(/```([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:10px;border-radius:6px;overflow-x:auto"><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:4px">$1</code>')
            .replace(/\n---\n/g, '<hr style="border:none;border-top:1px solid #eee;margin:16px 0">')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        html = '<p>' + html + '</p>';
        el.innerHTML = html;
    } catch(e) { el.innerHTML = '<p style="color:#e53e3e">載入失敗</p>'; }
}

// 頁面載入時讀取公司資訊
loadCompanyInfo();

// 新增項目
function addItem() {
    const container = document.getElementById('itemsContainer');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.innerHTML = `
        <input type="text" placeholder="項目名稱" value="">
        <input type="number" placeholder="數量" value="1">
        <input type="number" placeholder="單價" value="0">
        <button class="btn-remove" onclick="removeItem(this)">刪除</button>
    `;
    container.appendChild(itemRow);
}

// 刪除項目
function removeItem(btn) {
    const container = document.getElementById('itemsContainer');
    if (container.children.length > 1) {
        btn.parentElement.remove();
    } else {
        alert('至少需要保留一個項目！');
    }
}

// 重置表單
function resetForm() {
    if (confirm('確定要重置表單嗎？所有資料將被清空。')) {
        location.reload();
    }
}

// Cloudflare Worker PDF API (same domain via Worker route)
const PDF_API_URL = '/api/pdf/generate';

// 生成PDF — 優先使用 Cloudflare Worker API，失敗時降級為客戶端 jsPDF
async function generatePDF() {
    // 获取表单数据
    const companyName = document.getElementById('companyName').value;
    const companyPhone = document.getElementById('companyPhone').value;
    const companyAddress = document.getElementById('companyAddress').value;
    const companyEmail = document.getElementById('companyEmail').value;
    const customerName = document.getElementById('customerName').value;
    const customerContact = document.getElementById('customerContact').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const docNumber = document.getElementById('docNumber').value;
    const notes = document.getElementById('notes').value;

    const items = [];
    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        items.push({
            name: inputs[0].value,
            quantity: parseFloat(inputs[1].value) || 0,
            price: parseFloat(inputs[2].value) || 0
        });
    });

    let totalAmount = 0;
    items.forEach(item => { totalAmount += item.quantity * item.price; });

    // 優先使用 Cloudflare Worker API
    try {
        const workerPayload = {
            type: currentTab,
            invoice_no: docNumber,
            date: new Date().toLocaleDateString('zh-HK'),
            company_name: companyName,
            company_address: companyAddress,
            company_contact: `Tel ${companyPhone}  Email: ${companyEmail}`,
            customer: customerName,
            attention: customerContact,
            tel: customerPhone,
            email: companyEmail,
            address: customerPhone,
            items: items.map((item, i) => ({
                no: i + 1,
                description: item.name,
                qty: item.quantity,
                unit_price: item.price,
            })),
            subtotal: totalAmount,
            total: totalAmount,
            payment_terms: notes,
            signature_name: companyName,
            logo: 'logo2-removebg-preview.png',
            chop: 'musleabs eng chop.png',
            signature: 'signiture.png',
        };

        const resp = await fetch(PDF_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workerPayload),
        });

        if (resp.ok) {
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentTab === 'invoice' ? '發票' : '報價單'}_${docNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            // 儲存到 D1 記錄
            saveDocument(currentTab, docNumber, new Date().toLocaleDateString('zh-HK'), customerName, totalAmount, items, notes);
            console.log('✅ PDF generated via Cloudflare Worker');
            return;
        }
        console.warn('Worker API returned error, falling back to jsPDF');
    } catch (e) {
        console.warn('Worker API unavailable, falling back to jsPDF:', e.message);
    }

    // === 客戶端 jsPDF 降級方案 ===
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    try {
        let response = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-tc@latest/chinese-traditional-400-normal.woff2');
        if (!response.ok) throw new Error('字體載入失敗');
        const arrayBuffer = await response.arrayBuffer();
        const fontBase64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        doc.addFileToVFS("NotoSansSC.ttf", fontBase64);
        doc.addFont("NotoSansSC.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");
    } catch (e) {
        console.warn('Font load failed, using default font:', e.message);
    }

    // 標題
    const title = currentTab === 'invoice' ? '發 票' : '報 價 單';
    doc.setFontSize(22);
    doc.setFont("NotoSans", "normal");
    doc.text(title, 105, 20, { align: 'center' });
    
    // 公司資訊
    doc.setFontSize(10);
    doc.setFont("NotoSans", "normal");
    doc.text(`${companyName}`, 20, 35);
    doc.text(`電話: ${companyPhone}`, 20, 42);
    doc.text(`地址: ${companyAddress}`, 20, 49);
    doc.text(`郵箱: ${companyEmail}`, 20, 56);
    
    // 分隔線
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);
    
    // 客戶資訊和單據編號
    doc.setFontSize(11);
    doc.text(`客戶名稱: ${customerName}`, 20, 70);
    doc.text(`聯絡人: ${customerContact}`, 20, 77);
    doc.text(`聯絡電話: ${customerPhone}`, 20, 84);
    
    doc.text(`單據編號: ${docNumber}`, 130, 70);
    doc.text(`日期: ${new Date().toLocaleDateString('zh-HK')}`, 130, 77);
    
    // 表格標題
    let y = 95;
    doc.setFillColor(102, 126, 234);
    doc.rect(20, y, 170, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('項目名稱', 25, y + 5.5);
    doc.text('數量', 110, y + 5.5);
    doc.text('單價', 135, y + 5.5);
    doc.text('金額', 165, y + 5.5);
    
    // 表格内容
    doc.setTextColor(0, 0, 0);
    y += 8;
    
    items.forEach((item, index) => {
        const amount = item.quantity * item.price;
        
        // 交替行背景色
        if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(20, y, 170, 8, 'F');
        }
        
        doc.text(item.name, 25, y + 5.5);
        doc.text(item.quantity.toString(), 110, y + 5.5);
        doc.text(item.price.toFixed(2), 135, y + 5.5);
        doc.text(amount.toFixed(2), 165, y + 5.5);
        
        y += 8;
    });
    
    // 表格边框
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 95, 170, y - 95);
    
    // 垂直分隔线
    doc.line(105, 95, 105, y);
    doc.line(130, 95, 130, y);
    doc.line(160, 95, 160, y);
    
    // 總計
    y += 5;
    doc.setFontSize(12);
    doc.setFont("NotoSans", "normal");
    doc.text(`總計: HK$${totalAmount.toFixed(2)}`, 190, y, { align: 'right' });
    
    // 備註
    if (notes) {
        y += 10;
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(10);
        doc.text('備註:', 20, y);
        
        const noteLines = doc.splitTextToSize(notes, 170);
        doc.text(noteLines, 20, y + 6);
    }
    
    // 頁尾
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('感謝您的信任與支持！', 105, 280, { align: 'center' });
    
    // 儲存PDF
    const filename = currentTab === 'invoice' 
        ? `發票_${docNumber}_${new Date().getTime()}.pdf`
        : `報價單_${docNumber}_${new Date().getTime()}.pdf`;
    
    doc.save(filename);
}
