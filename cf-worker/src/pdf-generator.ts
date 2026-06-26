import { PDFDocument, StandardFonts, rgb, PDFPage, PageSizes } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { R2Bucket } from '@cloudflare/workers-types';
import { loadChineseFont } from './font-loader';
import type { PdfRequest, DocumentType } from './types';
import { COMPANY, TYPE_CONFIG, COLORS, FONT_SIZES } from './types';

// ─── helpers ────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function pt(mm: number): number { return mm * 2.8346457; }
const A4_W = PageSizes.A4[0]; // 595.28
const A4_H = PageSizes.A4[1]; // 841.89
const MARGIN = pt(15); // ~42.5pt
const USABLE_W = A4_W - 2 * MARGIN; // ~510pt
const USABLE_RIGHT = A4_W - MARGIN; // ~552.8pt

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  // Simple character-width-based line wrapping for CJK text
  // We estimate CJK char width ≈ fontSize, Latin char width ≈ fontSize * 0.55
  const lines: string[] = [];
  let current = '';
  let currentW = 0;

  for (const ch of text) {
    const isCJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch);
    const chW = isCJK ? fontSize : fontSize * 0.55;
    if (currentW + chW > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
      currentW = chW;
    } else {
      current += ch;
      currentW += chW;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function measureWidth(text: string, font: any, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    const isCJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch);
    w += isCJK ? fontSize : fontSize * 0.55;
  }
  return w;
}

// ─── image loading ──────────────────────────────────────

