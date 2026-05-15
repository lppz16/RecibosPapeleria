/* =============================
   PAPELERÍA EH — SCRIPT
   ============================= */

// ===== STATE =====
let invoiceItems = [];
let currentInvoiceNum = getNextInvoiceNum();

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setDateTime();
  setInterval(setDateTime, 60000);
  renderReceiptNum();
  loadCatalogSelect();
  renderCatalog();
  renderHistory();
  generateBarcode();
});

// ===== DATETIME =====
function setDateTime() {
  const now = new Date();
  const opts = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  const str = now.toLocaleDateString('es-CO', opts).replace(',', ' —');
  const el = document.getElementById('invoice-date');
  if (el) el.value = str;
  const rel = document.getElementById('r-date');
  if (rel) rel.textContent = str;
}

// ===== INVOICE NUMBER =====
function getNextInvoiceNum() {
  const n = parseInt(localStorage.getItem('eh_invoice_counter') || '0') + 1;
  return n;
}

function formatInvoiceNum(n) {
  return 'FACT-' + String(n).padStart(4, '0');
}

function incrementCounter() {
  const cur = parseInt(localStorage.getItem('eh_invoice_counter') || '0') + 1;
  localStorage.setItem('eh_invoice_counter', cur);
  return cur;
}

function renderReceiptNum() {
  const num = formatInvoiceNum(currentInvoiceNum);
  const d1 = document.getElementById('factura-num-display');
  const d2 = document.getElementById('r-num');
  if (d1) d1.textContent = num;
  if (d2) d2.textContent = num;
  const bn = document.getElementById('barcode-num');
  if (bn) bn.textContent = num;
}

// ===== NAVIGATION =====
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  if (window.innerWidth <= 700) closeSidebar();
  if (view === 'catalog') renderCatalog();
  if (view === 'history') renderHistory();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// ===== ADD PRODUCT =====
function addProduct() {
  const desc = document.getElementById('prod-desc').value.trim();
  const qty = parseFloat(document.getElementById('prod-qty').value) || 1;
  const price = parseFloat(document.getElementById('prod-price').value);

  if (!desc) return toast('Ingresa una descripción.', 'warn');
  if (isNaN(price) || price < 0) return toast('Ingresa un precio válido.', 'warn');

  invoiceItems.push({ desc, qty, price, total: qty * price });
  clearProductForm();
  renderReceiptItems();
  toast('Producto agregado ✓');
}

function addFromCatalog() {
  const sel = document.getElementById('catalog-select');
  const val = sel.value;
  if (!val) return toast('Selecciona un producto del catálogo.', 'warn');

  const catalog = getCatalog();
  const item = catalog.find(c => c.id === val);
  if (!item) return;

  document.getElementById('prod-desc').value = item.desc;
  document.getElementById('prod-price').value = item.price;
  document.getElementById('prod-qty').value = 1;
  sel.value = '';
  toast(`"${item.desc}" cargado ✓`);
}

function removeItem(idx) {
  invoiceItems.splice(idx, 1);
  renderReceiptItems();
}

function clearProductForm() {
  document.getElementById('prod-desc').value = '';
  document.getElementById('prod-qty').value = '1';
  document.getElementById('prod-price').value = '';
}

// ===== RENDER RECEIPT ITEMS =====
function renderReceiptItems() {
  const tbody = document.getElementById('receipt-items');

  // Update client name on receipt
  const clientName = document.getElementById('client-name').value.trim() || 'Cliente General';
  document.getElementById('r-client').textContent = clientName;

  if (invoiceItems.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Sin productos aún</td></tr>';
    document.getElementById('r-subtotal').textContent = '$0';
    document.getElementById('r-total').textContent = '$0';
    return;
  }

  let subtotal = 0;
  tbody.innerHTML = invoiceItems.map((item, i) => {
    subtotal += item.total;
    return `<tr>
      <td>${item.desc}</td>
      <td>${item.qty}</td>
      <td>${fmt(item.price)}</td>
      <td style="text-align:right">${fmt(item.total)}</td>
    </tr>`;
  }).join('');

  // Add delete buttons row (hidden on print)
  tbody.innerHTML += `<tr class="no-print"><td colspan="4" style="padding-top:6px;border:none">
    ${invoiceItems.map((item, i) =>
      `<button onclick="removeItem(${i})" style="font-size:.65rem;padding:2px 6px;margin:1px;background:#fee2e2;border:none;border-radius:4px;color:#dc2626;cursor:pointer">✕ ${item.desc.substring(0,15)}</button>`
    ).join('')}
  </td></tr>`;

  document.getElementById('r-subtotal').textContent = fmt(subtotal);
  document.getElementById('r-total').textContent = fmt(subtotal);
}

