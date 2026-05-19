---
name: invoice-generator
description: |
  Generate professional PDF invoices and quotations for Muse Labs Engineering Limited.
  Use when the user asks to create, generate, or make an invoice (發票), 
  quotation (報價單), or convert between them.
  Supports Chinese (繁體中文) and English, multiple line items with sub-items,
  company logo, chop overlay, and bank payment details.
---

# Invoice & Quotation Generator Skill

Generate professional PDF invoices and quotations for Muse Labs Engineering Limited using ReportLab.

## Prerequisites

```bash
pip3 install reportlab pypdf pillow pdfplumber --break-system-packages
```

System Python font required: STHeiti Medium (built-in on macOS).

## Quick Start

### Option A: Generate from JSON (Recommended)

```bash
cd /Users/apple/WorkBuddy/20260407161821
python3 gen_quo_from_json.py <json_file.json> <output.pdf>
cp <output.pdf> /Users/apple/Downloads/
open /Users/apple/Downloads/<output.pdf>
```

### Option B: Interactive Generation

Use `scripts/invoice_generator.py` with command-line flags.

## JSON Data Format

```json
{
  "type": "invoice",
  "invoice_no": "INV22-1175",
  "date": "DD/MM/YYYY",
  "customer": "CLIENT NAME",
  "attention": "Contact Person",
  "tel": "Phone",
  "mobile": "",
  "email": "email@example.com",
  "address": "Full address",
  "logo": "/Users/apple/Downloads/cropped-Muse-Labs-Engineering-Ltd-Logo-PNG-1-90x90.png",
  "project_title": "Project Name",
  "items": [
    {
      "no": 1,
      "description": "Item name (no Chinese numerals)",
      "qty": 1,
      "unit_price": 20000,
      "sub_items": ["sub-item 1", "sub-item 2"]
    }
  ],
  "subtotal": 200000,
  "discount": 0,
  "total": 200000,
  "deposit": 0,
  "deposit_label": "",
  "payment_terms": "Deposit Received HK$ 120,000\nRemaining balance to be settled.",
  "remark": "",
  "chop": "musleabs eng chop.png",
  "signature_name": "CASEY LAI"
}
```

## Layout Preferences (User-Validated)

- **2 pages** for detailed invoices with many line items — text should be sparse (疏)
- **Margins**: 15mm all sides
- **Logo**: Top-left, ~50mm column; company info to its right, left-aligned
- **Title**: "發票" for invoices, "報價單" for quotations (Chinese font, 14pt)
- **Numbering**: INV{YY}-{XXXX} for invoices, QUO{YY}-{XXXX} for quotations
- **Descriptions**: No Chinese numerals (一、二、三…) — row numbers suffice
- **Sub-items**: Indented with `- ` prefix

### Spacing Settings (gen_quo_from_json.py)
- Item font: 10pt, leading=17pt
- Row heights: 10mm base + 5.8mm per sub-item line
- Cell padding: 6pt (TOP/BOTTOM)
- Section spacers: 5-8mm
- Payment terms leading: 18pt

### Info Table Layout
- Row 0: 客戶 | Customer Name | 發票號碼 | Invoice No
- Row 1: 聯絡人 | Contact | 日期 | Date
- Row 2: 電話 | Tel | 電郵 | Email
- Row 3: 手機號 | Mobile (spans)
- Row 4: 地址 | Address (spans)
- Column widths: [22, 64, 24, 70]mm

## Company Reference

Read `references/company_info.md` for company details, bank info, chop paths.

### Bank Info
- Bank: HSBC Hong Kong
- Account: Muse Labs Engineering Limited
- Acc#: 004 484-485073-838
- BIC/SWIFT: HSBCHKHHHKH

### Available Assets
- English chop: `assets/musleabs_eng_chop.png`
- Chinese chop: `assets/muse_lab_chop.png`
- Logo: `/Users/apple/Downloads/cropped-Muse-Labs-Engineering-Ltd-Logo-PNG-1-90x90.png`

## Chinese Font Notes

- Primary: **STHeiti Medium** (`/System/Library/Fonts/STHeiti Medium.ttc`, subfontIndex=0)
- Fallback: Songti TC → Helvetica
- **Always prefer STHeiti Medium** — Songti TC causes missing characters in ReportLab

## Invoice/Quotation Number Tracking

Format: `{PREFIX}{YY}-{XXXX}`
- Invoice: `INV{YY}-{XXXX}` (e.g., INV26-0441)
- Quotation: `QUO{YY}-{XXXX}` (e.g., QUO24-0400)

## Quotation to Invoice Conversion

1. Change `invoice_no`: QUO → INV prefix
2. Change title: "報價單" → "發票"
3. Change label: "報價單號" → "發票號碼"
4. Update payment terms as needed
5. Regenerate PDF with updated JSON

## Files Location

- **Generator**: `/Users/apple/WorkBuddy/20260407161821/gen_quo_from_json.py`
- **JSON data**: `/Users/apple/WorkBuddy/20260407161821/*.json`
- **GitHub backup**: https://github.com/ai-caseylai/invoice-quotation (pdf-generator/ folder)
- **Output**: Copy to `/Users/apple/Downloads/`

## Verification

After generating, verify:
1. All Chinese characters render correctly (extract text with pypdf)
2. All amounts sum correctly to total
3. Payment terms match
4. Logo appears at top-left
5. Bank info appears at footer
