---
name: fotan-invoice
description: Generate invoice PDF for Fotan Business Association (火炭商會) via invoice.techforliving.net API
---

# Fotan Business Association Invoice Generator

Generate professional invoice PDFs for Fotan Business Association (火炭商會) using the cloud API.

## Quick Start

```bash
TOKEN=$(curl -s -X POST https://invoice.techforliving.net/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"hours":8760}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")

curl -X POST https://invoice.techforliving.net/api/pdf/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @fotan.json \
  -o "INV026-XXX_火炭商會.pdf"
```

## Default Data (fotan.json)

```json
{
  "type": "invoice",
  "invoice_no": "INV026-0444",
  "date": "26/06/2026",
  "customer": "Fotan Business Association",
  "attention": "Joey Lai",
  "tel": "852 6071 5475",
  "email": "",
  "address": "",
  "project_title": "簽到系統",
  "items": [
    {
      "no": 1,
      "description": "簽到系統12個月服務費連PayMe收費收據PDF升級",
      "qty": 1,
      "unit_price": 2500
    }
  ],
  "subtotal": 2500,
  "total": 2500,
  "payment_terms": "COD",
  "remark": "",
  "signature_name": "CASEY LAI",
  "logo": "logo2-removebg-preview.png",
  "chop": "musleabs eng chop.png",
  "signature": "signiture.png"
}
```

## Parameters

| Field | Default | Description |
|-------|---------|-------------|
| invoice_no | INV026-0444 | Invoice number |
| date | 26/06/2026 | Invoice date |
| items[0].description | 簽到系統12個月服務費... | Line item description |
| items[0].unit_price | 2500 | Unit price (HKD) |
| payment_terms | COD | Payment terms |
| remark | (empty) | Additional notes |

## Usage

- To change the invoice number: edit `invoice_no` field
- To add items: add objects to `items` array with `no`, `description`, `qty`, `unit_price`
- To change date: edit `date` field (DD/MM/YYYY format)
- Output PDF includes company logo, signature stamp, and company chop
