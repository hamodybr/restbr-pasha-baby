(() => {
  'use strict';
  const TABLES = ['restaurant_settings','categories','products','product_options','product_colors','discounts','customers','orders','order_items','pasha_reviews','pasha_review_settings'];
  // Read through the signed-in administrator's existing RLS permissions only.
  async function readAll(client, table, columns = '*') {
    const rows = [], seen = new Set();
    let cursor = null, expected = null;
    for (;;) {
      let query = client.from(table).select(columns, { count: 'exact' }).order('id', { ascending: true }).limit(250);
      if (cursor !== null) query = query.gt('id', cursor);
      const result = await query;
      if (result.error) throw new Error(result.error.message || 'تعذر قراءة البيانات');
      if (expected === null) expected = result.count;
      if (expected > 50000) throw new Error('حجم البيانات كبير؛ تواصل مع مسؤول النظام لتصديرها.');
      const batch = result.data || [];
      if (!batch.length) break;
      for (const row of batch) {
        if (row.id == null || seen.has(String(row.id))) throw new Error('تغيّرت البيانات أثناء القراءة؛ أعد المحاولة.');
        seen.add(String(row.id)); rows.push(row);
      }
      if (rows.length > 50000) throw new Error('حجم البيانات كبير؛ تواصل مع مسؤول النظام لتصديرها.');
      cursor = batch[batch.length - 1].id;
    }
    const check = await client.from(table).select('id', { count: 'exact', head: true });
    if (check.error) throw new Error(check.error.message || 'تعذر التحقق من البيانات');
    if (Number.isInteger(expected) && (rows.length !== expected || check.count !== expected)) {
      throw new Error('تغيّر عدد السجلات أثناء القراءة؛ أعد المحاولة للحصول على نسخة كاملة.');
    }
    return rows;
  }
  function pageRows(rows, page = 1, size = 25) {
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const current = Math.max(1, Math.min(pages, page));
    return { rows: rows.slice((current - 1) * size, current * size), page: current, pages, total: rows.length };
  }
  async function archive(client, progress = () => {}) {
    const data = {};
    for (const table of TABLES) {
      progress(table, Object.keys(data).length, TABLES.length);
      data[table] = await readAll(client, table);
    }
    const orders = new Set(data.orders.map(x => String(x.id)));
    const customers = new Set(data.customers.map(x => String(x.id)));
    if (data.order_items.some(x => !orders.has(String(x.order_id))) || data.orders.some(x => x.customer_id && !customers.has(String(x.customer_id)))) {
      throw new Error('تغيّرت الطلبات أثناء التصدير؛ أعد المحاولة.');
    }
    return {
      format: 'PASHA_COMMERCE_ARCHIVE', version: 1, created_at: new Date().toISOString(),
      counts: Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length])),
      notes: ['أرشيف بيانات؛ لا يسترجعه زر استرجاع الكتالوج.', 'صور المنتجات والخطوط محفوظة كروابط فقط؛ ملفاتها ليست مرفقة.', 'لا يشمل حسابات الدخول أو مفاتيح النظام أو إحصاءات التصفح.'],
      data
    };
  }
  function productContentIssues(product, logo = '') {
    const image = String(product.image_url || product.image || '').trim();
    const placeholder = !image || image === String(logo).trim() || /(?:restaurant-placeholder|pasha-placeholder|pasha-logo|store-logo)(?:[.\/_-]|$)/i.test(image);
    const issues = [];
    if (placeholder) issues.push('صورة المنتج ناقصة');
    if (!String(product.description_ar || product.description || '').trim()) issues.push('الوصف العربي ناقص');
    if (!String(product.name_ar || product.name || '').trim()) issues.push('الاسم العربي ناقص');
    return issues;
  }
  window.PashaAdminData = { readAll, pageRows, archive, productContentIssues };
})();
