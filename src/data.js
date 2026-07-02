// ===== 初期データ(すべてアプリ内で編集可能) =====

export const DEFAULT_FOODS = [
  { id: 'f01', name: '白米 150g', kcal: 234, p: 3.8, f: 0.5, c: 53.4 },
  { id: 'f02', name: '玄米 150g', kcal: 228, p: 4.2, f: 1.5, c: 47.8 },
  { id: 'f03', name: 'オートミール 30g', kcal: 105, p: 4.1, f: 1.7, c: 17.9 },
  { id: 'f04', name: '鶏むね肉(皮なし)100g', kcal: 105, p: 23.3, f: 1.9, c: 0.1 },
  { id: 'f05', name: 'サラダチキン 1個', kcal: 110, p: 24.0, f: 1.2, c: 0.5 },
  { id: 'f06', name: '卵 1個', kcal: 76, p: 6.2, f: 5.2, c: 0.2 },
  { id: 'f07', name: '納豆 1パック', kcal: 95, p: 8.3, f: 5.0, c: 6.1 },
  { id: 'f08', name: '豆腐 150g', kcal: 84, p: 7.9, f: 5.3, c: 1.2 },
  { id: 'f09', name: '鮭 切り身 1切', kcal: 106, p: 17.8, f: 3.3, c: 0.1 },
  { id: 'f10', name: 'サバ缶(水煮)1缶', kcal: 340, p: 31.2, f: 21.4, c: 0.4 },
  { id: 'f11', name: 'プロテイン 1杯', kcal: 115, p: 22.0, f: 1.5, c: 3.0 },
  { id: 'f12', name: 'ブロッコリー 100g', kcal: 37, p: 5.4, f: 0.6, c: 6.6 },
  { id: 'f13', name: '味噌汁 1杯', kcal: 40, p: 3.0, f: 1.2, c: 4.5 },
  { id: 'f14', name: 'バナナ 1本', kcal: 93, p: 1.1, f: 0.2, c: 22.5 },
  { id: 'f15', name: '無脂肪ヨーグルト 100g', kcal: 56, p: 4.0, f: 0.3, c: 9.6 },
  { id: 'f16', name: 'ゆで卵 1個', kcal: 76, p: 6.5, f: 5.0, c: 0.2 },
]

export const DEFAULT_MENUS = {
  A: {
    name: '全身法 A',
    exercises: [
      { name: 'スクワット', sets: 3, reps: 8 },
      { name: 'ベンチプレス', sets: 3, reps: 8 },
      { name: 'ラットプルダウン', sets: 3, reps: 10 },
      { name: 'ショルダープレス', sets: 3, reps: 10 },
      { name: 'レッグカール', sets: 3, reps: 12 },
    ],
  },
  B: {
    name: '全身法 B',
    exercises: [
      { name: 'デッドリフト', sets: 3, reps: 6 },
      { name: 'インクラインダンベルプレス', sets: 3, reps: 10 },
      { name: 'シーテッドロー', sets: 3, reps: 10 },
      { name: 'サイドレイズ', sets: 3, reps: 15 },
      { name: 'レッグエクステンション', sets: 3, reps: 12 },
    ],
  },
}

// 曜日 → メニュー (0=日, 1=月, 2=火, ...)
export const DEFAULT_SCHEDULE = { 2: 'A', 4: 'B', 6: 'A' }

export const DEFAULT_SETTINGS = {
  kcalTarget: 1800,
  pTarget: 130,
  fTarget: 50,
  cTarget: 200,
  apiKey: '',
}

export const SLOTS = [
  { key: 'breakfast', label: '朝' },
  { key: 'lunch', label: '昼' },
  { key: 'snack', label: '間食' },
  { key: 'dinner', label: '夜' },
]
