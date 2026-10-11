/* ===============================
   RollingStock Planner

   防災備蓄管理ツール - メインスクリプト

   このファイルは在庫管理、家族構成設定、アラート機能、
   備蓄チェック、表示と入力イベントを実装しています。

   LocalStorage Keys
==================================*/
const LS_ITEMS = 'rsp_items';              // 備蓄アイテムデータ
const LS_ALERT_MONTHS = 'rsp_alert_months'; // 警告閾値（月数）
const LS_FAMILY = 'rsp_family';            // 家族構成データ
const LS_THEME = 'rsp_theme';              // テーマ設定（dark/light）
const t = StockI18n.t;

/* ===============================
   State

   アプリケーションの状態を保持するグローバル変数
==================================*/
const stockStore = StockStore.create(() => window.localStorage);
const loadedStock = stockStore.load();
let items = loadedStock.data.items;
let family = loadedStock.data.family;
let alertMonths = loadedStock.data.alertMonths;
let importing = false;
let undoEntry = null;
let activeAction = null;

// ページネーション設定
const ITEMS_PER_PAGE = 50;  // 1ページあたりの表示件数
let currentPage = 1;         // 現在のページ番号

/* ===============================
   Utilities

   LocalStorageの読み書き、日付操作などのユーティリティ関数
==================================*/

// Persist the complete candidate before replacing any in-memory state.
function notice(message) { document.querySelector('#operationStatus').textContent = message; }
function commitState(candidate, replacing = false) {
  let data;
  try { data = stockStore.save(candidate, replacing); }
  catch (error) {
    notice(error.message === 'conflict'
      ? t('conflict')
      : t('saveFailed'));
    return false;
  }
  ({ items, family, alertMonths } = data);
  undoEntry = null;
  document.querySelector('#undoAction').disabled = true;
  notice(stockStore.isSession() ? t('sessionNotice') : t('saved'));
  return true;
}
function currentState() { return { items, family, alertMonths }; }
function downloadJSON(data, prefix) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = prefix + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Calendar helpers do not divide elapsed local time across a DST transition.
function parseDate(value) { return StockCore.dateNumber(value); }
function formatDate(date) { return StockCore.today(date); }

/* ===============================
   DOM Helpers

   jQueryライクなDOM操作ヘルパー関数
==================================*/
// 単一要素を取得（querySelector）
const $ = sel => document.querySelector(sel);

// 複数要素を配列で取得（querySelectorAll）
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ===============================
   Theme Toggle

   ダーク/ライトモードの切り替え機能
==================================*/
// Theme preferences must not prevent use when Storage is blocked.
let currentTheme = document.documentElement.dataset.theme || 'light';
function setTheme(theme) {
  currentTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = currentTheme;
  document.body.dataset.theme = currentTheme;
  try { localStorage.setItem(LS_THEME, currentTheme); } catch (_) { /* Optional preference. */ }
  $('#themeIcon').textContent = currentTheme === 'light' ? '🌙' : '☀️';
  $('#themeText').textContent = currentTheme === 'light' ? t('dark') : t('light');
}
$('#themeToggle').addEventListener('click', () => setTheme(currentTheme === 'dark' ? 'light' : 'dark'));
setTheme(currentTheme);

/* ===============================
   Tabs
==================================*/
const tabs = $$('.tab');
function activateTab(btn, focus = false) {
  tabs.forEach(tab => {
    const selected = tab === btn;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const panel = $('#' + tab.dataset.tab);
    panel.classList.toggle('active', selected);
    panel.hidden = !selected;
  });
  if (focus) btn.focus();
}
tabs.forEach((btn, index) => {
  btn.id = 'tab-' + btn.dataset.tab;
  btn.setAttribute('aria-controls', btn.dataset.tab);
  $('#' + btn.dataset.tab).setAttribute('aria-labelledby', btn.id);
  btn.addEventListener('click', () => activateTab(btn));
  btn.addEventListener('keydown', event => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex !== undefined) { event.preventDefault(); activateTab(tabs[nextIndex], true); }
  });
});
activateTab(tabs[0]);
// Associate existing form labels without changing their help-button content.
$$('label').forEach(label => {
  if (label.htmlFor || label.querySelector('input')) return;
  const control = label.parentElement.querySelector('input, select');
  if (control && control.id) label.htmlFor = control.id;
});

