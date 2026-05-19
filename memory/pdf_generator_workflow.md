---
name: pdf-generator-workflow
description: How to generate invoice/quotation PDFs using gen_quo_from_json.py with ReportLab
type: reference
originSessionId: 9d8a1e8c-e0d1-42e5-bda9-0f2d70f9fb19
---
# PDF Generator Workflow

## Location
- **Generator**: `/Users/apple/WorkBuddy/20260407161821/gen_quo_from_json.py`
- **JSON data**: `/Users/apple/WorkBuddy/20260407161821/*.json`
- **Also in GitHub**: `pdf-generator/` folder in invoice-quotation repo

## Workflow
1. Create/update JSON file with quotation/invoice data
2. Run: `python3 gen_quo_from_json.py <json_file> <output.pdf>`
3. Copy to Downloads: `cp <output.pdf> /Users/apple/Downloads/`
4. Open: `open /Users/apple/Downloads/<output.pdf>`

## JSON Format
```json
{
  "type": "invoice",
  "invoice_no": "INV22-1175",
  "date": "24/9/2024",
  "customer": "CLIENT NAME",
  "attention": "Contact Person",
  "tel": "Phone",
  "email": "email@example.com",
  "address": "Full address",
  "logo": "/path/to/logo.png",
  "project_title": "Project Name",
  "items": [
    {
      "no": 1,
      "description": "Item name",
      "qty": 1,
      "unit_price": 20000,
      "sub_items": ["sub-item 1", "sub-item 2"]
    }
  ],
  "subtotal": 200000,
  "total": 200000,
  "payment_terms": "Terms text",
  "chop": "musleabs eng chop.png",
  "signature_name": "CASEY LAI"
}
```

## Dependencies
- reportlab, pypdf, pillow, pdfplumber
- Chinese font: STHeiti Medium (macOS built-in)
- Logo: `/Users/apple/Downloads/cropped-Muse-Labs-Engineering-Ltd-Logo-PNG-1-90x90.png`
