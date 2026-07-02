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
src/data.js             初期データ(食品マスタ、メニューA/B、スケジュール、トレ日/オフ日別目標、固定献立セット)
src/store.js            localStorage入出力、マクロ計算、前回セット検索、エクスポート
src/ai.js               AI相談のコンテキスト組み立てとAPI呼び出し
```

## データモデル(localStorage `pfclog.v1`)

```
{
  settings: { kcalTargetTrain, pTargetTrain, fTargetTrain, cTargetTrain,
              kcalTargetOff, pTargetOff, fTargetOff, cTargetOff, apiKey },
  foods:    [{ id, name, kcal, p, f, c, unitGrams? }], // kcal/p/f/cはunitGrams(g)あたりの値。個数/パック単位の食品はunitGramsなし
  menus:    { A: { name, exercises: [Exercise] }, B: {...} },
  schedule: { 2: 'A', 4: 'B', 6: 'A' },               // 曜日(0=日)→メニュー。それ以外はオフ日
  logs:     { 'YYYY-MM-DD': {
                meals: [{ id, slot, qty, foodId? | custom?{name,kcal,p,f,c} }],
                weight: number|null,
                workout: { menu:'A'|'B', exercises:[LoggedExercise] } | null } },
  mealSets: [{ id, name, slot, items }],              // ワンタップ献立セット
  chat:     [{ role, content }]
}
```

- Exercise は通常種目 `{ name, sets, kg, reps }`(reps は "8〜10" のような範囲文字列)、または有酸素 `{ name, type:'cardio', incline, speed, minutes }` のいずれか
- LoggedExercise は通常種目 `{ name, repsTarget, sets:[{kg,reps}] }`、または有酸素 `{ name, type:'cardio', incline, speed, targetMinutes, minutes, done }`
- slot は breakfast / lunch / snack / dinner
- トレーニング日/オフ日の判定は `isTrainingDay(state, dateKey)`(schedule に当日のメニューがあるか)。目標値もこれで切り替える(`targetsOf()`)
- `loadState()` がデフォルト値とマージするので、localStorageに古い形式が残っていても起動は壊れない設計を維持すること。foods/mealSets はidベースで「保存済み+未追加のデフォルトを補う」マージ(`mergeById`)で、既存項目にもデフォルト側の新フィールドを不足分だけ補う(食品/献立セットは編集UIが無いので上書きしても安全という前提)。コード側で追加・変更した既定食品・献立セットは既存端末にも自動で反映される。menus はこの仕組みが無く `saved.menus || DEFAULT_MENUS` で丸ごと決まるので、内容を変えたら既存端末では設定画面のテキストエリアに書き直してもらう必要がある

## 仕様上の決めごと

- ジムメニュー設定は設定画面のテキストエリアで「1行 = 種目名, セット数, kg, 回数」。旧3項目形式(種目名, セット数, 回数)もパース可(後方互換を壊さない)。有酸素は「種目名, cardio, 傾斜, 速度, 分」
- トレ記録開始時、各種目のkgは「過去ログの同名種目の前回セット > メニュー定義のkg」の優先順で自動プリフィル。reps はメニュー定義の範囲文字列の先頭の数値をプリフィルに使う(`repsDefault()`)
- 1日の目標(kcal/P/F/C)はトレーニング日とオフ日で別々に持つ。ホーム画面は当日がどちらかを自動判定して該当する目標を表示する
- 履歴タブの各日付行はタップで開閉し、体重編集・「食事を編集」「トレを編集」を提供する。後者2つは食事/トレタブをその日付向けに開き(App.jsxの`editDate`state)、上部に「編集中: YYYY-MM-DD」バナーと「履歴に戻る」を表示する。ホーム/下部タブでの直接遷移は常に今日に戻る(食事⇄トレ間の遷移でのみeditDateを維持)
- 食品リストで`unitGrams`がある食品をタップするとグラム数入力モーダルが開き、入力に応じてkcal/PFCをその場で按分計算してから記録する(qty = 入力g / unitGrams)。無い食品(個数・パック単位)は従来通りタップで即qty=1追加
- AI相談は毎回 `buildContext()` で目標(当日該当分)・当日の全記録・直近7日サマリーをsystemプロンプトに注入する(ユーザーが状況説明しなくていいのがこのアプリの核)
- データは端末ローカルのみなので、設定画面のJSONエクスポート/インポート(バックアップ)機能は削らない
- UIは日本語、モバイルファースト(max-width 560px、下部タブ、safe-area対応)
- デザイントークン: ダーク基調 bg #14181d / アクセント #ffc53d / P #38d9a9 / F #ffa94d / C #74a8fc(index.cssの:root参照)

## 現在の状態と直近の作業

- 初回コミット(16ファイル)、kg対応、固定ルーティン反映(全身法A/B・固定献立・トレ日/オフ日別目標)、履歴の過去日編集、AI相談のGemini切り替えに続き、食事記録をグラム数入力→kcal/PFC自動按分に対応(src/data.js, src/store.js, src/App.jsx)
- 既存端末に保存済みのAPIキーはAnthropicのものなのでGeminiでは使えない。オーナーは設定画面でGoogle AI Studioのキーに入れ替える必要がある
- 既存端末の実データでは、foods/mealSetsの新規デフォルトは自動マージされるが、menus(A/Bの種目構成)は自動反映されない。設定画面のジムメニュー欄に新しいテキストを貼り直してもらう必要がある

## オーナーの環境

- Windows PC、作業ディレクトリ `C:\work\pfc-log`、Git for Windowsインストール済み、GitHub認証設定済み(アカウント mizuguchi-h)
- 本業はJava/Spring Boot(フリーランス)。Reactは別プロジェクト(PostCraft)で使用経験あり
- コミュニケーションは率直・直接的を好む

## 今後のアイデア(未着手)

- スケジュール(曜日→メニュー)を設定画面から編集可能に(現状 data.js のDEFAULT_SCHEDULE固定で、localStorage優先のため変更が反映しにくい)
- 食品マスタの編集・削除UI(現状は追加のみ)。追加できるのもunitGramsを持たないカスタム食品(kcal/PFC手入力)のみで、グラム按分には未対応
- 使用頻度による食品リストの並び替え
- AI相談の回答から食事エントリを自動登録(例: PFC推定→そのまま記録)

## 開発コマンド

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ に出力(Vercelはこれを自動実行)
```

デプロイは main への git push のみ。手動操作不要。
