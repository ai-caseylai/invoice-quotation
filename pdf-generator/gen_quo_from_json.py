#!/usr/bin/env python3
"""
從 JSON 文件生成報價單 (Quotation) PDF
支持子項描述、分期付款條款
用法: python3 gen_quo_from_json.py <json_file>
"""
import json
import sys
import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, Flowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

try:
    pdfmetrics.registerFont(TTFont('STHeitiMedium', '/System/Library/Fonts/STHeiti Medium.ttc', subfontIndex=0))
    CHINESE_FONT = 'STHeitiMedium'
except:
    try:
        pdfmetrics.registerFont(TTFont('SongtiTC', '/System/Library/Fonts/Supplemental/Songti.ttc', subfontIndex=0))
        CHINESE_FONT = 'SongtiTC'
    except:
        CHINESE_FONT = 'Helvetica'

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

# Debug mode
DEBUG = False

def dbg_marker(story, num, text):
    """Add a numbered debug marker to story"""
    if DEBUG:
        ms = ParagraphStyle(f'DM{num}', parent=ParagraphStyle('DMBase', fontSize=7),
            textColor=colors.white, backColor=colors.HexColor("#FF0000"),
            fontName='Helvetica-Bold', spaceBefore=0, spaceAfter=0, leading=9)
        story.append(Paragraph(f"[D{num}] {text}", ms))


class SignatureBlock(Flowable):
    """自訂 Flowable：用 canvas 絕對座標繪製簽名區（div 方式）
    座標原點 (0,0) = 左下角，y 向上遞增
    """
    def __init__(self, block_width, block_height, sig_name, chop_path=None, sig_image=None, debug=False):
        Flowable.__init__(self)
        self.width = block_width
        self.height = block_height
        self.sig_name = sig_name
        self.chop_path = chop_path
        self.sig_image = sig_image
        self.debug = debug

    def draw(self):
        c = self.canv
        h = self.height

        if self.debug:
            # 紅框圍住整個 block
            c.setStrokeColor(colors.red)
            c.setLineWidth(2)
            c.rect(0, 0, self.width, h)

        # ---- 座標規劃 (y 從下到上) ----
        # 左簽名線 y=h-5mm, 從 x=0 到 x=80mm
        # 章印 x=88mm, y 對齊線
        # 右簽名線 y=h-5mm, 從 x=115mm 到 x=180mm

        line_y = h - 5*mm

        # [#1] 左簽名線 (如有簽名圖片則不畫線)
        if not (self.sig_image and os.path.exists(self.sig_image)):
            c.setStrokeColor(colors.black)
            c.setLineWidth(0.5)
            c.line(0, line_y, 80*mm, line_y)

            if self.debug:
                c.setFillColor(colors.red)
                c.setFont('Helvetica-Bold', 7)
                c.drawString(0, line_y + 2*mm, "[#1] left sig line")

        # [#1.5] 簽名圖片(放在左簽名線上)
        if self.sig_image and os.path.exists(self.sig_image):
            try:
                sig_img = PILImage.open(self.sig_image)
                siw, sih = sig_img.size
                sig_w = 55*mm
                r = sig_w / siw
                sig_h = sih * r
                sig_x = 0
                sig_y = line_y - sig_h + 40*mm
                c.drawImage(self.sig_image, sig_x, sig_y, width=sig_w, height=sig_h, mask='auto')
                if self.debug:
                    c.setStrokeColor(colors.red)
                    c.setLineWidth(0.5)
                    c.rect(sig_x, sig_y, sig_w, sig_h)
                    c.setFillColor(colors.red)
                    c.setFont('Helvetica-Bold', 7)
                    c.drawString(sig_x, sig_y - 3*mm, "[#1.5] sig image")
            except:
                pass

        # [#5] 簽名者名稱
        c.setFillColor(colors.black)
        c.setFont(CHINESE_FONT, 8)
        name_lines = self.sig_name.replace('<br/>', '\n').split('\n')
        for i, line in enumerate(name_lines):
            c.drawString(0, line_y - 4*mm - i * 4*mm, line)

        if self.debug:
            c.setFillColor(colors.red)
            c.setFont('Helvetica-Bold', 7)
            c.drawString(0, line_y - 4*mm - 3*mm, "[#5]")

        # [#7] 簽名並蓋公司印章
        name_total_lines = len(name_lines)
        c.setFillColor(colors.black)
        c.setFont(CHINESE_FONT, 8)
        c.drawString(0, line_y - 4*mm - name_total_lines * 4*mm, "簽名並蓋公司印章")

        if self.debug:
            c.setFillColor(colors.red)
            c.setFont('Helvetica-Bold', 7)
            c.drawString(18*mm, line_y - 10*mm - 3*mm, "[#7]")

        # [#3] 章印
        if self.chop_path and os.path.exists(self.chop_path):
            try:
                img = PILImage.open(self.chop_path)
                iw, ih = img.size
                chop_w = 25*mm
                r = chop_w / iw
                chop_h = ih * r
                # 放在線的下方，置中
                chop_x = 58*mm
                chop_y = line_y - chop_h - 1*mm + 20*mm
                c.drawImage(self.chop_path, chop_x, chop_y, width=chop_w, height=chop_h, mask='auto')
                if self.debug:
                    c.setStrokeColor(colors.red)
                    c.setLineWidth(0.5)
                    c.rect(chop_x, chop_y, chop_w, chop_h)
                    c.setFillColor(colors.red)
                    c.setFont('Helvetica-Bold', 7)
                    c.drawString(chop_x, chop_y - 3*mm, "[#3] chop")
            except:
                pass

        # [#4] 右簽名線
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.5)
        right_x = 115*mm
        c.line(right_x, line_y, 180*mm, line_y)

        if self.debug:
            c.setFillColor(colors.red)
            c.setFont('Helvetica-Bold', 7)
            c.drawString(right_x, line_y + 2*mm, "[#4] right sig line")

        # [#6] 右側標籤
        c.setFillColor(colors.black)
        c.setFont(CHINESE_FONT, 8)
        c.drawString(right_x, line_y - 4*mm, "簽名並蓋公司印章")

        if self.debug:
            c.setFillColor(colors.red)
            c.setFont('Helvetica-Bold', 7)
            c.drawString(right_x + 33*mm, line_y - 4*mm - 3*mm, "[#6]")


