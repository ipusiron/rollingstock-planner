/* ===============================
   RollingStock Planner

   防災備蓄管理ツール - メインスクリプト

   このファイルは在庫管理、家族構成設定、アラート機能、
   AI防災アドバイザー、グラフ描画などの全機能を実装しています。

   LocalStorage Keys
==================================*/
const LS_ITEMS = 'rsp_items';              // 備蓄アイテムデータ
const LS_ALERT_MONTHS = 'rsp_alert_months'; // 警告閾値（月数）
const LS_FAMILY = 'rsp_family';            // 家族構成データ
const LS_THEME = 'rsp_theme';              // テーマ設定（dark/light）

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
let categoryChart, waterChart, kcalChart;

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
      ? '別のタブでデータが変更されました。現在の入力を控えてから再読込してください。保存は行っていません。'
      : '保存できませんでした。入力と保存済みデータは変更していません。容量や入力値を確認し、必要ならJSONをエクスポートしてください。');
    return false;
  }
  ({ items, family, alertMonths } = data);
  notice(stockStore.isSession() ? '一時利用中です。再読込で失われるため、JSONをエクスポートしてください。' : '保存しました。');
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

/**
 * ISO 8601形式の日付文字列をDateオブジェクトに変換
 * @param {string} str - 日付文字列（YYYY-MM-DD）
 * @returns {Date|null} Dateオブジェクトまたはnull
 */
function parseDate(str){
  if(!str) return null;
  const d = new Date(str + 'T00:00:00');  // 時刻を00:00:00に固定
  return isNaN(d) ? null : d;
}

/**
 * DateオブジェクトをYYYY-MM-DD形式の文字列に変換
 * @param {Date} d - Dateオブジェクト
 * @returns {string} フォーマットされた日付文字列
 */
function formatDate(d){
  if(!d) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

/**
 * 2つの日付間の月数差を計算
 * @param {Date} a - 開始日
 * @param {Date} b - 終了日
 * @returns {number} 月数差（b - a）
 */
function monthsDiff(a,b){
  return (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth());
}

/**
 * 2つの日付間の日数差を計算
 * @param {Date} a - 開始日
 * @param {Date} b - 終了日
 * @returns {number} 日数差（b - a）
 */
function daysDiff(a,b){
  return Math.floor((b - a)/(1000*60*60*24));
}

/**
 * 配列の合計値を計算
 * @param {Array<number>} arr - 数値配列
 * @returns {number} 合計値
 */
function sum(arr){ return arr.reduce((x,y)=>x+y,0); }

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
  $('#themeText').textContent = currentTheme === 'light' ? 'ダークモードへ切り替え' : 'ライトモードへ切り替え';
}
$('#themeToggle').addEventListener('click', () => setTheme(currentTheme === 'dark' ? 'light' : 'dark'));
setTheme(currentTheme);

/* ===============================
   Tabs
==================================*/
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab').forEach(b=>b.classList.remove('active'));
    $$('.tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    $('#'+id).classList.add('active');
    // redraw charts when becoming visible
    if(id==='alerts') drawCoverageCharts();
    if(id==='stock') drawCategoryChart();
  });
});

/* ===============================
   Modal Management
==================================*/
const modal = $('#itemModal');
const modalTitle = $('#modalTitle');
let originalExpiry = ''; // Store original expiry value for reset

function openModal(mode = 'add', itemIndex = -1){
  if(mode === 'edit'){
    modalTitle.textContent = 'アイテム編集';
  }else{
    modalTitle.textContent = 'アイテム追加';
  }

  $('#itemError').textContent = '';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scroll

  if(mode === 'edit' && itemIndex >= 0){
    const it = items[itemIndex];
    $('#name').value = it.name;
    $('#category').value = it.category;
    $('#quantity').value = it.quantity;
    $('#unit').value = it.unit||'';
    $('#expiry').value = it.expiry||'';
    $('#kcal').value = it.kcal!=null ? it.kcal : '';
    $('#editIndex').value = String(itemIndex);
    originalExpiry = it.expiry || ''; // Save original value
  }else{
    originalExpiry = ''; // No original value for new items
  }
}

