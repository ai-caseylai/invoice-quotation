// 🔧 快速重置 PDF 元件位置
// 在瀏覽器 Console 中執行此腳本

const CORRECT_POSITIONS = {
    'logo': {
        left: 40,
        top: 40,
        width: 150,
        height: 75
    },
    'company-info': {
        left: 305,
        top: 40,
        width: 250,
        height: 100
    },
    'title': {
        left: 297.5,  // 居中
        top: 150,
        width: 200,
        height: 50
    },
    'separator-line': {
        left: 40,
        top: 190,
        width: 515,
        height: 2
    },
    'invoice-info': {
        left: 40,
        top: 210,
        width: 200,
        height: 60
    },
    'customer-info': {
        left: 335,
        top: 210,
        width: 220,
        height: 60
    },
    'customer-detail': {
        left: 40,
        top: 280,
        width: 250,
        height: 80
    },
    'items-table': {
        left: 40,
        top: 380,
        width: 515,
        height: 200
    },
    'total': {
        left: 305,
        top: 480,
        width: 250,
        height: 100
    },
    'notes': {
        left: 40,
        top: 762,
        width: 300,
        height: 60
    }
};

// 執行重置
(async function() {
    console.log('🔄 開始重置位置...');
    console.log('新位置:', CORRECT_POSITIONS);
    
    try {
        await db.savePDFElementPositions(CORRECT_POSITIONS);
        console.log('✅ 位置已成功保存到 Supabase！');
        console.log('請刷新頁面 (Cmd+Shift+R) 並重新生成 PDF');
    } catch (e) {
        console.error('❌ 保存失敗:', e);
    }
})();
