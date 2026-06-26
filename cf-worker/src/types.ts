export type DocumentType = 'invoice' | 'quotation' | 'receipt';

export interface JsonItem {
  no: number;
  description: string;
  qty: number;
  unit_price: number;
  sub_items?: string[];
}

export interface PdfRequest {
  type?: DocumentType;
  invoice_no: string;
  date: string;
  customer: string;
  attention: string;
  tel: string;
  mobile: string;
  email: string;
  address: string;
  project_title?: string;
  items: JsonItem[];
  subtotal: number;
  discount?: number;
  total: number;
  deposit?: number;
  deposit_label?: string;
  payment_terms?: string;
  remark?: string;
  signature_name: string;
  logo?: string;
  chop?: string;
  signature?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  contact: string;
  bankLines: string[];
}

export interface TypeConfig {
  title: string;
  numberLabel: string;
}

export const COMPANY: CompanyInfo = {
  name: 'Muse Labs Engineering Limited',
  address: 'RM15, 11/F, Meeco Industrial Bldg, Nos. 53-55 Au Pui Wan St, Fo Tan, N.T.',
  contact: 'Tel 97188675  Website: www.muselabs-eng.com  Email: info@muselabs-eng.com',
  bankLines: [
    'Muse Labs Engineering Limited \u2022 Acc#: 004 484-485073-838 \u2022 Bank: HSBC Hong Kong',
    'BIC/SWIFT: HSBCHKHHHKH',
    'Beneficiary Bank Name: HSBC Hong Kong',
    "Beneficiary Bank Address: 1 Queen\u2019s Road Central, Hong Kong",
  ],
};

export const TYPE_CONFIG: Record<DocumentType, TypeConfig> = {
  receipt: { title: '\u6536\u64DA', numberLabel: '\u6536\u64DA\u865F\u78BC' },
  invoice: { title: '\u767C\u7968', numberLabel: '\u767C\u7968\u865F\u78BC' },
  quotation: { title: '\u5831\u50F9\u55AE', numberLabel: '\u5831\u50F9\u55AE\u865F\u78BC' },
};

export const COLORS = {
  HEADER: '#2C3E50',
  TABLE_HEADER_BG: '#A8D0E6',
  LINE: '#BDC3C7',
  GRAY: '#888888',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
};

export const FONT_SIZES = {
  TITLE: 14,
  COMPANY: 8,
  LABEL: 10,
  VALUE: 10,
  PROJECT: 11,
  ITEM: 10,
  ITEM_HEADER: 9,
  BANK: 8,
  SIGNATURE: 8,
  SUB_SMALL: 7,
};
