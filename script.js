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
// 備蓄アイテムリスト（起動時にLocalStorageから読み込み＋検証）
let items = validateItems(loadJSON(LS_ITEMS, []));

// 警告閾値（月数）デフォルト2ヶ月
let alertMonths = validateAlertMonths(parseInt(localStorage.getItem(LS_ALERT_MONTHS) || '2', 10));

// 家族構成（人間：成人/子ども/高齢者、ペット：犬/猫、想定日数）
let family = validateFamily(loadJSON(LS_FAMILY, {
  adults: 1, children: 0, seniors: 0,
  dogs: 0, cats: 0, days: 7
}));

// Chart.jsインスタンス（カテゴリ別円グラフ、水充足率棒グラフ、カロリー充足率棒グラフ）
let categoryChart, waterChart, kcalChart;

// ページネーション設定
const ITEMS_PER_PAGE = 50;  // 1ページあたりの表示件数
let currentPage = 1;         // 現在のページ番号

/* ===============================
   Utilities

   LocalStorageの読み書き、日付操作などのユーティリティ関数
==================================*/

/**
 * LocalStorageからJSONデータを読み込む
 * @param {string} key - LocalStorageのキー
 * @param {*} def - デフォルト値（読み込み失敗時）
 * @returns {*} パースされたデータまたはデフォルト値
 */
function loadJSON(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; }
  catch { return def; }
}

/**
 * LocalStorageにJSONデータを保存
 * @param {string} key - LocalStorageのキー
 * @param {*} val - 保存する値（JSON.stringifyされる）
 */
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ===============================
   Validation Functions

   XSS対策・データ整合性確保のための検証関数
   インポート時やLocalStorage読み込み時に使用
==================================*/

/**
 * アイテムデータの検証とサニタイズ
 * - カテゴリをホワイトリストで検証
 * - 文字列長を制限（XSS対策）
 * - 数値の範囲チェック
 * @param {Array} data - 検証するアイテム配列
 * @returns {Array} 検証済みアイテム配列
 */
function validateItems(data) {
  if(!Array.isArray(data)) return [];
  const validCategories = ['food', 'water', 'medicine', 'pet-food', 'daily', 'tool', 'other'];
  return data.filter(item => item && typeof item === 'object').map(item => ({
    name: String(item.name || '').trim().substring(0, 200),    // 最大200文字
    category: validCategories.includes(item.category) ? item.category : 'other',
    quantity: Math.max(0, parseFloat(item.quantity) || 0),     // 非負数
    unit: String(item.unit || '').trim().substring(0, 50),     // 最大50文字
    expiry: String(item.expiry || '').substring(0, 20),        // ISO 8601形式
    kcal: item.kcal != null ? Math.max(0, parseFloat(item.kcal) || 0) : null,
    createdAt: Number(item.createdAt) || Date.now()
  })).filter(item => item.name);  // 名前なしは除外
}

/**
 * 家族構成データの検証
 * - 各人数を0〜100人に制限
 * - 想定日数を許可された値のみに制限
 * @param {Object} data - 検証する家族構成データ
 * @returns {Object} 検証済み家族構成データ
 */
function validateFamily(data) {
  if(!data || typeof data !== 'object') {
    return { adults: 1, children: 0, seniors: 0, dogs: 0, cats: 0, days: 7 };
  }
  return {
    adults: Math.max(0, Math.min(100, parseInt(data.adults, 10) || 0)),
    children: Math.max(0, Math.min(100, parseInt(data.children, 10) || 0)),
    seniors: Math.max(0, Math.min(100, parseInt(data.seniors, 10) || 0)),
    dogs: Math.max(0, Math.min(100, parseInt(data.dogs, 10) || 0)),
    cats: Math.max(0, Math.min(100, parseInt(data.cats, 10) || 0)),
    days: [3, 7, 14, 30, 180].includes(parseInt(data.days, 10)) ? parseInt(data.days, 10) : 7
  };
}

/**
 * 警告閾値（月数）の検証
 * @param {number} value - 検証する値
 * @returns {number} 1/2/3/6のいずれか（デフォルト2）
 */