/* ===============================
   Modal Management
==================================*/
const modal = $('#itemModal');
const modalTitle = $('#modalTitle');
let modalOpener;
let originalExpiry = ''; // Store original expiry value for reset

function openModal(mode = 'add', itemIndex = -1){
  if(mode === 'edit'){
    modalTitle.textContent = t('editTitle');
  }else{
    modalTitle.textContent = t('s14');
  }

  modalOpener = document.activeElement;
  $('#itemError').textContent = '';
  modal.classList.add('active');
  document.body.classList.add('modal-open');
  $$('body > header, body > nav, body > main, body > footer').forEach(el => { el.inert = true; });

  if(mode === 'edit' && itemIndex >= 0){
    const it = items[itemIndex];
    $('#name').value = it.name;
    $('#category').value = it.category;
    $('#quantity').value = it.quantity;
    $('#unit').value = it.unit||'';
    $('#expiry').value = it.expiry||'';
    $('#expiryType').value = it.expiryType ?? 'unspecified';
    $('#kcal').value = it.kcal!=null ? it.kcal : '';
    $('#editIndex').value = String(itemIndex);
    $('#waterMode').value = it.volumeMl === undefined ? 'total' : 'bottles';
    $('#volumeMl').value = it.volumeMl ?? 2000;
    originalExpiry = it.expiry || ''; // Save original value
  }else{
    originalExpiry = ''; // No original value for new items
  }
  updateWaterMode();
  $('#name').focus();
}

function closeModal(){
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  $$('body > header, body > nav, body > main, body > footer').forEach(el => { el.inert = false; });
  (modalOpener?.isConnected ? modalOpener : $('#addItemBtn')).focus();

  // Reset form and remove editing highlight
  $('#itemForm').reset();
  $('#editIndex').value = '';
  const tbody = $('#stockTable tbody');
  tbody?.querySelectorAll('tr').forEach(row=>row.classList.remove('editing'));
}

// Open modal on "Add Item" button
$('#addItemBtn').addEventListener('click', ()=>{
  openModal('add');
});

// Close modal on X button
$('#modalClose').addEventListener('click', closeModal);

// Close modal on cancel button
$('#cancelEdit').addEventListener('click', closeModal);

// Close modal on overlay click
modal.addEventListener('click', (e)=>{
  if(e.target === modal){
    closeModal();
  }
});

