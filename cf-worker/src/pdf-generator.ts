import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { R2Bucket } from '@cloudflare/workers-types';
import { loadChineseFont } from './font-loader';
import { COMPANY } from './types';

const PAGE_W = 595.28, PAGE_H = 841.89, MARGIN = 42.5;
const BLACK = rgb(0,0,0), GRAY = rgb(0.53,0.53,0.53);
const HEADER_COLOR = rgb(0.17,0.24,0.31);
const TABLE_HEADER_BG = rgb(0.66,0.82,0.90);
const LINE_COLOR = rgb(0.74,0.76,0.78);

function pt(mm: number) { return mm * 2.8346457; }

// CJK-aware text width
function tw(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? size : size * 0.55;
  return w;
}

// Draw text with optional anchor and color
function T(page: any, text: string, x: number, y: number, font: any, size: number, anchor = 'left', color = BLACK) {
  if (!text) return;
  const w = tw(text, size);
  let dx = x;
  if (anchor === 'center') dx = x - w / 2;
  else if (anchor === 'right') dx = x - w;
  page.drawText(text, { x: dx, y, font, size, color });
}

function H(page: any, x1: number, x2: number, y: number, thickness = 0.5) {
  page.drawLine({ start: {x:x1,y}, end: {x:x2,y}, thickness, color: LINE_COLOR });
}

async function loadImg(doc: PDFDocument, bucket: R2Bucket|undefined, key: string) {
  if (!key || !bucket) return null;
  try {
    const obj = await bucket.get(key); if (!obj) return null;
    const buf = new Uint8Array(await obj.arrayBuffer());
    return (key.split('.').pop()?.toLowerCase()==='jpg'||key.split('.').pop()?.toLowerCase()==='jpeg')
      ? await doc.embedJpg(buf) : await doc.embedPng(buf);
  } catch { return null; }
}