async function loadImage(doc: PDFDocument, bucket: R2Bucket | undefined, path: string): Promise<{ data: Uint8Array; type: 'png' | 'jpg' } | null> {
  if (!path) return null;
  try {
    // Try R2 first
    if (bucket) {
      const key = path.replace(/^.*[\\/]/, '');
      const obj = await bucket.get(key);
      if (obj) {
        const buf = new Uint8Array(await obj.arrayBuffer());
        const ext = key.split('.').pop()?.toLowerCase();
        return { data: buf, type: ext === 'jpg' || ext === 'jpeg' ? 'jpg' : 'png' };
      }
    }
    // Fallback: try to fetch from Supabase Storage
    const url = `https://fcydqlusmtpgmwvfnopm.supabase.co/storage/v1/object/public/assets/${path}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const buf = new Uint8Array(await resp.arrayBuffer());
      return { data: buf, type: 'png' };
    }
  } catch {}
  return null;
}

// ─── drawing helpers ────────────────────────────────────

function drawTableRow(
  page: PDFPage, y: number, rowH: number,
  cells: { text: string; x: number; w: number; align?: 'left' | 'center' | 'right'; font: any; fontSize: number; bold?: boolean }[],
  bgColor?: [number, number, number]
) {
  if (bgColor) {
    const colWidths = cells.map(c => c.w);
    let cx = cells[0].x;
    page.drawRectangle({
      x: cx, y: y - rowH, width: colWidths.reduce((a, b) => a + b, 0), height: rowH,
      color: rgb(bgColor[0], bgColor[1], bgColor[2]),
    });
  }

  for (const cell of cells) {
    const tx = cell.align === 'center' ? cell.x + cell.w / 2 - measureWidth(cell.text, cell.font, cell.fontSize) / 2
              : cell.align === 'right' ? cell.x + cell.w - measureWidth(cell.text, cell.font, cell.fontSize) - 2
              : cell.x + 2;
    page.drawText(cell.text, {
      x: tx,
      y: y - rowH + (rowH - cell.fontSize) / 2 + 1,
      size: cell.fontSize,
      font: cell.font,
      color: rgb(0, 0, 0),
    });
  }
}

// ─── main generator ─────────────────────────────────────

export async function generatePdf(
  data: PdfRequest,
  bucket?: R2Bucket
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const page = doc.addPage([A4_W, A4_H]);

  // Load Chinese font
  let cnFont: any;
  try {
    const fontBuf = await loadChineseFont(bucket);
    cnFont = await doc.embedFont(fontBuf);
  } catch {
    cnFont = await doc.embedFont(StandardFonts.Helvetica);
  }

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = cnFont;  // primary: Chinese-capable font
  const fontB = helvBold;
  const fontH = helv;

  const cfg = TYPE_CONFIG[data.type as DocumentType];
  const [hdrR, hdrG, hdrB] = hexToRgb(COLORS.HEADER);
  const [thBgR, thBgG, thBgB] = hexToRgb(COLORS.TABLE_HEADER_BG);
  const [lineR, lineG, lineB] = hexToRgb(COLORS.LINE);
  const [grayR, grayG, grayB] = hexToRgb(COLORS.GRAY);

  let curY = A4_H - MARGIN; // start from top

  // ═══ SECTION 1: HEADER with LOGO ═══
  const logoData = data.logo ? await loadImage(doc, bucket, data.logo) : null;
  let logoX = MARGIN;
  let logoW = 0;

  if (logoData) {
    try {
      const img = logoData.type === 'png'
        ? await doc.embedPng(logoData.data)
        : await doc.embedJpg(logoData.data);
      const dim = img.scale(1); // native
      const targetH = pt(18);
      const scale = targetH / dim.height;
      logoW = Math.min(dim.width * scale, pt(55));
      const logoH = dim.height * scale;
      const logoY = curY - logoH;
      page.drawImage(img, { x: logoX, y: logoY, width: logoW, height: logoH });
    } catch {}
  }

  // Company info right of logo
  const infoX = MARGIN + logoW + pt(3);
  const infoW = USABLE_RIGHT - infoX;

  page.drawText(COMPANY.name, {
    x: infoX, y: curY - pt(0.5), size: FONT_SIZES.TITLE, font: fontB,
    color: rgb(hdrR, hdrG, hdrB),
  });
  const addrY = curY - pt(5);
  page.drawText(COMPANY.address, {
    x: infoX, y: addrY, size: FONT_SIZES.COMPANY, font: fontH,
    color: rgb(grayR, grayG, grayB),
  });
  const contactY = addrY - pt(3);
  page.drawText(COMPANY.contact, {
    x: infoX, y: contactY, size: FONT_SIZES.SUB_SMALL, font: fontH,
    color: rgb(grayR, grayG, grayB),
  });

  curY = contactY - pt(2);

  // ═══ SECTION 2: INFO TABLE ═══
  const infoTop = curY - pt(8);
  const colX = [MARGIN, MARGIN + pt(22), MARGIN + pt(22) + pt(64), MARGIN + pt(22) + pt(64) + pt(24)];
  const colW = [pt(22), pt(64), pt(24), pt(70)];
  const tableW = colW.reduce((a, b) => a + b, 0);
  const rowH = pt(6);

  type InfoRow = { label: string; labelX: number; value: string; valueX: number; valueW: number };

  const infoRows: InfoRow[] = [
    { label: '\u5BA2\u6236', labelX: colX[0], value: data.customer || '', valueX: colX[1], valueW: colW[1] },
    { label: '\u806F\u7D61\u4EBA', labelX: colX[0], value: data.attention || '', valueX: colX[1], valueW: colW[1] },
    { label: '\u96FB\u8A71', labelX: colX[0], value: data.tel || '', valueX: colX[1], valueW: colW[1] },
    { label: '\u624B\u6A5F\u865F', labelX: colX[0], value: data.mobile || '', valueX: colX[1], valueW: colW[1] + colW[2] + colW[3] },
    { label: '\u5730\u5740', labelX: colX[0], value: data.address || '', valueX: colX[1], valueW: colW[1] + colW[2] + colW[3] },
  ];

  const rightLabels = [
    { label: cfg.numberLabel, value: data.invoice_no || '', labelX: colX[2], valueX: colX[3], valueW: colW[3] },
    { label: '\u65E5\u671F', value: data.date || '', labelX: colX[2], valueX: colX[3], valueW: colW[3] },
    { label: '\u96FB\u90F5', value: data.email || '', labelX: colX[2], valueX: colX[3], valueW: colW[3] },
  ];

  const infoRowCount = infoRows.length;
  for (let i = 0; i < infoRowCount; i++) {
    const r = infoRows[i];
    const y = infoTop - i * rowH;

    // Left label
    page.drawText(r.label, {
      x: r.labelX, y: y - pt(1), size: FONT_SIZES.LABEL, font: font,
      color: rgb(grayR, grayG, grayB),
    });
    // Left value
    page.drawText(r.value || '', {
      x: r.valueX + pt(1), y: y - pt(1), size: FONT_SIZES.VALUE, font: font,
    });

    // Right side labels
    if (i < rightLabels.length) {
      const rl = rightLabels[i];
      page.drawText(rl.label, {
        x: rl.labelX, y: y - pt(1), size: FONT_SIZES.LABEL, font: font,
        color: rgb(grayR, grayG, grayB),
      });
      page.drawText(rl.value || '', {
        x: rl.valueX, y: y - pt(1), size: FONT_SIZES.VALUE, font: font,
      });
    }
  }

  curY = infoTop - infoRowCount * rowH - pt(3);

  // Document title
  const titleW = measureWidth(cfg.title, font, FONT_SIZES.TITLE);
  const titleX = MARGIN + (USABLE_W - titleW) / 2;
  page.drawText(cfg.title, {
    x: titleX, y: curY, size: FONT_SIZES.TITLE, font: font,
    color: rgb(hdrR, hdrG, hdrB),
  });
  curY -= pt(6);

  // ═══ SECTION 3: PROJECT TITLE ═══
  if (data.project_title) {
    const pw = measureWidth(data.project_title, font, FONT_SIZES.PROJECT);
    page.drawText(data.project_title, {
      x: MARGIN + (USABLE_W - pw) / 2, y: curY, size: FONT_SIZES.PROJECT, font: font,
      color: rgb(hdrR, hdrG, hdrB),
    });
    curY -= pt(7);
  }

  // ═══ SECTION 4: ITEMS TABLE ═══
  const itemColW = [pt(12), pt(88), pt(14), pt(32), pt(34)];
  const itemColX = [
    MARGIN,
    MARGIN + pt(12),
    MARGIN + pt(12 + 88),
    MARGIN + pt(12 + 88 + 14),
    MARGIN + pt(12 + 88 + 14 + 32),
  ];

  // Table header
  const thY = curY;
  const thRowH = pt(9);
  const thCells = [
    { text: 'No', x: itemColX[0], w: itemColW[0], align: 'center' as const, font: fontB, fontSize: FONT_SIZES.ITEM_HEADER, bold: true },
    { text: 'Description', x: itemColX[1], w: itemColW[1], align: 'center' as const, font: fontB, fontSize: FONT_SIZES.ITEM_HEADER, bold: true },
    { text: 'Qty', x: itemColX[2], w: itemColW[2], align: 'center' as const, font: fontB, fontSize: FONT_SIZES.ITEM_HEADER, bold: true },
    { text: '(HKD)\nUnit price', x: itemColX[3], w: itemColW[3], align: 'center' as const, font: fontB, fontSize: FONT_SIZES.ITEM_HEADER, bold: true },
    { text: '(HKD)\nSubtotal', x: itemColX[4], w: itemColW[4], align: 'center' as const, font: fontB, fontSize: FONT_SIZES.ITEM_HEADER, bold: true },
  ];

  drawTableRow(page, thY, thRowH, thCells, [thBgR, thBgG, thBgB]);
  let itemY = thY - thRowH;

  // Grid lines — draw header box
  const gridX = itemColX[0];
  const gridW = itemColW.reduce((a, b) => a + b, 0);

  page.drawRectangle({
    x: gridX, y: itemY, width: gridW, height: thRowH,
    borderColor: rgb(lineR, lineG, lineB), borderWidth: 0.5, color: undefined,
  });

  for (const item of data.items) {
    const desc = item.description;
    const subItems = item.sub_items || [];
    const descLines = [desc, ...subItems.map(s => `  - ${s}`)];

    const rowHt = pt(10) + subItems.length * pt(5.8);
    const itemY1 = itemY - rowHt;

    // Background
    page.drawRectangle({
      x: gridX, y: itemY1, width: gridW, height: rowHt,
      borderColor: rgb(lineR, lineG, lineB), borderWidth: 0.5,
    });

    // Cell dividers
    for (let ci = 1; ci < itemColX.length; ci++) {
      page.drawLine({
        start: { x: itemColX[ci], y: itemY1 },
        end: { x: itemColX[ci], y: itemY },
        color: rgb(lineR, lineG, lineB), thickness: 0.5,
      });
    }

    // No
    const noW = measureWidth(String(item.no), font, FONT_SIZES.ITEM);
    page.drawText(String(item.no), {
      x: itemColX[0] + (itemColW[0] - noW) / 2, y: itemY1 + rowHt / 2 - FONT_SIZES.ITEM / 2,
      size: FONT_SIZES.ITEM, font: font,
    });

    // Description (multi-line)
    for (let li = 0; li < descLines.length; li++) {
      page.drawText(descLines[li], {
        x: itemColX[1] + pt(1), y: itemY - pt(4) - li * pt(5.8),
        size: FONT_SIZES.ITEM, font: font,
      });
    }

    // Qty (right-aligned)
    const qtyS = String(item.qty);
    const qtyW = measureWidth(qtyS, fontH, FONT_SIZES.ITEM);
    page.drawText(qtyS, {
      x: itemColX[3] - pt(1) - qtyW, y: itemY1 + rowHt / 2 - FONT_SIZES.ITEM / 2,
      size: FONT_SIZES.ITEM, font: fontH,
    });

    // Unit price
    const upS = item.unit_price.toLocaleString('en-US');
    const upW = measureWidth(upS, fontH, FONT_SIZES.ITEM);
    page.drawText(upS, {
      x: itemColX[4] - pt(1) - upW, y: itemY1 + rowHt / 2 - FONT_SIZES.ITEM / 2,
      size: FONT_SIZES.ITEM, font: fontH,
    });

    // Subtotal
    const subS = (item.qty * item.unit_price).toLocaleString('en-US');
    const subW = measureWidth(subS, fontH, FONT_SIZES.ITEM);
    page.drawText(subS, {
      x: USABLE_RIGHT - pt(2) - subW, y: itemY1 + rowHt / 2 - FONT_SIZES.ITEM / 2,
      size: FONT_SIZES.ITEM, font: fontH,
    });

    itemY = itemY1;
  }

  curY = itemY - pt(6);

  // ═══ SECTION 5: TOTALS + PAYMENT TERMS ═══
  const totalsColW = [pt(80), pt(32), pt(32), pt(36)];
  const totalsColX = [
    MARGIN,
    MARGIN + pt(80),
    MARGIN + pt(80 + 32),
    MARGIN + pt(80 + 32 + 32),
  ];

  const subtotal = data.subtotal || data.items.reduce((s, i) => s + (i.qty || 1) * (i.unit_price || 0), 0);
  const total = data.total || subtotal;

  // Subtotal row
  page.drawText('Subtotal:', {
    x: totalsColX[2] + totalsColW[2] - measureWidth('Subtotal:', fontB, FONT_SIZES.ITEM) - pt(2),
    y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontB,
  });
  const subS = subtotal.toLocaleString('en-US');
  page.drawText(subS, {
    x: totalsColX[3] + totalsColW[3] - measureWidth(subS, fontH, FONT_SIZES.ITEM) - pt(2),
    y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontH,
  });
  curY -= pt(5);

  // Total row
  page.drawText('TOTAL:', {
    x: totalsColX[2] + totalsColW[2] - measureWidth('TOTAL:', fontB, FONT_SIZES.ITEM) - pt(2),
    y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontB,
  });
  const totS = total.toLocaleString('en-US');
  page.drawText(totS, {
    x: totalsColX[3] + totalsColW[3] - measureWidth(totS, fontH, FONT_SIZES.ITEM) - pt(2),
    y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontH,
  });
  curY -= pt(5);

  // Discount if any
  if (data.discount) {
    const discAmt = Math.round(total * data.discount / 100);
    page.drawText(`Discount ${data.discount}%:`, {
      x: totalsColX[2] + totalsColW[2] - measureWidth(`Discount ${data.discount}%:`, fontB, FONT_SIZES.ITEM) - pt(2),
      y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontB,
    });
    const dS = `-${discAmt.toLocaleString('en-US')}`;
    page.drawText(dS, {
      x: totalsColX[3] + totalsColW[3] - measureWidth(dS, fontH, FONT_SIZES.ITEM) - pt(2),
      y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontH,
    });
    curY -= pt(5);

    const netT = total - discAmt;
    page.drawText('Net Total:', {
      x: totalsColX[2] + totalsColW[2] - measureWidth('Net Total:', fontB, FONT_SIZES.ITEM) - pt(2),
      y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontB,
    });
    const ntS = netT.toLocaleString('en-US');
    page.drawText(ntS, {
      x: totalsColX[3] + totalsColW[3] - measureWidth(ntS, fontH, FONT_SIZES.ITEM) - pt(2),
      y: curY - FONT_SIZES.ITEM, size: FONT_SIZES.ITEM, font: fontH,
    });
    curY -= pt(5);
  }

  // Payment terms
  if (data.payment_terms) {
    curY -= pt(3);
    page.drawText('Payment Terms:', {
      x: MARGIN, y: curY, size: FONT_SIZES.ITEM, font: font,
    });
    curY -= pt(5);

    const ptLines = (data.payment_terms || '').split('\n');
    for (const line of ptLines) {
      page.drawText(line, {
        x: MARGIN, y: curY, size: FONT_SIZES.ITEM, font: font,
      });
      curY -= pt(5);
    }
  }

  // ═══ SECTION 6: SIGNATURE BLOCK ═══
  curY -= pt(20);

  // Left signature line
  const sigY = curY;
  page.drawLine({
    start: { x: MARGIN, y: sigY },
    end: { x: MARGIN + pt(80), y: sigY },
    color: rgb(0, 0, 0), thickness: 0.5,
  });

  // Right signature line
  page.drawLine({
    start: { x: MARGIN + pt(115), y: sigY },
    end: { x: USABLE_RIGHT, y: sigY },
    color: rgb(0, 0, 0), thickness: 0.5,
  });

  // Signature image
  if (data.signature) {
    const sigImg = await loadImage(doc, bucket, data.signature);
    if (sigImg) {
      try {
        const img = sigImg.type === 'png'
          ? await doc.embedPng(sigImg.data)
          : await doc.embedJpg(sigImg.data);
        const dim = img.scale(1);
        const sigW = pt(55);
        const scale = sigW / dim.width;
        const sigH = dim.height * scale;
        page.drawImage(img, {
          x: MARGIN,
          y: sigY - sigH + pt(40), // adjust position
          width: sigW,
          height: sigH,
        });
      } catch {}
    }
  }

  // Signature name
  const sigName = data.signature_name || 'CASEY LAI';
  const nameLines = sigName.replace(/<br\/>/g, '\n').split('\n');
  for (let i = 0; i < nameLines.length; i++) {
    page.drawText(nameLines[i], {
      x: MARGIN, y: sigY - pt(4) - i * pt(4),
      size: FONT_SIZES.SIGNATURE, font: font,
    });
  }
  page.drawText('\u7C3D\u540D\u4E26\u84CB\u516C\u53F8\u5370\u7AE0', {
    x: MARGIN, y: sigY - pt(4) - nameLines.length * pt(4),
    size: FONT_SIZES.SIGNATURE, font: font,
  });

  // Chop
  if (data.chop) {
    const chopImg = await loadImage(doc, bucket, data.chop);
    if (chopImg) {
      try {
        const img = chopImg.type === 'png'
          ? await doc.embedPng(chopImg.data)
          : await doc.embedJpg(chopImg.data);
        const dim = img.scale(1);
        const chopW = pt(25);
        const scale = chopW / dim.width;
        const chopH = dim.height * scale;
        page.drawImage(img, {
          x: MARGIN + pt(58),
          y: sigY - chopH - pt(1) + pt(20),
          width: chopW,
          height: chopH,
        });
      } catch {}
    }
  }

  // Right label
  page.drawText('\u7C3D\u540D\u4E26\u84CB\u516C\u53F8\u5370\u7AE0', {
    x: MARGIN + pt(115), y: sigY - pt(4),
    size: FONT_SIZES.SIGNATURE, font: font,
  });

  curY = sigY - pt(30);

  // ═══ SECTION 7: BANK INFO ═══
  for (const line of COMPANY.bankLines) {
    page.drawText(line, {
      x: MARGIN, y: curY, size: FONT_SIZES.BANK, font: font,
    });
    curY -= pt(3.5);
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}