// Close modal on Esc key
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && $('#helpPopover').matches(':popover-open')) {
    e.preventDefault();
    $('#helpPopover').hidePopover();
    return;
  }
  if(e.key === 'Escape' && modal.classList.contains('active')){
    closeModal();
    return;
  }
  if (e.key === 'Tab' && modal.classList.contains('active')) {
    const controls = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([type=hidden]):not([disabled]), select')).filter(el => el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// Expiry date input buttons
$('#expiryReset').addEventListener('click', ()=>{
  $('#expiry').value = originalExpiry;
});

$('#expiryNone').addEventListener('click', ()=>{
  $('#expiry').value = '';
});

/* ===============================
   Stock Form
==================================*/
function updateWaterMode() {
  const water = $('#category').value === 'water';
  const packaged = water && $('#waterMode').value === 'bottles';
  $('#waterModeFields').hidden = !water;
  $('#bottleFields').hidden = !packaged;
  $('#volumeMl').disabled = !packaged;
  $('#volumeMl').required = packaged;
  $('#unit').disabled = packaged;
  $('#quantity').step = packaged ? '1' : 'any';
}
$('#category').addEventListener('change', updateWaterMode);
$('#waterMode').addEventListener('change', updateWaterMode);
updateWaterMode();
$('#alertMonths').value = String(alertMonths);
$('#alertMonths').addEventListener('change', e => {
  if (commitState({ ...currentState(), alertMonths: Number(e.target.value) })) renderAll();
  e.target.value = String(alertMonths);
});

$('#itemForm').addEventListener('submit', e => {
  e.preventDefault();
  const idx = $('#editIndex').value === '' ? -1 : Number($('#editIndex').value);
  let item;
  try {
    item = StockCore.validateItem({
      name: $('#name').value, category: $('#category').value,
      quantity: $('#quantity').value, unit: $('#volumeMl').disabled ? $('#unit').value : 'bottle',
      ...($('#volumeMl').disabled ? {} : { volumeMl: $('#volumeMl').value }),
      expiry: $('#expiry').value, expiryType: $('#expiryType').value, kcal: $('#kcal').value,
      createdAt: idx >= 0 ? items[idx].createdAt : Date.now()
    });
  } catch (_) { $('#itemError').textContent = t('itemError'); return; }
  const nextItems = items.slice();
  if (idx >= 0) nextItems[idx] = item;
  else nextItems.push(item);
  if (!commitState({ ...currentState(), items: nextItems })) {
    $('#itemError').textContent = $('#operationStatus').textContent;
    return;
  }
  closeModal();
  renderAll();
  $('#addItemBtn').focus();
});

$('#clearAll').addEventListener('click', () => {
  if (!confirm(t('clearConfirm'))) return;
  if (commitState({ ...currentState(), items: [] })) renderAll();
});
$('#exportJson').addEventListener('click', () => {
  downloadJSON({ meta: { app: 'rollingstock-planner', ver: 3 }, ...currentState() }, 'rollingstock-data');
});
$('#exportRecovery').addEventListener('click', () => {
  const raw = stockStore.recovery();
  if (raw) downloadJSON(raw, 'rollingstock-recovery-raw');
  else notice(t('recoveryFailed'));
});
$('#enableSession').addEventListener('click', () => {
  if (!confirm(t('sessionConfirm'))) return;
  stockStore.useSession();
  $('#storageStatus').textContent = t('sessionStatus');
  notice(t('sessionEnabled'));
});
$('#importJson').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file || importing) return;
  importing = true;
  const before = JSON.stringify(currentState());
  try {
    if (file.size > StockCore.MAX_FILE_BYTES) throw new Error('size');
    const candidate = StockCore.validateState(JSON.parse(await file.text()));
    if (before !== JSON.stringify(currentState())) throw new Error('changed');
    if (!confirm(t('importConfirm', { count: candidate.items.length }))) return;
    if (commitState(candidate, true)) {
      currentPage = 1;
      hydrateFamilyForm();
      $('#alertMonths').value = String(alertMonths);
      renderAll();
    }
  } catch (_) {
    notice(t('importFailed'));
  } finally { importing = false; e.target.value = ''; }
});



$('#search').addEventListener('input', ()=>{
  currentPage = 1; // Reset to first page on search
  renderTable();
});
$('#sort').addEventListener('change', renderTable);

// Allow past dates for expiry input (e.g., already expired items)
// No minimum date restriction

/* ===============================
   Family Setup
==================================*/
const familyFields = ['adults', 'children', 'seniors', 'dogs', 'cats', 'days',
  'waterPerPerson', 'adultKcal', 'childKcal', 'seniorKcal', 'dogWater', 'catWater'];
function hydrateFamilyForm() {
  familyFields.forEach(key => { $('#' + key).value = family[key] ?? ''; });
}
hydrateFamilyForm();
$('#familyForm').addEventListener('submit', e => {
  e.preventDefault();
  let candidate;
  try {
    candidate = StockCore.validateFamily(Object.fromEntries(familyFields.map(key => [key, $('#' + key).value])));
  } catch (_) { notice(t('familyError')); return; }
  if (commitState({ ...currentState(), family: candidate })) { hydrateFamilyForm(); renderAll(); }
});
$('#resetFamily').addEventListener('click', () => {
  if (!confirm(t('familyReset'))) return;
  if (commitState({ ...currentState(), family: StockCore.defaults() })) { hydrateFamilyForm(); renderAll(); }
});