// ===== SAVE PRODUCT TO CATALOG =====
function saveProductToCatalog() {
  const desc = document.getElementById('prod-desc').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);

  if (!desc) return toast('Ingresa una descripción para guardar.', 'warn');
  if (isNaN(price)) return toast('Ingresa un precio para guardar.', 'warn');

  const catalog = getCatalog();
  const exists = catalog.find(c => c.desc.toLowerCase() === desc.toLowerCase());
  if (exists) return toast('Este producto ya está en el catálogo.', 'warn');

  catalog.push({ id: 'cat_' + Date.now(), desc, price });
  localStorage.setItem('eh_catalog', JSON.stringify(catalog));
  loadCatalogSelect();
  renderCatalog();
  toast(`"${desc}" guardado en catálogo ✓`);
}

// ===== CATALOG =====
function getCatalog() {
  try { return JSON.parse(localStorage.getItem('eh_catalog') || '[]'); } catch { return []; }
}

function loadCatalogSelect() {
  const sel = document.getElementById('catalog-select');
  const catalog = getCatalog();
  sel.innerHTML = '<option value="">— Elegir producto —</option>' +
    catalog.map(c => `<option value="${c.id}">${c.desc} — ${fmt(c.price)}</option>`).join('');
}

function renderCatalog() {
  const catalog = getCatalog();
  const count = document.getElementById('catalog-count');
  if (count) count.textContent = `${catalog.length} producto${catalog.length !== 1 ? 's' : ''} guardado${catalog.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('catalog-body');
  if (!tbody) return;

  if (catalog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No hay productos en el catálogo.</td></tr>';
    return;
  }

  tbody.innerHTML = catalog.map((item, i) => `
    <tr>
      <td style="color:var(--gray-4);font-size:.8rem">${i + 1}</td>
      <td>${escHtml(item.desc)}</td>
      <td style="font-family:var(--font-mono)">${fmt(item.price)}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteCatalogItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Eliminar
        </button>
      </td>
    </tr>
  `).join('');
}

function deleteCatalogItem(id) {
  let catalog = getCatalog().filter(c => c.id !== id);
  localStorage.setItem('eh_catalog', JSON.stringify(catalog));
  loadCatalogSelect();
  renderCatalog();
  toast('Producto eliminado del catálogo.');
}

function clearCatalog() {
  if (!confirm('¿Vaciar el catálogo completo?')) return;
  localStorage.removeItem('eh_catalog');
  loadCatalogSelect();
  renderCatalog();
  toast('Catálogo vaciado.');
}

// ===== SAVE INVOICE =====
function saveInvoice() {
  if (invoiceItems.length === 0) return toast('Agrega al menos un producto.', 'warn');

  const num = incrementCounter();
  const invoice = {
    id: 'inv_' + Date.now(),
    num: formatInvoiceNum(num),
    client: document.getElementById('client-name').value.trim() || 'Cliente General',
    clientId: document.getElementById('client-id').value.trim(),
    clientPhone: document.getElementById('client-phone').value.trim(),
    date: document.getElementById('invoice-date').value,
    notes: document.getElementById('invoice-notes').value.trim(),
    items: [...invoiceItems],
    total: invoiceItems.reduce((s, i) => s + i.total, 0),
    createdAt: Date.now()
  };

  const history = getHistory();
  history.unshift(invoice);
  localStorage.setItem('eh_history', JSON.stringify(history));

  currentInvoiceNum = parseInt(localStorage.getItem('eh_invoice_counter') || '1') + 1;
  toast(`Factura ${invoice.num} guardada ✓`);
  renderHistory();
}

// ===== CLEAR INVOICE =====
function clearInvoice() {
  if (invoiceItems.length > 0 || document.getElementById('client-name').value) {
    if (!confirm('¿Limpiar la factura actual?')) return;
  }
  invoiceItems = [];
  currentInvoiceNum = getNextInvoiceNum();
  document.getElementById('client-name').value = '';
  document.getElementById('client-id').value = '';
  document.getElementById('client-phone').value = '';
  document.getElementById('invoice-notes').value = '';
  clearProductForm();
  renderReceiptItems();
  renderReceiptNum();
  generateBarcode();
  toast('Factura limpiada.');
}

// ===== HISTORY =====
function getHistory() {
  try { return JSON.parse(localStorage.getItem('eh_history') || '[]'); } catch { return []; }
}

function renderHistory(filter) {
  let history = getHistory();
  const count = document.getElementById('history-count');
  if (count) count.textContent = `${history.length} factura${history.length !== 1 ? 's' : ''} guardada${history.length !== 1 ? 's' : ''}`;

  if (filter) {
    const f = filter.toLowerCase();
    history = history.filter(inv =>
      inv.num.toLowerCase().includes(f) ||
      inv.client.toLowerCase().includes(f) ||
      inv.date.toLowerCase().includes(f)
    );
  }

  const grid = document.getElementById('history-grid');
  if (!grid) return;

  if (history.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><p>${filter ? 'Sin resultados.' : 'No hay facturas guardadas aún.'}</p></div>`;
    return;
  }

  grid.innerHTML = history.map(inv => `
    <div class="history-card" onclick="openInvoice('${inv.id}')">
      <button class="hcard-delete" onclick="deleteInvoice(event, '${inv.id}')">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="hcard-num">${escHtml(inv.num)}</div>
      <div class="hcard-client">${escHtml(inv.client)}</div>
      <div class="hcard-date">${escHtml(inv.date)}</div>
      <div class="hcard-total">${fmt(inv.total)}</div>
      <div class="hcard-items">${inv.items.length} producto${inv.items.length !== 1 ? 's' : ''}</div>
    </div>
  `).join('');
}

