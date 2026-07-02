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
- AI相談: ブラウザから直接 Anthropic Messages API を呼ぶ(`anthropic-dangerous-direct-browser-access` ヘッダ使用、モデル `claude-sonnet-4-6`)。APIキーはユーザーが設定画面で入力しlocalStorageに保存

## ファイル構成

```
index.html              PWAメタタグ、SW登録(https時のみ)
public/                 manifest, sw.js, アイコン(PIL生成の黄色バーベル)
src/main.jsx            エントリ
src/App.jsx             全UI(ホーム/食事/トレ/履歴/AI相談/設定モーダル、下部5タブ)
src/data.js             初期データ(食品マスタ16品、メニューA/B、スケジュール、目標)
src/store.js            localStorage入出力、マクロ計算、前回セット検索、エクスポート
src/ai.js               AI相談のコンテキスト組み立てとAPI呼び出し
```

## データモデル(localStorage `pfclog.v1`)

```
{
  settings: { kcalTarget, pTarget, fTarget, cTarget, apiKey },
  foods:    [{ id, name, kcal, p, f, c }],            // 1単位あたり
  menus:    { A: { name, exercises: [{ name, sets, kg, reps }] }, B: {...} },
  schedule: { 2: 'A', 4: 'B', 6: 'A' },               // 曜日(0=日)→メニュー。火A木B土A
  logs:     { 'YYYY-MM-DD': {
                meals: [{ id, slot, qty, foodId? | custom?{name,kcal,p,f,c} }],
                weight: number|null,
                workout: { menu:'A'|'B', exercises:[{ name, sets:[{kg,reps}] }] } | null } },
  mealSets: [{ id, name, slot, items }],              // ワンタップ献立セット
  chat:     [{ role, content }]
}
```

- slot は breakfast / lunch / snack / dinner
- `loadState()` がデフォルト値とマージするので、localStorageに古い形式が残っていても起動は壊れない設計を維持すること

## 仕様上の決めごと

- ジムメニュー設定は設定画面のテキストエリアで「1行 = 種目名, セット数, kg, 回数」。旧3項目形式(種目名, セット数, 回数)もパース可(後方互換を壊さない)
- トレ記録開始時、各種目のkgは「過去ログの同名種目の前回セット > メニュー定義のkg」の優先順で自動プリフィル
- AI相談は毎回 `buildContext()` で目標・当日の全記録・直近7日サマリーをsystemプロンプトに注入する(ユーザーが状況説明しなくていいのがこのアプリの核)
- データは端末ローカルのみなので、設定画面のJSONエクスポート/インポート(バックアップ)機能は削らない
- UIは日本語、モバイルファースト(max-width 560px、下部タブ、safe-area対応)
- デザイントークン: ダーク基調 bg #14181d / アクセント #ffc53d / P #38d9a9 / F #ffa94d / C #74a8fc(index.cssの:root参照)

## 現在の状態と直近の作業

- 初回コミット(16ファイル)はpush済み、Vercelデプロイ済み、動作確認済み
- 直近の変更: メニュー定義へのkg追加(src/App.jsx, src/data.js)。チャットからダウンロードしたファイルの上書きで適用予定だったため、**リポジトリに反映済みかは最初に確認すること**(設定画面のラベルが「種目名, セット数, kg, 回数」になっていれば適用済み)
- 既存ユーザーデータのmenusにはkgが無い場合がある(設定画面で4項目形式に書き直せば入る)

## オーナーの環境

- Windows PC、作業ディレクトリ `C:\work\pfc-log`、Git for Windowsインストール済み、GitHub認証設定済み(アカウント mizuguchi-h)
- 本業はJava/Spring Boot(フリーランス)。Reactは別プロジェクト(PostCraft)で使用経験あり
- コミュニケーションは率直・直接的を好む

## 今後のアイデア(未着手)

- スケジュール(曜日→メニュー)を設定画面から編集可能に(現状 data.js のDEFAULT_SCHEDULE固定で、localStorage優先のため変更が反映しにくい)
- 食品マスタの編集・削除UI(現状は追加のみ)
- 使用頻度による食品リストの並び替え
- AI相談の回答から食事エントリを自動登録(例: PFC推定→そのまま記録)
- 過去日付の記録編集(現状は当日のみ)

## 開発コマンド

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ に出力(Vercelはこれを自動実行)
```

デプロイは main への git push のみ。手動操作不要。