function validateAlertMonths(value) {
  return [1, 2, 3, 6].includes(value) ? value : 2;
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
// 現在のテーマ（デフォルト: dark）
let currentTheme = localStorage.getItem(LS_THEME) || 'dark';

function setTheme(theme){
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem(LS_THEME, theme);

  const icon = $('#themeIcon');
  const text = $('#themeText');
  // Show the NEXT theme (what it will switch TO)
  if(theme === 'light'){
    // Currently light, will switch to dark
    icon.textContent = '🌙';
    text.textContent = 'ダークモードへ切り替え';
  }else{
    // Currently dark, will switch to light
    icon.textContent = '☀️';
    text.textContent = 'ライトモードへ切り替え';
  }

  // Re-render charts with new theme colors
  setTimeout(()=>{
    drawCategoryChart();
    drawCoverageCharts();
  }, 100);
}

$('#themeToggle').addEventListener('click', ()=>{
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// Initialize theme on load
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
$('#alertMonths').addEventListener('change', e=>{
  alertMonths = parseInt(e.target.value,10);
  localStorage.setItem(LS_ALERT_MONTHS, String(alertMonths));
  renderTable();
  renderAlerts();
});

$('#itemForm').addEventListener('submit', e=>{
  e.preventDefault();
  const idx = $('#editIndex').value !== '' ? parseInt($('#editIndex').value,10) : -1;

  // Validate and sanitize inputs
  const validCategories = ['food', 'water', 'medicine', 'pet-food', 'daily', 'tool', 'other'];
  const category = validCategories.includes($('#category').value) ? $('#category').value : 'other';

  const obj = {
    name: $('#name').value.trim().substring(0, 200), // Max length 200
    category: category,
    quantity: Math.max(0, parseFloat($('#quantity').value || '0')),
    unit: $('#unit').value.trim().substring(0, 50), // Max length 50
    expiry: $('#expiry').value || '',
    kcal: $('#kcal').value ? Math.max(0, parseFloat($('#kcal').value)) : null,
    createdAt: Date.now()
  };
  if(!obj.name || isNaN(obj.quantity)) return;

  if(idx >= 0){ items[idx] = obj; } else { items.push(obj); }
  saveJSON(LS_ITEMS, items);

  closeModal(); // Close modal after save
  renderAll();
});

$('#clearAll').addEventListener('click', ()=>{
  if(!confirm('在庫データを全削除します。よろしいですか？')) return;
  items = [];
  saveJSON(LS_ITEMS, items);
  renderAll();
});

$('#exportJson').addEventListener('click', ()=>{
  const data = {
    meta: { app: 'rollingstock-planner', ver: 1 },
    items, family, alertMonths
  };

  // Generate filename with timestamp
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;
  const filename = `rollingstock-data_${timestamp}.json`;

  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
});

$('#importJson').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  // File size check (max 10MB)
  if(file.size > 10 * 1024 * 1024){
    alert('ファイルサイズが大きすぎます（最大10MB）。');
    e.target.value = '';
    return;
  }

  try{
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate and sanitize items
    const validCategories = ['food', 'water', 'medicine', 'pet-food', 'daily', 'tool', 'other'];
    if(Array.isArray(data.items)){
      items = data.items.filter(item => item && typeof item === 'object').map(item => ({
        name: String(item.name || '').trim().substring(0, 200),
        category: validCategories.includes(item.category) ? item.category : 'other',
        quantity: Math.max(0, parseFloat(item.quantity) || 0),
        unit: String(item.unit || '').trim().substring(0, 50),
        expiry: String(item.expiry || '').substring(0, 20),
        kcal: item.kcal != null ? Math.max(0, parseFloat(item.kcal) || 0) : null,
        createdAt: Number(item.createdAt) || Date.now()
      })).filter(item => item.name); // Remove items without name
    }

    // Validate and sanitize family data
    if(data.family && typeof data.family === 'object'){
      family = {
        adults: Math.max(0, Math.min(100, parseInt(data.family.adults, 10) || 0)),
        children: Math.max(0, Math.min(100, parseInt(data.family.children, 10) || 0)),
        seniors: Math.max(0, Math.min(100, parseInt(data.family.seniors, 10) || 0)),
        dogs: Math.max(0, Math.min(100, parseInt(data.family.dogs, 10) || 0)),
        cats: Math.max(0, Math.min(100, parseInt(data.family.cats, 10) || 0)),
        days: [3, 7, 14, 30, 180].includes(parseInt(data.family.days, 10)) ? parseInt(data.family.days, 10) : 7
      };
    }

    // Validate alertMonths
    if(typeof data.alertMonths === 'number'){
      alertMonths = [1, 2, 3, 6].includes(data.alertMonths) ? data.alertMonths : 2;
    }

    saveJSON(LS_ITEMS, items);
    saveJSON(LS_FAMILY, family);
    localStorage.setItem(LS_ALERT_MONTHS, String(alertMonths));
    // update forms
    hydrateFamilyForm();
    $('#alertMonths').value = String(alertMonths);
    renderAll();
    alert('インポートしました。');
  }catch(err){
    alert('JSONの読み込みに失敗しました。');
  }finally{
    e.target.value = '';
  }
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
function hydrateFamilyForm(){
  $('#adults').value = family.adults;
  $('#children').value = family.children;
  $('#seniors').value = family.seniors;
  $('#dogs').value = family.dogs;
  $('#cats').value = family.cats;
  $('#days').value = family.days;
}
hydrateFamilyForm();

$('#familyForm').addEventListener('submit', e=>{
  e.preventDefault();
  family = {
    adults: parseInt($('#adults').value||'0',10),
    children: parseInt($('#children').value||'0',10),
    seniors: parseInt($('#seniors').value||'0',10),
    dogs: parseInt($('#dogs').value||'0',10),
    cats: parseInt($('#cats').value||'0',10),
    days: parseInt($('#days').value||'7',10)
  };
  saveJSON(LS_FAMILY, family);
  renderAll();
});

$('#resetFamily').addEventListener('click', ()=>{
  family = { adults:1, children:0, seniors:0, dogs:0, cats:0, days:7 };
  saveJSON(LS_FAMILY, family);
  hydrateFamilyForm();
  renderAll();
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
      items.splice(i,1);
      saveJSON(LS_ITEMS, items);
      renderAll();
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
