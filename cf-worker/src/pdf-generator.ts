import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { R2Bucket } from '@cloudflare/workers-types';
import { loadChineseFont } from './font-loader';
import { COMPANY } from './types';

// ─── A4 page ────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const BLACK = rgb(0, 0, 0);
const THIN = 0.5;

// ─── Table column boundaries ────────────────────────────────
const TBL = { L: 50, R: 527, NO_END: 90, QTY: 330, QTY_END: 370, PRICE_END: 447 };

// ─── Y coordinates ───────────────────────────────────────────
const Y = {
  logo:      PAGE_H - 100,
  company:   PAGE_H - 72,
  addr1:     PAGE_H - 93,
  addr2:     PAGE_H - 110,
  contact:   PAGE_H - 130,
  separator: PAGE_H - 140,
  title:     PAGE_H - 165,
  custStart: PAGE_H - 195,
  custStep:  20,
};

// ─── Font sizes ──────────────────────────────────────────────
const FS = { company: 13, title: 18, addr: 10, label: 10, table: 10, small: 9, bank: 10 };

// ─── Helpers ─────────────────────────────────────────────────

function cjkWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) { w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? size : size * 0.55; }
  return w;
}

function drawText(page: any, text: string, x: number, y: number, font: any, size: number, anchor = 'left') {
  if (!text) return;
  const w = cjkWidth(text, size);
  let dx = x;
  if (anchor === 'center') dx = x - w / 2;
  else if (anchor === 'right') dx = x - w;
  page.drawText(text, { x: dx, y, font, size, color: BLACK });
}

function hLine(page: any, x1: number, x2: number, y: number, thickness = THIN) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color: BLACK });
}

function vLine(page: any, x: number, y1: number, y2: number) {
  page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: THIN, color: BLACK });
}

// ─── Image loading ──────────────────────────────────────────

async function loadImage(doc: PDFDocument, bucket: R2Bucket | undefined, key: string): Promise<any> {
  if (!key || !bucket) return null;
  try {
    const obj = await bucket.get(key);
    if (!obj) return null;
    const buf = new Uint8Array(await obj.arrayBuffer());
    const ext = key.split('.').pop()?.toLowerCase();
    return ext === 'jpg' || ext === 'jpeg' ? await doc.embedJpg(buf) : await doc.embedPng(buf);
  } catch { return null; }
}

// ─── Main generator ─────────────────────────────────────────