export async function generatePdf(data: any, bucket?: R2Bucket): Promise<Uint8Array> {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);

  let f: any, Hv: any, Hb: any;
  try { const fb = await loadChineseFont(); f = await doc.embedFont(fb); } catch {}
  Hv = await doc.embedFont(StandardFonts.Helvetica);
  Hb = await doc.embedFont(StandardFonts.HelveticaBold);
  if (!f) f = Hv;

  const logo = await loadImg(doc, bucket, data.logo || 'logo2-removebg-preview.png');
  const chop = await loadImg(doc, bucket, data.chop || 'musleabs eng chop.png');
  const sig = await loadImg(doc, bucket, data.signature || 'signiture.png');

  const items: any[] = data.items || [];
  const isQuo = data.type === 'quotation', isRec = data.type === 'receipt';
  const zhTitle = isRec ? '收據' : isQuo ? '報價單' : '發票';
  const numLabel = isRec ? '收據號碼' : isQuo ? '報價單號碼' : '發票號碼';
  const USABLE_R = PAGE_W - MARGIN;
  const page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // ═══ HEADER: Logo left, company info right ═══
  const lw = pt(50);
  if (logo) {
    const d = logo.scale(1), s = Math.min(lw/d.width, pt(18)/d.height);
    page.drawImage(logo, { x: MARGIN, y: y - d.height*s, width: d.width*s, height: d.height*s });
  }
  const ix = MARGIN + lw + pt(2);
  T(page, data.company_name || COMPANY.name, ix, y - pt(1), f, 14, 'left', HEADER_COLOR);
  T(page, data.company_address || COMPANY.address, ix, y - pt(6), f, 8, 'left', GRAY);
  T(page, data.company_contact || COMPANY.contact, ix, y - pt(10), f, 7, 'left', GRAY);

  // ═══ INFO TABLE ═══
  y -= pt(25);
  const cX = [MARGIN, MARGIN+pt(22), MARGIN+pt(22)+pt(64), MARGIN+pt(22)+pt(64)+pt(24)];
  const irh = pt(6);
  const ir: [string,string,string,string][] = [
    ['客戶', data.customer||'', numLabel, data.invoice_no||''],
    ['聯絡人', data.attention||'', '日期', data.date||''],
    ['電話', data.tel||'', '電郵', data.email||''],
    ['手機號', data.mobile||'', '', ''],
    ['地址', data.address||'', '', ''],
  ];
  for (let i = 0; i < ir.length; i++) {
    const [l1,v1,l2,v2] = ir[i], yi = y - i*irh;
    T(page, l1, cX[0], yi-pt(1), f, 10, 'left', GRAY);
    T(page, v1, cX[1]+pt(1), yi-pt(1), f, 10);
    if (l2) T(page, l2, cX[2], yi-pt(1), f, 10, 'left', GRAY);
    if (v2) T(page, v2, cX[3], yi-pt(1), f, 10);
  }
  y = y - ir.length*irh - pt(3);

  // ═══ CHINESE TITLE ═══
  const ttlW = tw(zhTitle, 14);
  T(page, zhTitle, MARGIN + (USABLE_R - MARGIN - ttlW) / 2, y, f, 14, 'left', HEADER_COLOR);
  y -= pt(6);

  // ═══ PROJECT TITLE ═══
  if (data.project_title) {
    T(page, data.project_title, MARGIN+(USABLE_R-MARGIN-tw(data.project_title,11))/2, y, f, 11, 'left', HEADER_COLOR);
    y -= pt(7);
  } else { y -= pt(2); }

  // ═══ ITEMS TABLE ═══
  const iW = [pt(12), pt(88), pt(14), pt(32), pt(34)];
  const iX = [MARGIN, MARGIN+pt(12), MARGIN+pt(100), MARGIN+pt(114), MARGIN+pt(146)];
  const iTW = iW.reduce((a,b)=>a+b);
  const thH = pt(9);

  // Table header
  page.drawRectangle({ x: iX[0], y: y-thH, width: iTW, height: thH, color: TABLE_HEADER_BG });
  T(page, 'No', iX[0]+iW[0]/2, y-thH/2-3, Hb, 9, 'center');
  T(page, 'Description', iX[1]+iW[1]/2, y-thH/2-3, Hb, 9, 'center');
  T(page, 'Qty', iX[2]+iW[2]/2, y-thH/2-3, Hb, 9, 'center');
  T(page, '(HKD) Unit price', iX[3]+iW[3]/2, y-thH/2-3, Hb, 9, 'center');
  T(page, '(HKD) Subtotal', iX[4]+iW[4]/2, y-thH/2-3, Hb, 9, 'center');

  let iy = y - thH;
  for (const item of items) {
    const desc = item.description || item.desc || '';
    const subs: string[] = item.sub_items || [];
    const rh = pt(10) + subs.length * pt(5.8);

    page.drawRectangle({ x: iX[0], y: iy-rh, width: iTW, height: rh, borderColor: LINE_COLOR, borderWidth: 0.5 });
    for (let ci = 1; ci < iX.length; ci++) page.drawLine({ start: {x:iX[ci],y:iy-rh}, end: {x:iX[ci],y:iy}, thickness:0.5, color:LINE_COLOR });

    T(page, String(item.no||''), iX[0]+iW[0]/2, iy-rh/2-3, f, 10, 'center');
    T(page, desc, iX[1]+pt(1), iy-pt(4), f, 10);
    for (let si = 0; si < subs.length; si++) T(page, '  - '+subs[si], iX[1]+pt(1), iy-pt(4)-(si+1)*pt(5.8), f, 10);

    T(page, String(item.qty||1), iX[3]-pt(2), iy-rh/2-3, Hv, 10, 'right');
    T(page, Number(item.unit_price||0).toLocaleString('en-US'), iX[4]-pt(2), iy-rh/2-3, Hv, 10, 'right');
    T(page, Number((item.qty||1)*(item.unit_price||0)).toLocaleString('en-US'), USABLE_R-pt(2), iy-rh/2-3, Hv, 10, 'right');
    iy -= rh;
  }
  y = iy - pt(6);

  // ═══ TOTALS ═══
  const tX = [MARGIN, MARGIN+pt(80), MARGIN+pt(112), MARGIN+pt(144)];
  const tW = [pt(80), pt(32), pt(32), pt(36)];
  const sub = data.subtotal || items.reduce((s:number,i:any)=>s+(i.qty||1)*(i.unit_price||0),0);
  const tot = data.total || sub;

  T(page, 'Subtotal:', tX[2]+tW[2]-tw('Subtotal:',10)-pt(2), y, Hb, 10, 'left');
  T(page, sub.toLocaleString('en-US'), tX[3]+tW[3]-tw(sub.toLocaleString('en-US'),10)-pt(2), y, Hv, 10, 'left');
  y -= pt(5);
  T(page, 'TOTAL:', tX[2]+tW[2]-tw('TOTAL:',10)-pt(2), y, Hb, 10, 'left');
  T(page, tot.toLocaleString('en-US'), tX[3]+tW[3]-tw(tot.toLocaleString('en-US'),10)-pt(2), y, Hv, 10, 'left');
  y -= pt(5);

  if (data.discount) {
    const da = Math.round(tot*data.discount/100);
    T(page, `Discount ${data.discount}%:`, tX[2]+tW[2]-tw(`Discount ${data.discount}%:`,10)-pt(2), y, Hb, 10, 'left');
    T(page, '-'+da.toLocaleString('en-US'), tX[3]+tW[3]-tw('-'+da.toLocaleString('en-US'),10)-pt(2), y, Hv, 10, 'left');
    y -= pt(5);
    T(page, 'Net Total:', tX[2]+tW[2]-tw('Net Total:',10)-pt(2), y, Hb, 10, 'left');
    T(page, (tot-da).toLocaleString('en-US'), tX[3]+tW[3]-tw((tot-da).toLocaleString('en-US'),10)-pt(2), y, Hv, 10, 'left');
    y -= pt(5);
  }

  if (data.payment_terms) {
    y -= pt(3); T(page, 'Payment Terms:', MARGIN, y, f, 10); y -= pt(5);
    for (const ln of String(data.payment_terms).split('\n')) { T(page, ln, MARGIN, y, f, 10); y -= pt(5); }
  } else { y -= pt(8); }

  // ═══ SIGNATURE ═══
  y -= pt(20);
  if (sig) { try { const d=sig.scale(1),sw=pt(55),s=sw/d.width; page.drawImage(sig,{x:MARGIN,y:y-d.height*s+pt(40),width:sw,height:d.height*s}); } catch{} }

  const sn = String(data.signature_name||'CASEY LAI').replace(/<br\/>/g,'\n').split('\n');
  for (let i=0;i<sn.length;i++) T(page, sn[i], MARGIN, y-pt(4)-i*pt(4), f, 8);
  T(page, '簽名並蓋公司印章', MARGIN, y-pt(4)-sn.length*pt(4), f, 8);

  if (chop) { try { const d=chop.scale(1),cw=pt(25),s=cw/d.width; page.drawImage(chop,{x:MARGIN+pt(58),y:y-d.height*s-pt(1)+pt(20),width:cw,height:d.height*s}); } catch{} }
  T(page, '簽名並蓋公司印章', MARGIN+pt(115), y-pt(4), f, 8);

  // ═══ BANK INFO ═══
  y -= pt(30);
  for (const ln of COMPANY.bankLines) { T(page, ln, MARGIN, y, f, 8); y -= pt(3.5); }

  return doc.save();
}
