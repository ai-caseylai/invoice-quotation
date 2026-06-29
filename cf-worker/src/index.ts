import { Hono } from 'hono';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { DB } from './db';
import { authMiddleware, loginHandler, tokenGenHandler } from './auth';
import { generatePdf } from './pdf-generator';
import { prewarmFont } from './font-loader';
import { handleMcpSSE, handleMcpMessage } from './mcp';

interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  QWEN_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

let warmed = false;
app.use('*', async (c, next) => { if (!warmed) { prewarmFont(); warmed = true; } await next(); });

// ─── Public routes ───
app.get('/api/health', (c) => c.json({ status: 'ok', version: '2.0.0' }));
app.get('/api/debug-auth', (c) => {
  const auth = c.req.header('Authorization') || '(none)';
  const token = auth.replace('Bearer ', '');
  const valid = token !== '(none)' && token.split('.').length === 2 && token.split('.')[0] === 'inv_7xK9mP2qR5vL8nB3wJ6fD4hT1cY0a';
  return c.json({ auth, token: token.substring(0, 30), valid, allHeaders: Object.fromEntries(c.req.raw.headers.entries()) });
});
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/token', tokenGenHandler);

// ─── MCP Server (public) ───
app.get('/api/mcp/sse', (c) => handleMcpSSE(c));
app.post('/api/mcp/messages', (c) => handleMcpMessage(c, c.env));
app.options('/api/mcp/messages', (c) => new Response(null, {
  headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
}));

// Skill info — public API documentation for AI agents
app.get('/api/skill', (c) => c.json({
  name: 'Invoice & Quotation PDF API',
  version: '2.0.0',
  description: 'Generate professional Chinese/English invoice PDFs with logo, chop, and signature',
  auth: 'Bearer token from POST /api/auth/token (no password needed)',
  endpoints: {
    'POST /api/pdf/generate': { desc: 'Generate invoice/quotation/receipt PDF', body: 'JSON, returns PDF binary' },
    'POST /api/chat': { desc: 'AI chat with form control capability', body: '{message, sessionId?, formState?}' },
    'GET /api/company': { desc: 'Get company info' },
    'POST /api/documents': { desc: 'Create document record' },
    'GET /api/documents?type=invoice': { desc: 'List documents by type' },
  },
  tokenGen: 'POST /api/auth/token  { "hours": 8760 }  // 1h to 8760h (1 year)',
}));

// CORS for PDF
app.options('/api/pdf/generate', (c) => new Response(null, {
  headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
}));

// ─── Auth middleware ───
const PUBLIC_PREFIXES = ['/api/auth/login', '/api/auth/token', '/api/skill', '/api/health', '/api/pdf/generate', '/api/debug-auth',
  '/mcp/',
  '/api/chat', '/api/company', '/api/save-form', '/api/documents'];
app.use('/api/*', async (c, next) => {
  if (PUBLIC_PREFIXES.some(p => c.req.path.startsWith(p))) return next();
  return authMiddleware(c, next);
});

function p(c: any, key: string): string { return c.req.param(key) as string; }

// ─── Company ───
app.get('/api/company', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getCompany() || {}); });
app.put('/api/company', async (c) => {
  const db = new DB(c.env.DB); const body: any = await c.req.json();
  let co: any = await db.getCompany();
  if (co) co = await db.updateCompany(co.id as string, body);
  else co = await db.createCompany(body);
  return c.json(co);
});

// ─── Customers ───
app.get('/api/customers', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getCustomers()); });
app.get('/api/customers/:id', async (c) => { const db = new DB(c.env.DB); const r = await db.getCustomer(p(c,'id')); return r ? c.json(r) : c.json({error:'Not found'},404); });
app.post('/api/customers', async (c) => { const db = new DB(c.env.DB); return c.json(await db.createCustomer(await c.req.json() as any)); });
app.put('/api/customers/:id', async (c) => { const db = new DB(c.env.DB); return c.json(await db.updateCustomer(p(c,'id'), await c.req.json() as any)); });
app.delete('/api/customers/:id', async (c) => { const db = new DB(c.env.DB); await db.deleteCustomer(p(c,'id')); return c.json({ok:true}); });

// ─── Suppliers ───
app.get('/api/suppliers', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getSuppliers()); });
app.get('/api/suppliers/:id', async (c) => { const db = new DB(c.env.DB); const r = await db.getSupplier(p(c,'id')); return r ? c.json(r) : c.json({error:'Not found'},404); });
app.post('/api/suppliers', async (c) => { const db = new DB(c.env.DB); return c.json(await db.createSupplier(await c.req.json() as any)); });
app.put('/api/suppliers/:id', async (c) => { const db = new DB(c.env.DB); return c.json(await db.updateSupplier(p(c,'id'), await c.req.json() as any)); });
app.delete('/api/suppliers/:id', async (c) => { const db = new DB(c.env.DB); await db.deleteSupplier(p(c,'id')); return c.json({ok:true}); });

