import type { D1Database } from '@cloudflare/workers-types';

function uuid(): string {
  return crypto.randomUUID();
}
function now(): string {
  return new Date().toISOString();
}

export class DB {
  constructor(private d1: D1Database) {}

  // ─── Company ───
  async getCompany() {
    const r = await this.d1.prepare('SELECT * FROM companies LIMIT 1').first();
    return r || null;
  }
  async updateCompany(id: string, data: Record<string, any>) {
    const fields = Object.keys(data).filter(k => k !== 'id');
    if (!fields.length) return null;
    const sets = fields.map(k => `${k} = ?`).join(', ');
    const vals = fields.map(k => data[k]);
    vals.push(now(), id);
    await this.d1.prepare(`UPDATE companies SET ${sets}, updated_at = ? WHERE id = ?`).bind(...vals).run();
    return this.getCompany();
  }
  async createCompany(data: Record<string, any>) {
    const id = uuid();
    const fields = ['id', ...Object.keys(data), 'created_at', 'updated_at'];
    const placeholders = fields.map(() => '?').join(', ');
    const vals = [id, ...Object.values(data), now(), now()];
    await this.d1.prepare(`INSERT INTO companies (${fields.join(', ')}) VALUES (${placeholders})`).bind(...vals).run();
    return this.getCompany();
  }

  // ─── Customers ───
  async getCustomers() {
    const r = await this.d1.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    return r.results;
  }
  async getCustomer(id: string) {
    return await this.d1.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first() || null;
  }
  async createCustomer(data: Record<string, any>) {
    const id = uuid();
    await this.d1.prepare(
      `INSERT INTO customers (id, name, contact_person, phone, email, address, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, data.name||'', data.contact_person||'', data.phone||'', data.email||'', data.address||'', data.notes||'', now(), now()).run();
    return this.getCustomer(id);
  }
  async updateCustomer(id: string, data: Record<string, any>) {
    const fs = ['name','contact_person','phone','email','address','notes'].filter(k => k in data);
    if (!fs.length) return null;
    const sets = fs.map(k => `${k} = ?`).join(', ');
    const vals = fs.map(k => data[k]||'');
    vals.push(now(), id);
    await this.d1.prepare(`UPDATE customers SET ${sets}, updated_at = ? WHERE id = ?`).bind(...vals).run();
    return this.getCustomer(id);
  }
  async deleteCustomer(id: string) {
    await this.d1.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();
    return true;
  }

  // ─── Suppliers ───
  async getSuppliers() {
    const r = await this.d1.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
    return r.results;
  }
  async getSupplier(id: string) {
    return await this.d1.prepare('SELECT * FROM suppliers WHERE id = ?').bind(id).first() || null;
  }
  async createSupplier(data: Record<string, any>) {
    const id = uuid();
    await this.d1.prepare(
      `INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, data.name||'', data.contact_person||'', data.phone||'', data.email||'', data.address||'', data.notes||'', now(), now()).run();
    return this.getSupplier(id);
  }
  async updateSupplier(id: string, data: Record<string, any>) {
    const fs = ['name','contact_person','phone','email','address','notes'].filter(k => k in data);
    if (!fs.length) return null;
    const sets = fs.map(k => `${k} = ?`).join(', ');
    const vals = fs.map(k => data[k]||'');
    vals.push(now(), id);
    await this.d1.prepare(`UPDATE suppliers SET ${sets}, updated_at = ? WHERE id = ?`).bind(...vals).run();
    return this.getSupplier(id);
  }
  async deleteSupplier(id: string) {
    await this.d1.prepare('DELETE FROM suppliers WHERE id = ?').bind(id).run();
    return true;
  }