/* ===============================
   Calculations
==================================*/
function calcTotals() { return StockCore.totals(items); }
function calcNeeds() { return StockCore.needs(family); }
function coverage() { return StockCore.coverage(items, family); }
function ratioText(metric) {
  return metric.ratio === null ? t('notCalculated') : fmtNum(Math.floor(metric.ratio * 100) / 100) + '%';
}

/* ===============================
   Rendering: Stock Table

   在庫管理テーブルの描画
   - 検索・ソート・ページネーション対応
   - 4段階ステータスバッジ（期限切れ/本日期限/要消費/OK）
==================================*/
function renderTable(){
  const q = $('#search').value.trim().toLowerCase();
  const sort = $('#sort').value;
  const day = StockCore.today();
  const totals = calcTotals();
  $('#waterTotal').textContent = fmtNum(totals.waterL) + ' L';
  $('#kcalTotal').textContent = fmtNum(totals.kcal) + ' kcal';
  $('#summaryRow').textContent = t('summary', { count: items.length, water: fmtNum(totals.waterL), food: fmtNum(totals.kcal) });
  $('#stockLimits').textContent = t('stockLimits', { ...totals, water: fmtNum(totals.plannedWaterL), food: fmtNum(totals.plannedKcal) });

  let filtered = items.map((it, idx)=> ({...it, idx}));
  if(q){
    filtered = filtered.filter(it=>{
      return [it.name, it.category, StockMessages.ja[it.category], StockMessages.en[it.category], it.unit].filter(Boolean).some(s=>String(s).toLowerCase().includes(q));
    });
  }

  filtered.sort((a,b)=>{
    const da = a.expiry ? parseDate(a.expiry) : null;
    const db = b.expiry ? parseDate(b.expiry) : null;
    if(sort==='expiryAsc'){
      if(da === null && db === null) return 0; if(da === null) return 1; if(db === null) return -1; return da-db;
    }else if(sort==='expiryDesc'){
      if(da === null && db === null) return 0; if(da === null) return 1; if(db === null) return -1; return db-da;
    }else if(sort==='nameAsc'){
      return a.name.localeCompare(b.name);
    }else if(sort==='nameDesc'){
      return b.name.localeCompare(a.name);
    }else if(sort==='catAsc'){
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    }
    return 0;
  });

  const tbody = $('#stockTable tbody');
  tbody.innerHTML = '';

  // Show both an empty inventory and an empty search explicitly.
  if (filtered.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'empty-state';
    cell.textContent = items.length === 0 ? t('empty') : t('noMatch');
    row.appendChild(cell);
    tbody.appendChild(row);
    drawCategoryChart();
    updatePagination(0);
    return;
  }

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  currentPage = Math.min(currentPage, totalPages || 1);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(start, end);

  for(const it of paginatedItems){
    const tr = document.createElement('tr');

    const status = StockCore.expiryStatus(it, day, alertMonths);
    const statuses = {
      expired: ['red', t('expired')], today: ['orange', t('today')],
      near: ['yellow', t('near')], later: ['green', t('later')],
      unknown: ['', t('unknown')], invalid: ['red', t('invalid')]
    };
    const [color, label] = statuses[status];
    const badge = '<span class="badge ' + color + '">' + label + '</span>';

    const kcalText = it.kcal!=null ? `${(it.kcal*it.quantity).toLocaleString(StockI18n.locale())} kcal` : '—';

    // Category badge with color
    const categoryLabel = labelForCategory(it.category);
    const validCategories = ['food', 'water', 'medicine', 'pet-food', 'daily', 'tool', 'other'];
    const safeCategory = validCategories.includes(it.category) ? it.category : 'other';
    const categoryBadge = `<span class="category-badge ${safeCategory}">${escapeHtml(categoryLabel)}</span>`;

    tr.innerHTML = `
      <td>${escapeHtml(it.name)}</td>
      <td>${categoryBadge}</td>
      <td>${fmtNum(it.quantity)}</td>
      <td>${escapeHtml(it.volumeMl === undefined ? (it.unit||'') : t('bottleUnit', { ml: fmtNum(it.volumeMl), liters: fmtNum(StockCore.waterVolume(it)) }))}</td>
      <td>${it.expiry ? escapeHtml(it.expiry) : '—'}<small class="expiry-type">${escapeHtml(labelForExpiryType(it.expiryType))}</small></td>
      <td>${kcalText}</td>
      <td>${badge}</td>
      <td>
        <button class="btn" data-use-one="${it.idx}" ${it.quantity < 1 ? 'disabled' : ''}>${t('useOne')}</button>
        <button class="btn" data-consume="${it.idx}" ${it.quantity === 0 ? 'disabled' : ''}>${t('consume')}</button>
        <button class="btn" data-replenish="${it.idx}">${t('replenish')}</button>
        <button class="btn" data-edit="${it.idx}">${t('edit')}</button>
        <button class="btn danger" data-del="${it.idx}">${t('remove')}</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('[data-use-one]').forEach(b => b.addEventListener('click', () => performAction('consume', Number(b.dataset.useOne), 1, '')));
  tbody.querySelectorAll('[data-consume]').forEach(b => b.addEventListener('click', () => openAction('consume', Number(b.dataset.consume))));
  tbody.querySelectorAll('[data-replenish]').forEach(b => b.addEventListener('click', () => openAction('replenish', Number(b.dataset.replenish))));
  tbody.querySelectorAll('[data-edit]').forEach(b=>{
    b.addEventListener('click', ()=>{
      // Remove previous highlight
      tbody.querySelectorAll('tr').forEach(row=>row.classList.remove('editing'));
      // Highlight editing row
      b.closest('tr').classList.add('editing');

      // Open modal in edit mode
      const itemIndex = parseInt(b.dataset.edit,10);
      openModal('edit', itemIndex);
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const i = parseInt(b.dataset.del,10);
      if(!confirm(t('deleteConfirm', { name: items[i].name }))) return;
      const nextItems = items.filter((_, index) => index !== i);
      if (commitState({ ...currentState(), items: nextItems })) renderAll();
    });
  });



  updatePagination(totalPages);
  checkTableScroll();
  drawCategoryChart();
}

function updatePagination(totalPages){
  let pagination = $('.pagination');
  if(!pagination){
    // Create pagination element
    const tableWrap = $('.table-wrap');
    pagination = document.createElement('div');
    pagination.className = 'pagination';
    tableWrap.after(pagination);
  }

  if(totalPages <= 1){
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = `
    <button class="btn" id="prevPage" ${currentPage <= 1 ? 'disabled' : ''}>${t('prev')}</button>
    <span class="page-info">${t('page', { current: currentPage, total: totalPages })}</span>
    <button class="btn" id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>${t('next')}</button>
  `;

  $('#prevPage')?.addEventListener('click', ()=>{
    if(currentPage > 1){
      currentPage--;
      renderTable();
      window.scrollTo({top:0, behavior:'smooth'});
    }
  });

  $('#nextPage')?.addEventListener('click', ()=>{
    if(currentPage < totalPages){
      currentPage++;
      renderTable();
      window.scrollTo({top:0, behavior:'smooth'});
    }
  });
}

function checkTableScroll(){
  const tableWrap = $('.table-wrap');
  const table = tableWrap?.querySelector('table');
  if(tableWrap && table){
    if(table.offsetWidth > tableWrap.offsetWidth){
      tableWrap.classList.add('has-scroll');
    }else{
      tableWrap.classList.remove('has-scroll');
    }
  }
}

function labelForCategory(c){
  const map = {
    'food':t('food'), 'water':t('water'), 'medicine':t('medicine'), 'pet-food':t('pet-food'),
    'daily':t('daily'), 'tool':t('tool'), 'other':t('other')
  };
  return map[c] || c;
}
function labelForExpiryType(type) {
  const labels = { unspecified: t('type_unspecified'), 'best-before': t('type_best-before'),
    'use-by': t('type_use-by'), expiration: t('type_expiration') };
  return labels[type ?? 'unspecified'];
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function performAction(kind, index, amount, expiry, expiryType = 'unspecified') {
  const before = StockCore.validateState(currentState());
  let candidate;
  try { candidate = StockActions[kind](before, index, amount, expiry, expiryType); }
  catch (_) {
    const message = t('actionError');
    $('#actionError').textContent = message; notice(message); return false;
  }
  if (!commitState(candidate)) { $('#actionError').textContent = $('#operationStatus').textContent; return false; }
  undoEntry = { before, after: JSON.stringify(currentState()) };
  $('#undoAction').disabled = false;
  renderAll();
  $('#undoAction').focus();
  return true;
}
function openAction(kind, index) {
  activeAction = { kind, index, before: JSON.stringify(currentState()) };
  $('#actionTitle').textContent = kind === 'consume' ? t('consume') : t('replenish');
  $('#actionItem').textContent = items[index].name;
  $('#actionAmount').value = '1';
  $('#actionAmount').step = items[index].volumeMl === undefined ? 'any' : '1';
  $('#actionExpiry').value = '';
  $('#actionExpiryType').value = 'unspecified';
  $('#actionDateFields').hidden = kind !== 'replenish';
  $('#actionRule').hidden = kind !== 'replenish';
  $('#actionError').textContent = '';
  $('#actionDialog').showModal();
  $('#actionAmount').focus();
}
$('#cancelAction').addEventListener('click', () => $('#actionDialog').close());
$('#actionForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!activeAction || activeAction.before !== JSON.stringify(currentState())) {
    $('#actionError').textContent = t('staleAction'); return;
  }
  if (performAction(activeAction.kind, activeAction.index, $('#actionAmount').value, $('#actionExpiry').value, $('#actionExpiryType').value)) {
    $('#actionDialog').close(); $('#undoAction').focus();
  }
});
$('#undoAction').addEventListener('click', () => {
  let candidate;
  try { candidate = StockActions.undo(currentState(), undoEntry); }
  catch (_) { notice(t('noUndo')); return; }
  if (commitState(candidate)) { renderAll(); $('#addItemBtn').focus(); }
});
function fmtNum(n){
  const v = Number(n);
  if(Number.isNaN(v)) return '—';
  return (Math.round(v*100)/100).toLocaleString(StockI18n.locale());
}

/* ===============================
   Alerts and stock checks
==================================*/
function renderAlerts() {
  const lists = StockCore.alerts(items, StockCore.today(), alertMonths);
  const expiryUl = $('#expiryList');
  expiryUl.replaceChildren();
  for (const it of [...lists.expired, ...lists.near]) {
    const li = document.createElement('li');
    const status = StockCore.expiryStatus(it, StockCore.today(), alertMonths);
    const tag = status === 'expired' ? t('expired') : status === 'today' ? t('today') : t('near');
    li.textContent = '[' + tag + '] ' + it.name + ' / ' + fmtNum(it.quantity) + ' ' + it.unit + ' / ' + it.expiry + ' / ' + labelForExpiryType(it.expiryType);
    expiryUl.appendChild(li);
  }
  if (!expiryUl.children.length) expiryUl.textContent = t('none');
  const rollingUl = $('#rollingList');
  rollingUl.replaceChildren();
  for (const it of lists.rolling) {
    const li = document.createElement('li');
    li.textContent = t('rollingItem', { name: it.name, expiry: it.expiry }) + ' / ' + labelForExpiryType(it.expiryType);
    rollingUl.appendChild(li);
  }
  if (!rollingUl.children.length) rollingUl.textContent = t('noRolling');
  renderStockCheck(lists);
  drawCoverageCharts();
}

function renderStockCheck(lists) {
  const cov = coverage();
  const container = $('#expertAnalysis');
  container.replaceChildren();
  const lines = [];
  for (const [label, metric, unit] of [[t('water'), cov.water, 'L'], [t('humanFood'), cov.food, 'kcal']]) {
    lines.push(label + t('separator') + (metric.met === null
      ? t('zeroTarget')
      : metric.met
        ? t('met')
        : t('short', { amount: fmtNum(Math.ceil(metric.shortage * 100) / 100), unit })));
  }
  if (cov.needs.petUnknown) lines.push(t('petUnknown'));
  if (lists.expired.length) lines.push(t('expiredNote', { count: lists.expired.length }));
  if (cov.totals.undated) lines.push(t('undatedNote', { count: cov.totals.undated }));
  if (cov.totals.unknownWater) lines.push(t('unknownWaterNote', { count: cov.totals.unknownWater }));
  if (cov.totals.unknownKcal) lines.push(t('unknownKcalNote', { count: cov.totals.unknownKcal }));
  const categories = new Set(items.filter(it => it.quantity > 0).map(it => it.category));
  if (family.dogs + family.cats > 0) lines.push(t('petFoodNote'));
  lines.push(t('categoriesNote', { count: categories.size }));
  for (const line of lines) { const p = document.createElement('p'); p.textContent = line; container.appendChild(p); }
}

/* ===============================
   Dependency-free data displays
==================================*/
function drawCategoryChart() {
  const container = $('#categoryChart');
  container.replaceChildren();
  for (const category of StockCore.CATEGORIES) {
    const count = items.filter(it => it.category === category && it.quantity > 0).length;
    const p = document.createElement('p');
    p.textContent = t('categoryCount', { category: labelForCategory(category), count });
    container.appendChild(p);
  }
}
function drawCoverageCharts() {
  const cov = coverage();
  const entries = [
    ['#waterChart', cov.water, cov.totals.plannedWaterL, cov.needs.needWater, 'L'],
    ['#kcalChart', cov.food, cov.totals.plannedKcal, cov.needs.needKcal, 'kcal']
  ];
  for (const [id, metric, stock, target, unit] of entries) {
    const container = $(id);
    container.replaceChildren();
    const summary = document.createElement('p');
    summary.textContent = t('chartSummary', { target: target === null ? t('unset') : fmtNum(target) + ' ' + unit, stock: fmtNum(stock), unit });
    const ratio = document.createElement('p');
    ratio.textContent = t('ratio', { value: ratioText(metric) });
    container.append(summary, ratio);
    if (metric.ratio !== null) {
      const progress = document.createElement('progress');
      progress.max = 100;
      progress.value = Math.min(100, metric.ratio);
      progress.setAttribute('aria-label', t('progressLabel'));
      container.appendChild(progress);
    }
  }
  $('#needWater').textContent = cov.needs.needWater === null ? t('petUnset') : fmtNum(cov.needs.needWater) + ' L';
  $('#needKcal').textContent = fmtNum(cov.needs.needKcal) + ' kcal';
  $('#coverage').textContent = t('coverage', { water: ratioText(cov.water), food: ratioText(cov.food) });
}

/* ===============================
   Init
==================================*/
function renderShopping() {
  let result;
  try { result = StockActions.shopping(currentState(), $('#shoppingBottleMl').value); }
  catch (_) {
    $('#shoppingText').value = t('capacityError');
    $('#shoppingPrint').textContent = $('#shoppingText').value;
    $('#copyShopping').disabled = $('#printShopping').disabled = true;
    return;
  }
  $('#copyShopping').disabled = $('#printShopping').disabled = false;
  const numberOrUnknown = value => value === null ? t('notCalculated') : fmtNum(Math.ceil(value * 100) / 100);
  const lines = [
    t('memoTitle', { date: StockCore.today() }),
    t('memoWater', { target: numberOrUnknown(result.needs.needWater), stock: fmtNum(result.totals.plannedWaterL) }),
    t('memoShortWater', { amount: numberOrUnknown(result.water.shortage) }),
    t('memoBottles', { count: numberOrUnknown(result.bottles), ml: fmtNum(result.bottleMl) }),
    t('memoFood', { target: fmtNum(result.needs.needKcal), stock: fmtNum(result.totals.plannedKcal) }),
    t('memoShortFood', { amount: numberOrUnknown(result.food.shortage) }),
    t('excluded')
  ];
  let excluded = 0;
  for (const it of items) {
    if (!it.quantity || !['water', 'food'].includes(it.category)) continue;
    const reasons = [];
    const status = StockCore.expiryStatus(it);
    if (status === 'expired') reasons.push(t('expired'));
    if (status === 'unknown') reasons.push(t('unknown'));
    if (it.category === 'water' && StockCore.waterVolume(it) === null) reasons.push(t('unknownVolume'));
    if (it.category === 'food' && it.kcal === null) reasons.push(t('missingCalories'));
    if (reasons.length) { lines.push('- ' + it.name + t('separator') + reasons.join(t('join'))); excluded++; }
  }
  if (!excluded) lines.push(t('none'));
  lines.push(t('memoLimits'));
  $('#shoppingText').value = lines.join('\n');
  $('#shoppingPrint').textContent = lines.join('\n');
}
$('#shoppingBottleMl').addEventListener('input', () => { $('#shoppingStatus').textContent = ''; renderShopping(); });
$('#copyShopping').addEventListener('click', async () => {
  renderShopping();
  if ($('#copyShopping').disabled) return;
  try {
    await navigator.clipboard.writeText($('#shoppingText').value);
    $('#shoppingStatus').textContent = t('copied');
  } catch (_) {
    $('#shoppingText').focus(); $('#shoppingText').select();
    $('#shoppingStatus').textContent = t('copyFailed');
  }
});
$('#printShopping').addEventListener('click', () => {
  renderShopping();
  if ($('#printShopping').disabled) return;
  document.body.classList.add('print-shopping');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('print-shopping'));

function renderAll(){
  renderTable();
  renderAlerts();
  renderShopping();
}
renderAll();
$('#storageStatus').textContent = loadedStock.problem === 'corrupt'
  ? t('corrupt')
  : loadedStock.problem === 'unavailable'
    ? t('unavailable')
    : loadedStock.legacy
      ? t('legacy')
      : t('storage');
window.addEventListener('storage', event => {
  if ([StockStore.KEY, ...StockStore.LEGACY].includes(event.key) || event.key === null)
    notice(t('storageChanged'));
});

/* ===============================
   Minor helpers
==================================*/
// Check table scroll on window resize
window.addEventListener('resize', ()=>{
  checkTableScroll();
});

// A shared native popover keeps explanations inside the viewport.
const helpPopover = $('#helpPopover');
let helpSource = null;
$$('.help-icon').forEach(button => {
  button.addEventListener('click', () => {
    helpSource = button;
    helpPopover.textContent = button.dataset.tooltip;
    helpPopover.showPopover();
  });
});
$('#storageOptions').open = Boolean(loadedStock.problem);
let renderedDay = StockCore.today();
function refreshDay() {
  const day = StockCore.today();
  if (day !== renderedDay) { renderedDay = day; renderAll(); }
}
window.addEventListener('focus', refreshDay);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
setInterval(refreshDay, 60000);
document.addEventListener('languagechange', () => {
  // Render only saved data; do not hydrate or submit partially edited forms.
  renderAll();
  if (helpSource) helpPopover.textContent = helpSource.dataset.tooltip;
});
