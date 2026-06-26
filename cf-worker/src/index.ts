import { Hono } from 'hono';
import type { R2Bucket } from '@cloudflare/workers-types';
import { generatePdf } from './pdf-generator';
import { prewarmFont } from './font-loader';
import type { PdfRequest, DocumentType } from './types';

interface Env {
  ASSETS: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

// Prewarm font on first request (subsequent requests use cache)
let warmed = false;
app.use('*', async (c, next) => {
  if (!warmed) {
    prewarmFont(c.env.ASSETS);
    warmed = true;
  }
  await next();
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'invoice-pdf-api', version: '1.0.0' });
});

// PDF generation
app.post('/api/pdf/generate', async (c) => {
  try {
    const body = await c.req.json() as PdfRequest;

    // Validate required fields
    if (!body.items || !Array.isArray(body.items)) {
      return c.json({ error: 'Missing required fields: items' }, 400);
    }

    // Infer type from invoice_no prefix if not provided
    if (!body.type) {
      const no = body.invoice_no || '';
      if (no.startsWith('INV')) body.type = 'invoice';
      else if (no.startsWith('QUO')) body.type = 'quotation';
      else if (no.startsWith('REC')) body.type = 'receipt';
      else body.type = 'invoice'; // default
    }

    const validTypes: DocumentType[] = ['invoice', 'quotation', 'receipt'];
    if (!validTypes.includes(body.type)) {
      return c.json({ error: `Invalid type: ${body.type}. Must be one of: ${validTypes.join(', ')}` }, 400);
    }

    const pdfBytes = await generatePdf(body, c.env.ASSETS);

    // Support base64 preview mode
    const url = new URL(c.req.url);
    if (url.searchParams.get('format') === 'base64') {
      // Chunked base64 encoding to avoid call stack overflow for large PDFs
      const chunkSize = 0x8000; // 32KB chunks
      let b64 = '';
      const bytes = new Uint8Array(pdfBytes);
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        b64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      b64 = btoa(b64);
      return c.json({ pdf: b64, filename: `${body.invoice_no || 'document'}.pdf` });
    }

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${body.invoice_no || 'document'}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return c.json({ error: err.message || 'Internal server error' }, 500);
  }
});

// CORS preflight
app.options('/api/pdf/generate', (c) => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
});

// Default 404
app.all('*', (c) => {
  return c.json({ error: 'Not found', endpoints: ['POST /api/pdf/generate', 'GET /api/health'] }, 404);
});

export default app;