  // ─── Documents ───
  async getDocuments(type?: string) {
    let q = 'SELECT * FROM documents';
    const params: any[] = [];
    if (type) { q += ' WHERE type = ?'; params.push(type); }
    q += ' ORDER BY date DESC';
    const r = params.length
      ? await this.d1.prepare(q).bind(...params).all()
      : await this.d1.prepare(q).all();
    return r.results;
  }
  async getDocument(id: string) {
    return await this.d1.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first() || null;
  }
  async createDocument(data: Record<string, any>, items: any[]) {
    const id = uuid();
    await this.d1.prepare(
      `INSERT INTO documents (id, type, doc_number, customer_id, supplier_id, date, due_date, subtotal, tax, total, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, data.type, data.doc_number, data.customer_id||null, data.supplier_id||null,
      data.date||new Date().toISOString().split('T')[0], data.due_date||null,
      data.subtotal||0, data.tax||0, data.total||0, data.status||'draft', data.notes||'', now(), now()).run();
    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await this.d1.prepare(
        `INSERT INTO document_items (id, document_id, description, quantity, unit_price, amount, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(uuid(), id, item.description, item.quantity||1, item.unit_price||0,
        (item.quantity||1)*(item.unit_price||0), i, now()).run();
    }
    return this.getDocument(id);
  }
  async getDocumentItems(docId: string) {
    const r = await this.d1.prepare('SELECT * FROM document_items WHERE document_id = ? ORDER BY sort_order ASC').bind(docId).all();
    return r.results;
  }
  async deleteDocument(id: string) {
    await this.d1.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
    return true;
  }

  // ─── Bank Accounts ───
  async getBankAccounts(activeOnly = true) {
    const q = activeOnly ? 'SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY name ASC' : 'SELECT * FROM bank_accounts ORDER BY name ASC';
    const r = await this.d1.prepare(q).all();
    return r.results;
  }
  async getBankAccount(id: string) {
    return await this.d1.prepare('SELECT * FROM bank_accounts WHERE id = ?').bind(id).first() || null;
  }
  async createBankAccount(data: Record<string, any>) {
    const id = uuid();
    await this.d1.prepare(
      `INSERT INTO bank_accounts (id, name, bank_name, account_number, currency, balance, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, data.name, data.bank_name||'', data.account_number||'', data.currency||'HKD', data.balance||0, data.is_active!==false?1:0, now(), now()).run();
    return this.getBankAccount(id);
  }
  async updateBankAccount(id: string, data: Record<string, any>) {
    const fs = ['name','bank_name','account_number','currency','balance','is_active'].filter(k => k in data);
    if (!fs.length) return null;
    const sets = fs.map(k => k === 'is_active' ? `is_active = ?` : `${k} = ?`).join(', ');
    const vals = fs.map(k => k === 'is_active' ? (data[k]?1:0) : data[k]);
    vals.push(now(), id);
    await this.d1.prepare(`UPDATE bank_accounts SET ${sets}, updated_at = ? WHERE id = ?`).bind(...vals).run();
    return this.getBankAccount(id);
  }

  // ─── Categories ───
  async getCategories(type?: string) {
    const q = type ? 'SELECT * FROM categories WHERE type = ? ORDER BY name ASC' : 'SELECT * FROM categories ORDER BY name ASC';
    const r = type ? await this.d1.prepare(q).bind(type).all() : await this.d1.prepare(q).all();
    return r.results;
  }

  // ─── Transactions ───
  async getTransactions(options?: any) {
    let q = 'SELECT * FROM transactions ORDER BY date DESC';
    let params: any[] = [];
    if (options?.limit) { q += ' LIMIT ?'; params.push(options.limit); }
    const r = params.length ? await this.d1.prepare(q).bind(...params).all() : await this.d1.prepare(q).all();
    return r.results;
  }
  async getTransaction(id: string) {
    return await this.d1.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first() || null;
  }
  async createTransaction(data: Record<string, any>) {
    const id = uuid();
    await this.d1.prepare(
      `INSERT INTO transactions (id, date, type, category_id, amount, bank_account_id, customer_id, supplier_id, document_id, description, reference, notes, is_reconciled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, data.date||new Date().toISOString().split('T')[0], data.type, data.category_id||null, data.amount,
      data.bank_account_id||null, data.customer_id||null, data.supplier_id||null, data.document_id||null,
      data.description||'', data.reference||'', data.notes||'', data.is_reconciled?1:0, now(), now()).run();
    return this.getTransaction(id);
  }
  async updateTransaction(id: string, data: Record<string, any>) {
    const fs = ['date','type','category_id','amount','bank_account_id','customer_id','supplier_id','document_id','description','reference','notes','is_reconciled'].filter(k => k in data);
    if (!fs.length) return null;
    const sets = fs.map(k => k === 'is_reconciled' ? `is_reconciled = ?` : `${k} = ?`).join(', ');
    const vals = fs.map(k => k === 'is_reconciled' ? (data[k]?1:0) : data[k]);
    vals.push(now(), id);
    await this.d1.prepare(`UPDATE transactions SET ${sets}, updated_at = ? WHERE id = ?`).bind(...vals).run();
    return this.getTransaction(id);
  }
  async deleteTransaction(id: string) {
    await this.d1.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
    return true;
  }

  // ─── Reports (Views) ───
  async getReceivablesSummary() {
    const r = await this.d1.prepare('SELECT * FROM receivables_summary ORDER BY outstanding_amount DESC').all();
    return r.results;
  }
  async getPayablesSummary() {
    const r = await this.d1.prepare('SELECT * FROM payables_summary ORDER BY outstanding_amount DESC').all();
    return r.results;
  }
  async getMonthlySummary(limit = 12) {
    const r = await this.d1.prepare('SELECT * FROM monthly_summary LIMIT ?').bind(limit).all();
    return r.results;
  }
  async getBankBalanceSummary() {
    const r = await this.d1.prepare('SELECT * FROM bank_balance_summary').all();
    return r.results;
  }

  // ─── PDF Settings ───
  async getPDFSettings() {
    const r = await this.d1.prepare('SELECT * FROM pdf_settings ORDER BY updated_at DESC LIMIT 1').first();
    if (r) { try { r.settings = JSON.parse(r.settings as string); } catch {} }
    return r || null;
  }
  async savePDFSettings(settings: any) {
    const existing = await this.getPDFSettings();
    const json = JSON.stringify(settings);
    if (existing) {
      await this.d1.prepare('UPDATE pdf_settings SET settings = ?, updated_at = ? WHERE id = ?').bind(json, now(), existing.id).run();
    } else {
      await this.d1.prepare('INSERT INTO pdf_settings (id, settings, created_at, updated_at) VALUES (?, ?, ?, ?)').bind(uuid(), json, now(), now()).run();
    }
    return settings;
  }
  async getPDFElementPositions() {
    const r = await this.d1.prepare('SELECT * FROM pdf_element_positions ORDER BY updated_at DESC LIMIT 1').first();
    if (r) { try { r.positions = JSON.parse(r.positions as string); } catch {} }
    return r || null;
  }
  async savePDFElementPositions(positions: any) {
    const existing = await this.getPDFElementPositions();
    const json = JSON.stringify(positions);
    if (existing) {
      await this.d1.prepare('UPDATE pdf_element_positions SET positions = ?, updated_at = ? WHERE id = ?').bind(json, now(), existing.id).run();
    } else {
      await this.d1.prepare('INSERT INTO pdf_element_positions (id, positions, created_at, updated_at) VALUES (?, ?, ?, ?)').bind(uuid(), json, now(), now()).run();
    }
    return positions;
  }
}
