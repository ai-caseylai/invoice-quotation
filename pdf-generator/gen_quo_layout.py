#!/usr/bin/env python3
"""從 JSON 文件生成報價單 (Quotation) PDF — 由佈局編輯器自動生成
用法: python3 gen_quo_layout.py <json_file> [output.pdf]
"""
import json, sys, os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Flowable, Image
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

# === 字體註冊 ===
try:
    pdfmetrics.registerFont(TTFont('STHeitiMedium', '/System/Library/Fonts/STHeiti Medium.ttc', subfontIndex=0))
    CHINESE_FONT = 'STHeitiMedium'
except:
    try:
        pdfmetrics.registerFont(TTFont('SongtiTC', '/System/Library/Fonts/Supplemental/Songti.ttc', subfontIndex=0))
        CHINESE_FONT = 'SongtiTC'
    except:
        CHINESE_FONT = 'Helvetica'

# === 公司資料常數 ===
COMPANY_NAME = "Muse Labs Engineering Limited"
COMPANY_ADDRESS = "RM15, 11/F, Meeco Industrial Bldg, Nos. 53-55 Au Pui Wan St, Fo Tan, N.T."
COMPANY_CONTACT = "Tel 97188675  Website: www.muselabs-eng.com  Email: info@muselabs-eng.com"
BANK_LINES = [
    "Muse Labs Engineering Limited \u2022 Acc#: 004 484-485073-838 \u2022 Bank: HSBC Hong Kong",
    "BIC/SWIFT: HSBCHKHHHKH",
    "Beneficiary Bank Name: HSBC Hong Kong",
    "Beneficiary Bank Address: 1 Queen\u2019s Road Central, Hong Kong",
]
HEADER_COLOR = colors.HexColor("#2C3E50")
TABLE_HEADER_BG = colors.HexColor("#A8D0E6")
LINE_COLOR = colors.HexColor("#BDC3C7")
DEBUG = False

# ============================================================
# === 佈局座標配置 (由編輯器生成，可直接修改) ===
# ============================================================
LAYOUT = {
    "header": {
        "company_name": {"y": 2.0, "fontSize": 14, "font": "Helvetica-Bold", "align": "center", "color": "#2C3E50", "bold": True},
        "company_addr": {"y": 10.0, "fontSize": 8, "font": "Helvetica", "align": "center", "color": "#888888"},
        "company_contact": {"y": 15.0, "fontSize": 7, "font": "Helvetica", "align": "center", "color": "#888888"},
        "invoice_title": {"y": 20.0, "fontSize": 12, "font": "Helvetica-Bold", "align": "center", "color": "#2C3E50", "bold": True},
    },
    "info_table": {"x": 0.0, "y": 30.0, "w": 186.0, "h": 32.0},
    "project_title": {"y": 65.0, "fontSize": 11, "font": "STHeitiMedium", "align": "center", "color": "#2C3E50", "bold": True},
    "items_table": {"x": 0.0, "y": 74.0, "w": 186.0, "h": 88.0},
    "totals_table": {"x": 0.0, "y": 164.0, "w": 186.0, "h": 42.0},
    "signature": {
        "left_line":  {"x": 0.0, "y": 225.0, "w": 80.0, "lineWidth": 0.5, "lineColor": "#333333"},
        "sig_name":   {"x": 0.0, "y": 227.0, "fontSize": 8, "font": "STHeitiMedium", "color": "#000000"},
        "left_label": {"x": 0.0, "y": 233.0, "fontSize": 8, "font": "STHeitiMedium", "color": "#000000"},
        "chop":       {"x": 88.0, "y": 228.0, "w": 25.0, "h": 11.0},
        "right_line": {"x": 115.0, "y": 225.0, "w": 65.0, "lineWidth": 0.5, "lineColor": "#333333"},
        "right_label":{"x": 115.0, "y": 227.0, "fontSize": 8, "font": "STHeitiMedium", "color": "#000000"},
    },
    "bank_info": {"y": 250.0, "fontSize": 8, "font": "STHeitiMedium", "color": "#333333"},
    # Page margins
    "margins": {"left": 12, "right": 12, "top": 0, "bottom": 25},
    "sig_block_height": 20,
}


