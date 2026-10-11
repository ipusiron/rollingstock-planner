# RollingStock Planner - 技術詳細ドキュメント

開発者向けの技術実装詳細、アルゴリズム解説、設計思想を記載したドキュメントです。

---

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [セキュリティ実装](#セキュリティ実装)
3. [期限判定アルゴリズム](#期限判定アルゴリズム)
4. [備蓄チェックの判定](#備蓄チェックの判定)
5. [必要量計算ロジック](#必要量計算ロジック)
6. [テーマと数値の表示](#テーマと数値の表示)
7. [ヘルプとキーボード操作](#ヘルプとキーボード操作)
8. [データ永続化と検証](#データ永続化と検証)
9. [ページネーション実装](#ページネーション実装)
10. [パフォーマンス最適化](#パフォーマンス最適化)

---

## アーキテクチャ概要

### 技術スタック

- フロントエンド：Vanilla JavaScript、HTML、CSS
- データ永続化：LocalStorage。明示選択時のみメモリ内で一時利用
- グラフ相当の表示：登録行数のリストとHTMLのprogress要素
- デプロイ：GitHub Pages、mainブランチのルート
- テスト：Node.js標準のnode:test。CIはNode.js 22

### 設計思想

1. 計算と入力検証をDOM非依存のStockCoreに置く。
2. 保存候補を検証し、永続化できてからメモリを置き換える。
3. 不明な値を0や「安全」として扱わない。
4. 数量と割合を分け、総合点で不足を隠さない。
5. 外部ライブラリーや通信なしで画面を動かす。

### ファイル構成

| ファイル | 責務 |
|---|---|
| stock-core.js | UMD／CommonJS、暦日・検証・集計・計画値・アラート |
| stock-actions.js | DOM非依存の消費・補充・取り消し候補、購入本数 |
| stock-store.js | 保存領域の読み取り、保存、競合検出、一時利用、元データ取得 |
| messages.js / i18n.js | 日英の辞書、初期言語、静的文言と属性の対応付け |
| script.js | 入力イベント、確定済み状態、描画、ダイアログ |
| theme-init.js | CSS適用前にテーマを読み取り、htmlに指定 |
| style.css | モバイル優先のレイアウト、2テーマ |
| index.html | 5タブ、入力フォーム、13節の基礎知識 |
| test/ | コア・保存・UI構造の回帰テスト |

StockCore、StockActions、StockStoreはNode.jsではrequire、ブラウザーではグローバル変数として参照します。HTMLではcore、actions、store、messages、i18n、scriptの順に読み込みます。

---

## セキュリティ実装

### XSS対策

在庫表はescapeHtmlで入力文字列をエスケープしてからHTMLを構築します。アラート・ヘルプなどはtextContentで出力します。登録値をコードとして実行する処理はありません。

```javascript
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({
    '&':'&amp;', '<':'&lt;', '>':'&gt;',
    '"':'&quot;', "'":'&#39;'
  }[c]));
}
```

カテゴリはfood、water、medicine、pet-food、daily、tool、otherの7値です。不明な値はotherへ変換せず、入力全体を拒否します。CSSクラス名にも許可された値だけを使います。

### 入力の上限

| 項目 | 受け付ける値 |
|---|---|
| 品名 | 200文字まで。空文字・空白だけは不可 |
| 単位 | 50文字まで |
| 数量・1単位あたりkcal | 有限の0〜1,000,000。kcalは未入力をnullとして保持 |
| 容量付きの水 | category=water、unit=bottle、volumeMlは1〜1,000,000の整数。quantityは整数 |
| 期限 | 空文字または実在するYYYY-MM-DD。年は0001〜9999 |
| 各人数・匹数 | 0〜100の整数 |
| 想定日数 | 3・7・14・30・180 |
| 人の水量・ペットの水量 | 0〜100 L／日。ペットはnullも可 |
| 人のカロリー計画値 | 0〜10,000 kcal／日 |
| 警告閾値 | 1・2・3・6カ月 |
| 在庫行数 | 最大5,000件 |
| JSONファイル | 最大10×1024×1024バイト（10MiB） |

数値の文字列は全体をNumberで変換し、有限性・範囲を検証します。「12abc」の部分だけを読む処理や、上限への丸めはしません。HTMLの入力制約だけに頼らず、保存・インポートにも同じ検証を適用します。数量0は有効な記録です。

### CSPと限界

HTMLの先頭側に次のmeta CSPを置きます。

```text
default-src 'none'; script-src 'self'; style-src 'self';
img-src 'self' data:; connect-src 'none'; base-uri 'none';
form-action 'none'; object-src 'none'
```

外部CDN、インラインスクリプト、eval、アプリからの外部通信を必要としません。リンクで公式資料へ移動する操作は別です。Referrer-Policyはno-referrerです。

X-Frame-OptionsとX-Content-Type-Optionsはmetaタグでは有効なレスポンスヘッダーになりません。この構成では、任意のレスポンスヘッダーやクリックジャッキング防御を保証しません。

LocalStorageと出力JSONは平文です。機密情報を入れないでください。CSPやエスケープは暗号化、利用者認証、改ざん検出の代わりにはなりません。

---

## 期限判定アルゴリズム

### 概要

| コアの状態 | 画面表示 | 条件 |
|---|---|---|
| expired | 期限切れ | 期限日が今日より前 |
| today | 本日期限 | 今日と同じ暦日 |
| near | 期限間近 | 明日から警告閾値の日まで |
| later | 期限まで余裕 | 警告閾値の日より後 |
| unknown | 期限未入力 | 空文字 |

### 暦日の比較

todayは端末のローカル年・月・日をYYYY-MM-DDにします。dateNumberは厳密な形式と実在日を確認し、UTC上の日番号へ変換します。ローカル時刻の差を24時間で割らないため、夏時間の切り替えで日数がずれる計算にはしません。

```javascript
const day = StockCore.today();
const difference =
  StockCore.dateNumber('2026-10-26') -
  StockCore.dateNumber('2026-10-12'); // 14
```

addMonthsは移動先の月末に切り詰めます。2026-01-31の1カ月後は2026-02-28、2028-01-31なら2028-02-29です。

### 境界と更新

- 期限が今日の品は期限切れではなくtoday
- 消費候補は今日から14日後まで、両端を含む
- 候補のカテゴリはfood・water・pet-foodだけ
- 数量0の行はアラートと候補から除外
- 期限未入力は計画算入から除外するが、台帳から削除しない
- 存在しない日付は入力検証で拒否し、別の日へ補正しない

日付の更新は約60秒ごとの確認、windowのfocus、表示状態への復帰で行います。バックグラウンドでのタイマー抑制や端末の時計設定によって反映時刻は変わります。OS通知やプッシュ通知ではありません。

---

## 備蓄チェックの判定

### 台帳と計画算入量

水はcategoryがwaterの場合だけ対象です。単位の大文字・小文字を区別せず、L／ℓはそのまま、mLは1,000で割ってLにします。本・箱などの容量は推測しません。

volumeMlを明示した水はquantity×volumeMl÷1,000でLへ換算します。unitはbottle固定で、画面では本数・1本のmL・合計Lを表示します。合計容量だけの記録から本数を作らず、入力方式を変更しても数量を自動換算しません。

人用食料はcategoryがfoodでkcalが入力されている場合だけ、数量×kcalを合計します。ペットフードや医薬品を人用カロリーに加えません。

台帳の水量・カロリーは期限切れや期限未入力でも集計します。計画算入量にはtoday・near・laterの品だけを入れます。計算対象に入ったという表示は、開封状態や衛生面を確認済みという意味ではありません。

### 未確認の数値

totalsはunknownWater、unknownKcal、expired、undated、zeroの行数を別々に返します。画面には集計できない理由を表示します。同じ行が「期限未入力」と「水の単位不明」の両方に該当することがあります。

### 達成率と不足量

```javascript
const result = StockCore.metric(12, 21);
// { ratio: 57.14285714285714, shortage: 9, met: false }
```

計画値がnullまたは0ならratio・shortage・metはnullです。0%や達成済みとはしません。計算上の達成率は100%を超える値も保持し、進捗バーだけを100%で止めます。表示の達成率は小数第2位まで切り捨て、達成判定は丸める前の量で行います。

水と食料の割合を平均した総合点、栄養バランスの採点、避難の可否判定はありません。カテゴリ別の表示は数量が正の登録行数で、物資の重量・容量・栄養素を横断して合計したものではありません。

---

## 必要量計算ロジック

### 水の計画値

人の初期値は1人1日3Lで、飲料と調理用の目安です。衛生・洗浄・トイレ用の水を含みません。農林水産省の家庭備蓄資料を参照し、個別事情に合わせて変更できる入力値として扱います。

```text
人の水量／日 = (成人 + 子ども + 高齢者) × waterPerPerson
合計水量 = (人の水量／日 + 犬×dogWater + 猫×catWater) × days
```

dogWater・catWaterの初期値はnullです。該当するペットが1匹以上いてnullの場合、needWaterはnull、petUnknownはtrueになります。knownWaterには既知の部分だけを保持します。匹数0の動物の未設定値は合計を妨げません。

### 人用食料の計画値

```text
計画カロリー =
  (成人×adultKcal + 子ども×childKcal + 高齢者×seniorKcal) × days
```

初期値は成人2,000、子ども1,400、高齢者1,800kcalです。食事摂取基準への適合や個人の必要量を保証する値ではなく、変更可能な入力例です。ペットフードは必要量の計算対象外です。

### 確認例

成人2人・子ども2人・7日、初期の1日計画値なら、水84L、人用食料47,600kcalになります。期限内の水12Lに対する不足量は72Lです。

水0.5L＋12Lは12.5Lです。同じ数量2Lでもカテゴリがdailyの洗剤は0Lとして水の合計から除外します。

---

## テーマと数値の表示

### 日英切り替え

初期言語はURLのlang=ja|en、rsp_language、ブラウザーの言語の順で選びます。ブラウザーが日本語以外なら英語です。保存設定へのアクセス例外でも動作し、htmlのlangも更新します。

messages.jsは静的テキストと動的メッセージのja/en辞書を持ちます。i18n.jsはアプリ描画前のテキストノード、aria-label、placeholder、ヘルプ属性などだけを対応付けます。品名などを描画後に走査・翻訳しません。パラメーターは文字列として置換し、HTMLとして解釈しません。

languagechangeでは確定済み状態を使って表示を更新し、家族構成フォームや入力ダイアログの値を再設定しません。テーマ、開いたタブ・学習節、取り消し情報も保ちます。操作メッセージと開いたヘルプも切り替えます。数値表示はja-JPまたはen-USです。

### CSS変数によるテーマ

theme-init.jsをスタイルシートより先に同期読込します。保存されたrsp_themeがlightまたはdarkなら採用し、それ以外や読み取り例外ではlightにします。CSS適用前にhtmlのdata-themeを指定します。

script.jsのsetThemeはhtmlとbodyのdata-theme、切り替えボタンの説明を更新します。テーマ保存の例外は在庫機能を停止させません。

### 数量と割合の分離

カテゴリはリスト、水と人用食料は数量の文章と別の達成率・progress要素で表示します。L／kcalと%を同じ軸に置きません。テーマ変更はCSS変数で反映し、外部グラフライブラリーの生成・破棄はありません。

画面の装飾的な動きを抑え、prefers-reduced-motionにも対応します。

---

## ヘルプとキーボード操作

### ヘルプ

説明ボタンはbutton要素で、共通のhelpPopoverにtextContentを設定して開きます。Popover APIを使い、画面内に収まる固定幅・最大高とスクロールを指定します。開いている説明はEscapeで閉じ、その操作では入力ダイアログを閉じません。

### タブとダイアログ

- タブ：aria-controls・aria-selected・aria-labelledby、非選択タブはtabindex=-1
- 左右矢印：前後のタブへ移動。Home／End：最初／最後へ移動
- 非選択パネル：hidden属性で非表示
- ダイアログ：role=dialog・aria-modal・見出しの関連付け
- 開く操作：品名にフォーカス、背景をinertに指定
- Tab／Shift+Tab：ダイアログ内を循環
- 閉じる操作：背景のinertを解除し、開いたボタンへフォーカスを復帰

### 小さい画面

タブは中央で折り返します。フォームは1列を基本にし、幅650px以上で列を増やします。在庫表は横スクロール領域内に収め、画面全体を横へ押し広げないようにします。入力の文字サイズは16px以上です。

ChromiumとFirefoxでファイル直接表示とローカルHTTPを確認しています。Safari、実機のモバイルブラウザー、スクリーンリーダーの読み上げ結果は未確認です。Popover APIとinertに対応したブラウザーが必要です。

---

## データ永続化と検証

### LocalStorage構造

| キー | 用途 |
|---|---|
| rsp_state_v2 | meta、items、family、alertMonthsをまとめたJSON |
| rsp_items | 互換読み込み対象。在庫JSON配列を保持するキー |
| rsp_family | 互換読み込み対象。家族構成のJSON |
| rsp_alert_months | 互換読み込み対象。警告月数の文字列 |
| rsp_theme | lightまたはdark |
| rsp_language | jaまたはen。在庫のJSON出力とは別の任意設定 |

rsp_state_v2があればそれを使い、なければ互換キーを読みます。読み込み時に保存し直したり、互換キーを書き換えたり削除したりしません。計画値を含まない家族構成には初期値を補い、画面に確認を促す説明を出します。

rsp_state_v2が壊れている場合、別キーの古い内容へ勝手に切り替えません。保存を止め、元の文字列を復旧用JSONとして取り出せるようにします。復旧用JSONは通常のインポートとは別形式です。

### 保存の手順

```text
候補作成 → 全体の検証 → 保存領域の変更確認
        → rsp_state_v2へのsetItemが成功
        → メモリ更新 → 描画
```

キー1つへの書き込みなので、家族構成だけ保存されて在庫が保存されない部分更新を避けます。setItemが例外を投げたら確定済み状態を更新しません。入力フォームは残します。

保存前に、読み取り時の4キーの文字列と現在値を比較します。異なればconflictとして停止し、storageイベントでも通知します。ただし比較と書き込みをまたぐ排他ロックはなく、複数タブの完全な同時更新を保証しません。

### インポート

metaを付ける場合はappがrollingstock-planner、verが1・2・3のいずれかである必要があります。items・family・alertMonthsは必須です。保存と通常のJSON出力はver=3です。保存キー名rsp_state_v2と形式番号は別であり、volumeMlを保持します。対応していない形式は読み取り時に拒否し、容量情報を落として保存しません。

1. ファイルサイズを読み込み前に確認。
2. JSONを解析し、件数・全行・家族構成・設定値を検証。
3. 読み込み待ちの間に画面内の状態が変わっていないか確認。
4. データ全体を置き換えることを利用者に確認。
5. 保存に成功してから画面を更新。

不正行の間引き、数値の部分解析、未知のカテゴリの置換は行いません。いずれか1件が不正なら全部を拒否します。保存不能状態では正常なインポートも保存できません。破損状態の明示的な置換インポートは受け付けます。

### 一時利用

保存領域が使えないとき、自動ではメモリ保存へ移行しません。利用者が「保存せず一時利用」を選んだ場合だけメモリ内で操作します。再読込で消える旨を常時表示します。切り替え前に失敗した操作を勝手に再実行しません。

ブラウザーの容量制限は一定ではなく、10MiBのJSONを保存できるとは限りません。HTTPS／HTTP／ファイル直接表示で同じデータが共有される前提にもしていません。

### 消費・補充・取り消し

StockActionsは入力状態を変更せず、検証済みの候補を返します。消費量は正で在庫以下、容量付きの水なら整数です。残り0の行は削除しません。補充は同じ空欄でない期限のときだけ加算し、それ以外は同じ品の新しい行にします。未入力同士も同一ロットとは判断しません。作成候補には5,000件の上限を適用します。

保存に成功した消費・補充だけが、beforeと確定後のシリアライズ結果afterをメモリ内に残します。取り消しは現在値とafterの一致を確かめ、beforeを通常の保存手順で保存します。ほかの保存成功と再読込で履歴を消し、保存失敗では確定済み状態と履歴を保ちます。

### 買い物メモ

購入本数はceil(水の不足L×1,000÷1本のmL)です。容量は1〜1,000,000mLの整数で、数量目標が0または不明なら本数はnullです。食料の不足kcalを缶数・食数に換算しません。期限切れ、期限未入力、容量不明、カロリー未入力の水・食料は品名と理由をテキストで表示します。数量0は対象外です。

在庫・家族・日付の変更と、購入容量の入力時に更新します。容量は保存しません。コピーはClipboard APIの成功後だけ完了を表示し、失敗時はtextareaを選択して手動コピーを案内します。印刷は同じ文面のpre要素と印刷用CSSを使い、在庫全体や入力フォームを含めません。

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
    pagination.hidden = true;  // 1ページ以下は非表示
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

### 描画範囲

検索・並べ替えを行ってから、在庫表には最大50行を描画します。編集・削除ボタンのリスナーは表示した行に付けます。これは親へのイベント委譲ではありません。

renderAllは在庫一覧とアラートを更新します。集計は検索による絞り込みより先に行い、検索結果に関係なく全在庫を対象にします。空の在庫でも合計と図表相当の表示を更新します。

### 保存と再計算

検索・並べ替え・タブ移動・日付更新は保存を行いません。確定操作時だけ保存します。外部グラフの再生成やCSSの完了待ちはありません。

最大件数5,000は入力上限であり、あらゆる端末で高速に操作できる保証ではありません。LocalStorageへの書き込みとJSON処理は同期処理を含みます。

---

## まとめ

### 実装上の確認点

- 数量・期限・単位・カテゴリを検証してから集計
- 計画値・台帳・計画算入量を区別
- 不明・0目標・期限切れを達成済みと表示しない
- 保存が成功してからメモリを更新
- ブラウザーの保存領域が使えなくても、理由と復旧手段を表示
- 狭い画面とキーボード操作を確認

### 検証

Node.js 22でnpm testを実行します。日付の境界、期限切れ・期限未入力、単位、数量0、未設定のペット、丸め前の達成判定、保存例外、別タブの変更、不正JSON、UIの保護条件を対象にしています。

ブラウザー確認はChromium／Firefox、ファイル直接表示／HTTP、320・390・800・1280px、ライト／ダーク、5タブで行います。保存を遮断した場合と容量エラー、全削除、入力ダイアログ、キーボード、CSP違反も確認します。

### 拡張時に維持すること

消費・補充の操作や容量換算を追加する場合も、未設定の値を推測しないこと、保存失敗で入力を失わないことを維持してください。多言語化では計算ロジックとデータ形式を共有し、単位と限界の説明をそろえます。

---

## 参考資料

- [MDN Web Docs - LocalStorage](https://developer.mozilla.org/ja/docs/Web/API/Window/localStorage)
- [OWASP - XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [農林水産省 - 家庭での食料品備蓄](https://www.maff.go.jp/j/zyukyu/foodstock/imadoki/imadoki02_10.html)
- 食品・停電・ペットの公式資料は[README.md](README.md#-関連知識)を参照

---

© 2025 RollingStock Planner - MIT License
