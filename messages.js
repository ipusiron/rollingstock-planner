/* Local, trusted interface messages. User-entered names and units are never translated. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StockMessages = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const pairs = [
["在庫と期限をブラウザー内で記録し、家族の計画量と比較する防災備蓄管理ツール。飲料水と人用食料の集計条件を表示します。","Record emergency supplies and dates in your browser and compare them with your household plan. Water and human-food totals show their calculation rules."],
["このツールの計算と保存にはJavaScriptが必要です。有効にして再読込してください。","JavaScript is required for calculations and saving. Enable it and reload."],
["テーマ切り替え","Switch theme"],
["ライトモードへ切り替え","Switch to light mode"],
["家族とペットの備蓄を記録し、期限と計画量を確認するツール。","Record supplies for your household and pets, and check dates and planned quantities."],
["在庫管理","Inventory"],
["家族構成","Household"],
["アラート・提案","Alerts & planning"],
["システム設定","Settings"],
["基礎知識","Basics"],
["保存状態","Storage status"],
["保存できない場合の操作","Options when saving is unavailable"],
["保存せず一時利用","Use without saving"],
["元データを救出","Rescue raw data"],
["アイテム追加","Add item"],
["直前の消費・補充を取り消す","Undo last use or replenishment"],
["在庫を検索","Search inventory"],
["検索（品名・カテゴリ・単位）","Search (name, category, unit)"],
["在庫の並べ替え","Sort inventory"],
["賞味期限 早い順","Expiry: earliest first"],
["賞味期限 遅い順","Expiry: latest first"],
["品名 A→Z","Name: A–Z"],
["品名 Z→A","Name: Z–A"],
["カテゴリ","Category"],
["在庫一覧（横にスクロールできます）","Inventory (scroll horizontally)"],
["品名","Item name"],
["数量","Quantity"],
["単位","Unit"],
["期限","Expiry"],
["栄養","Nutrition"],
["状態","Status"],
["操作","Actions"],
["合計：—","Total: —"],
["水の在庫（概算）","Water in inventory (estimate)"],
["食料のカロリー（概算）","Food calories (estimate)"],
["カテゴリ別の登録件数（数量0を除く）","Rows by category (excluding zero quantity)"],
["在庫の合計と、計画へ算入した量は異なります。水は「水」カテゴリのL・mL、または容量を指定した本数を集計します。人用カロリーは「食料」カテゴリのみ集計し、期限切れと期限未入力は計画から除外します。","Inventory totals differ from amounts counted toward the plan. Water includes the Water category in L or mL, or bottles with an explicit capacity. Human calories include only the Food category. Expired and undated records are excluded from the plan."],
["取り消せるのは、このタブを開いてから直前に行った消費・補充1回だけです。ほかの変更を保存すると取り消せなくなります。","Only the most recent use or replenishment since opening this tab can be undone. Saving another change clears undo."],
["👥 人間","👥 People"],
["成人（18–64歳）","Adults (18–64)"],
["18歳から64歳までの人数を入力します。1日あたりの水とカロリーの計画値は下の欄で調整できます。","Enter the number of people aged 18–64. Adjust the daily water and calorie planning values below."],
["項目の説明","About this field"],
["子ども（0–17歳）","Children (0–17)"],
["0歳から17歳までの人数を入力します。初期カロリーは計算例です。乳幼児など個別の条件に合わせて変更してください。","Enter the number of people aged 0–17. Default calories are calculation examples. Adjust for individual circumstances, including infants."],
["高齢者（65歳以上）","Seniors (65+)"],
["65歳以上の人数を入力します。健康上の必要量は計算しません。下の計画値を確認してください。","Enter the number of people aged 65 or older. This does not calculate health-related requirements. Check the planning values below."],
["🐾 ペット","🐾 Pets"],
["犬（頭数）","Dogs"],
["犬の頭数を入力します。1頭あたりの水量を下の欄に設定してください。未設定なら水の達成率を計算しません。","Enter the number of dogs and set water per dog below. Water coverage is not calculated if this is unset."],
["猫（頭数）","Cats"],
["猫の頭数を入力します。1頭あたりの水量を下の欄に設定してください。未設定なら水の達成率を計算しません。","Enter the number of cats and set water per cat below. Water coverage is not calculated if this is unset."],
["📅 想定日数","📅 Planning period"],
["想定日数","Planning period"],
["災害時に備蓄で生活する日数を想定します。食品備蓄の目安は最低3日から1週間分です。地域の特性や季節に応じて設定してください。","Choose how many days your supplies should cover. A basic food-stock guideline is at least 3 days to 1 week. Adjust for local conditions and the season."],
["3日","3 days"],
["7日","7 days"],
["14日","14 days"],
["1ヶ月（30日）","1 month (30 days)"],
["半年（180日）","Half a year (180 days)"],
["1日あたりの計画値","Daily planning values"],
["水は飲料と調理用の目安です。生活用水は別に備えてください。カロリーの初期値は計算例であり、年齢、体格、健康状態に応じた栄養の必要量ではありません。ペットの水量は普段の使用量などから設定してください。","Water is for drinking and cooking. Prepare water for sanitation separately. Default calorie values are calculation examples, not nutritional requirements based on age, body size or health. Set pet water from normal use and other relevant needs."],
["人1人の水（L）","Water per person (L)"],
["成人1人の計画カロリー（kcal）","Calories per adult (kcal)"],
["子ども1人の計画カロリー（kcal）","Calories per child (kcal)"],
["高齢者1人の計画カロリー（kcal）","Calories per senior (kcal)"],
["犬1頭の水（L、未設定可）","Water per dog (L, optional)"],
["普段の使用量を入力","Enter normal daily use"],
["猫1頭の水（L、未設定可）","Water per cat (L, optional)"],
["計算して保存","Calculate and save"],
["初期化","Reset"],
["入力した条件による計画量","Plan for the saved conditions"],
["水の計画量（人＋ペット）","Planned water (people + pets)"],
["人数と1日あたりの計画値、日数を掛けた量です。人用の初期値は飲料と調理用の3Lで、衛生などの生活用水は含みません。","The number of people multiplied by the daily planning value and number of days. The default for people is 3 L for drinking and cooking, excluding sanitation water."],
["人用の初期値：1人1日3L（飲料と調理用）。ペットの水量は個別設定。","Default for people: 3 L/person/day for drinking and cooking. Set pet water individually."],
["カロリーの計画量（人）","Planned calories (people)"],
["入力した計画値の合計です。個人の栄養の必要量やペットフードの必要量は判定しません。","The sum of the entered planning values. This does not determine individual nutritional requirements or pet-food needs."],
["初期値は計算例です。各家庭の条件に合わせて調整してください。","Defaults are calculation examples. Adjust them to your household."],
["在庫充足率","Inventory coverage"],
["計画に算入した在庫を目標量で割った割合です。期限切れ、期限未入力、容量不明や栄養未入力の値は算入しません。食品の安全性は判定しません。","Stock counted toward the plan divided by the target. Expired, undated, unknown-volume and missing-calorie records are excluded from the relevant totals. This does not assess food safety."],
["水・カロリーそれぞれの達成率を表示","Water and calorie coverage are shown separately"],
["アラート","Alerts"],
["期限切れ / 期限間近","Expired / expiring soon"],
["登録した期限を基に確認対象を表示します。消費期限を過ぎた食品は食べないでください。医薬品等は製品の表示を確認してください。","Items to check based on recorded dates. Do not eat food past its use-by date. Check labels for medicines and other products."],
["今日から14日後までの食品と水","Food and water due today through 14 days from now"],
["数量がある食料、水、ペットフードだけを表示します。期限と保存状態、製品の表示を確認して使用してください。","Only food, water and pet food with a positive quantity are shown. Check the date, storage conditions and product label before use."],
["水の充足率","Water coverage"],
["計画量と算入した在庫をLで比較します。達成率は別に表示し、棒の長さだけ100%を上限にします。","Compares planned and counted water in L. The percentage is shown separately; only the bar is capped at 100%."],
["カロリーの充足率","Calorie coverage"],
["人用食料の計画量と算入した在庫をkcalで比較します。達成率は別に表示します。栄養バランスは評価しません。","Compares planned and counted human food in kcal. The percentage is shown separately. Nutritional balance is not assessed."],
["不足分の買い物メモ","Shopping memo for shortages"],
["買う水の1本の容量（mL）","Capacity of water bottles to buy (mL)"],
["保存済みの家族設定と在庫から計算します。本数は不足量を満たすよう切り上げます。食料はkcalの不足だけを示し、缶数や食数には換算しません。","Calculated from saved household settings and inventory. Bottle counts round up to cover the shortage. Food shortages are shown only in kcal, not converted to cans or meals."],
["買い物メモ","Shopping memo"],
["メモをコピー","Copy memo"],
["メモを印刷","Print memo"],
["提案","Planning notes"],
["備蓄チェック","Stock check"],
["登録内容に基づく確認","Checks based on your records"],
["固定の計算条件で登録内容を整理します。AIや専門家の診断ではありません。食品の安全性、栄養の充足、避難の可否は判断しません。","Organizes your records using fixed calculation rules. This is not an AI or expert assessment. It does not determine food safety, nutritional adequacy or whether evacuation is necessary."],
["アラート設定","Alert settings"],
["期限切れ警告のしきい値を設定します。この期間内に期限が来るアイテムを「期限間近」として表示します。","Set the expiry-warning threshold. Items expiring within this period are marked as expiring soon."],
["警告閾値（月）:","Warning threshold (months):"],
["1ヶ月","1 month"],
["2ヶ月","2 months"],
["3ヶ月","3 months"],
["6ヶ月","6 months"],
["期限がこの期間内に来るアイテムを黄色で警告表示します","Items expiring within this period are highlighted in yellow"],
["データ管理","Data management"],
["在庫データと家族設定をJSONファイルでバックアップ・復元できます。","Back up and restore inventory and household settings using JSON files."],
["データをエクスポート","Export data"],
["すべての在庫データと設定をJSONファイルでダウンロードします","Download all inventory and settings as a JSON file"],
["データをインポート","Import data"],
["以前にエクスポートしたJSONファイルから復元します","Restore from an exported JSON file"],
["データ削除","Delete data"],
["すべての在庫データを削除します。この操作は取り消せません。","Delete all inventory records. This cannot be undone."],
["全アイテムを削除","Delete all items"],
["⚠️ すべての在庫データが完全に削除されます。実行前にエクスポートを推奨します。","⚠️ All inventory records will be deleted. Export a backup before proceeding."],
["防災備蓄の基礎知識","Emergency-stock basics"],
["避難情報と製品の表示を優先してください。このページは医療や栄養、食品安全の個別判断を行いません。","Follow evacuation information and product labels first. This page does not make individual medical, nutritional or food-safety judgments."],
["農林水産省：水の備蓄","MAFF: Water storage (Japanese)"],
["消費者庁：賞味期限を過ぎた備蓄食品","Consumer Affairs Agency: Emergency food past its best-before date (Japanese)"],
["FDA：停電時の食品管理（英語）","FDA: Food safety during power outages"],
["環境省：マイクロチップの制度","Ministry of the Environment: Microchip system (Japan)"],
["🧭 基本方針（在宅避難 vs 避難所避難）","🧭 Basic approach (staying home vs. evacuation shelter)"],
["📍 自宅の安全と避難情報を確認","📍 Check home safety and evacuation information"],
["安全確保が最優先","Safety first"],
["：自治体の避難情報とハザードマップを確認し、安全な場所へ避難する。在宅避難は自宅の安全を確認できる場合の選択肢",": Check local evacuation information and hazard maps, and move to a safe place. Staying home is an option only when you can confirm your home is safe"],
["プライバシー確保","Privacy"],
["：避難所と比べて生活の質を維持できる",": May maintain a better quality of life than a shelter"],
["感染症リスク低減","Lower infection risk"],
["：密集を避けられる",": Avoid crowding"],
["ペット同伴可能","Keeping pets with you"],
["：避難所では制限がある場合も",": Shelters may impose restrictions"],
["🏃 避難所へ行くべきケース","🏃 When to go to an evacuation shelter"],
["建物の倒壊・損傷リスクがある","The building may collapse or suffer damage"],
["火災・津波・土砂崩れの危険が迫っている","Fire, tsunami or landslide danger is approaching"],
["ライフラインの停止により自宅で安全に生活できない","Utility outages make living at home unsafe"],
["医療・介護が必要で自宅では対応困難","Medical or care needs cannot be met at home"],
["真冬・真夏で空調なしでは生命の危険がある","Lack of heating or cooling poses a threat to life in extreme winter or summer weather"],
["🔄 ローリングストックの3原則","🔄 Three principles of rotating stock"],
["日常使い","Everyday use"],
["：普段から食べ慣れたものを備蓄",": Stock foods you normally eat"],
["定期消費","Regular consumption"],
["：期限が近いものから計画的に消費",": Plan to use items with the earliest dates first"],
["即補充","Prompt replenishment"],
["：消費したらすぐに同量を買い足す",": Buy the same quantity soon after using it"],
["📦 備蓄期間の考え方","📦 Choosing a stock duration"],
["期間","Duration"],
["対象","For whom"],
["備蓄の目的","Purpose"],
["3日分","3 days"],
["すべての家庭","All households"],
["家庭備蓄の目安。3日で救援が届くという保証ではない","A household-stock guideline, not a guarantee that help arrives in 3 days"],
["7日分","7 days"],
["一般家庭の推奨","Suggested for typical households"],
["可能なら1週間分を備える。復旧に必要な日数は災害ごとに異なる","Prepare a week if possible. Recovery time varies by disaster"],
["14日分","14 days"],
["都市部・交通遮断リスク地域","Urban areas and places at risk of transport disruption"],
["大規模災害時の物流停止に対応","Prepare for disrupted distribution after a major disaster"],
["1ヶ月分","1 month"],
["山間部・離島・プレッパー","Mountain areas, remote islands and preppers"],
["孤立が長期化する可能性がある地域","Areas where isolation may last longer"],
["3〜6ヶ月分","3–6 months"],
["本格的プレッパー","Dedicated preppers"],
["大規模災害・パンデミック等の長期危機に備える","Prepare for prolonged crises such as major disasters or pandemics"],
["地域特性を考慮","Consider local conditions"],
["：海沿い（津波）、山間部（土砂災害）、活断層付近（地震）など、リスクに応じて期間を調整",": Adjust the duration for coastal tsunami risk, mountain landslides, earthquakes near active faults and other local risks"],
["🔄 ローリングストックの実践方法","🔄 Practicing stock rotation"],
["📅 月次サイクル","📅 Monthly cycle"],
["月初（1日）","Start of month (1st)"],
["：このツールで期限間近リストを確認",": Check the expiring-soon list in this tool"],
["週次（毎週日曜）","Weekly (every Sunday)"],
["：「今日から14日後まで」の対象を確認し、食品を、日常食に組み込む",": Check items due within 14 days and incorporate foods into regular meals"],
["買い物時","When shopping"],
["：消費した分を必ず補充（同じもの or 類似品）",": Replenish what you used with the same or similar products"],
["月末（25日頃）","End of month (around the 25th)"],
["：在庫の棚卸し・登録データの更新",": Take inventory and update your records"],
["🍱 具体例：カレーのローリングストック","🍱 Example: rotating ready-to-eat curry"],
["備蓄目標","Stock target"],
["：レトルトカレー 28食分（家族4人 × 7日 × 1食/日）",": 28 servings of ready-to-eat curry (4 people × 7 days × 1 serving/day)"],
["実践","Practice"],
["毎月2回、日曜の夕食でレトルトカレー（4袋消費）","Twice a month, serve ready-to-eat curry for Sunday dinner (use 4 pouches each time)"],
["翌週の買い物で同量を補充","Replenish the same quantity on the following shopping trip"],
["期限が早いものから使う（FEFO: First Expired, First Out）。保存状態と製品の表示を確認する","Use items with the earliest expiry first (FEFO: First Expired, First Out). Check storage conditions and product labels"],
["結果","Result"],
["：使った分を補充し、28食分の目標と在庫を比較",": Replenish what you used and compare inventory with the 28-serving target"],
["⚠️ よくある失敗と対策","⚠️ Common mistakes and responses"],
["失敗","Mistake"],
["：消費したのに買い忘れ →",": Forgetting to replenish after use →"],
["対策","Response"],
["：買い物リストアプリに即登録",": Add it to a shopping-list app immediately"],
["：同じものばかりで飽きる →",": Getting tired of the same food →"],
["：カレー・シチュー・中華など種類を分散",": Include a variety such as curry, stew and Chinese dishes"],
["：期限管理が面倒 →",": Managing dates feels tedious →"],
["：このツールで自動アラート",": Use this tool's on-page alerts"],
["🏠 保管場所の工夫","🏠 Choosing storage locations"],
["📍 分散保管の原則","📍 Distribute your supplies"],
["1階と2階に分散","Split between ground and upper floors"],
["：1階浸水でも2階で確保",": Keep supplies upstairs if the ground floor floods"],
["玄関近くに非常袋","Emergency bag near the entrance"],
["：即避難時の持ち出し用（3日分）",": For immediate evacuation (3 days of supplies)"],
["寝室に懐中電灯・靴","Flashlight and shoes in the bedroom"],
["：夜間地震時の安全確保",": For safety during a nighttime earthquake"],
["車のトランク","Car trunk"],
["：高温になるため食品や水の表示条件に注意。車内保管に適さない品は置かない",": High temperatures may violate food and water storage instructions. Do not leave products unsuitable for vehicle storage"],
["🌡️ 保管環境","🌡️ Storage conditions"],
["直射日光を避ける","Avoid direct sunlight"],
["：劣化を防ぐため暗所・クローゼット内",": Use a dark place or closet to reduce deterioration"],
["温度変化の少ない場所","Stable temperatures"],
["：押入れ・床下収納（ただし浸水リスクに注意）",": Closets or underfloor storage, while considering flood risk"],
["湿気対策","Control moisture"],
["：防水ケース・乾燥剤を活用",": Use waterproof containers and desiccants"],
["ローテーション収納","Rotate placement"],
["：新しいものは奥、古いものは手前",": New items at the back, older ones at the front"],
["📦 収納テクニック","📦 Organizing supplies"],
["透明ケース","Clear containers"],
["：中身が一目で分かる",": See the contents at a glance"],
["ラベル貼付","Labels"],
["：「期限：2025-06」「カテゴリ：主食」など明記",": Mark details such as \"Expiry: 2025-06\" and \"Category: staple\""],
["カテゴリ別","Group by category"],
["：水/主食/おかず/おやつで分ける",": Separate water, staples, main dishes and snacks"],
["重量物は下段","Heavy items on lower shelves"],
["：水・缶詰は下、軽いものは上",": Water and cans below, light items above"],
["🍽️ 栄養バランスと食品選び","🍽️ Nutritional balance and food selection"],
["🥗 災害時の栄養3原則","🥗 Three nutrition considerations during disasters"],
["エネルギー確保","Energy"],
["：主食と主菜などを組み合わせる。必要量は年齢、体格、活動量、健康状態により異なる",": Combine staples and main dishes. Needs vary with age, body size, activity and health"],
["タンパク質補給","Protein"],
["：缶詰（ツナ・サバ）・豆類で筋肉維持",": Canned tuna or mackerel and beans help maintain muscle"],
["ビタミン・ミネラル","Vitamins and minerals"],
["：野菜ジュース・フルーツ缶で不足を補う",": Supplement with vegetable juice and canned fruit"],
["📋 推奨食品リスト","📋 Suggested foods"],
["具体例","Examples"],
["ポイント","Considerations"],
["主食","Staples"],
["アルファ米、パックご飯、乾麺、カロリーメイト","Rehydratable rice, packaged cooked rice, dried noodles, CalorieMate"],
["加熱不要 or 簡単調理","No heating or simple preparation"],
["おかず","Main dishes"],
["レトルトカレー、缶詰（ツナ・サバ・焼き鳥）","Ready-to-eat curry, canned tuna, mackerel or chicken"],
["そのまま食べられる","Ready to eat"],
["野菜","Vegetables"],
["野菜ジュース、トマト缶、コーン缶","Vegetable juice, canned tomatoes or corn"],
["ビタミン・食物繊維","Vitamins and dietary fiber"],
["果物","Fruit"],
["フルーツ缶、ドライフルーツ","Canned or dried fruit"],
["ビタミンC・糖分","Vitamin C and sugars"],
["菓子","Snacks"],
["チョコレート、ビスケット、羊羹","Chocolate, biscuits, yokan (sweet bean jelly)"],
["高カロリー・長期保存","High calories and long storage"],
["調味料","Seasonings"],
["塩、砂糖、醤油、味噌","Salt, sugar, soy sauce, miso"],
["味付けで食欲維持","Flavor helps maintain appetite"],
["⚠️ 避けるべき食品","⚠️ Foods to avoid for emergency stock"],
["生鮮食品（すぐ腐敗）","Fresh perishable food (spoils quickly)"],
["冷凍食品（停電で解凍）","Frozen food (thaws during outages)"],
["調理に時間がかかるもの（燃料・水の浪費）","Foods requiring lengthy preparation (use more fuel and water)"],
["匂いの強いもの（避難所では迷惑）","Strong-smelling foods (may disturb others in shelters)"],
["📅 賞味期限と消費期限の違い","📅 Best-before vs. use-by dates"],
["🟢 賞味期限（Best Before）","🟢 Best before"],
["意味","Meaning"],
["：美味しく食べられる期限",": The date until which the food should retain its quality"],
["：缶詰・レトルト・スナック菓子など",": Canned food, retort pouches, snacks and similar products"],
["期限後","After the date"],
["：すぐに食べられなくなるとは限らないが、安全に食べられる期間は一律には判断できない",": Not necessarily immediately inedible, but there is no universal safe period after the date"],
["目安","Guidance"],
["：期限は未開封で表示された方法を守って保存した場合のもの。見た目やにおいだけで安全とは判断できない。製造者の案内を確認する",": Dates assume unopened products stored as directed. Appearance and smell alone cannot establish safety. Check the manufacturer's guidance"],
["🔴 消費期限（Use By）","🔴 Use by"],
["：安全に食べられる期限",": The date until which the food can be eaten safely"],
["：弁当・惣菜・生菓子など",": Boxed lunches, prepared dishes, fresh pastries and similar products"],
["：消費期限を過ぎた食品は食べない",": Do not eat food past its use-by date"],
["厳守","Important"],
["：このツールは賞味期限、消費期限、使用期限を自動判別しない。登録した日付だけで食べられるか判断しない",": This tool does not automatically distinguish best-before, use-by or other expiry dates. Do not decide whether food is safe from the recorded date alone"],
["📝 備蓄での扱い","📝 Handling dates in emergency stock"],
["賞味期限の食品","Foods with best-before dates"],
["：ローリングストックの主力。表示された期限と日常の使用頻度に合わせて入れ替える",": Suitable for stock rotation. Rotate according to the label and your normal use"],
["消費期限の食品","Foods with use-by dates"],
["：短い期限と保存条件に注意。期限切れを避ける",": Pay attention to short shelf lives and storage conditions. Avoid letting them expire"],
["期限表示なし","No date label"],
["：期限表示の省略が認められる食品でも保存条件と開封後の扱いを確認する。乳児に蜂蜜を与えない",": Even where a date label is not required, check storage and after-opening instructions. Do not give honey to infants"],
["🔥 災害時の調理方法","🔥 Cooking during disasters"],
["🍳 加熱手段の優先順位","🍳 Heating options, in order of preference"],
["カセットコンロ","Portable gas stove"],
["（推奨）：説明書の使用場所と換気条件を守る。燃焼時間は製品と火力によって異なる"," (suggested): Follow the manual's location and ventilation requirements. Burn time varies with the product and heat setting"],
["固形燃料","Solid fuel"],
["：適合する器具と使用条件を確認し、火災や一酸化炭素中毒に注意",": Check compatible equipment and operating conditions; beware of fire and carbon monoxide poisoning"],
["キャンプ用バーナー","Camping burner"],
["：屋外専用、火力強いが換気必須",": Outdoor use only; high heat still requires ventilation"],
["炭・薪","Charcoal or firewood"],
["：長期籠城向け、屋外のみ",": For longer stays; outdoors only"],
["💧 節水調理テクニック","💧 Water-saving cooking"],
["ポリ袋調理","Cooking in bags"],
["：食品用かつ湯煎対応の袋を製品の指示に従って使う",": Use food-safe, boil-safe bags according to their instructions"],
["アルファ米","Rehydratable rice"],
["：水で戻せる製品もある。水量と待ち時間は製品の表示に従う",": Some products can use cold water. Follow the label for water quantities and waiting times"],
["缶詰そのまま","Unheated canned food"],
["：温めなくても食べられる",": Can be eaten without warming"],
["ラップ活用","Plastic wrap"],
["：皿にラップを敷いて洗い物削減",": Line plates to reduce washing"],
["🧊 冷蔵庫の活用（停電時）","🧊 Refrigerators during power outages"],
["保冷時間","Keeping food cold"],
["：FDAの目安は扉を開けない冷蔵庫で約4時間。温度や食品の状態も確認し、安全を判断できない食品は食べない",": FDA guidance is about 4 hours in an unopened refrigerator. Also check temperature and food condition; do not eat food whose safety is uncertain"],
["温度管理","Temperature control"],
["：庫内温度計と保冷剤を準備し、開閉を減らす",": Prepare a refrigerator thermometer and cold packs, and minimize opening the door"],
["安全確認","Safety checks"],
["：経過時間と温度、食品の表示を確認する。味見で安全性を確かめない",": Check elapsed time, temperature and labels. Never taste food to test safety"],
["⚠️ 火災・一酸化炭素中毒に注意","⚠️ Fire and carbon monoxide hazards"],
["屋内で炭・薪は絶対NG（一酸化炭素中毒）","Never burn charcoal or firewood indoors (carbon monoxide risk)"],
["カセットコンロも換気しながら使用","Ventilate when using a portable gas stove"],
["就寝時は火を完全消火","Extinguish all flames before sleeping"],
["🐾 ペット同行避難の準備","🐾 Preparing to evacuate with pets"],
["📋 事前準備（平時）","📋 Prepare before a disaster"],
["自治体の方針確認","Check local policy"],
["：自治体に受け入れ条件を確認。同じ場所へ避難する「同行避難」と同室で過ごせることは別",": Ask your municipality about acceptance rules. Evacuating to the same site does not mean sharing a room with pets"],
["マイクロチップ装着","Microchipping"],
["：販売業者の装着義務と一般飼い主の努力義務を区別する。装着済みの犬猫は登録情報の確認も必要",": In Japan, sellers' mandatory duties differ from general owners' duty to make an effort. Check registration details for already microchipped dogs and cats"],
["ワクチン接種","Vaccination"],
["：狂犬病・混合ワクチンを最新に",": Keep rabies and combination vaccinations up to date"],
["ケージ訓練","Crate training"],
["：普段からケージ・キャリーに慣れさせる",": Familiarize pets with crates and carriers"],
["人慣れ訓練","Socialization"],
["：他人や他の動物に吠えない訓練",": Train pets not to bark at unfamiliar people or other animals"],
["🎒 ペット用非常袋の中身","🎒 Pet emergency bag"],
["フード（7日分以上）：普段食べているもの","Food (at least 7 days): their usual food"],
["水：普段の使用量と個体の状態に応じて準備","Water: plan for normal use and the individual animal's condition"],
["食器（折りたたみ式が便利）","Bowls (folding bowls are convenient)"],
["トイレシート・猫砂（1週間分）","Pet pads or cat litter (1 week)"],
["リード・首輪（予備も）","Leash and collar, including spares"],
["キャリーバッグ・ケージ","Carrier or crate"],
["常備薬・療法食（処方箋のコピー）","Regular medicines and therapeutic food (copies of prescriptions)"],
["ペット手帳（ワクチン証明・既往歴）","Pet health records (vaccination certificates and medical history)"],
["写真（迷子捜索用、飼い主と一緒のもの）","Photos for a lost-pet search, including one with the owner"],
["ガムテープ（ケージ補修）","Duct tape for crate repairs"],
["タオル・ブランケット","Towels and blankets"],
["🏠 避難所でのマナー","🏠 Shelter etiquette"],
["ペットは原則ケージ内（他の避難者への配慮）","Generally keep pets in crates out of consideration for other evacuees"],
["鳴き声・臭い対策を徹底","Manage noise and odors"],
["排泄物は飼い主が責任を持って処理","Owners are responsible for disposing of waste"],
["アレルギー持ちの避難者に配慮","Consider evacuees with allergies"],
["🚗 車中避難も選択肢","🚗 Staying in a car as an option"],
["ペット不可の避難所の場合、車中泊も検討（エコノミークラス症候群に注意）","If a shelter does not accept pets, consider staying in a car (beware of deep-vein thrombosis from prolonged immobility)"],
["👶 子ども・高齢者への配慮","👶 Considerations for children and seniors"],
["👶 乳幼児（0〜2歳）","👶 Infants and toddlers (0–2)"],
["粉ミルク","Infant formula"],
["：液体ミルク（開封後すぐ使用）が便利",": Ready-to-feed liquid formula can be convenient; use promptly after opening"],
["離乳食","Baby food"],
["：月齢に合わせたレトルト（7ヶ月用、12ヶ月用など）",": Age-appropriate pouches, such as products for 7 or 12 months"],
["おむつ","Diapers"],
["：1日5〜10枚 × 7日分 = 35〜70枚",": 5–10 per day × 7 days = 35–70"],
["おしりふき","Baby wipes"],
["：多めに備蓄（体も拭ける）",": Stock extra; they can also clean the body"],
["哺乳瓶","Feeding bottles"],
["：使い捨てタイプが衛生的",": Disposable types can help with hygiene"],
["🧒 子ども（3〜12歳）","🧒 Children (3–12)"],
["好きな食べ物","Favorite foods"],
["：ストレス軽減のためお菓子も備蓄",": Include snacks to help reduce stress"],
["遊び道具","Play materials"],
["：絵本・折り紙・トランプで退屈対策",": Picture books, origami and cards to relieve boredom"],
["防災教育","Disaster education"],
["：避難訓練を家族でシミュレーション",": Practice evacuation as a family"],
["連絡先カード","Contact card"],
["：名前・住所・親の電話番号を記入して常時携帯",": Carry a card with name, address and a parent's phone number"],
["👴 高齢者（65歳以上）","👴 Seniors (65+)"],
["常備薬","Regular medicines"],
["：必要な備えを医師や薬剤師に相談（お薬手帳も用意）",": Discuss supplies with a doctor or pharmacist; prepare a medication record too"],
["食べ慣れた食品","Familiar foods"],
["：飲み込みに不安がある場合は適切な食品形態を専門家に確認",": If swallowing is a concern, ask a specialist about appropriate food textures"],
["入れ歯洗浄剤","Denture cleaner"],
["：口腔衛生維持",": Maintain oral hygiene"],
["杖・補聴器の予備電池","Walking stick and spare hearing-aid batteries"],
["介護用品","Care supplies"],
["：大人用おむつ・防水シーツ",": Adult diapers and waterproof sheets"],
["お薬手帳","Medication record"],
["：既往歴・アレルギー情報",": Medical history and allergy information"],
["🌦️ 季節別の注意点","🌦️ Seasonal considerations"],
["❄️ 冬季（12〜2月）","❄️ Winter (December–February)"],
["防寒対策","Protection from cold"],
["：カイロ・毛布・寝袋・防寒着を備蓄",": Stock hand warmers, blankets, sleeping bags and warm clothes"],
["暖房器具","Heating equipment"],
["：石油ストーブ（電気不要タイプ）・灯油備蓄",": Kerosene heaters that do not require electricity, and fuel"],
["高カロリー食","High-calorie food"],
["：体温維持のためカロリー摂取量増",": More calories may be needed to maintain body temperature"],
["凍結対策","Prevent freezing"],
["：屋外の水は凍るため屋内保管",": Store water indoors because outdoor supplies may freeze"],
["☀️ 夏季（6〜8月）","☀️ Summer (June–August)"],
["熱中症対策","Heat illness prevention"],
["：涼しい場所の確保と水分補給。体調や持病に応じた対策を確認",": Secure a cool place and stay hydrated. Check precautions for health conditions"],
["水分量増","Water planning"],
["：気温や活動量に応じて計画を見直す。一律の倍率で足りるとは限らない",": Review for temperature and activity. A fixed multiplier may not be sufficient"],
["腐敗注意","Spoilage"],
["：停電時、食品が早く傷む",": Food deteriorates faster during outages"],
["虫対策","Insect protection"],
["：蚊取り線香・虫除けスプレー",": Mosquito coils and repellent"],
["🌸 春・秋","🌸 Spring and autumn"],
["花粉症対策","Hay fever precautions"],
["：マスク・目薬・抗アレルギー薬",": Masks, eye drops and allergy medicines"],
["台風対策","Typhoon precautions"],
["：窓ガラス養生・雨具",": Protect windows and prepare rain gear"],
["⚖️ 倫理的ジレンマ Q&A","⚖️ Ethical dilemmas: Q&A"],
["Q：隣人に食料を求められたら？","Q: What if a neighbor asks for food?"],
["基本","Basic approach"],
["：まず自分と家族の生命維持を優先。ただし地域の連携が生死を分ける場合も。",": Prioritize survival needs for yourself and your family. However, community cooperation can also be lifesaving."],
["中間策の例","Possible compromises"],
["食料そのものではなく、「調理済みの1食分」を提供","Offer one prepared meal rather than supplies themselves"],
["共同調理で燃料・水を節約しながらシェア","Share cooking to save fuel and water"],
["情報（給水場所・避難所の状況）を共有","Share information on water distribution and shelter conditions"],
["「我が家も3日分しかない」と正直に伝え、一緒に避難所へ","Honestly explain if you have only 3 days of supplies and go to a shelter together"],
["有効策","Practical approach"],
["：備蓄場所を分散化する。「もうほとんどない」と断っても強引に「備蓄場所を見せろ」といってくる可能性があるため。見せることを想定した備蓄部屋があれば、そんなときでも納得させられる。備蓄品で余裕があってもそれを表に出さない。食料を隠れて食べること。",": Distribute storage locations. Even if you explain that little remains, someone might insist on seeing your supplies. A storage area you are prepared to show may help explain your situation. Avoid displaying surplus supplies; eat out of public view."],
["注意","Caution"],
["：「無限にある」と思われると、次々に頼られる可能性。「子ども・病人・高齢者がいるから」とねだられ続ける。助けるとその噂が広まり、別の家族からも要求される。適切な境界設定を。",": If others think your supplies are unlimited, requests may continue, citing children, illness or older relatives. Word of assistance may spread and bring requests from other families. Set appropriate boundaries."],
["Q：避難所でペットはどうする？","Q: What should I do with pets at a shelter?"],
["事前準備","Preparation"],
["自治体HP・防災マップで「ペット同行避難可」の避難所を確認","Check municipal websites and disaster maps for shelters accepting evacuation with pets"],
["マイクロチップ装着・ワクチン接種を済ませる","Arrange microchipping and vaccinations"],
["ケージ訓練・人慣れ訓練を日常的に実施","Practice crate training and socialization regularly"],
["受け入れ不可の場合","If pets are not accepted"],
["車中避難（エコノミークラス症候群に注意）","Consider staying in a car, with precautions against deep-vein thrombosis"],
["ペット可の避難所を遠方でも探す","Look for a pet-accepting shelter, even farther away"],
["知人・親戚に一時預かり依頼","Ask friends or relatives for temporary care"],
["Q：何日分を備えるべき？","Q: How many days should I prepare for?"],
["最低ライン","Minimum guideline"],
["：3日分（すべての家庭）",": 3 days for all households"],
["推奨ライン","Suggested range"],
["：7〜14日分（一般家庭）",": 7–14 days for typical households"],
["地域リスク別","Local risks"],
["都市部：物流や給水の停止に備え、自治体の想定を確認","Urban areas: prepare for distribution and water-supply disruptions; check municipal scenarios"],
["郊外・地方都市：14日分（幹線道路の寸断リスク）","Suburbs and regional cities: 14 days for risks of major-road disruption"],
["山間部・離島：1ヶ月分（孤立の長期化）","Mountain areas and remote islands: 1 month for prolonged isolation"],
["プレッパー：3〜6ヶ月分（パンデミック・大規模災害対応）","Preppers: 3–6 months for pandemics and major disasters"],
["Q：備蓄を無駄にしたくない","Q: How can I avoid wasting supplies?"],
["解決策","Approach"],
["：ローリングストック方式",": Rotate your stock"],
["普段から食べる → 備蓄が日常の延長に","Use supplies regularly so stocking becomes part of everyday life"],
["ページを開いて期限を確認し、使った分の数量を編集して補充する","Open the page to check dates, update quantities after use, and replenish"],
["「特別な非常食」ではなく「日常食の延長」と考える","Think of supplies as an extension of ordinary meals, not special emergency food"],
["このツールは食品ロスの削減率を測定していません。ページを閉じている間の通知も行いません。","This tool does not measure a reduction in food waste or send notifications while the page is closed."],
["📝 このツールの使い方のコツ","📝 Tips for using this tool"],
["カロリー登録","Enter calories"],
["：在庫登録時に「カロリー」を入れておくと、充足率の算出精度が向上",": Entering calories when registering food makes calorie coverage more informative"],
["水の登録","Register water"],
["：「数量 × 単位 L」で合計。例：2Lボトル6本なら合計容量で",": Total volume is quantity in L. For example, six 2 L bottles can be entered as"],
["数量=12, 単位=L","quantity=12, unit=L"],
["（カテゴリは水）","(category: Water)"],
["医薬品の期限","Medicine dates"],
["：使用期限も必ず登録。アラート対象に含まれる",": Record expiry dates too; medicines are included in alerts"],
["家族構成の更新","Update household settings"],
["：家族が増減したら、必ず「家族構成」タブで再計算→保存",": Recalculate and save in the Household tab when household membership changes"],
["定期エクスポート","Export regularly"],
["：月1回データをエクスポートしてバックアップ",": Export a backup once a month"],
["スマホ活用","Use on a phone"],
["：買い物先でこのツールを開き、在庫確認・補充漏れ防止",": Check inventory while shopping to avoid missing replenishments"],
["❌ よくある失敗例と対策","❌ Common mistakes and responses"],
["❌ 失敗1：備蓄したまま期限切れ","❌ Mistake 1: Leaving supplies until they expire"],
["原因","Cause"],
["：「非常食」として別扱いし、日常で食べない",": Treating them as separate emergency food and never using them"],
["：ローリングストック方式。普段から食べるものを備蓄",": Rotate stock and buy foods you normally eat"],
["❌ 失敗2：水だけ大量、食料が少ない","❌ Mistake 2: Plenty of water but little food"],
["：「水が最優先」と聞いて水ばかり買う",": Buying only water because you heard it comes first"],
["：このツールで水・カロリー両方の充足率を確認",": Check both water and calorie coverage in this tool"],
["❌ 失敗3：缶切りがない","❌ Mistake 3: No can opener"],
["：缶詰は買ったが開ける道具を忘れる",": Buying canned food but forgetting an opener"],
["：プルトップ缶 or 多目的ナイフを備蓄",": Stock pull-tab cans or a multipurpose knife"],
["❌ 失敗4：家族が食べられないものを備蓄","❌ Mistake 4: Food the family cannot eat"],
["：「栄養価が高い」だけで選び、好みを無視",": Choosing only for nutritional value and ignoring preferences"],
["：試食してから備蓄。子どもの好き嫌いも考慮",": Taste before stocking and consider children's preferences"],
["❌ 失敗5：保管場所が浸水リスク地域","❌ Mistake 5: Storage in a flood-risk location"],
["：1階・床下収納に全備蓄を集中",": Keeping all supplies on the ground floor or under the floor"],
["：1階と2階に分散保管",": Distribute supplies between ground and upper floors"],
["🔗 GitHubリポジトリはこちら（","🔗 GitHub repository ("],
["閉じる","Close"],
["例: 2Lペットボトル水 / ツナ缶","Example: 2 L bottled water / canned tuna"],
["食料","Food"],
["水","Water"],
["医薬品","Medicine"],
["ペットフード","Pet food"],
["生活用品","Daily supplies"],
["ツール","Tools"],
["その他","Other"],
["水の登録方法","Water entry method"],
["合計容量で登録","Total volume"],
["本数と1本の容量で登録","Bottle count and capacity"],
["1本の容量（mL）","Capacity per bottle (mL)"],
["2Lなら2000。数量には本数を入力します。既存の合計容量から本数を推測しません。","Enter 2000 for 2 L and put the bottle count in Quantity. Bottle counts are never inferred from existing total-volume records."],
["合計容量で登録する場合、2Lボトル6本は数量12・単位Lです。本数で登録する場合は数量6・1本2000mLです。箱の容量は推測しません。","For total-volume entry, six 2 L bottles are quantity 12 with unit L. For bottle entry, use quantity 6 and 2000 mL per bottle. Box sizes are not inferred."],
["数量の単位を記入します（例：個、缶、袋、L、本、箱）。水はL・mL、または容量を指定した本数で集計します。他のカテゴリの液体は水として数えません。","Enter the quantity's unit, such as items, cans, bags, L, bottles or boxes. Water is counted in L or mL, or as bottles with explicit capacity. Liquids in other categories are not counted as water."],
["選択または入力","Select or type"],
["個","items"],
["缶","cans"],
["袋","bags"],
["本","bottles"],
["箱","boxes"],
["L（リットル）","L (liters)"],
["パック","packs"],
["セット","sets"],
["賞味/使用期限","Best-before / expiry date"],
["食品の賞味期限や医薬品の使用期限を入力します。期限が近づくと自動で警告を表示します。","Enter the food's date or a medicine's expiry. On-page warnings appear as the date approaches."],
["リセット","Reset"],
["なし","None"],
["カロリー（1単位あたり, kcal）","Calories (kcal per unit)"],
["食品1個あたりのカロリーを入力すると、家族の必要カロリーに対する充足率を自動計算します。缶詰やレトルト食品のパッケージに記載されています。","Enter calories per food item to calculate coverage against the household calorie plan. Check the label on cans or ready-to-eat pouches."],
["食品のみ任意","Optional for food"],
["保存","Save"],
["キャンセル","Cancel"],
["在庫の数量操作","Inventory quantity operation"],
["補充は今回の期限を入力してください。同じ期限の場合だけ数量を合算し、それ以外は別行で記録します。","Enter the date on the new supplies. Quantities are combined only when the dates match; otherwise a separate row is added."],
["補充品の期限（未入力可）","Date on replenished supplies (optional)"],
["記録上の数量を変更する操作です。食品や医薬品を消費・使用してよいかは判断しません。","This changes recorded quantities. It does not decide whether food or medicines are safe to consume or use."],
["確定する","Confirm"],
  ];
  const ja = {}, en = {};
  pairs.forEach(([source, translation], index) => { ja['s' + index] = source; en['s' + index] = translation; });
  const dynamic = {
  "reviewLabel": ["見直し対象", "Review records"],
  "reviewAll": ["すべての在庫", "All inventory"],
  "reviewAny": ["見直し対象すべて（数量0を除く）", "All review items (excluding zero quantity)"],
  "reviewNear": ["本日期限・期限間近", "Due today or soon"],
  "reviewUntyped": ["期限の種類が未指定", "Date type unspecified"],
  "reviewVolume": ["水の容量不明", "Water volume unknown"],
  "reviewCalories": ["食料のカロリー未入力", "Food calories missing"],
  "reviewZero": ["数量0", "Zero quantity"],
  "reviewReset": ["検索・絞り込みを解除", "Clear search and filter"],
  "reviewHelp": ["検索と組み合わせて絞り込みます。期限間近の範囲はシステム設定に従います。集計・アラート・買い物メモは常に在庫全体が対象です。安全性の判定ではありません。", "Combine this filter with search. The alert threshold in Settings defines dates due soon. Totals, alerts and the shopping memo always use the entire inventory. This is not a safety assessment."],
  "reviewCount": ["該当 {matched} 件 / 全 {total} 件（ページ分割前）", "Matching {matched} of {total} records (before pagination)"],
  "dateSortAsc": ["期限 早い順", "Date: earliest first"],
  "dateSortDesc": ["期限 遅い順", "Date: latest first"],
  "dateLabel": ["期限の日付", "Label date"],
  "dateTypeLabel": ["期限の種類", "Date type"],
  "type_unspecified": ["未指定", "Unspecified"],
  "type_best-before": ["賞味期限", "Best-before date"],
  "type_use-by": ["消費期限", "Use-by date"],
  "type_expiration": ["使用期限", "Expiration date"],
  "dateHelp": ["製品に表示された日付を入力します。期限の種類は別に選びます。日付や種類だけでは食品・医薬品の安全性を判定できません。", "Enter the date printed on the product and select its type separately. A date or its type alone cannot establish food or medicine safety."],
  "typeHelp": ["製品の表示を確認して選びます。わからない場合は未指定のままにしてください。日付が空欄なら計画には算入しません。", "Check the product label before selecting a type. Leave it unspecified if unknown. Records without a date are excluded from the plan."],
  "replenishRule": ["補充品の日付と期限の種類を確認してください。空欄でない日付と種類が両方同じ場合だけ合算し、それ以外は別行で記録します。", "Check the new stock's date and date type. Quantities combine only when both the nonempty date and type match; otherwise, a separate row is created."],
  "conflict": [
    "別のタブでデータが変更されました。現在の入力を控えてから再読込してください。保存は行っていません。",
    "Another tab changed the data. Keep a copy of your current input, then reload. Nothing was saved."
  ],
  "saveFailed": [
    "保存できませんでした。入力と保存済みデータは変更していません。容量や入力値を確認し、必要ならJSONをエクスポートしてください。",
    "Could not save. Your input and saved data are unchanged. Check storage capacity and input values; export JSON if needed."
  ],
  "sessionNotice": [
    "一時利用中です。再読込で失われるため、JSONをエクスポートしてください。",
    "Temporary session: export JSON before reloading, or changes will be lost."
  ],
  "saved": [
    "保存しました。",
    "Saved."
  ],
  "dark": [
    "ダークモードへ切り替え",
    "Switch to dark mode"
  ],
  "light": [
    "ライトモードへ切り替え",
    "Switch to light mode"
  ],
  "editTitle": [
    "アイテム編集",
    "Edit item"
  ],
  "itemError": [
    "名前、数量、単位、期限、カロリーの入力を確認してください。",
    "Check the name, quantity, unit, date and calories."
  ],
  "clearConfirm": [
    "在庫データを全削除します。先にJSONをエクスポートしてください。削除しますか？",
    "Delete all inventory records? Export JSON first."
  ],
  "recoveryFailed": [
    "保存領域にアクセスできず、元データを取得できません。",
    "Storage is inaccessible; raw data could not be retrieved."
  ],
  "sessionConfirm": [
    "このタブ内だけで一時利用します。再読込やタブを閉じると変更は失われます。続けますか？",
    "Use a temporary session in this tab only? Changes will be lost on reload or closing the tab. Continue?"
  ],
  "sessionStatus": [
    "一時利用中：変更は保存されません。終了前にJSONをエクスポートしてください。",
    "Temporary session: changes are not saved. Export JSON before leaving."
  ],
  "sessionEnabled": [
    "一時利用に切り替えました。保存できなかった操作は、入力を確認して再実行してください。",
    "Temporary session enabled. Check your input and retry any operation that could not be saved."
  ],
  "importConfirm": [
    "{count}件の在庫と家族設定で置き換えます。現在のデータをエクスポート済みですか？",
    "Replace inventory and household settings with {count} rows? Have you exported your current data?"
  ],
  "importFailed": [
    "インポートできませんでした。最大10MB・5000件、形式、数値、日付を確認してください。読込中に編集した場合も取り込みません。既存データは変更していません。",
    "Import failed. Check the 10 MiB / 5000-row limits, format, numbers and dates. Changes made during loading also cancel the import. Existing data is unchanged."
  ],
  "familyError": [
    "人数は0〜100の整数、日数と計画値は入力欄の範囲で指定してください。",
    "Use whole-number counts from 0 to 100, and keep days and planning values within the field limits."
  ],
  "familyReset": [
    "家族構成と計画値を初期値に戻しますか？",
    "Reset household and planning values to their defaults?"
  ],
  "notCalculated": [
    "計算対象外／未設定",
    "Not calculated / unset"
  ],
  "summary": [
    "登録件数：{count} ｜ 水：{water} L ｜ 人用食料：{food} kcal",
    "Rows: {count} | Water: {water} L | Human food: {food} kcal"
  ],
  "stockLimits": [
    "計画に算入した在庫：水 {water} L、人用食料 {food} kcal。確認が必要：水の容量不明 {unknownWater}件、食料のカロリー未入力 {unknownKcal}件、期限未入力 {undated}件、期限切れ {expired}件。数量0は集計とアラートの対象外です。",
    "Counted toward the plan: water {water} L, human food {food} kcal. Rows to check: unknown water volume {unknownWater}, missing food calories {unknownKcal}, undated {undated}, expired {expired}. Zero quantities are excluded from totals and alerts."
  ],
  "empty": [
    "まだアイテムが登録されていません。「アイテム追加」から登録してください。",
    "No items yet. Choose Add item to register supplies."
  ],
  "noMatch": [
    "検索条件に一致するアイテムはありません。",
    "No items match your search."
  ],
  "expired": [
    "期限切れ",
    "Expired"
  ],
  "today": [
    "本日期限",
    "Due today"
  ],
  "near": [
    "期限間近",
    "Expiring soon"
  ],
  "later": [
    "期限まで余裕",
    "Later expiry"
  ],
  "unknown": [
    "期限未入力",
    "No date"
  ],
  "invalid": [
    "日付要確認",
    "Check date"
  ],
  "bottleUnit": [
    "本（1本 {ml} mL／計 {liters} L）",
    "bottles ({ml} mL each / {liters} L total)"
  ],
  "useOne": [
    "1使う",
    "Use 1"
  ],
  "consume": [
    "数量を指定して使う",
    "Use a quantity"
  ],
  "replenish": [
    "補充",
    "Replenish"
  ],
  "edit": [
    "編集",
    "Edit"
  ],
  "remove": [
    "削除",
    "Delete"
  ],
  "deleteConfirm": [
    "「{name}」を削除します。よろしいですか？",
    "Delete \"{name}\"?"
  ],
  "prev": [
    "前へ",
    "Previous"
  ],
  "next": [
    "次へ",
    "Next"
  ],
  "page": [
    "{current} / {total} ページ",
    "Page {current} / {total}"
  ],
  "food": [
    "食料",
    "Food"
  ],
  "water": [
    "水",
    "Water"
  ],
  "medicine": [
    "医薬品",
    "Medicine"
  ],
  "pet-food": [
    "ペットフード",
    "Pet food"
  ],
  "daily": [
    "生活用品",
    "Daily supplies"
  ],
  "tool": [
    "ツール",
    "Tools"
  ],
  "other": [
    "その他",
    "Other"
  ],
  "actionError": [
    "数量・期限・件数を確認してください。在庫を超える消費や、上限を超える補充はできません。",
    "Check quantity, date and row limits. You cannot use more than recorded or replenish beyond the limits."
  ],
  "staleAction": [
    "在庫が変更されています。閉じてから操作をやり直してください。",
    "Inventory has changed. Close this dialog and start the operation again."
  ],
  "noUndo": [
    "取り消せる操作がありません。",
    "There is no operation to undo."
  ],
  "none": [
    "該当なし",
    "None"
  ],
  "rollingItem": [
    "{name}（期限 {expiry}、表示と保存状態を確認）",
    "{name} (date {expiry}; check label and storage conditions)"
  ],
  "noRolling": [
    "今日から14日後までの対象はありません。",
    "No eligible items are due today through 14 days from now."
  ],
  "humanFood": [
    "人用食料",
    "Human food"
  ],
  "zeroTarget": [
    "目標が0または未設定のため達成率を計算しません。",
    "Coverage is not calculated because the target is zero or unset."
  ],
  "met": [
    "入力した数量の目標以上です。食品の安全性や栄養の充足を保証するものではありません。",
    "The entered quantity meets the target. This does not guarantee food safety or nutritional adequacy."
  ],
  "short": [
    "計画値に対し {amount} {unit}不足しています。",
    "Short of the plan by {amount} {unit}."
  ],
  "petUnknown": [
    "ペットの水量が未設定です。家族構成タブで、普段の使用量などに基づく計画値を入力してください。",
    "Pet water is unset. Enter a planning value based on normal use and other needs in Household."
  ],
  "expiredNote": [
    "期限切れは{count}件です。消費期限を過ぎた食品は食べないでください。医薬品等は製品の表示を確認してください。",
    "Expired rows: {count}. Do not eat food past its use-by date. Check labels for medicines and other products."
  ],
  "undatedNote": [
    "期限未入力は{count}件です。期限表示のない品も含め、計画への算入から外しています。安全性を判定した結果ではありません。",
    "Undated rows: {count}. These are excluded from the plan, including products without date labels. This exclusion is not a safety judgment."
  ],
  "unknownWaterNote": [
    "水の容量不明は{count}件です。本数や箱数をLへ推測換算しません。",
    "Unknown water-volume rows: {count}. Bottle or box sizes are not guessed to convert them to L."
  ],
  "unknownKcalNote": [
    "人用食料のカロリー未入力は{count}件です。未入力は0kcalの食品という意味ではありません。",
    "Human-food rows with missing calories: {count}. Missing does not mean the food contains 0 kcal."
  ],
  "petFoodNote": [
    "ペットフードの必要量は計算していません。普段の食事と個体ごとの必要量を別に確認してください。",
    "Pet-food needs are not calculated. Check normal feeding and individual requirements separately."
  ],
  "categoriesNote": [
    "数量のある登録カテゴリ：{count}種類。品目数だけで備蓄のバランスや安全性は評価しません。",
    "Categories with positive quantities: {count}. Item counts alone do not assess stock balance or safety."
  ],
  "categoryCount": [
    "{category}：{count}件",
    "{category}: {count} rows"
  ],
  "chartSummary": [
    "計画値：{target} ｜ 算入した在庫：{stock} {unit}",
    "Plan: {target} | Counted stock: {stock} {unit}"
  ],
  "unset": [
    "未設定",
    "Unset"
  ],
  "ratio": [
    "達成率：{value}",
    "Coverage: {value}"
  ],
  "progressLabel": [
    "計画値に対する達成率（棒は100%まで）",
    "Coverage against the plan (bar capped at 100%)"
  ],
  "petUnset": [
    "ペットの水量が未設定",
    "Pet water is unset"
  ],
  "coverage": [
    "水 {water} ｜ 人用食料 {food}",
    "Water {water} | Human food {food}"
  ],
  "capacityError": [
    "1本の容量を1〜1,000,000mLの整数で入力してください。",
    "Enter a whole-number bottle capacity from 1 to 1,000,000 mL."
  ],
  "memoTitle": [
    "買い物メモ（確認日 {date}）",
    "Shopping memo (checked {date})"
  ],
  "memoWater": [
    "水：計画 {target} L／算入した在庫 {stock} L",
    "Water: plan {target} L / counted stock {stock} L"
  ],
  "memoShortWater": [
    "水の不足：{amount} L",
    "Water shortage: {amount} L"
  ],
  "memoBottles": [
    "購入本数の目安：{count} 本（1本 {ml} mL）",
    "Bottles to buy (estimate): {count} ({ml} mL each)"
  ],
  "memoFood": [
    "人用食料：計画 {target} kcal／算入した在庫 {stock} kcal",
    "Human food: plan {target} kcal / counted stock {stock} kcal"
  ],
  "memoShortFood": [
    "人用食料の不足：{amount} kcal（缶数・食数への換算なし）",
    "Human-food shortage: {amount} kcal (not converted to cans or meals)"
  ],
  "excluded": [
    "算入できない記録（理由は重複する場合があります）：",
    "Excluded records (reasons may overlap):"
  ],
  "unknownVolume": [
    "容量不明",
    "Unknown volume"
  ],
  "missingCalories": [
    "カロリー未入力",
    "Missing calories"
  ],
  "memoLimits": [
    "期限・保存状態・製品の表示を別に確認してください。食品の安全性や栄養の充足を保証しません。ペットフード・生活用水の必要量は計算していません。",
    "Check dates, storage conditions and product labels separately. Food safety and nutritional adequacy are not guaranteed. Pet-food and sanitation-water needs are not calculated."
  ],
  "copied": [
    "コピーしました。",
    "Copied."
  ],
  "copyFailed": [
    "自動コピーできませんでした。選択したメモを手動でコピーしてください。",
    "Automatic copying failed. Copy the selected memo manually."
  ],
  "corrupt": [
    "保存データの形式を確認できません。元データは変更していません。「元データを救出」で保管し、正しいJSONをインポートするか、一時利用を選んでください。",
    "Saved data has an unsupported or invalid format. The original is unchanged. Use Rescue raw data, then import valid JSON or choose a temporary session."
  ],
  "unavailable": [
    "保存領域を利用できません。保存する操作は停止しています。一時利用を選ぶと、このタブ内だけで操作できます。",
    "Storage is unavailable. Saving is paused. Choose a temporary session to work only within this tab."
  ],
  "legacy": [
    "保存済みの在庫を読み込みました。計画水量は1人1日3L、ペットの水量は未設定です。単位と計画値を確認してください。元の保存キーは変更しません。",
    "Saved inventory loaded. Planned water defaults to 3 L/person/day; pet water is unset. Check units and planning values. Compatibility storage keys are unchanged."
  ],
  "storage": [
    "このブラウザーに保存します。定期的にJSONをエクスポートしてください。",
    "Data is saved in this browser. Export JSON regularly."
  ],
  "storageChanged": [
    "別のタブで保存データが変更されました。未保存の入力を控えてから再読込してください。",
    "Another tab changed saved data. Keep a copy of unsaved input before reloading."
  ],
  "separator": [
    "：",
    ": "
  ],
  "join": [
    "、",
    ", "
  ],
  "closeParen": [
    "）",
    ")"
  ]
};
  for (const [key, pair] of Object.entries(dynamic)) { ja[key] = pair[0]; en[key] = pair[1]; }
  return { ja, en };
});