function filterHistory() {
  const q = document.getElementById('history-search').value.trim();
  renderHistory(q || undefined);
}

function deleteInvoice(e, id) {
  e.stopPropagation();
  if (!confirm('¿Eliminar esta factura del historial?')) return;
  const history = getHistory().filter(inv => inv.id !== id);
  localStorage.setItem('eh_history', JSON.stringify(history));
  renderHistory();
  toast('Factura eliminada.');
}

function clearHistory() {
  if (!confirm('¿Vaciar todo el historial de facturas?')) return;
  localStorage.removeItem('eh_history');
  renderHistory();
  toast('Historial vaciado.');
}

// ===== OPEN INVOICE MODAL =====
function openInvoice(id) {
  const inv = getHistory().find(i => i.id === id);
  if (!inv) return;

  const content = buildReceiptHTML(inv);
  document.getElementById('modal-receipt-content').innerHTML = content;
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('modal').classList.add('open');
}

function buildReceiptHTML(inv) {
  const subtotal = inv.items.reduce((s, i) => s + i.total, 0);
  const rows = inv.items.map(i =>
    `<tr>
      <td>${escHtml(i.desc)}</td>
      <td>${i.qty}</td>
      <td>${fmt(i.price)}</td>
      <td style="text-align:right">${fmt(i.total)}</td>
    </tr>`
  ).join('');

  const barcode = buildBarcodeHTML(inv.num);

  return `
  <div class="receipt">
    <div class="receipt-header">
      <div class="receipt-logo">EH</div>
      <div class="receipt-biz">
        <div class="receipt-biz-name">Papelería EH</div>
        <div class="receipt-biz-info">Venecia, Antioquia</div>
        <div class="receipt-biz-info">📱 +57 314 7219317</div>
        <div class="receipt-biz-info">lppz1606@gmail.com</div>
      </div>
    </div>
    <div class="receipt-divider">✦ ✦ ✦</div>
    <div class="receipt-meta">
      <div class="meta-row"><span class="meta-label">FACTURA</span><span class="meta-value">${escHtml(inv.num)}</span></div>
      <div class="meta-row"><span class="meta-label">FECHA</span><span class="meta-value">${escHtml(inv.date)}</span></div>
      <div class="meta-row"><span class="meta-label">CLIENTE</span><span class="meta-value">${escHtml(inv.client)}</span></div>
      ${inv.clientId ? `<div class="meta-row"><span class="meta-label">CC/NIT</span><span class="meta-value">${escHtml(inv.clientId)}</span></div>` : ''}
    </div>
    <div class="receipt-divider">────────────────────</div>
    <table class="receipt-table">
      <thead><tr><th>DESCRIPCIÓN</th><th>CANT</th><th>P/U</th><th>TOTAL</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="receipt-divider">────────────────────</div>
    <div class="receipt-totals">
      <div class="total-row subtotal-row"><span>SUBTOTAL</span><span>${fmt(subtotal)}</span></div>
      <div class="total-row grand-row"><span>TOTAL</span><span>${fmt(inv.total)}</span></div>
    </div>
    <div class="receipt-divider">────────────────────</div>
    ${inv.notes ? `<div class="receipt-notes"><p>${escHtml(inv.notes)}</p></div>` : ''}
    <div class="receipt-footer">
      <p>¡Gracias por su preferencia!</p>
      <p>Papelería EH — Venecia, Antioquia</p>
      <div class="receipt-barcode">${barcode}</div>
    </div>
  </div>`;
}

