// ===== 初期データ(すべてアプリ内で編集可能) =====

// unitGrams: この栄養値が基準とする重量(g)。設定されている食品はタップ時にグラム数を
// 指定でき、その場でkcal/PFCを按分計算する。個数・パック単位の食品はunitGramsなし(従来通りqtyで加減)
export const DEFAULT_FOODS = [
  { id: 'f01', name: '白米 150g', kcal: 234, p: 3.8, f: 0.5, c: 53.4, unitGrams: 150 },
  { id: 'f02', name: '玄米 150g', kcal: 228, p: 4.2, f: 1.5, c: 47.8, unitGrams: 150 },
  { id: 'f03', name: 'オートミール 30g', kcal: 105, p: 4.1, f: 1.7, c: 17.9, unitGrams: 30 },
  { id: 'f04', name: '鶏むね肉(皮なし)100g', kcal: 105, p: 23.3, f: 1.9, c: 0.1, unitGrams: 100 },
  { id: 'f05', name: 'サラダチキン 1個', kcal: 110, p: 24.0, f: 1.2, c: 0.5 },
  { id: 'f06', name: '卵 1個', kcal: 76, p: 6.2, f: 5.2, c: 0.2 },
  { id: 'f07', name: '納豆 1パック', kcal: 95, p: 8.3, f: 5.0, c: 6.1 },
  { id: 'f08', name: '豆腐 150g', kcal: 84, p: 7.9, f: 5.3, c: 1.2, unitGrams: 150 },
  { id: 'f09', name: '鮭 切り身 1切', kcal: 106, p: 17.8, f: 3.3, c: 0.1 },
  { id: 'f10', name: 'サバ缶(水煮)1缶', kcal: 340, p: 31.2, f: 21.4, c: 0.4 },
  { id: 'f11', name: 'プロテイン 1杯', kcal: 115, p: 22.0, f: 1.5, c: 3.0 },
  { id: 'f12', name: 'ブロッコリー 100g', kcal: 37, p: 5.4, f: 0.6, c: 6.6, unitGrams: 100 },
  { id: 'f13', name: '味噌汁 1杯', kcal: 40, p: 3.0, f: 1.2, c: 4.5 },
  { id: 'f14', name: 'バナナ 1本', kcal: 93, p: 1.1, f: 0.2, c: 22.5 },
  { id: 'f15', name: '無脂肪ヨーグルト 100g', kcal: 56, p: 4.0, f: 0.3, c: 9.6, unitGrams: 100 },
  { id: 'f16', name: 'ゆで卵 1個', kcal: 76, p: 6.5, f: 5.0, c: 0.2 },
  { id: 'f17', name: 'さつまいも 160g', kcal: 211, p: 1.9, f: 0.3, c: 51.0, unitGrams: 160 },
  { id: 'f18', name: '鶏むね肉(皮なし)220g', kcal: 231, p: 51.3, f: 4.2, c: 0.2, unitGrams: 220 },
  { id: 'f19', name: '無水カレー(鶏むねひき肉)250g', kcal: 380, p: 28.0, f: 12.0, c: 35.0, unitGrams: 250 },
  { id: 'f20', name: '茎ブロッコリー 80g', kcal: 24, p: 3.0, f: 0.2, c: 3.8, unitGrams: 80 },
  { id: 'f21', name: 'ズッキーニ 100g', kcal: 14, p: 1.3, f: 0.1, c: 2.8, unitGrams: 100 },
  { id: 'f22', name: 'キムチ 30g', kcal: 9, p: 0.6, f: 0.1, c: 1.4, unitGrams: 30 },
  { id: 'f23', name: 'ご飯 160g', kcal: 250, p: 4.1, f: 0.5, c: 57.0, unitGrams: 160 },
  { id: 'f24', name: 'ご飯 120g', kcal: 187, p: 3.0, f: 0.4, c: 42.7, unitGrams: 120 },
]

