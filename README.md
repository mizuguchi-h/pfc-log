# PFCログ - ダイエット記録PWA

ChatGPTとの毎日の定型やり取りを置き換える、自分専用のダイエット・筋トレ記録アプリ。

## 機能

- **ホーム**: 残りカロリー、PFCバー(目標比)、今日のジムメニュー(火A・木B・土A自動判定)、体重記録
- **食事記録**: 登録済み食品をタップで追加、量は0.5刻みで調整。よく食べる組み合わせは「セット保存」してワンタップ追加(=献立テンプレ)
- **トレーニング**: 全身法A/Bのメニューを曜日で自動表示。前回の重量を自動で引き継ぎ、kg×回数×セットを記録
- **履歴**: 直近14日のカロリー/PFC/体重一覧、体重30日グラフ
- **AI相談**: Google Gemini APIによるコーチ機能(無料枠あり)。目標・今日の記録・直近7日分が自動でコンテキストに入るので、状況説明なしで「今夜何食べるべき?」と聞ける
- **バックアップ**: JSONエクスポート/インポート(データは端末ローカルのみのため定期バックアップ推奨)

## ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:5173` で開く。スマホから同一LANで確認したい場合は `npm run dev -- --host`。

## iPhoneにインストールする(PWA)

PWAとしてホーム画面に追加するには **https配信が必要** です。無料でやるなら:

1. GitHubにpushして [Vercel](https://vercel.com) か [Netlify](https://netlify.com) に接続(ビルドコマンド `npm run build`、出力 `dist`)
2. 発行されたURLをiPhoneのSafariで開く
3. 共有ボタン → 「ホーム画面に追加」

以後、アプリアイコンから全画面で起動し、オフラインでも動きます(AI相談以外)。

## AI相談のセットアップ

1. [Google AI Studio](https://aistudio.google.com/apikey) でAPIキーを無料発行(Googleアカウントのみで取得可、無料枠の範囲なら課金不要)
2. アプリの「設定」→ APIキーを貼り付け

### 注意

- キーは端末のlocalStorageにのみ保存されます(サーバーには送りません。API呼び出しはブラウザ→Gemini API直通)
- **個人利用前提の構成**です。公開URLを他人と共有する場合、キーが端末ごとに必要になるだけで漏洩はしませんが、自分専用のキーを使うこと(他人と共有しない)
- 無料枠にはレート制限があります(目安: `gemini-2.5-flash` で1日250回・1分10回程度)。それを超える使い方をするなら、将来的にはAPIキーをサーバー側(Vercel Functions等)に置くのが理想

## データ構造

すべて `localStorage` のキー `pfclog.v1` に保存:

```
{
  settings: { kcalTarget, pTarget, fTarget, cTarget, apiKey },
  foods:    [{ id, name, kcal, p, f, c }],
  menus:    { A: { exercises: [{ name, sets, reps }] }, B: {...} },
  schedule: { 2: 'A', 4: 'B', 6: 'A' },   // 曜日→メニュー
  logs:     { 'YYYY-MM-DD': { meals, weight, workout } },
  mealSets: [{ id, name, slot, items }],
  chat:     [{ role, content }]
}
```

## カスタマイズポイント

- 食品の初期リスト: `src/data.js` の `DEFAULT_FOODS`(アプリ内でも「その他を追加」で追加可能)
- ジムメニュー・目標値: アプリ内の設定画面から変更可能
- スケジュール変更(例: 週4に増やす): `src/data.js` の `DEFAULT_SCHEDULE`(※既存データがある場合はlocalStorage側が優先されるので、設定画面拡張かlocalStorageクリアで反映)