function closeModal(){
  modal.classList.remove('active');
  document.body.style.overflow = ''; // Restore scroll

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
  if(e.key === 'Escape' && modal.classList.contains('active')){
    closeModal();
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
      quantity: $('#quantity').value, unit: $('#unit').value,
      expiry: $('#expiry').value, kcal: $('#kcal').value,
      createdAt: idx >= 0 ? items[idx].createdAt : Date.now()
    });
  } catch (_) { $('#itemError').textContent = '名前、数量、単位、期限、カロリーの入力を確認してください。'; return; }
  const nextItems = items.slice();
  if (idx >= 0) nextItems[idx] = item;
  else nextItems.push(item);
  if (!commitState({ ...currentState(), items: nextItems })) {
    $('#itemError').textContent = $('#operationStatus').textContent;
    return;
  }
  closeModal();
  renderAll();
});

$('#clearAll').addEventListener('click', () => {
  if (!confirm('在庫データを全削除します。先にJSONをエクスポートしてください。削除しますか？')) return;
  if (commitState({ ...currentState(), items: [] })) renderAll();
});
$('#exportJson').addEventListener('click', () => {
  downloadJSON({ meta: { app: 'rollingstock-planner', ver: 2 }, ...currentState() }, 'rollingstock-data');
});
$('#exportRecovery').addEventListener('click', () => {
  const raw = stockStore.recovery();
  if (raw) downloadJSON(raw, 'rollingstock-recovery-raw');
  else notice('保存領域にアクセスできず、元データを取得できません。');
});
$('#enableSession').addEventListener('click', () => {
  if (!confirm('このタブ内だけで一時利用します。再読込やタブを閉じると変更は失われます。続けますか？')) return;
  stockStore.useSession();
  $('#storageStatus').textContent = '一時利用中：変更は保存されません。終了前にJSONをエクスポートしてください。';
  notice('一時利用に切り替えました。保存できなかった操作は、入力を確認して再実行してください。');
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
    if (!confirm(candidate.items.length + '件の在庫と家族設定で置き換えます。現在のデータをエクスポート済みですか？')) return;
    if (commitState(candidate, true)) {
      currentPage = 1;
      hydrateFamilyForm();
      $('#alertMonths').value = String(alertMonths);
      renderAll();
    }
  } catch (_) {
    notice('インポートできませんでした。最大10MB・5000件、形式、数値、日付を確認してください。読込中に編集した場合も取り込みません。既存データは変更していません。');
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
  } catch (_) { notice('人数は0〜100の整数、日数と計画値は入力欄の範囲で指定してください。'); return; }
  if (commitState({ ...currentState(), family: candidate })) { hydrateFamilyForm(); renderAll(); }
});
$('#resetFamily').addEventListener('click', () => {
  if (!confirm('家族構成と計画値を初期値に戻しますか？')) return;
  if (commitState({ ...currentState(), family: StockCore.defaults() })) { hydrateFamilyForm(); renderAll(); }
});

/* ===============================
   Calculations

   備蓄量・必要量・充足率の計算関数
==================================*/

/**
 * 現在の備蓄量の合計を計算
 * - 水：カテゴリが'water'または単位が'L'/'ℓ'のアイテムの合計
 * - カロリー：kcal値を持つアイテムの合計（数量×単位カロリー）
 * @returns {Object} { waterL: 水の合計(L), kcal: カロリーの合計 }
 */
function calcTotals(){
  // 水の合計（リットル）
  let waterL = 0;
  for(const it of items){
    const unit = (it.unit||'').toLowerCase();
    if(it.category==='water' || unit==='l' || unit==='ℓ'){
      // 単位がLの場合、数量はすでにリットル単位
      // 例：2Lペットボトル6本 → 数量=12、単位=L
      waterL += Number(it.quantity)||0;
    }
  }

  // カロリーの合計（kcal）
  const kcal = sum(items.filter(i=>i.kcal!=null).map(i=> (Number(i.kcal)||0) * (Number(i.quantity)||0) ));

  return { waterL, kcal };
}