def create_quotation_pdf(data, output_path=None):
    if output_path is None:
        output_path = data.get("output_filename", "quotation.pdf")

    doc_type = data.get("type", "invoice")
    type_config = {
        "receipt": {"title": "收據", "number_label": "收據號碼"},
        "invoice": {"title": "發票", "number_label": "發票號碼"},
        "quotation": {"title": "報價單", "number_label": "報價單號碼"},
    }
    config = type_config.get(doc_type, type_config["invoice"])

    doc = SimpleDocTemplate(output_path, pagesize=A4,
        rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=20*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('T', parent=styles['Heading1'], fontSize=14, textColor=HEADER_COLOR, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceBefore=0, spaceAfter=0)
    company_style = ParagraphStyle('C', parent=styles['Normal'], fontSize=8, textColor=colors.gray, alignment=TA_CENTER, spaceBefore=0, spaceAfter=0)
    quo_title = ParagraphStyle('Q', parent=styles['Normal'], fontSize=14, textColor=HEADER_COLOR, fontName=CHINESE_FONT, alignment=TA_CENTER, spaceBefore=0, spaceAfter=1*mm)
    label = ParagraphStyle('L', parent=styles['Normal'], fontSize=10, fontName=CHINESE_FONT, textColor=colors.gray, leading=15)
    val = ParagraphStyle('V', parent=styles['Normal'], fontSize=10, fontName=CHINESE_FONT, leading=15)
    proj = ParagraphStyle('P', parent=styles['Normal'], fontSize=11, fontName=CHINESE_FONT, textColor=HEADER_COLOR, alignment=TA_CENTER, spaceBefore=0, spaceAfter=4*mm)
    ns = ParagraphStyle('N', parent=styles['Normal'], fontSize=10, fontName=CHINESE_FONT, leading=17)
    bs = ParagraphStyle('B', parent=styles['Normal'], fontSize=10, fontName=CHINESE_FONT, leading=13)
    rl = ParagraphStyle('RL', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT, leading=14)
    rv = ParagraphStyle('RV', parent=styles['Normal'], fontSize=10, fontName='Helvetica', alignment=TA_RIGHT, leading=14)
    bank = ParagraphStyle('BK', parent=styles['Normal'], fontSize=8, fontName=CHINESE_FONT, leading=9, spaceBefore=0, spaceAfter=0)
    pt = ParagraphStyle('PT', parent=styles['Normal'], fontSize=9, fontName=CHINESE_FONT)

    story = []
    # ===== SECTION 1: HEADER with Logo =====
    dbg_marker(story, 1, "Company Header START")

    header_table_data = []
    logo_path = data.get("logo", "")
    has_logo = logo_path and os.path.exists(logo_path)

    if has_logo:
        try:
            logo_img = PILImage.open(logo_path)
            logo_w, logo_h = logo_img.size
            aspect = logo_w / logo_h
            target_h = 18*mm
            target_w = target_h * aspect
            if target_w > 55*mm:
                target_w = 55*mm
                target_h = target_w / aspect
            logo_elem = Image(logo_path, width=target_w, height=target_h)
            logo_col = [logo_elem]
            info_col = [
                Paragraph(COMPANY_NAME, title_style),
                Paragraph(COMPANY_ADDRESS, company_style),
                Paragraph(COMPANY_CONTACT, company_style),
            ]
            header_table_data.append([logo_col, info_col])
            header_table = Table(header_table_data, colWidths=[50*mm, 130*mm])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('ALIGN', (0,0), (0,0), 'LEFT'),
                ('ALIGN', (1,0), (1,0), 'LEFT'),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('LEFTPADDING', (1,0), (1,0), -40*mm),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ]))
            story.append(header_table)
        except Exception as e:
            has_logo = False

    if not has_logo:
        story.append(Paragraph(COMPANY_NAME, title_style))
        story.append(Paragraph(COMPANY_ADDRESS, company_style))
        story.append(Paragraph(COMPANY_CONTACT, company_style))

    dbg_marker(story, 2, "Company Header END")

    # ===== SECTION 2: INFO TABLE =====
    story.append(Spacer(1, 8*mm))
    dbg_marker(story, 3, "Info Table START")
    info_data = [
        [Paragraph("", val), Paragraph("", val), Paragraph("", val), Paragraph("", val)],
        [Paragraph("\u5ba2\u6236", label), Paragraph(data["customer"], val),
         Paragraph(config["number_label"], label), Paragraph(data["invoice_no"], val)],
        [Paragraph("\u806f\u7d61\u4eba", label), Paragraph(data.get("attention", ""), val),
         Paragraph("\u65e5\u671f", label), Paragraph(data["date"], val)],
        [Paragraph("\u96fb\u8a71", label), Paragraph(data.get("tel", ""), val),
         Paragraph("\u96fb\u90f5", label), Paragraph(data.get("email", ""), val)],
        [Paragraph("\u624b\u6a5f\u865f", label), Paragraph(data.get("mobile", ""), val), "", ""],
        [Paragraph("\u5730\u5740", label), Paragraph(data.get("address", ""), val), "", ""],
    ]
    info_table = Table(info_data, colWidths=[22*mm, 64*mm, 24*mm, 70*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3), ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('SPAN', (1,4), (3,4)), ('SPAN', (1,5), (3,5)),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(config["title"], quo_title))
    story.append(Spacer(1, 2*mm))
    dbg_marker(story, 4, "Info Table END")

    # ===== SECTION 3: PROJECT TITLE =====
    project_title = data.get("project_title", "")
    if project_title:
        dbg_marker(story, 5, "Project Title START")
        story.append(Paragraph(project_title, proj))
        dbg_marker(story, 6, "Project Title END")

    # ===== SECTION 4: ITEMS TABLE =====
    dbg_marker(story, 7, "Items Table START")
    items = data.get("items", [])
    table_data = [[
        Paragraph("No", bs), Paragraph("Description", bs),
        Paragraph("Qty", bs), Paragraph("(HKD)<br/>Unit price", bs),
        Paragraph("(HKD)<br/>Subtotal", bs),
    ]]
    row_heights = [9*mm]

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
        br_count = desc.count("<br/>")
        row_heights.append(10*mm + (len(sub_items) + br_count) * 5.8*mm)

    it = Table(table_data, colWidths=[12*mm, 88*mm, 14*mm, 32*mm, 34*mm], rowHeights=row_heights)
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
        ('TOPPADDING', (0,1), (-1,-1), 6),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
    ]))
    story.append(it)
    story.append(Spacer(1, 6*mm))
    dbg_marker(story, 8, "Items Table END")

    # ===== SECTION 5: TOTALS + PAYMENT TERMS =====
    dbg_marker(story, 9, "Totals + Payment Terms Table START")
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

    # Payment Terms merged into totals table as additional rows
    payment_terms = data.get("payment_terms", "")
    if payment_terms:
        pt_lines = payment_terms.replace(chr(10), '<br/>')
        pt_style = ParagraphStyle('PTI', parent=styles['Normal'], fontSize=10, fontName=CHINESE_FONT, leading=18)
        bd.append([Paragraph("Payment Terms:", pt_style), "", "", ""])
        bd.append([Paragraph(pt_lines, pt_style), "", "", ""])

    bt = Table(bd, colWidths=[80*mm, 32*mm, 32*mm, 36*mm])
    bt.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('VALIGN', (0,-1), (0,-1), 'TOP'),   # Payment Terms content: top-align
        ('TOPPADDING', (0,0), (-1,-1), 1), ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('SPAN', (0,-1), (-1,-1)),           # Payment Terms content spans all cols
    ]))
    story.append(bt)
    dbg_marker(story, 10, "Totals + Payment Terms Table END")

    # ===== SECTION 6: SIGNATURE BLOCK (div) =====
    dbg_marker(story, 11, "Spacers before signature")
    story.append(Spacer(1, 20*mm))
    story.append(Spacer(1, 8*mm))
    story.append(Spacer(1, 8*mm))
    story.append(Spacer(1, 8*mm))

    sig_name = data.get("signature_name", "CASEY LAI")
    chop_path = data.get("chop")
    sig_image = data.get("signature", "")
    page_usable_w = 180*mm  # A4 - 15mm*2 margins

    sig_block_height = 40*mm if sig_image else 20*mm
    dbg_marker(story, 12, "SignatureBlock START")
    sig_block = SignatureBlock(
        block_width=page_usable_w,
        block_height=sig_block_height,
        sig_name=sig_name,
        chop_path=chop_path,
        sig_image=sig_image,
        debug=DEBUG,
    )
    story.append(sig_block)
    dbg_marker(story, 13, "SignatureBlock END")

    # ===== SECTION 7: BANK INFO =====
    dbg_marker(story, 14, "Bank Info START")
    bank_text = "<br/>".join(BANK_LINES)
    bank_style = ParagraphStyle('BK2', parent=styles['Normal'], fontSize=8, fontName=CHINESE_FONT, leading=10, spaceBefore=0, spaceAfter=0)
    story.append(Paragraph(bank_text, bank_style))
    dbg_marker(story, 15, "Bank Info END")

    doc.build(story)
    print(f"{config['title']} generated: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 gen_quo_from_json.py <json_file> [output.pdf]")
        sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    output = sys.argv[2] if len(sys.argv) > 2 else None
    create_quotation_pdf(data, output)