export async function generatePdf(data: any, bucket?: R2Bucket): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load fonts
  let cnFont: any, helv: any;
  try { const fb = await loadChineseFont(); cnFont = await doc.embedFont(fb); } catch { cnFont = helv; }
  helv = await doc.embedFont(StandardFonts.Helvetica);

  const f = cnFont;

  // Load images
  const logo = await loadImage(doc, bucket, data.logo || 'logo2-removebg-preview.png');
  const chop = await loadImage(doc, bucket, data.chop || 'musleabs eng chop.png');
  const sig = await loadImage(doc, bucket, data.signature || 'signiture.png');

  const items = data.items || [];
  const isQuotation = data.type === 'quotation';
  const title = isQuotation ? 'QUOTATION' : 'INVOICE';
  const numberLabel = isQuotation ? 'Quotation No. :' : 'Invoice No. :';

  const page = doc.addPage([PAGE_W, PAGE_H]);

  // ═══ HEADER ═══
  if (logo) page.drawImage(logo, { x: 57, y: Y.logo, width: 46, height: 37 });

  drawText(page, data.company_name || 'Muse Labs Engineering Limited', PAGE_W / 2, Y.company, f, FS.company, 'center');
  drawText(page, data.company_address || COMPANY.address, PAGE_W / 2, Y.addr1, helv, FS.addr, 'center');
  drawText(page, data.company_contact || COMPANY.contact, PAGE_W / 2, Y.contact, helv, FS.addr, 'center');

  hLine(page, TBL.L, TBL.R, Y.separator);
  drawText(page, title, PAGE_W / 2, Y.title, helv, FS.title, 'center');

  // ═══ CUSTOMER INFO ═══
  const y0 = Y.custStart;
  const s = Y.custStep;

  drawText(page, 'Customer:', TBL.L, y0, helv, FS.label);
  drawText(page, data.customer || '', 120, y0, f, FS.label);
  drawText(page, numberLabel, 340, y0, helv, FS.label);
  drawText(page, data.invoice_no || '', 420, y0, helv, FS.label);

  const y1 = y0 - s;
  drawText(page, 'Attn:', TBL.L, y1, helv, FS.label);
  drawText(page, data.attention || '', 120, y1, f, FS.label);
  drawText(page, 'Date:', 340, y1, helv, FS.label);
  drawText(page, data.date || '', 420, y1, helv, FS.label);

  const y2 = y1 - s;
  drawText(page, 'Tel:', TBL.L, y2, helv, FS.label);
  drawText(page, data.tel || '', 120, y2, helv, FS.label);
  drawText(page, 'E-mail:', 340, y2, helv, FS.label);
  drawText(page, data.email || '', 420, y2, helv, FS.label);

  const y3 = y2 - s;
  drawText(page, 'Add:', TBL.L, y3, helv, FS.label);
  drawText(page, data.address || '', 120, y3, f, FS.label);

  // ═══ ITEMS TABLE ═══
  const HDR_H = 26;
  const ROW_H = 36;
  const tableTop = y3 - 3 * s;

  let tableBot = tableTop - HDR_H - items.length * ROW_H;

  hLine(page, TBL.L, TBL.R, tableTop);
  hLine(page, TBL.L, TBL.R, tableTop - HDR_H);
  hLine(page, TBL.L, TBL.R, tableBot);

  for (const x of [TBL.L, TBL.NO_END, TBL.QTY, TBL.QTY_END, TBL.PRICE_END, TBL.R]) {
    vLine(page, x, tableTop, tableBot);
  }

  const hdrY = tableTop - HDR_H + 7;
  drawText(page, 'No.', (TBL.L + TBL.NO_END) / 2, hdrY, helv, FS.table, 'center');
  drawText(page, 'Description', (TBL.NO_END + TBL.QTY) / 2, hdrY, helv, FS.table, 'center');
  drawText(page, 'Qty', (TBL.QTY + TBL.QTY_END) / 2, hdrY, helv, FS.table, 'center');
  drawText(page, 'Unit Price', (TBL.QTY_END + TBL.PRICE_END) / 2, hdrY, helv, FS.table, 'center');
  drawText(page, 'Subtotal', (TBL.PRICE_END + TBL.R) / 2, hdrY, helv, FS.table, 'center');

  let rowY = tableTop - HDR_H;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const yd = rowY - ROW_H / 2 + 3;

    if (i > 0) hLine(page, TBL.L, TBL.R, rowY);

    drawText(page, String(item.no ?? i + 1), (TBL.L + TBL.NO_END) / 2, yd, helv, FS.table, 'center');
    drawText(page, (item.description || item.desc || '').replace(/\n/g, ' '), TBL.NO_END + 6, yd, f, FS.table);
    drawText(page, String(item.qty ?? ''), (TBL.QTY + TBL.QTY_END) / 2, yd, helv, FS.table, 'center');

    const up = item.unit_price != null ? Number(item.unit_price).toLocaleString('en-US') : '';
    drawText(page, up, TBL.PRICE_END - 4, yd, helv, FS.table, 'right');

    const sub = item.qty != null && item.unit_price != null
      ? Number(item.qty * item.unit_price).toLocaleString('en-US') : '';
    drawText(page, sub, TBL.R - 4, yd, helv, FS.table, 'right');

    rowY -= ROW_H;
  }

  // ═══ FOOTER ═══
  let y = tableBot - 26;

  const subtotal = data.subtotal || items.reduce((s: number, it: any) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const subtotalStr = subtotal.toLocaleString('en-US');
  drawText(page, 'Subtotal (HKD)', TBL.PRICE_END - 4, y, helv, FS.table, 'right');
  drawText(page, subtotalStr, TBL.R - 4, y, helv, FS.table, 'right');

  // Remark
  y -= 82;
  drawText(page, 'Remark:', TBL.L, y, helv, FS.label);
  if (data.remark) {
    for (const line of data.remark.split('\n')) {
      y -= 14;
      drawText(page, line, TBL.L, y, f, FS.small);
    }
  }

  // Payment Terms
  y -= 22;
  drawText(page, 'Payment Terms:', TBL.L, y, helv, FS.label);
  drawText(page, data.payment_terms || '', 155, y, f, FS.label);

  // Signature
  y -= 50;
  hLine(page, 53, 173, y + 7, 1.0);
  hLine(page, 330, 450, y + 7, 1.0);

  if (sig) page.drawImage(sig, { x: 61, y: y - 33, width: 88, height: 97 });
  if (chop) page.drawImage(chop, { x: (PAGE_W - 55) / 2, y: y + 32, width: 55, height: 55 });

  drawText(page, data.signature_name || 'CASEY LAI', 53, y - 8, f, FS.label);

  y -= 18;
  drawText(page, '簽名並蓋公司印章', 53, y, f, FS.label);
  drawText(page, '簽名並蓋公司印章', 330, y + 8, f, FS.label);

  // Bank info
  y -= 28;
  for (const line of COMPANY.bankLines) {
    drawText(page, line, TBL.L, y, helv, FS.bank);
    y -= 16;
  }

  return doc.save();
}
