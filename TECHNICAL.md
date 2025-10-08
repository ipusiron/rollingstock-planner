# RollingStock Planner - 技術詳細ドキュメント

開発者向けの技術実装詳細、アルゴリズム解説、設計思想を記載したドキュメントです。

---

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [セキュリティ実装](#セキュリティ実装)
3. [4段階期限判定アルゴリズム](#4段階期限判定アルゴリズム)
4. [AI防災アドバイザーのスコアリング](#ai防災アドバイザーのスコアリング)
5. [必要量計算ロジック](#必要量計算ロジック)
6. [テーマシステムとChart.js統合](#テーマシステムとchartjs統合)
7. [レスポンシブツールチップ実装](#レスポンシブツールチップ実装)
8. [データ永続化と検証](#データ永続化と検証)
9. [ページネーション実装](#ページネーション実装)
10. [パフォーマンス最適化](#パフォーマンス最適化)

---

## アーキテクチャ概要

### 技術スタック

- **フロントエンド**: Vanilla JavaScript（フレームワーク不使用）
- **データ永続化**: LocalStorage
- **グラフ描画**: Chart.js 3.x
- **スタイリング**: CSS3（CSS Variables + メディアクエリ）
- **デプロイ**: GitHub Pages（静的ホスティング）

### 設計思想

1. **Zero Dependencies（最小依存）**
   - Chart.js 以外の外部ライブラリを使用しない
   - フレームワーク不要で軽量・高速
   - オフライン動作可能

2. **Privacy-First（プライバシー優先）**
   - すべてのデータをクライアント側で処理
   - サーバー送信なし
   - アカウント登録不要

3. **Progressive Enhancement（段階的機能向上）**
   - 基本機能はすべてのブラウザーで動作
   - モダンブラウザーで高度な機能を提供

4. **Accessibility（アクセシビリティ）**
   - セマンティックHTML
   - キーボード操作対応
   - スクリーンリーダー対応（role属性）

### ファイル構成

```
script.js    (1000行) - アプリケーションロジック
style.css    (1200行) - スタイル定義
index.html   (800行)  - マークアップ
```

---

## セキュリティ実装

### XSS対策

#### 1. HTML エスケープ関数

すべてのユーザー入力を表示前にエスケープ：

```javascript
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}
```

**使用例**：
```javascript
// ❌ 危険：直接HTML挿入
li.innerHTML = item.name;

// ✅ 安全：エスケープ後に挿入
li.innerHTML = escapeHtml(item.name);
```

#### 2. カテゴリホワイトリスト方式

CSSクラス名として使用されるカテゴリを制限：

```javascript
const validCategories = [
  'food', 'water', 'medicine',
  'pet-food', 'daily', 'tool', 'other'
];

// カテゴリをホワイトリストで検証
category: validCategories.includes(item.category)
  ? item.category
  : 'other'
```

**理由**：
- ユーザー入力をそのままCSSクラス名に使用すると、任意のスタイル注入が可能
- ホワイトリスト方式で安全なカテゴリのみ許可

#### 3. 入力長制限

```javascript
validateItems(data) {
  return data.map(item => ({
    name: String(item.name || '').trim().substring(0, 200),    // 最大200文字
    unit: String(item.unit || '').trim().substring(0, 50),     // 最大50文字
    expiry: String(item.expiry || '').substring(0, 20),        // ISO 8601形式
    // ...
  }));
}
```

**効果**：
- DoS攻撃の防止（巨大データの挿入を防ぐ）
- LocalStorageの容量制限対策
- UI表示の破綻防止

#### 4. セキュリティヘッダー

```html
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
<meta http-equiv="X-Frame-Options" content="DENY" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
```

- **X-Content-Type-Options**: MIMEタイプスニッフィング防止
- **X-Frame-Options**: クリックジャッキング攻撃防止
- **Referrer-Policy**: リファラー情報の漏洩防止

#### 5. ファイルサイズ制限

```javascript
$('#importJson').addEventListener('change', async (e)=>{
  const file = e.target.files[0];

  // 最大10MBに制限
  if(file.size > 10 * 1024 * 1024){
    alert('ファイルサイズが大きすぎます（最大10MB）。');
    e.target.value = '';
    return;
  }
  // ...
});
```

---

## 4段階期限判定アルゴリズム

### 概要

アイテムの賞味/消費期限を4段階で自動判定：

1. 🔴 **期限切れ**（red）: 昨日以前
2. 🟠 **本日期限**（orange）: 今日
3. 🟡 **要消費**（yellow）: 警告閾値以内
4. 🟢 **OK**（green）: 警告閾値を超えている

### 実装の要点

#### 1. 日付のみの比較（時刻を無視）

```javascript
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 0:00:00
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
```

**重要**：
- `new Date()` は現在時刻を含む（例：2025-10-08 14:30:45）
- 期限日は日付のみ（例：2025-10-08）
- 時刻を含めて比較すると、今日の0時～現在時刻の間が「期限切れ」と誤判定される
- 解決策：`today` を0時0分0秒に設定して比較

#### 2. 判定ロジック

```javascript
function renderTable(){
  // ...
  const warnEdge = new Date(now);
  warnEdge.setMonth(now.getMonth() + alertMonths);  // 警告閾値

  for(const it of paginatedItems){
    let badge = '<span class="badge">—</span>';
    if(it.expiry){
      const d = parseDate(it.expiry);  // YYYY-MM-DDをDate化
      if(d){
        if(d < today)
          badge = '<span class="badge red">期限切れ</span>';
        else if(d < tomorrow)
          badge = '<span class="badge orange">本日期限</span>';
        else if(d <= warnEdge)
          badge = '<span class="badge yellow">要消費</span>';
        else
          badge = '<span class="badge green">OK</span>';
      }
    }
    // ...
  }
}
```

#### 3. 判定フロー図

```
入力: 期限日 d, 今日 today, 明日 tomorrow, 警告閾値 warnEdge

d < today?
  Yes → 🔴 期限切れ
  No  → d < tomorrow?
          Yes → 🟠 本日期限
          No  → d <= warnEdge?
                  Yes → 🟡 要消費
                  No  → 🟢 OK
```

#### 4. エッジケース処理

```javascript
function parseDate(str){
  if(!str) return null;  // 期限なし → nullを返す
  const d = new Date(str + 'T00:00:00');  // ISO 8601形式
  return isNaN(d) ? null : d;  // 不正な日付 → null
}
```

**処理されるケース**：
- 期限未入力（`expiry: ''`） → ステータスなし（`—`）
- 不正な日付（`expiry: 'invalid'`） → ステータスなし
- 過去の日付（`expiry: '2020-01-01'`） → 🔴 期限切れ

---

## AI防災アドバイザーのスコアリング

### 概要

備蓄状況を5つの観点から総合分析し、具体的なアクションを提案：

1. **総合評価**（4段階グレード）
2. **水・食料の充足状況**（不足量の具体的提示）
3. **期限管理状況**（期限切れ・間近の件数）
4. **カテゴリバランス**（多様性チェック）
5. **具体的なアクション**（家族構成に応じた提案）

### 総合評価アルゴリズム

```javascript
function generateExpertAnalysis(expired, near, rolling){
  const cov = coverage();  // 充足率を計算
  const avgCoverage = (cov.waterCov + cov.kcalCov) / 2;

  let overallGrade = '';
  let gradeClass = '';

  if(avgCoverage >= 100 && expired.length === 0){
    overallGrade = '優秀';
    gradeClass = 'grade-excellent';
  }else if(avgCoverage >= 80 && expired.length <= 2){
    overallGrade = '良好';
    gradeClass = 'grade-good';
  }else if(avgCoverage >= 50){
    overallGrade = '要改善';
    gradeClass = 'grade-warning';
  }else{
    overallGrade = '緊急対応必要';
    gradeClass = 'grade-critical';
  }
  // ...
}
```

### 判定基準

| グレード | 条件 | 視覚効果 |
|---------|------|---------|
| 優秀 | 充足率≧100% AND 期限切れ=0件 | 緑グラデーション + パルスアニメーション |
| 良好 | 充足率≧80% AND 期限切れ≦2件 | 青グラデーション + パルスアニメーション |
| 要改善 | 充足率≧50% | 橙グラデーション + パルスアニメーション |
| 緊急対応必要 | 充足率<50% | 赤グラデーション + パルスアニメーション |

### 不足量の具体的提示

```javascript
// 水の不足分析
if(cov.waterCov < 100){
  const shortage = Math.ceil(cov.needs.needWater - cov.totals.waterL);
  const bottles = Math.ceil(shortage / 2);  // 2Lペットボトル換算

  coverageAnalysis.push(`
    <strong>💧 水：</strong>目標の<span>${cov.waterCov}%</span>
    <span class="shortage-amount">不足 ${shortage}L</span>
    <div class="action-hint">
      → 2Lペットボトルで約${bottles}本の追加購入を推奨
    </div>
  `);
}

// 食料の不足分析
if(cov.kcalCov < 100){
  const shortage = Math.ceil(cov.needs.needKcal - cov.totals.kcal);
  const cansNeeded = Math.ceil(shortage / 300);  // 1缶約300kcal想定

  coverageAnalysis.push(`
    <strong>🍱 食料：</strong>目標の<span>${cov.kcalCov}%</span>
    <span class="shortage-amount">不足 ${shortage} kcal</span>
    <div class="action-hint">
      → 缶詰・レトルト約${cansNeeded}個分の補充が必要
    </div>
  `);
}
```

### カテゴリバランス分析

```javascript
const categories = {};
for(const it of items){
  categories[it.category] = (categories[it.category] || 0) + 1;
}
const categoryCount = Object.keys(categories).length;

if(categoryCount >= 5){
  categoryAnalysis.push('✅ カテゴリバランスは良好です');
}else if(categoryCount >= 3){
  categoryAnalysis.push('⚠️ カテゴリがやや偏っています');
}else{
  categoryAnalysis.push('🔴 カテゴリが偏っています');
}

// 必須カテゴリの欠落チェック
if(!categories['medicine']){
  categoryAnalysis.push('💊 医薬品が未登録です');
}
if(!categories['daily']){
  categoryAnalysis.push('🧻 生活用品を追加推奨');
}
```

### 家族構成に応じた提案

```javascript
const totalPets = family.dogs + family.cats;

if(totalPets > 0 && !categories['pet-food']){
  recommendations.push('🐾 ペット用の備蓄を追加してください');
}
if(family.children > 0){
  recommendations.push('👶 乳幼児がいる場合、粉ミルク・離乳食も必須');
}
if(family.seniors > 0){
  recommendations.push('👴 高齢者向けに、常備薬・介護食を考慮');
}
```

---

## 必要量計算ロジック

### 水の必要量（1日あたり）

```javascript
function calcNeeds(){
  const waterPerDay =
    family.adults * 4 +      // 成人: 4L/日
    family.children * 2 +    // 子ども: 2L/日
    family.seniors * 3 +     // 高齢者: 3L/日
    family.dogs * 1 +        // 犬: 1L/日
    family.cats * 0.3;       // 猫: 0.3L/日

  const needWater = waterPerDay * family.days;
  // ...
}
```

**根拠**：
- 成人: 飲料2L + 調理・衛生2L = 4L
- 子ども: 体格が小さいため半分
- 高齢者: 脱水リスクを考慮して3L
- 犬: 体重10kg想定で1L
- 猫: 体重5kg想定で0.3L

### カロリーの必要量（1日あたり）

```javascript
const kcalPerDay =
  family.adults * 2000 +     // 成人: 2000kcal/日
  family.children * 1400 +   // 子ども: 1400kcal/日
  family.seniors * 1800;     // 高齢者: 1800kcal/日

const needKcal = kcalPerDay * family.days;
```

**根拠**：
- 成人: 厚生労働省「日本人の食事摂取基準」に準拠
- 子ども: 6-11歳の平均摂取カロリー
- 高齢者: 活動量低下を考慮

### 充足率の計算

```javascript
function coverage(){
  const t = calcTotals();   // 現在の備蓄量
  const n = calcNeeds();    // 必要量

  // 充足率（上限100%）
  const waterCov = n.needWater
    ? Math.min(100, Math.round(t.waterL / n.needWater * 100))
    : 0;
  const kcalCov = n.needKcal
    ? Math.min(100, Math.round(t.kcal / n.needKcal * 100))
    : 0;

  return { waterCov, kcalCov, totals: t, needs: n };
}
```

**工夫点**：
- 100%を上限とする（150%などと表示しない）
- 必要量が0の場合（家族0人）は0%とする

---

## テーマシステムとChart.js統合

### CSS Variables によるテーマ切り替え

```css
:root{
  --bg:#0b0c0f;
  --text:#e8eaed;
  --accent:#4cc9f0;
  /* ... */
}

[data-theme="light"]{
  --bg:#fafafa;
  --text:#1a1a1a;
  --accent:#2563eb;
  /* ... */
}
```

### Chart.js のテーマ連動

```javascript
function getChartTextColor(){
  return currentTheme === 'light' ? '#1a1a1a' : '#cbd5e1';
}

function setTheme(theme){
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem(LS_THEME, theme);

  // Chart.js を再描画してテーマ反映
  setTimeout(()=>{
    drawCategoryChart();
    drawCoverageCharts();
  }, 100);
}
```

**課題と解決策**：
- Chart.js は CSS Variables を直接参照できない
- 解決策：テーマ切り替え時にグラフを再描画
- 100ms の遅延でCSS transitionを待つ

### グラフの破棄と再生成

```javascript
function drawCategoryChart(){
  const ctx = $('#categoryChart');

  // 既存のグラフを破棄
  if(categoryChart){
    categoryChart.destroy();
    categoryChart = null;
  }

  // 新しいグラフを生成
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: { /* ... */ },
    options: {
      plugins:{
        legend:{
          labels:{ color: getChartTextColor() }  // テーマに応じた色
        }
      }
    }
  });
}
```

---

## レスポンシブツールチップ実装

### 課題

モーダル内の2列グリッドで、右列のツールチップが画面からはみ出す：

```
┌─────────────────────────┐
│ 左列        │ 右列? → │ ツールチップ切れる
└─────────────────────────┘
```

### 解決策：列に応じた位置調整

```css
/* 基本：左揃え */
.help-icon[data-tooltip]::before{
  left:0;
  /* ... */
}

/* 右列（偶数番目）：右揃え */
.modal-body .grid > div:nth-child(even) .help-icon[data-tooltip]::before{
  left:auto;
  right:0;
}

/* モバイル：すべて左揃えに統一 */
@media (max-width:640px){
  .modal-body .grid > div:nth-child(even) .help-icon[data-tooltip]::before{
    left:0;
    right:auto;
  }
}
```

### レスポンシブ幅調整

```css
.help-icon[data-tooltip]::before{
  min-width:min(200px, 60vw);   /* 狭い画面でも適応 */
  max-width:min(280px, 85vw);   /* 画面幅の85%まで */
}
```

---

## データ永続化と検証

### LocalStorage 構造

```javascript
localStorage['rsp_items']        // アイテムデータ（JSON配列）
localStorage['rsp_family']       // 家族構成（JSON）
localStorage['rsp_alert_months'] // 警告閾値（文字列）
localStorage['rsp_theme']        // テーマ（'dark' | 'light'）
```

### 起動時の検証フロー

```javascript
// 1. LocalStorageから読み込み
let items = loadJSON(LS_ITEMS, []);

// 2. データ検証
items = validateItems(items);

// 3. 検証結果を保存
saveJSON(LS_ITEMS, items);
```

### 検証関数の実装

```javascript
function validateItems(data) {
  // 配列でなければ空配列
  if(!Array.isArray(data)) return [];

  const validCategories = ['food', 'water', /* ... */];

  return data
    .filter(item => item && typeof item === 'object')  // オブジェクトのみ
    .map(item => ({
      name: String(item.name || '').trim().substring(0, 200),
      category: validCategories.includes(item.category)
        ? item.category
        : 'other',
      quantity: Math.max(0, parseFloat(item.quantity) || 0),
      // ... 他のフィールドも同様に検証
    }))
    .filter(item => item.name);  // 名前なしは除外
}
```

**検証内容**：
1. 型チェック（配列、オブジェクト）
2. カテゴリのホワイトリスト検証
3. 文字列長の制限
4. 数値の範囲チェック（非負数）
5. 必須フィールドの確認

### インポート時の検証

```javascript
$('#importJson').addEventListener('change', async (e)=>{
  try{
    const text = await file.text();
    const data = JSON.parse(text);

    // 1. ファイルサイズチェック
    if(file.size > 10 * 1024 * 1024){
      alert('ファイルサイズが大きすぎます');
      return;
    }

    // 2. データ構造の検証
    if(Array.isArray(data.items)){
      items = validateItems(data.items);
    }
    if(data.family && typeof data.family === 'object'){
      family = validateFamily(data.family);
    }

    // 3. 検証済みデータを保存
    saveJSON(LS_ITEMS, items);
    saveJSON(LS_FAMILY, family);

    renderAll();
    alert('インポートしました。');
  }catch(err){
    alert('JSONの読み込みに失敗しました。');
  }
});
```

---

## ページネーション実装

### 設計方針

- 1ページ50件表示
- 検索・ソート結果にも対応
- ページ番号をグローバル状態で管理

### 実装

```javascript
const ITEMS_PER_PAGE = 50;
let currentPage = 1;

function renderTable(){
  // 1. 検索・ソートでフィルタリング
  let filtered = items.map((it, idx)=> ({...it, idx}));
  if(q){
    filtered = filtered.filter(/* 検索条件 */);
  }
  filtered.sort(/* ソート条件 */);

  // 2. ページネーション
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  currentPage = Math.min(currentPage, totalPages || 1);  // ページ数超過を防ぐ

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(start, end);

  // 3. ページ内のアイテムを表示
  for(const it of paginatedItems){
    // テーブル行を生成
  }

  // 4. ページネーションUIを更新
  updatePagination(totalPages);
}
```

### ページ切り替え

```javascript
function updatePagination(totalPages){
  if(totalPages <= 1){
    pagination.style.display = 'none';  // 1ページ以下は非表示
    return;
  }

  pagination.innerHTML = `
    <button id="prevPage" ${currentPage <= 1 ? 'disabled' : ''}>前へ</button>
    <span>${currentPage} / ${totalPages} ページ</span>
    <button id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>次へ</button>
  `;

  $('#prevPage')?.addEventListener('click', ()=>{
    if(currentPage > 1){
      currentPage--;
      renderTable();
      window.scrollTo({top:0, behavior:'smooth'});  // トップにスクロール
    }
  });
}
```

### 検索時のページリセット

```javascript
$('#search').addEventListener('input', ()=>{
  currentPage = 1;  // 検索時は1ページ目にリセット
  renderTable();
});
```

---

## パフォーマンス最適化

### 1. 遅延評価（Lazy Evaluation）

```javascript
// Chart.js の初期化を遅延
let categoryChart, waterChart, kcalChart;

function drawCategoryChart(){
  // タブが表示されるまで初期化しない
  if(!$('#stock').classList.contains('active')) return;

  // 初回のみ初期化
  if(categoryChart){
    categoryChart.destroy();
  }
  categoryChart = new Chart(/* ... */);
}
```

### 2. イベント委譲（Event Delegation）

```javascript
// ❌ 悪い例：各行にイベントリスナーを追加
for(const item of items){
  const btn = document.createElement('button');
  btn.addEventListener('click', ()=> deleteItem(item.id));
}

// ✅ 良い例：親要素にイベントリスナーを1つだけ追加
tbody.querySelectorAll('[data-del]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const i = parseInt(b.dataset.del,10);
    // ...
  });
});
```

### 3. Chart.js の再描画最適化

```javascript
function setTheme(theme){
  // ...

  // CSS transitionの完了を待ってからChart.js再描画
  setTimeout(()=>{
    drawCategoryChart();
    drawCoverageCharts();
  }, 100);
}
```

### 4. LocalStorage の最小化

```javascript
// 必要な時のみ保存
function renderTable(){
  // レンダリングのみ（保存しない）
}

$('#itemForm').addEventListener('submit', ()=>{
  items.push(newItem);
  saveJSON(LS_ITEMS, items);  // ここでのみ保存
  renderAll();
});
```

---

## まとめ

### 主要な技術的特徴

1. **セキュリティ**: XSS対策、ホワイトリスト方式、入力検証
2. **アルゴリズム**: 4段階期限判定、AI分析スコアリング
3. **UI/UX**: レスポンシブツールチップ、テーマ連動グラフ
4. **データ管理**: LocalStorage検証、ページネーション
5. **パフォーマンス**: 遅延評価、イベント委譲

### 設計の工夫

- **Vanilla JavaScript**: フレームワーク不要で軽量・高速
- **Privacy-First**: サーバー送信なし、完全クライアント処理
- **Progressive Enhancement**: 基本機能から段階的に向上
- **Accessibility**: セマンティックHTML、キーボード操作対応

### 今後の拡張可能性

- PWA化（Service Worker、オフライン対応）
- IndexedDB移行（LocalStorageの5MB制限を超える）
- Web Crypto API（データ暗号化）
- WebAssembly（計算処理の高速化）

---

## 参考資料

- [Chart.js 公式ドキュメント](https://www.chartjs.org/docs/latest/)
- [MDN Web Docs - LocalStorage](https://developer.mozilla.org/ja/docs/Web/API/Window/localStorage)
- [OWASP - XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [厚生労働省 - 日本人の食事摂取基準](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/eiyou/syokuji_kijyun.html)

---

© 2025 RollingStock Planner - MIT License