// 種目は sets/kg/reps(通常種目) か type:'cardio' + incline/speed/minutes(有酸素) のいずれか
export const DEFAULT_MENUS = {
  A: {
    name: '全身法A(ベンチ重視)',
    exercises: [
      { name: 'ベンチプレス', sets: 4, kg: 30, reps: '8〜10' },
      { name: 'ラットプルダウン', sets: 4, kg: 30, reps: '10〜12' },
      { name: 'レッグプレス', sets: 4, kg: 60, reps: '10〜12' },
      { name: 'ショルダープレス', sets: 3, kg: 15, reps: '10〜12' },
      { name: 'トライセプスエクステンション', sets: 3, kg: 15, reps: '12〜15' },
      { name: 'レッグレイズ', sets: 3, kg: 0, reps: '12〜15' },
      { name: 'ウォーキング', type: 'cardio', incline: 12, speed: '4.5〜5', minutes: 20 },
    ],
  },
  B: {
    name: '全身法B(バランス重視)',
    exercises: [
      { name: 'チェストプレス', sets: 4, kg: 30, reps: '8〜12' },
      { name: 'ローイング', sets: 4, kg: 30, reps: '10〜12' },
      { name: 'レッグエクステンション', sets: 4, kg: 20, reps: '10〜12' },
      { name: 'レッグカール', sets: 4, kg: 20, reps: '10〜12' },
      { name: 'サイドレイズ', sets: 4, kg: 5, reps: '10〜12' },
      { name: 'アブドミナル', sets: 3, kg: 20, reps: '10〜12' },
      { name: 'レッグレイズ', sets: 3, kg: 0, reps: '12' },
      { name: 'ウォーキング', type: 'cardio', incline: 12, speed: '4.5〜5', minutes: 20 },
    ],
  },
}

// 曜日 → メニュー (0=日, 1=月, 2=火, ...)。それ以外はオフ日
export const DEFAULT_SCHEDULE = { 2: 'A', 4: 'B', 6: 'A' }

export const DEFAULT_SETTINGS = {
  kcalTargetTrain: 1900,
  pTargetTrain: 140,
  fTargetTrain: 40,
  cTargetTrain: 210,
  kcalTargetOff: 1750,
  pTargetOff: 140,
  fTargetOff: 40,
  cTargetOff: 165,
  apiKey: '',
}

// 固定献立(食事タブの「ワンタップ追加」に初期表示)
export const DEFAULT_MEAL_SETS = [
  { id: 'ms-train-am', name: 'トレ日: 朝', slot: 'breakfast', items: [
    { foodId: 'f11', qty: 1 }, { foodId: 'f06', qty: 2 }, { foodId: 'f17', qty: 1 },
  ] },
  { id: 'ms-train-lunch-curry', name: 'トレ日: 昼(カレー)', slot: 'lunch', items: [
    { foodId: 'f19', qty: 1 }, { foodId: 'f01', qty: 1 },
  ] },
  { id: 'ms-train-lunch-chicken', name: 'トレ日: 昼(鶏むね)', slot: 'lunch', items: [
    { foodId: 'f18', qty: 1 }, { foodId: 'f23', qty: 1 }, { foodId: 'f20', qty: 1 },
  ] },
  { id: 'ms-train-snack', name: 'トレ日: 間食(ジム前)', slot: 'snack', items: [
    { foodId: 'f14', qty: 1 },
  ] },
  { id: 'ms-train-dinner', name: 'トレ日: 夜', slot: 'dinner', items: [
    { foodId: 'f09', qty: 1 }, { foodId: 'f23', qty: 1 }, { foodId: 'f21', qty: 1 }, { foodId: 'f11', qty: 1 },
  ] },
  { id: 'ms-off-am-natto', name: 'オフ日: 朝(納豆)', slot: 'breakfast', items: [
    { foodId: 'f11', qty: 1 }, { foodId: 'f17', qty: 1 }, { foodId: 'f07', qty: 1 }, { foodId: 'f22', qty: 1 },
  ] },
  { id: 'ms-off-am-egg', name: 'オフ日: 朝(卵)', slot: 'breakfast', items: [
    { foodId: 'f06', qty: 2 },
  ] },
  { id: 'ms-off-lunch-chicken', name: 'オフ日: 昼(鶏むね)', slot: 'lunch', items: [
    { foodId: 'f18', qty: 1 }, { foodId: 'f23', qty: 1 }, { foodId: 'f20', qty: 1 },
  ] },
  { id: 'ms-off-lunch-curry', name: 'オフ日: 昼(カレー)', slot: 'lunch', items: [
    { foodId: 'f19', qty: 1 }, { foodId: 'f01', qty: 1 },
  ] },
  { id: 'ms-off-dinner', name: 'オフ日: 夜', slot: 'dinner', items: [
    { foodId: 'f09', qty: 1 }, { foodId: 'f24', qty: 1 }, { foodId: 'f21', qty: 1 },
  ] },
]

export const SLOTS = [
  { key: 'breakfast', label: '朝' },
  { key: 'lunch', label: '昼' },
  { key: 'snack', label: '間食' },
  { key: 'dinner', label: '夜' },
]
