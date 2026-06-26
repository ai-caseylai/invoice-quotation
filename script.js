// Supabase 設定
const SUPABASE_URL = 'https://fcydqlusmtpgmwvfnopm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeWRxbHVzbXRwZ213dmZub3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjA0NDUsImV4cCI6MjA4MDkzNjQ0NX0.bk605O6ELQ3jIkzMXhByCLBrISxrtWB6BnTpsFNBIZ8';

let currentTab = 'invoice';

// 切換標籤頁
function switchTab(tab) {
    currentTab = tab;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // 更新標籤文字
    const label = document.getElementById('docNumberLabel');
    const input = document.getElementById('docNumber');
    if (tab === 'invoice') {
        label.textContent = '發票編號';
        input.value = 'INV-2024-001';
    } else {
        label.textContent = '報價單編號';
        input.value = 'QUO-2024-001';
    }
}

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

// Cloudflare Worker PDF API
const PDF_API_URL = 'https://invoice-pdf-api.ai-caseylai.workers.dev/api/pdf/generate';

// 生成PDF — 優先使用 Cloudflare Worker API，失敗時降級為客戶端 jsPDF
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    try {
        // 先嘗試從 Supabase Storage 載入字體
        console.log('正在從 Supabase 載入字體檔案...');
        let response = await fetch(`${SUPABASE_URL}/storage/v1/object/public/fonts/NotoSansSC-Regular.ttf`);
        
        // 如果 Supabase 失敗，降級使用本地字體
        if (!response.ok) {
            console.log('Supabase 載入失敗，改用本地字體檔案...');
            response = await fetch('./NotoSansSC-Regular.ttf');
            
            if (!response.ok) {
                throw new Error('字體檔案載入失敗');
            }
        } else {
            console.log('✅ 成功從 Supabase 載入字體！');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // 轉換為Base64
        console.log('正在轉換字體檔案...');
        const fontBase64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        console.log('正在新增字體到PDF...');
        // 新增中文字體
        doc.addFileToVFS("NotoSansSC.ttf", fontBase64);
        doc.addFont("NotoSansSC.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");
        
        console.log('✅ 字體載入成功！');
    } catch (error) {
        console.error('❌ 字體載入失敗:', error);
        alert('字體載入失敗，請確保：\n1. 使用 http://localhost:8000 存取\n2. 或字體已上傳到 Supabase Storage\n3. 使用本地伺服器執行');
        return;
    }
    
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
    
    // 获取项目明细
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
    
    // 计算总金额
    let totalAmount = 0;
    items.forEach(item => {
        totalAmount += item.quantity * item.price;
    });

    // 嘗試使用 Cloudflare Worker API 生成專業 PDF
    try {
        const workerPayload = {
            type: currentTab,
            invoice_no: docNumber,
            date: new Date().toLocaleDateString('zh-HK'),
            customer: customerName,
            attention: customerContact,
            tel: customerPhone,
            email: companyEmail,
            address: '',
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
            console.log('✅ PDF generated via Cloudflare Worker');
            return;
        }
        console.warn('Worker API returned error, falling back to jsPDF');
    } catch (e) {
        console.warn('Worker API unavailable, falling back to jsPDF:', e.message);
    }

    // 客戶端 jsPDF 降級方案
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