/**
 * 家族構成に基づく必要量を計算
 *
 * 水の必要量（1日あたり）：
 * - 成人: 4L/日
 * - 子ども: 2L/日
 * - 高齢者: 3L/日
 * - 犬: 1L/日
 * - 猫: 0.3L/日
 *
 * カロリーの必要量（1日あたり）：
 * - 成人: 2000kcal/日
 * - 子ども: 1400kcal/日
 * - 高齢者: 1800kcal/日
 *
 * @returns {Object} { needWater: 必要水量(L), needKcal: 必要カロリー(kcal) }
 */
function calcNeeds(){
  const d = family.days;
  const waterPerDay =
    family.adults*4 + family.children*2 + family.seniors*3
    + family.dogs*1 + family.cats*0.3;
  const kcalPerDay =
    family.adults*2000 + family.children*1400 + family.seniors*1800;
  return { needWater: waterPerDay * d, needKcal: kcalPerDay * d };
}

/**
 * 備蓄の充足率を計算
 * @returns {Object} {
 *   waterCov: 水の充足率(%)、
 *   kcalCov: カロリーの充足率(%)、
 *   totals: 現在の備蓄量、
 *   needs: 必要量
 * }
 */
function coverage(){
  const t = calcTotals();
  const n = calcNeeds();
  const waterCov = n.needWater ? Math.min(100, Math.round(t.waterL / n.needWater * 100)) : 0;
  const kcalCov = n.needKcal ? Math.min(100, Math.round(t.kcal / n.needKcal * 100)) : 0;
  return { waterCov, kcalCov, totals: t, needs: n };
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
  const now = new Date();

  // 日付のみの比較用（時刻を0:00:00に統一）
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 警告閾値の日付（今日 + alertMonths ヶ月）
  const warnEdge = new Date(now);
  warnEdge.setMonth(now.getMonth() + alertMonths);

  let filtered = items.map((it, idx)=> ({...it, idx}));
  if(q){
    filtered = filtered.filter(it=>{
      return [it.name, it.category, it.unit].filter(Boolean).some(s=>String(s).toLowerCase().includes(q));
    });
  }

  filtered.sort((a,b)=>{
    const da = a.expiry ? parseDate(a.expiry) : null;
    const db = b.expiry ? parseDate(b.expiry) : null;
    if(sort==='expiryAsc'){
      if(!da && !db) return 0; if(!da) return 1; if(!db) return -1; return da-db;
    }else if(sort==='expiryDesc'){
      if(!da && !db) return 0; if(!da) return 1; if(!db) return -1; return db-da;
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

  // Empty state
  if(items.length === 0){
    tbody.innerHTML = `
      <tr><td colspan="8" class="empty-state">
        <h3>まだアイテムが登録されていません</h3>
        <p>上のフォームから備蓄品を追加してください</p>
      </td></tr>
    `;
    $('#summaryRow').textContent = '登録件数：0';
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

    // status badge (4 states: expired, today, warning, ok)
    let badge = '<span class="badge">—</span>';
    if(it.expiry){
      const d = parseDate(it.expiry);
      if(d){
        if(d < today) badge = '<span class="badge red">期限切れ</span>';
        else if(d < tomorrow) badge = '<span class="badge orange">本日期限</span>';
        else if(d <= warnEdge) badge = '<span class="badge yellow">要消費</span>';
        else badge = '<span class="badge green">OK</span>';
      }
    }

    const kcalText = it.kcal!=null ? `${(it.kcal*it.quantity).toLocaleString()} kcal` : '—';

    // Category badge with color
    const categoryLabel = labelForCategory(it.category);
    const validCategories = ['food', 'water', 'medicine', 'pet-food', 'daily', 'tool', 'other'];
    const safeCategory = validCategories.includes(it.category) ? it.category : 'other';
    const categoryBadge = `<span class="category-badge ${safeCategory}">${escapeHtml(categoryLabel)}</span>`;

    tr.innerHTML = `
      <td>${escapeHtml(it.name)}</td>
      <td>${categoryBadge}</td>
      <td>${fmtNum(it.quantity)}</td>
      <td>${escapeHtml(it.unit||'')}</td>
      <td>${it.expiry ? escapeHtml(it.expiry) : '—'}</td>
      <td>${kcalText}</td>
      <td>${badge}</td>
      <td>
        <button class="btn" data-edit="${it.idx}">編集</button>
        <button class="btn danger" data-del="${it.idx}">削除</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

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
      if(!confirm(`「${items[i].name}」を削除します。よろしいですか？`)) return;
      const nextItems = items.filter((_, index) => index !== i);
      if (commitState({ ...currentState(), items: nextItems })) renderAll();
    });
  });

  // summary
  const { waterL, kcal } = calcTotals();
  $('#waterTotal').textContent = `${fmtNum(waterL)} L`;
  $('#kcalTotal').textContent = `${fmtNum(kcal)} kcal`;
  $('#summaryRow').textContent = `登録件数：${items.length}　｜　水：${fmtNum(waterL)} L　｜　食料エネルギー：${fmtNum(kcal)} kcal`;

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
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';
  pagination.innerHTML = `
    <button class="btn" id="prevPage" ${currentPage <= 1 ? 'disabled' : ''}>前へ</button>
    <span class="page-info">${currentPage} / ${totalPages} ページ</span>
    <button class="btn" id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>次へ</button>
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
    'food':'食料', 'water':'水', 'medicine':'医薬品', 'pet-food':'ペットフード',
    'daily':'生活用品', 'tool':'ツール', 'other':'その他'
  };
  return map[c] || c;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fmtNum(n){
  const v = Number(n);
  if(Number.isNaN(v)) return '—';
  return (Math.round(v*100)/100).toLocaleString();
}

/* ===============================
   Alerts & Suggestions
==================================*/
function renderAlerts(){
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Midnight of today
  const warnEdge = new Date(now);
  warnEdge.setMonth(now.getMonth()+alertMonths);

  const expired = [];
  const near = [];
  const rollingThisWeek = []; // items expiring within 7 days after warnEdge? No: items with no expiry but category food/water -> if plenty, suggest consume. For simplicity, choose near list also.
  for(const it of items){
    if(!it.expiry) continue;
    const d = parseDate(it.expiry);
    if(!d) continue;
    if(d < today) expired.push(it);
    else if(d <= warnEdge) near.push(it);
    const diff = daysDiff(now, d);
    if(diff >= 0 && diff <= 14) rollingThisWeek.push(it);
  }

  const expiryUl = $('#expiryList');
  expiryUl.innerHTML = '';
  [...expired, ...near].forEach(it=>{
    const li = document.createElement('li');
    const tag = (parseDate(it.expiry) < today) ? '期限切れ' : '期限近';
    li.innerHTML = `<strong>[${tag}]</strong> ${escapeHtml(it.name)} / ${fmtNum(it.quantity)} ${escapeHtml(it.unit||'')} / 期限: ${escapeHtml(it.expiry)}`;
    expiryUl.appendChild(li);
  });
  if(expiryUl.children.length===0){
    expiryUl.innerHTML = '<li>該当なし</li>';
  }

  const rollingUl = $('#rollingList');
  rollingUl.innerHTML = '';
  if(rollingThisWeek.length){
    rollingThisWeek.sort((a,b)=>parseDate(a.expiry)-parseDate(b.expiry));
    rollingThisWeek.forEach(it=>{
      const li = document.createElement('li');
      li.textContent = `${it.name}（${it.expiry} までに消費推奨）`;
      rollingUl.appendChild(li);
    });
  }else{
    rollingUl.innerHTML = '<li>今週の推奨消費対象はありません</li>';
  }

  // Expert analysis
  generateExpertAnalysis(expired, near, rollingThisWeek);
  drawCoverageCharts();
}

/* ===============================
   Expert Analysis

   AI防災アドバイザー機能
   備蓄状況を5つの観点から総合分析し、具体的なアクションを提案
==================================*/

/**
 * 専門家による備蓄分析を生成
 *
 * 分析項目：
 * 1. 総合評価（優秀/良好/要改善/緊急対応必要）
 * 2. 水・食料の充足状況（不足量の具体的な提示）
 * 3. 期限管理状況（期限切れ・期限間近の件数）
 * 4. カテゴリバランス（多様性のチェック）
 * 5. 具体的なアクション（家族構成に応じた個別提案）
 *
 * @param {Array} expired - 期限切れアイテムリスト
 * @param {Array} near - 期限間近アイテムリスト
 * @param {Array} rolling - ローリングストック推奨アイテムリスト
 */
function generateExpertAnalysis(expired, near, rolling){
  const cov = coverage();
  const totalItems = items.length;

  // カテゴリ別のアイテム数を集計
  const categories = {};
  for(const it of items){
    categories[it.category] = (categories[it.category] || 0) + 1;
  }

  // 分析セクションを構築
  const sections = [];

  // 1. 総合評価（充足率と期限切れ数から総合判定）
  let overallGrade = '';
  let overallMsg = '';
  let gradeClass = '';
  const avgCoverage = (cov.waterCov + cov.kcalCov) / 2;

  if(avgCoverage >= 100 && expired.length === 0){
    overallGrade = '優秀';
    overallMsg = '備蓄体制は非常に良好です。現在の管理体制を継続してください。';
    gradeClass = 'grade-excellent';
  }else if(avgCoverage >= 80 && expired.length <= 2){
    overallGrade = '良好';
    overallMsg = '概ね良好な備蓄状態です。一部改善の余地があります。';
    gradeClass = 'grade-good';
  }else if(avgCoverage >= 50){
    overallGrade = '要改善';
    overallMsg = '備蓄が不足しています。早急に補充を検討してください。';
    gradeClass = 'grade-warning';
  }else{
    overallGrade = '緊急対応必要';
    overallMsg = '備蓄が著しく不足しています。至急、必要物資を確保してください。';
    gradeClass = 'grade-critical';
  }

  sections.push(`<div class="analysis-section overall-grade">
    <h4>📊 総合評価</h4>
    <div class="grade-badge ${gradeClass}">${overallGrade}</div>
    <p class="grade-message">${overallMsg}</p>
  </div>`);

  // 2. Coverage analysis
  const coverageAnalysis = [];
  if(cov.waterCov < 100){
    const shortage = Math.ceil(cov.needs.needWater - cov.totals.waterL);
    const urgency = cov.waterCov < 50 ? 'critical-shortage' : 'shortage';
    coverageAnalysis.push(`<div class="coverage-item ${urgency}">
      <strong>💧 水：</strong>目標の<span class="coverage-percent">${cov.waterCov}%</span>
      <span class="shortage-amount">不足 ${shortage}L</span>
      <div class="action-hint">→ 2Lペットボトルで約${Math.ceil(shortage/2)}本の追加購入を推奨</div>
    </div>`);
  }else{
    coverageAnalysis.push(`<div class="coverage-item ok">
      <strong>💧 水：</strong>目標達成（<span class="coverage-percent ok">${cov.waterCov}%</span>）適切に管理されています。
    </div>`);
  }

  if(cov.kcalCov < 100){
    const shortage = Math.ceil(cov.needs.needKcal - cov.totals.kcal);
    const cansNeeded = Math.ceil(shortage / 300); // 1缶約300kcal想定
    const urgency = cov.kcalCov < 50 ? 'critical-shortage' : 'shortage';
    coverageAnalysis.push(`<div class="coverage-item ${urgency}">
      <strong>🍱 食料：</strong>目標の<span class="coverage-percent">${cov.kcalCov}%</span>
      <span class="shortage-amount">不足 ${fmtNum(shortage)} kcal</span>
      <div class="action-hint">→ 缶詰・レトルト約${cansNeeded}個分の補充が必要</div>
    </div>`);
  }else{
    coverageAnalysis.push(`<div class="coverage-item ok">
      <strong>🍱 食料：</strong>目標達成（<span class="coverage-percent ok">${cov.kcalCov}%</span>）適切に管理されています。
    </div>`);
  }

  sections.push(`<div class="analysis-section">
    <h4>💧 水・食料の充足状況</h4>
    <div class="coverage-grid">${coverageAnalysis.join('')}</div>
  </div>`);

  // 3. Expiry management
  const expiryAnalysis = [];
  if(expired.length > 0){
    expiryAnalysis.push(`<strong class="warning">⚠️ 期限切れ：${expired.length}件</strong> - 至急確認し、処分または消費を検討してください。`);
  }
  if(near.length > 0){
    expiryAnalysis.push(`<strong class="caution">⏰ 期限間近：${near.length}件</strong> - ${alertMonths}ヶ月以内に期限が到来します。計画的に消費しましょう。`);
  }
  if(rolling.length > 0){
    expiryAnalysis.push(`<strong>🔄 ローリングストック推奨：${rolling.length}件</strong> - 日常生活で消費し、新しいものと入れ替えてください。`);
  }
  if(expired.length === 0 && near.length === 0){
    expiryAnalysis.push(`<strong class="good">✅ 期限管理：良好</strong> - 期限切れ・期限間近のアイテムはありません。`);
  }

  sections.push(`<div class="analysis-section">
    <h4>📅 期限管理状況</h4>
    <p>${expiryAnalysis.join('<br>')}</p>
  </div>`);

  // 4. Category balance
  const categoryAnalysis = [];
  const categoryCount = Object.keys(categories).length;

  if(categoryCount >= 5){
    categoryAnalysis.push('✅ カテゴリバランスは良好です（水・食料・医薬品・生活用品など）。');
  }else if(categoryCount >= 3){
    categoryAnalysis.push('⚠️ カテゴリがやや偏っています。医薬品・生活用品・ツール類も検討してください。');
  }else{
    categoryAnalysis.push('🔴 カテゴリが偏っています。多様な備蓄を心がけましょう。');
  }

  if(!categories['medicine'] && !categories['医薬品']){
    categoryAnalysis.push('💊 医薬品が未登録です。常備薬・救急セットを備蓄してください。');
  }
  if(!categories['daily'] && !categories['生活用品']){
    categoryAnalysis.push('🧻 生活用品（トイレットペーパー、石けん等）を追加推奨。');
  }

  sections.push(`<div class="analysis-section">
    <h4>📦 カテゴリバランス（${categoryCount}種類登録）</h4>
    <p>${categoryAnalysis.join('<br>')}</p>
  </div>`);

  // 5. Actionable recommendations
  const recommendations = [];

  if(totalItems === 0){
    recommendations.push('📝 まずは基本的な備蓄から始めましょう：水、保存食、医薬品、懐中電灯。');
  }else{
    if(cov.waterCov < 70) recommendations.push('💧 最優先：水の備蓄を増やしてください。');
    if(cov.kcalCov < 70) recommendations.push('🍱 次に：長期保存可能な食料（缶詰・レトルト）を追加してください。');
    if(expired.length > 3) recommendations.push('⚠️ 期限切れアイテムが多数あります。定期的な見直しが必要です。');
    if(rolling.length > 5) recommendations.push('🔄 ローリングストック対象が多数あります。週次で計画的に消費しましょう。');

    // Family-based recommendations
    const totalPeople = family.adults + family.children + family.seniors;
    const totalPets = family.dogs + family.cats;
    if(totalPets > 0 && (!categories['pet-food'] && !categories['ペットフード'])){
      recommendations.push('🐾 ペット用の備蓄（餌・水）を忘れずに追加してください。');
    }
    if(family.children > 0){
      recommendations.push('👶 乳幼児がいる場合、粉ミルク・離乳食・おむつも必須です。');
    }
    if(family.seniors > 0){
      recommendations.push('👴 高齢者向けに、常備薬・介護用品・やわらかい食品を考慮してください。');
    }
  }

  if(recommendations.length === 0){
    recommendations.push('✅ 現在の備蓄は充実しています。定期的なメンテナンスを継続してください。');
  }

  sections.push(`<div class="analysis-section">
    <h4>💡 具体的なアクション</h4>
    <ul class="recommendation-list">
      ${recommendations.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>`);

  // Render
  $('#expertAnalysis').innerHTML = sections.join('');
}

/* ===============================
   Charts
==================================*/
function getChartTextColor(){
  return currentTheme === 'light' ? '#1a1a1a' : '#cbd5e1';
}

function drawCategoryChart(){
  if (typeof Chart === 'undefined') return;
  const ctx = $('#categoryChart');
  if(!ctx) return;

  const counts = {};
  for(const it of items){
    counts[it.category] = (counts[it.category]||0) + (Number(it.quantity)||0);
  }
  const labels = Object.keys(counts).map(labelForCategory);
  const data = Object.values(counts);

  if(categoryChart){
    categoryChart.destroy();
    categoryChart = null;
  }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets:[{ data }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins:{
        legend:{
          labels:{
            color: getChartTextColor(),
            boxWidth: 20,
            boxHeight: 20,
            padding: 15,
            font: {
              size: 13
            }
          },
          position: 'bottom',
          align: 'start'
        }
      }
    }
  });
}

function drawCoverageCharts(){
  if (typeof Chart === 'undefined') return;
  const cov = coverage();
  const wctx = $('#waterChart');
  const kctx = $('#kcalChart');

  if(!wctx || !kctx) return;

  if(waterChart){
    waterChart.destroy();
    waterChart = null;
  }
  if(kcalChart){
    kcalChart.destroy();
    kcalChart = null;
  }

  const chartColor = getChartTextColor();

  waterChart = new Chart(wctx, {
    type:'bar',
    data:{
      labels:['必要量','在庫','達成率(%)'],
      datasets:[{ data:[cov.needs.needWater, cov.totals.waterL, cov.waterCov] }]
    },
    options:{
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      scales:{
        x:{ ticks:{ color: chartColor } },
        y:{ ticks:{ color: chartColor }, beginAtZero: true }
      },
      plugins:{ legend:{ display:false } }
    }
  });

  kcalChart = new Chart(kctx, {
    type:'bar',
    data:{
      labels:['必要量','在庫','達成率(%)'],
      datasets:[{ data:[cov.needs.needKcal, cov.totals.kcal, cov.kcalCov] }]
    },
    options:{
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      scales:{
        x:{ ticks:{ color: chartColor } },
        y:{ ticks:{ color: chartColor }, beginAtZero: true }
      },
      plugins:{ legend:{ display:false } }
    }
  });

  // Family panel KPIs
  $('#needWater').textContent = `${fmtNum(cov.needs.needWater)} L`;
  $('#needKcal').textContent = `${fmtNum(cov.needs.needKcal)} kcal`;
  $('#coverage').textContent = `水 ${cov.waterCov}% ｜ カロリー ${cov.kcalCov}%`;
}

/* ===============================
   Init
==================================*/
function renderAll(){
  renderTable();
  renderAlerts();
}
renderAll();
$('#storageStatus').textContent = loadedStock.problem === 'corrupt'
  ? '保存データの形式を確認できません。元データは変更していません。「元データを救出」で保管し、正しいJSONをインポートするか、一時利用を選んでください。'
  : loadedStock.problem === 'unavailable'
    ? '保存領域を利用できません。保存する操作は停止しています。一時利用を選ぶと、このタブ内だけで操作できます。'
    : loadedStock.legacy
      ? '保存済みの在庫を読み込みました。計画水量は1人1日3L、ペットの水量は未設定です。単位と計画値を確認してください。元の保存キーは変更しません。'
      : 'このブラウザーに保存します。定期的にJSONをエクスポートしてください。';
window.addEventListener('storage', event => {
  if ([StockStore.KEY, ...StockStore.LEGACY].includes(event.key) || event.key === null)
    notice('別のタブで保存データが変更されました。未保存の入力を控えてから再読込してください。');
});

/* ===============================
   Minor helpers
==================================*/
// Check table scroll on window resize
window.addEventListener('resize', ()=>{
  checkTableScroll();
});

// Mobile: Toggle tooltip on tap
document.addEventListener('click', (e)=>{
  if(e.target.classList.contains('help-icon')){
    e.preventDefault();
    e.stopPropagation();
    // Toggle active class
    const wasActive = e.target.classList.contains('active');
    // Remove active from all help icons
    $$('.help-icon').forEach(icon => icon.classList.remove('active'));
    // Toggle current icon
    if(!wasActive){
      e.target.classList.add('active');
    }
  }else{
    // Close all tooltips when clicking outside
    $$('.help-icon').forEach(icon => icon.classList.remove('active'));
  }
});