function buildBarcodeHTML(num) {
  const bars = generateBarsFromNum(num);
  const barsHTML = bars.map(w => `<span style="width:${w}px;height:${Math.random() > .3 ? 32 : 20}px"></span>`).join('');
  return `<div class="barcode-lines">${barsHTML}</div><div class="barcode-num">${num}</div>`;
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('modal').classList.remove('open');
}

function printModal() {
  document.body.classList.add('printing-modal');
  window.print();
  document.body.classList.remove('printing-modal');
}

// ===== PRINT INVOICE =====
function printInvoice() {
  if (invoiceItems.length === 0) return toast('Agrega al menos un producto para imprimir.', 'warn');
  // Update receipt client
  document.getElementById('r-client').textContent =
    document.getElementById('client-name').value.trim() || 'Cliente General';
  // Update notes
  const notes = document.getElementById('invoice-notes').value.trim();
  const notesEl = document.getElementById('r-notes');
  if (notesEl) notesEl.textContent = notes;
  window.print();
}

// ===== BARCODE GENERATOR =====
function generateBarcode() {
  const container = document.getElementById('barcode-lines');
  if (!container) return;
  const num = formatInvoiceNum(currentInvoiceNum);
  const bars = generateBarsFromNum(num);
  container.innerHTML = bars.map(w =>
    `<span style="width:${w}px;height:${Math.random() > .3 ? 32 : 20}px"></span>`
  ).join('');
}

function generateBarsFromNum(num) {
  const seed = num.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bars = [];
  let r = seed;
  for (let i = 0; i < 30; i++) {
    r = (r * 1664525 + 1013904223) & 0xffffffff;
    bars.push((Math.abs(r) % 3) + 1);
  }
  return bars;
}

// ===== UTILS =====
function fmt(n) {
  return '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = (type === 'warn' ? '⚠️ ' : '✓ ') + msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// Live preview: update receipt client when name changes
document.addEventListener('DOMContentLoaded', () => {
  const cn = document.getElementById('client-name');
  if (cn) cn.addEventListener('input', () => {
    document.getElementById('r-client').textContent = cn.value.trim() || 'Cliente General';
  });

  const notes = document.getElementById('invoice-notes');
  if (notes) notes.addEventListener('input', () => {
    const el = document.getElementById('r-notes');
    if (el) el.textContent = notes.value;
  });
});