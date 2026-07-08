# PFCログ - プロジェクトコンテキスト

## これは何か

ダイエット・筋トレ記録用の個人向けPWA。オーナー(HIDE)が毎日ChatGPTとやっていた定型のやり取り(献立候補・ジムメニュー確認・食事とトレの報告・カロリー/PFC集計)をアプリに置き換えたもの。Claude(claude.ai)との対話で初期実装され、以後の開発はClaude Codeで行う。

- リポジトリ: https://github.com/mizuguchi-h/pfc-log
- 本番URL: https://pfc-log-mocha.vercel.app (mainへのpushでVercelが自動デプロイ)
- 利用形態: iPhoneのSafariから「ホーム画面に追加」してPWAとして利用。個人利用のみ。

## 技術スタック

- Vite + React 18(JSX、TypeScriptなし)
- 状態管理: useStateのみ。全データをlocalStorageのキー `pfclog.v1` に保存(サーバーなし・端末ローカルのみ)
- スタイル: 素のCSS(`src/index.css`)。CSSフレームワーク不使用
- PWA: 手書きの `public/sw.js`(同一オリジンGETのstale-while-revalidate)+ `manifest.webmanifest`
- AI相談: ブラウザから直接 Google Gemini API(`generativelanguage.googleapis.com` の generateContent)を呼ぶ、モデル `gemini-2.5-flash`(無料枠あり。課金なしで使えることを優先して選定)。APIキーはGoogle AI Studioで発行し、ユーザーが設定画面で入力しlocalStorageに保存

## ファイル構成

```
index.html              PWAメタタグ、SW登録(https時のみ)
public/                 manifest, sw.js, アイコン(PIL生成の黄色バーベル)
src/main.jsx            エントリ
src/App.jsx             全UI(ホーム/食事/トレ/履歴/AI相談/設定モーダル、下部5タブ)
src/data.js             初期データ(食品マスタ、初期ルーティンA/B、スケジュール、トレ日/オフ日別目標、固定献立セット)
src/store.js            localStorage入出力、マクロ計算、前回セット検索、エクスポート
src/ai.js               AI相談のコンテキスト組み立てとAPI呼び出し
```

## データモデル(localStorage `pfclog.v1`)

```
{
  settings: { kcalTargetTrain, pTargetTrain, fTargetTrain, cTargetTrain,
              kcalTargetOff, pTargetOff, fTargetOff, cTargetOff, apiKey },
  foods:    [{ id, name, kcal, p, f, c, unitGrams? }], // kcal/p/f/cはunitGrams(g)あたりの値。個数/パック単位の食品はunitGramsなし
  routines: [{ id, name, exercises: [Exercise] }],    // 自由に追加・削除できるトレーニングルーティンの一覧
  schedule: { 2: 'A', 4: 'B', 6: 'A' },               // 曜日(0=日)→routines[].id。それ以外はオフ日
  logs:     { 'YYYY-MM-DD': {
                meals: [{ id, slot, qty, foodId? | custom?{name,kcal,p,f,c} }],
                weight: number|null,
                workout: { menu: routineId, exercises:[LoggedExercise] } | null } },
  mealSets: [{ id, name, slot, items }],              // ワンタップ献立セット
  chat:     [{ role, content }]
}
```

- Exercise は3種類: 通常 `{ name, sets, kg, reps }` / 自重(kgなし) `{ name, type:'bodyweight', sets, reps }` / 有酸素 `{ name, type:'cardio', incline, speed, minutes }`。reps は "8〜10" のような範囲文字列
- LoggedExercise は通常/自重種目 `{ name, type?, repsTarget, sets:[{kg,reps}|{reps}] }`(自重はsetsにkgを含めない)、または有酸素 `{ name, type:'cardio', incline, speed, targetMinutes, minutes, done }`
- slot は breakfast / lunch / snack / dinner
- トレーニング日/オフ日の判定は `isTrainingDay(state, dateKey)`(schedule に当日のメニューがあるか)。目標値もこれで切り替える(`targetsOf()`)
- `loadState()`(内部で`normalizeState()`)がデフォルト値とマージ・移行するので、localStorageに古い形式が残っていても起動は壊れない設計を維持すること。foods/mealSets はidベースで「保存済み+未追加のデフォルトを補う」マージ(`mergeById`)で、既存項目にもデフォルト側の新フィールドを不足分だけ補う(食品/献立セットは編集UIが無いので上書きしても安全という前提)。コード側で追加・変更した既定食品・献立セットは既存端末にも自動で反映される。routinesは旧`menus:{A,B}`形式からの自動移行(`migrateRoutines()`、idはA/Bのまま引き継ぐ)のみで、内容自体のマージはしない。バックアップのインポートも`normalizeState()`を通すので旧形式のJSONを読み込んでも壊れない

## 仕様上の決めごと