def dbg_marker(story, num, text):
    if DEBUG:
        ms = ParagraphStyle(f'DM{num}', parent=ParagraphStyle('DMBase', fontSize=7),
            textColor=colors.white, backColor=colors.HexColor("#FF0000"),
            fontName='Helvetica-Bold', spaceBefore=0, spaceAfter=0, leading=9)
        story.append(Paragraph(f"[D{num}] {text}", ms))


class SignatureBlock(Flowable):
    """自訂 Flowable：用 canvas 絕對座標繪製簽名區"""
    def __init__(self, block_width, block_height, sig_name, chop_path=None, layout=None):
        Flowable.__init__(self)
        self.width = block_width
        self.height = block_height
        self.sig_name = sig_name
        self.chop_path = chop_path
        self.layout = layout or LAYOUT["signature"]

    def draw(self):
        c = self.canv
        h = self.height
        L = self.layout

        # 基準線 y 座標
        sig_bottom_y = 297 - 25 - 20  # 頁面底部-margin-簽名區高度
        line_y = h - (L["left_line"]["y"] - sig_bottom_y) * mm

        if DEBUG:
            c.setStrokeColor(colors.red); c.setLineWidth(2)
            c.rect(0, 0, self.width, h)

        # [#1] 左簽名線
        ll = L["left_line"]
        c.setStrokeColor(colors.HexColor(ll["lineColor"]))
        c.setLineWidth(ll["lineWidth"])
        c.line(ll["x"]*mm, line_y, (ll["x"]+ll["w"])*mm, line_y)

        # [#5] 簽名者名稱
        sn = L["sig_name"]
        c.setFillColor(colors.HexColor(sn["color"]))
        c.setFont(sn["font"], sn["fontSize"])
        offset_y = (L["left_line"]["y"] - sn["y"]) * mm
        c.drawString(sn["x"]*mm, line_y - offset_y, self.sig_name)

        # [#7] 左側標籤
        sll = L["left_label"]
        c.setFont(sll["font"], sll["fontSize"])
        offset_y = (L["left_line"]["y"] - sll["y"]) * mm
        c.drawString(sll["x"]*mm, line_y - offset_y, "\u7c3d\u540d\u4e26\u84cb\u516c\u53f8\u5370\u7ae0")

        # [#3] 章印
        ch = L["chop"]
        if self.chop_path and os.path.exists(self.chop_path):
            try:
                img = PILImage.open(self.chop_path)
                iw, ih = img.size
                chop_w = ch["w"] * mm
                r = chop_w / iw
                chop_h = ih * r
                offset_y = (L["left_line"]["y"] - ch["y"]) * mm
                chop_y = line_y - offset_y - chop_h
                c.drawImage(self.chop_path, ch["x"]*mm, chop_y, width=chop_w, height=chop_h, mask='auto')
            except: pass

        # [#4] 右簽名線
        rl = L["right_line"]
        c.setStrokeColor(colors.HexColor(rl["lineColor"]))
        c.setLineWidth(rl["lineWidth"])
        c.line(rl["x"]*mm, line_y, (rl["x"]+rl["w"])*mm, line_y)

        # [#6] 右側標籤
        slr = L["right_label"]
        c.setFont(slr["font"], slr["fontSize"])
        offset_y = (L["left_line"]["y"] - slr["y"]) * mm
        c.drawString(slr["x"]*mm, line_y - offset_y, "\u7c3d\u540d\u4e26\u84cb\u516c\u53f8\u5370\u7ae0")


