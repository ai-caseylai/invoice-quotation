import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { DB } from './db';
import { generatePdf } from './pdf-generator';
import { COMPANY } from './types';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  QWEN_API_KEY?: string;
}

export async function handleMcpSSE(c: any): Promise<Response> {
  const sessionId = crypto.randomUUID();
  const baseUrl = new URL(c.req.url).origin;

  // Return SSE with endpoint event pointing to messages URL
  const body = `event: endpoint\ndata: ${baseUrl}/api/mcp/messages?sessionId=${sessionId}\n\n`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function handleMcpMessage(c: any, env: Env): Promise<Response> {
  const req: MCPRequest = await c.req.json().catch(() => ({}));
  if (req.jsonrpc !== '2.0') return mcpError(req.id, -32600, 'Invalid Request');

  try {
    switch (req.method) {
      case 'initialize': return mcpResult(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'invoice-pdf-mcp', version: '2.0.0' },
      });
      case 'tools/list': return mcpResult(req.id, { tools: getTools() });
      case 'tools/call': return await handleToolCall(req, c, env);
      case 'resources/list': return mcpResult(req.id, { resources: getResources() });
      case 'resources/read': return await handleResourceRead(req, env);
      case 'notifications/initialized': return new Response(null, { status: 204 });
      default: return mcpError(req.id, -32601, `Method not found: ${req.method}`);
    }
  } catch (e: any) {
    return mcpError(req.id, -32000, e.message || 'Internal error');
  }
}

function getTools() {
  return [
    {
      name: 'generate_pdf',
      description: '生成專業的發票/報價單/收據 PDF。支援繁體中文、公司 Logo、簽名和蓋章。傳入 type=invoice|quotation|receipt、items 陣列和客戶資訊，返回 PDF 二進制檔案。',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['invoice', 'quotation', 'receipt'], description: '單據類型' },
          invoice_no: { type: 'string', description: '單據編號，如 INV26-0001' },
          date: { type: 'string', description: '日期，格式 DD/MM/YYYY' },
          company_name: { type: 'string', description: '公司名稱' },
          company_address: { type: 'string', description: '公司地址' },
          company_contact: { type: 'string', description: '公司聯絡方式' },
          customer: { type: 'string', description: '客戶名稱' },
          attention: { type: 'string', description: '聯絡人' },
          tel: { type: 'string', description: '電話' },
          email: { type: 'string', description: '電郵' },
          address: { type: 'string', description: '客戶地址' },
          project_title: { type: 'string', description: '項目名稱（選填）' },
          items: {
            type: 'array',
            description: '項目明細',
            items: {
              type: 'object',
              properties: {
                no: { type: 'number' },
                description: { type: 'string' },
                qty: { type: 'number' },
                unit_price: { type: 'number' },
                sub_items: { type: 'array', items: { type: 'string' } },
              },
              required: ['description', 'qty', 'unit_price'],
            },
          },
          subtotal: { type: 'number', description: '小計' },
          total: { type: 'number', description: '總金額' },
          discount: { type: 'number', description: '折扣百分比（選填）' },
          payment_terms: { type: 'string', description: '付款條款' },
          remark: { type: 'string', description: '備註' },
          signature_name: { type: 'string', description: '簽名人' },
        },
        required: ['type', 'items', 'total'],
      },
    },
    {
      name: 'chat',
      description: '與發票系統 AI 助手對話。可要求修改表單欄位，AI 會返回修改指令和回覆文字。',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '用戶訊息' },
          sessionId: { type: 'string', description: '對話 session ID（選填）' },
          formState: { type: 'object', description: '當前表單狀態（選填）' },
        },
        required: ['message'],
      },
    },
    {
      name: 'get_company',
      description: '讀取公司資訊（名稱、地址、電話、電郵）',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'list_documents',
      description: '查詢發票/報價單記錄列表',
      inputSchema: {
        type: 'object',
        properties: { type: { type: 'string', enum: ['invoice', 'quotation', 'receipt', 'purchase_order'], description: '單據類型' } },
      },
    },
    {
      name: 'get_document',
      description: '讀取單筆單據的完整資訊，包含項目明細',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: '單據 ID' } },
        required: ['id'],
      },
    },
  ];
}

function getResources() {
  return [
    { uri: 'company://info', name: '公司資訊', description: '目前儲存的公司基本資料', mimeType: 'application/json' },
    { uri: 'documents://recent', name: '最近單據', description: '最近 20 筆單據記錄', mimeType: 'application/json' },
    { uri: 'qa://list', name: '常見問題', description: '100 條常見問題與解答', mimeType: 'text/markdown' },
  ];
}

async function handleToolCall(req: MCPRequest, c: any, env: Env): Promise<Response> {
  const { name, arguments: args } = req.params || {};
  const db = new DB(env.DB);

  switch (name) {
    case 'generate_pdf': {
      const pdfBytes = await generatePdf(args, env.ASSETS);
      const b64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
      return mcpResult(req.id, { content: [{ type: 'text', text: `PDF generated successfully (${(pdfBytes.length / 1024).toFixed(0)}KB). Base64: ${b64.substring(0, 100)}...` }] });
    }
    case 'chat': {
      const apiKey = env.QWEN_API_KEY;
      if (!apiKey) return mcpResult(req.id, { content: [{ type: 'text', text: 'AI chat not configured (missing QWEN_API_KEY)' }] });
      const fields = args.formState || {};
      const sysPrompt = `你是發票生成器 AI 助手。當前表單：${JSON.stringify(fields)}。用繁體中文回答。`;
      const resp = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'qwen-plus', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: args.message }], max_tokens: 1000 }),
      });
      const data: any = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'No response';
      return mcpResult(req.id, { content: [{ type: 'text', text: reply }] });
    }
    case 'get_company': {
      const co = await db.getCompany();
      return mcpResult(req.id, { content: [{ type: 'text', text: JSON.stringify(co, null, 2) }] });
    }
    case 'list_documents': {
      const docs = await db.getDocuments(args?.type);
      return mcpResult(req.id, { content: [{ type: 'text', text: JSON.stringify(docs, null, 2) }] });
    }
    case 'get_document': {
      const docData: any = await db.getDocument(args.id);
      if (!docData) return mcpResult(req.id, { content: [{ type: 'text', text: 'Document not found' }] });
      const items = await db.getDocumentItems(docData.id);
      return mcpResult(req.id, { content: [{ type: 'text', text: JSON.stringify({ ...docData, items }, null, 2) }] });
    }
    default:
      return mcpError(req.id, -32601, `Tool not found: ${name}`);
  }
}

async function handleResourceRead(req: MCPRequest, env: Env): Promise<Response> {
  const { uri } = req.params || {};
  const db = new DB(env.DB);

  switch (uri) {
    case 'company://info': {
      const co = await db.getCompany();
      return mcpResult(req.id, { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(co, null, 2) }] });
    }
    case 'documents://recent': {
      const docs = await db.getDocuments();
      return mcpResult(req.id, { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(docs.slice(0, 20), null, 2) }] });
    }
    case 'qa://list': {
      return mcpResult(req.id, { contents: [{ uri, mimeType: 'text/markdown', text: 'See https://invoice.techforliving.net/QA-100.md for the full 100 Q&A list.' }] });
    }
    default:
      return mcpError(req.id, -32002, `Resource not found: ${uri}`);
  }
}

function mcpResult(id: number | string, result: any): Response {
  return Response.json({ jsonrpc: '2.0', id, result });
}

function mcpError(id: number | string, code: number, message: string): Response {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } });
}