- トレーニングルーティンは固定A/Bではなく自由な数だけ追加・削除できる(トレタブの「ルーティン管理」)。各ルーティンの種目も同じ画面で個別に追加・削除する(重量/自重/有酸素をタブで選んでから入力)。曜日への割り当ては設定画面のセレクトボックスで行う。ルーティン削除時はscheduleの参照も自動で外す
- トレ記録開始時、各種目のkgは「過去ログの同名種目の前回セット > メニュー定義のkg」の優先順で自動プリフィル。reps はメニュー定義の範囲文字列の先頭の数値をプリフィルに使う(`repsDefault()`)。自重種目はkgを持たず、回数のみ記録する
- 1日の目標(kcal/P/F/C)はトレーニング日とオフ日で別々に持つ。ホーム画面は当日がどちらかを自動判定して該当する目標を表示する
- 履歴タブの各日付行はタップで開閉し、体重編集・「食事を編集」「トレを編集」を提供する。後者2つは食事/トレタブをその日付向けに開き(App.jsxの`editDate`state)、上部に「編集中: YYYY-MM-DD」バナーと「履歴に戻る」を表示する。ホーム/下部タブでの直接遷移は常に今日に戻る(食事⇄トレ間の遷移でのみeditDateを維持)
- 食品リストで`unitGrams`がある食品をタップするとグラム数入力モーダルが開き、入力に応じてkcal/PFCをその場で按分計算してから記録する(qty = 入力g / unitGrams)。無い食品(個数・パック単位)は従来通りタップで即qty=1追加。食品カード上のkcal表示にunitGramsは出さない(グラム数はタップ後に自由入力するので不要)
- 食品リストは各カードの✕でいつでも削除可能(確認ダイアログあり。過去ログのfoodId参照は現在のfoodsから都度引くため、削除すると過去分の表示も0kcal/`?`になる—既知のトレードオフ)。「＋ 食品を追加」フォームでは名前・kcal/P/F/C・グラム数(任意、gで量が変わる食品向け)を入力し、「食品リストに保存する」を外せばその場限りの記録(従来の一発追加)、付けたままなら食品リストにも永続保存されて次回からタップで使える
- トレ記録開始時、前回セットが目標reps範囲の上限を全セットで達成していた(かつ前回kg>0)場合、次回セットのkgを自動で+2.5kgして提案バッジを出す(`repsRangeMax()`、Workoutの`start()`内)。過負荷漸進の自動化で、意図的にkgそのものを書き換える(表示だけの提案ではない)ので合わない場合は数値を直接編集すればよい。自重・有酸素種目は対象外
- ホーム画面に「直近7日の記録日数」ストリークチップを表示(`loggedDaysCount()`)。継続の可視化が目的で、判定は食事/体重/トレのいずれか1つでもあればその日は「記録あり」
- 体重グラフ(履歴タブ)は実測点(薄いグレーの散布)と7日移動平均(グラデーションの太線)を重ねて表示する(`movingAverage()`)。日々のブレより傾向を見せる意図
- AI相談は毎回 `buildContext()` で目標(当日該当分)・当日の全記録・直近7日サマリーをsystemプロンプトに注入する(ユーザーが状況説明しなくていいのがこのアプリの核)
- データは端末ローカルのみなので、設定画面のJSONエクスポート/インポート(バックアップ)機能は削らない
- UIは日本語、モバイルファースト(max-width 560px、下部タブ、safe-area対応)
- デザイントークン: ダーク基調 bg #10141a / アクセントは黄〜オレンジのグラデーション(#ffc857→#ff9955)/ P #35d0a4 / F #ff9f5a / C #6fa8ff(index.cssの:root参照)。カード・ボタン・タブに影とグラデーションを使い「安っぽく見えない」ことを意識(2026-07時点で見た目のチープさを指摘されて刷新)。アイコンは引き続き絵文字(SVGアイコンセットへの置き換えは未着手)

## 現在の状態と直近の作業

- 初回コミット(16ファイル)、kg対応、固定ルーティン反映、履歴の過去日編集、AI相談のGemini切り替え、食事記録のグラム数入力対応、食品リストの追加・削除UI、重量アップ自動提案/体重移動平均/記録ストリーク+見た目刷新、に続き、ジムメニューを固定A/Bから自由に追加・削除できるルーティン一覧に変更し(`menus`→`routines`、旧形式は自動移行)、自重種目(kgなし)にも対応した(src/data.js, src/store.js, src/App.jsx, src/ai.js)
- 既存端末に保存済みのAPIキーはAnthropicのものなのでGeminiでは使えない。オーナーは設定画面でGoogle AI Studioのキーに入れ替える必要がある
- 既存端末の実データでは、foods/mealSetsの新規デフォルトは自動マージされるが、menus(A/Bの種目構成)は自動反映されない。設定画面のジムメニュー欄に新しいテキストを貼り直してもらう必要がある

## オーナーの環境

- Windows PC、作業ディレクトリ `C:\work\pfc-log`、Git for Windowsインストール済み、GitHub認証設定済み(アカウント mizuguchi-h)
- 本業はJava/Spring Boot(フリーランス)。Reactは別プロジェクト(PostCraft)で使用経験あり
- コミュニケーションは率直・直接的を好む

## 今後のアイデア(未着手)

- 食品マスタの追加・削除は実装済み。既存項目の編集(名前やkcal/PFCの書き換え)UIはまだ無い(削除して追加し直す運用)
- ルーティン・種目の追加・削除、曜日割り当ては実装済み。ルーティン名や既存種目の中身のリネーム/編集UIはまだ無い(削除して追加し直す運用)
- 使用頻度による食品リストの並び替え
- AI相談の回答から食事エントリを自動登録(例: PFC推定→そのまま記録)

## 開発コマンド

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ に出力(Vercelはこれを自動実行)
```

デプロイは main への git push のみ。手動操作不要。