// ─── Documents ───
app.get('/api/documents', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getDocuments(c.req.query('type') || undefined)); });
app.get('/api/documents/:id', async (c) => {
  const db = new DB(c.env.DB); const doc: any = await db.getDocument(p(c,'id'));
  if (!doc) return c.json({error:'Not found'},404);
  return c.json({...doc, items: await db.getDocumentItems(doc.id as string)});
});
app.post('/api/documents', async (c) => {
  const db = new DB(c.env.DB); const body: any = await c.req.json();
  const { items, ...docData } = body;
  return c.json(await db.createDocument(docData, items || []));
});
app.delete('/api/documents/:id', async (c) => { const db = new DB(c.env.DB); await db.deleteDocument(p(c,'id')); return c.json({ok:true}); });

// ─── Bank Accounts ───
app.get('/api/bank-accounts', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getBankAccounts()); });
app.post('/api/bank-accounts', async (c) => { const db = new DB(c.env.DB); return c.json(await db.createBankAccount(await c.req.json() as any)); });
app.put('/api/bank-accounts/:id', async (c) => { const db = new DB(c.env.DB); return c.json(await db.updateBankAccount(p(c,'id'), await c.req.json() as any)); });

// ─── Categories ───
app.get('/api/categories', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getCategories(c.req.query('type') || undefined)); });

// ─── Transactions ───
app.get('/api/transactions', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getTransactions({limit:500})); });
app.get('/api/transactions/:id', async (c) => { const db = new DB(c.env.DB); const r = await db.getTransaction(p(c,'id')); return r ? c.json(r) : c.json({error:'Not found'},404); });
app.post('/api/transactions', async (c) => { const db = new DB(c.env.DB); return c.json(await db.createTransaction(await c.req.json() as any)); });
app.put('/api/transactions/:id', async (c) => { const db = new DB(c.env.DB); return c.json(await db.updateTransaction(p(c,'id'), await c.req.json() as any)); });
app.delete('/api/transactions/:id', async (c) => { const db = new DB(c.env.DB); await db.deleteTransaction(p(c,'id')); return c.json({ok:true}); });

// ─── Reports ───
app.get('/api/reports/receivables', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getReceivablesSummary()); });
app.get('/api/reports/payables', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getPayablesSummary()); });
app.get('/api/reports/monthly', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getMonthlySummary()); });
app.get('/api/reports/bank-balance', async (c) => { const db = new DB(c.env.DB); return c.json(await db.getBankBalanceSummary()); });

// ─── PDF Settings ───
app.get('/api/pdf/settings', async (c) => { const db = new DB(c.env.DB); const s = await db.getPDFSettings(); return c.json((s as any)?.settings || {}); });
app.put('/api/pdf/settings', async (c) => { const db = new DB(c.env.DB); return c.json(await db.savePDFSettings(await c.req.json() as any)); });
app.get('/api/pdf/positions', async (c) => { const db = new DB(c.env.DB); const p = await db.getPDFElementPositions(); return c.json((p as any)?.positions || {}); });
app.put('/api/pdf/positions', async (c) => { const db = new DB(c.env.DB); return c.json(await db.savePDFElementPositions(await c.req.json() as any)); });

// ─── Upload (logo/signature/chop → R2) ───
app.post('/api/upload', async (c) => {
  const form = await c.req.formData();
  const entry = form.get('file');
  if (!entry || typeof entry === 'string') return c.json({error:'No file'}, 400);
  const file = entry as File;
  const key = (form.get('key') as string) || file.name;
  const buffer = await file.arrayBuffer();
  await c.env.ASSETS.put(key, buffer);
  return c.json({key, size: buffer.byteLength});
});