def create_quotation_pdf(data, output_path=None):
    if output_path is None:
        output_path = data.get("output_filename", "quotation.pdf")

    m = LAYOUT["margins"]
    doc = SimpleDocTemplate(output_path, pagesize=A4,
        rightMargin=m["right"]*mm, leftMargin=m["left"]*mm,
        topMargin=m["top"]*mm, bottomMargin=m["bottom"]*mm)

    styles = getSampleStyleSheet()
    hl = LAYOUT["header"]
    title_style = ParagraphStyle('T', parent=styles['Heading1'],
        fontSize=hl["company_name"]["fontSize"],
        textColor=colors.HexColor(hl["company_name"]["color"]),
        fontName=hl["company_name"]["font"],
        alignment={'left':TA_LEFT,'center':TA_CENTER,'right':TA_RIGHT}[hl["company_name"]["align"]],
        spaceBefore=0, spaceAfter=0)
    company_style = ParagraphStyle('C', parent=styles['Normal'],
        fontSize=hl["company_addr"]["fontSize"],
        textColor=colors.HexColor(hl["company_addr"]["color"]),
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=0)
    quo_title = ParagraphStyle('Q', parent=styles['Normal'],
        fontSize=hl["invoice_title"]["fontSize"],
        textColor=colors.HexColor(hl["invoice_title"]["color"]),
        fontName=hl["invoice_title"]["font"],
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=1*mm)
    label = ParagraphStyle('L', parent=styles['Normal'], fontSize=9, fontName=CHINESE_FONT, textColor=colors.gray)
    val = ParagraphStyle('V', parent=styles['Normal'], fontSize=10, fontName=CHINESE_FONT)
    pl = LAYOUT["project_title"]
    proj = ParagraphStyle('P', parent=styles['Normal'],
        fontSize=pl["fontSize"], fontName=pl["font"],
        textColor=colors.HexColor(pl["color"]),
        alignment={'left':TA_LEFT,'center':TA_CENTER,'right':TA_RIGHT}[pl["align"]],
        spaceBefore=0, spaceAfter=1*mm)
    ns = ParagraphStyle('N', parent=styles['Normal'], fontSize=9, fontName=CHINESE_FONT)
    bs = ParagraphStyle('B', parent=styles['Normal'], fontSize=9, fontName=CHINESE_FONT)
    rl = ParagraphStyle('RL', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', alignment=TA_RIGHT)
    rv = ParagraphStyle('RV', parent=styles['Normal'], fontSize=10, fontName='Helvetica', alignment=TA_RIGHT)

    story = []

    # ===== SECTION 1: HEADER =====
    story.append(Paragraph(COMPANY_NAME, title_style))
    story.append(Paragraph(COMPANY_ADDRESS, company_style))
    story.append(Paragraph(COMPANY_CONTACT, company_style))
    story.append(Spacer(1, 0.5*mm))
    story.append(Paragraph("INVOICE", quo_title))

    # ===== SECTION 2: INFO TABLE =====
    info_data = [
        [Paragraph("\u5ba2\u6236", label), Paragraph(data["customer"], val), "", ""],
        [Paragraph("\u806f\u7d61\u4eba", label), Paragraph(data.get("attention", ""), val),
         Paragraph("\u5831\u50f9\u55ae\u865f", label), Paragraph(data["invoice_no"], val)],
        [Paragraph("\u96fb\u8a71", label), Paragraph(data.get("tel", ""), val),
         Paragraph("\u65e5\u671f", label), Paragraph(data["date"], val)],
        [Paragraph("\u624b\u6a5f\u865f", label), Paragraph(data.get("mobile", ""), val),
         Paragraph("\u96fb\u90f5", label), Paragraph(data.get("email", ""), val)],
        [Paragraph("\u5730\u5740", label), Paragraph(data.get("address", ""), val), "", ""],
    ]
    info_table = Table(info_data, colWidths=[25*mm, 65*mm, 25*mm, 65*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 1), ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('SPAN', (1,0), (3,0)), ('SPAN', (1,4), (3,4)),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0*mm))

    # ===== SECTION 3: PROJECT TITLE =====
    project_title = data.get("project_title", "")
    if project_title:
        story.append(Paragraph(project_title, proj))

    # ===== SECTION 4: ITEMS TABLE =====
    items = data.get("items", [])
    table_data = [[
        Paragraph("No", bs), Paragraph("Description", bs),
        Paragraph("Qty", bs), Paragraph("(HKD)<br/>Unit price", bs),
        Paragraph("(HKD)<br/>Subtotal", bs),
    ]]
    row_heights = [7*mm]

    for item in items:
        desc = item.get("description", "")
        sub_items = item.get("sub_items", [])
        parts = [desc]
        for si in sub_items:
            parts.append(f"&nbsp;&nbsp;- {si}")
        table_data.append([
            str(item.get("no", "")),
            Paragraph("<br/>".join(parts), ns),
            str(item.get("qty", 1)),
            f"{item['unit_price']:,.0f}",
            f"{item.get('qty', 1) * item['unit_price']:,.0f}",
        ])
        row_heights.append(7*mm + len(sub_items) * 3.5*mm)

    it = Table(table_data, colWidths=[12*mm, 85*mm, 15*mm, 30*mm, 30*mm], rowHeights=row_heights)
    it.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0,0), (-1,0), HEADER_COLOR),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,0), 'MIDDLE'),
        ('VALIGN', (0,1), (0,-1), 'TOP'),
        ('VALIGN', (1,1), (1,-1), 'TOP'),
        ('VALIGN', (2,1), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,1), (0,-1), 'CENTER'),
        ('ALIGN', (2,1), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('BOX', (0,0), (-1,-1), 1, TABLE_HEADER_BG),
        ('TOPPADDING', (0,1), (-1,-1), 2),
        ('BOTTOMPADDING', (0,1), (-1,-1), 2),
    ]))
    story.append(it)
    story.append(Spacer(1, 0*mm))

    # ===== SECTION 5: TOTALS + PAYMENT TERMS =====
    subtotal = data.get("subtotal", sum(i["qty"]*i["unit_price"] for i in items))
    total = data.get("total", subtotal)

    bd = [
        ["", "", Paragraph("Subtotal:", rl), Paragraph(f"{subtotal:,.0f}", rv)],
        ["", "", Paragraph("TOTAL:", rl), Paragraph(f"{total:,.0f}", rv)],
    ]
    discount_pct = data.get("discount", 0)
    if discount_pct:
        discount_amt = int(total * discount_pct / 100)
        net_total = total - discount_amt
        bd.append(["", "", Paragraph(f"Discount {discount_pct}%:", rl), Paragraph(f"-{discount_amt:,.0f}", rv)])
        bd.append(["", "", Paragraph("Net Total:", rl), Paragraph(f"{net_total:,.0f}", rv)])

    payment_terms = data.get("payment_terms", "")
    if payment_terms:
        pt_lines = payment_terms.replace(chr(10), '<br/>')
        pt_style = ParagraphStyle('PTI', parent=styles['Normal'], fontSize=9, fontName=CHINESE_FONT, leading=11)
        bd.append([Paragraph("Payment Terms:", pt_style), "", "", ""])
        bd.append([Paragraph(pt_lines, pt_style), "", "", ""])

    bt = Table(bd, colWidths=[80*mm, 30*mm, 30*mm, 30*mm])
    bt.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('VALIGN', (0,-1), (0,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 1), ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('SPAN', (0,-1), (-1,-1)),
    ]))
    story.append(bt)

    # ===== SECTION 6: SIGNATURE BLOCK =====
    story.append(Spacer(1, 4*mm))
    story.append(Spacer(1, 4*mm))
    story.append(Spacer(1, 4*mm))

    sig_name = data.get("signature_name", "CASEY LAI")
    chop_path = data.get("chop")
    page_usable_w = (210 - m["left"] - m["right"]) * mm

    sig_block = SignatureBlock(
        block_width=page_usable_w,
        block_height=LAYOUT["sig_block_height"]*mm,
        sig_name=sig_name,
        chop_path=chop_path,
    )
    story.append(sig_block)

    # ===== SECTION 7: BANK INFO =====
    bl = LAYOUT["bank_info"]
    bank_style = ParagraphStyle('BK2', parent=styles['Normal'],
        fontSize=bl["fontSize"], fontName=bl["font"], leading=10, spaceBefore=0, spaceAfter=0)
    bank_text = "<br/>".join(BANK_LINES)
    story.append(Paragraph(bank_text, bank_style))

    doc.build(story)
    print(f"PDF generated: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 gen_quo_layout.py <json_file> [output.pdf]")
        sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    output = sys.argv[2] if len(sys.argv) > 2 else None
    create_quotation_pdf(data, output)
