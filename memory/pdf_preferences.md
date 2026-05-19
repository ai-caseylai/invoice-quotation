---
name: pdf-generation-preferences
description: User's preferences for invoice/quotation PDF layout, spacing, and formatting
type: feedback
originSessionId: 9d8a1e8c-e0d1-42e5-bda9-0f2d70f9fb19
---
# PDF Generation Preferences

## Layout
- **2 pages preferred** for detailed quotations/invoices with many line items
- **Text should be sparse** (疏), not dense — prioritize readability
- **Logo** positioned at top-left corner, company info to its right, left-aligned
- **四邊留 margin** on all 4 sides (15mm each)
- **Title**: Use "發票" (invoice) or "報價單" (quotation), matching the document number prefix

## Numbering
- Invoice prefix: `INV{YY}-{XXXX}` (e.g., INV22-1175)
- Quotation prefix: `QUO{YY}-{XXXX}` (e.g., QUO24-0400)

## Description Column
- No Chinese numerals (一、二、三…) in descriptions — row numbers suffice
- Sub-items indented with `- ` prefix

## Spacing Settings (gen_quo_from_json.py)
- Item font: 10pt, leading=17pt
- Row heights: base 10mm + 5.8mm per sub-item line
- Cell padding: 6pt (TOP/BOTTOM)
- Section spacers: 5-8mm
- Payment terms leading: 18pt

## Info Table
- 客戶 and 發票號碼 on the same row
- Column widths: [22, 64, 24, 70]mm

**Why**: User repeatedly asked for sparser text and 2-page layout; found 1-page version too cramped.
**How to apply**: When generating any invoice/quotation PDF, default to these spacing settings and 2-page layout.