// ─── PDF Generation (public) ───
app.post('/api/pdf/generate', async (c) => {
  try {
    const body: any = await c.req.json();
    if (!body.items || !Array.isArray(body.items)) return c.json({error:'Missing items'}, 400);
    if (!body.type) {
      const no = body.invoice_no || '';
      if (no.startsWith('INV')) body.type = 'invoice';
      else if (no.startsWith('QUO')) body.type = 'quotation';
      else if (no.startsWith('REC')) body.type = 'receipt';
      else body.type = 'invoice';
    }
    const pdfBytes = await generatePdf(body, c.env.ASSETS);
    const url = new URL(c.req.url);
    if (url.searchParams.get('format') === 'base64') {
      const chunkSize = 0x8000; let b64 = '';
      const bytes = new Uint8Array(pdfBytes);
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        b64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      b64 = btoa(b64);
      return c.json({pdf: b64, filename: `${body.invoice_no || 'document'}.pdf`});
    }
    return new Response(pdfBytes, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${body.invoice_no || 'document'}.pdf"`, 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) { console.error('PDF error:', err); return c.json({error:err.message||'Internal error'}, 500); }
});

app.options('/api/*', (c) => new Response(null, {
  headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
}));

// ─── Save form data to DB ───
app.post('/api/save-form', async (c) => {
  const db = new DB(c.env.DB);
  const body: any = await c.req.json();
  let co: any = await db.getCompany();
  const data = {
    name: body.companyName || co?.name || '',
    phone: body.companyPhone || co?.phone || '',
    address: body.companyAddress || co?.address || '',
    email: body.companyEmail || co?.email || '',
  };
  if (co) await db.updateCompany(co.id as string, data);
  else await db.createCompany(data);
  return c.json({ ok: true });
});

// ─── Chat (Qwen3 via 阿里雲百煉) ───
app.post('/api/chat', async (c) => {
  const apiKey = c.env.QWEN_API_KEY;
  if (!apiKey) return c.json({ error: 'QWEN_API_KEY not configured' }, 500);

  const { message, sessionId, formState } = await c.req.json().catch(() => ({}));
  if (!message) return c.json({ error: 'Missing message' }, 400);

  const db = new DB(c.env.DB);
  let sid = sessionId;

  // Create or load session
  if (!sid) {
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO chat_sessions (id, title) VALUES (?, ?)').bind(id, message.slice(0, 30)).run();
    sid = id;
  }

  // Save user message
  await c.env.DB.prepare('INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), sid, 'user', message).run();

  // Load recent history
  const history = await c.env.DB.prepare('SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 10').bind(sid).all();
  const msgs = history.results.reverse().map((r: any) => ({ role: r.role, content: r.content }));

  // Build system prompt with form context
  const fields = formState || {};
  const sysPrompt = `你是「發票 & 報價單生成器」的 AI 助手，運行於 invoice.techforliving.net。你的核心功能：

## 你可以做的事
- 填寫/修改公司資訊：companyName、companyPhone、companyAddress、companyEmail（公司資訊會自動儲存到雲端資料庫）
- 填寫/修改客戶資訊：customerName、customerContact、customerPhone
- 管理項目明細：新增、修改、刪除 items（每項含 name、quantity、price）
- 設定發票編號 docNumber 和備註 notes
- 生成專業 PDF 發票/報價單（點擊「生成PDF」按鈕，支援公司 Logo、簽名、蓋章）
- PDF 採用 A4 紙張，支援繁體中文，嵌入 Noto Sans TC 字型
- 所有生成的發票會自動儲存到雲端記錄（可於「發票記錄」「報價記錄」分頁查看並重新下載）
- 支援發票和報價單兩種模式（點擊分頁切換）
- 有密碼保護（admin888）
- 公司資料會儲存在雲端 D1 資料庫，跨裝置同步

## 你不能做的事
- 不能直接發送電郵、不能設定自動遞增編號、不能批量生成
- 沒有多用戶權限系統、沒有深色模式、沒有快捷鍵
- 不能匯出 CSV

## 如何修改欄位
當你確認要修改表單時，請用以下 JSON 格式回覆：
\`\`\`action
{"setFields": {"companyName": "新值", "customerName": "新值", "docNumber": "INV26-0001", "notes": "備註內容"}}
\`\`\`

對於 items 修改，使用 setItems 欄位，值為完整的新 items 陣列：
\`\`\`action
{"setItems": [{"name": "網站設計", "quantity": 1, "price": 50000}]}
\`\`\`

當前表單狀態：${JSON.stringify(fields, null, 2)}

請用繁體中文回答。回答要簡潔有用。即使你要輸出 action JSON 來修改欄位，也必須同時用一句話說明你做了什麼修改。`;

  try {
    const resp = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [{ role: 'system', content: sysPrompt }, ...msgs.slice(-9), { role: 'user', content: message }],
        max_tokens: 2000,
      }),
    });

    const data: any = await resp.json();
    if (!resp.ok) throw new Error(data.message || data.error?.message || 'API error');

    const reply = data.choices?.[0]?.message?.content || '';
    await c.env.DB.prepare('INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), sid, 'assistant', reply).run();

    // Extract action JSON from reply
    let action = null;
    const m = reply.match(/```action\s*\n([\s\S]*?)\n```/);
    if (m) {
      try { action = JSON.parse(m[1]); } catch {}
    }

    return c.json({ reply, sessionId: sid, action });
  } catch (err: any) {
    return c.json({ error: err.message || 'Chat error' }, 500);
  }
});

app.get('/api/chat/sessions', async (c) => {
  const r = await c.env.DB.prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT 20').all();
  return c.json(r.results);
});

app.get('/api/chat/sessions/:id', async (c) => {
  const r = await c.env.DB.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC').bind(c.req.param('id')).all();
  return c.json(r.results);
});

app.all('*', (c) => c.json({error:'Not found'}, 404));

export default app;
