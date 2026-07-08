import { DEFAULT_FOODS, DEFAULT_MEAL_SETS, DEFAULT_ROUTINES, DEFAULT_SCHEDULE, DEFAULT_SETTINGS } from './data'

const KEY = 'pfclog.v1'

export const uid = () => Math.random().toString(36).slice(2, 10)

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// 保存済みリストに、まだ無いデフォルト項目をidで補って追加し、既存項目にも
// デフォルト側の新しいフィールド(unitGrams追加など)を不足分だけ補う
// (コード側の更新が、既存端末のデータにも反映されるように。編集UIが無い項目が対象なので上書きしても安全)
function mergeById(defaults, saved) {
  const list = saved || []
  const byId = new Map(defaults.map((d) => [d.id, d]))
  const merged = list.map((item) => (byId.has(item.id) ? { ...byId.get(item.id), ...item } : item))
  const ids = new Set(list.map((x) => x.id))
  return [...merged, ...defaults.filter((d) => !ids.has(d.id))]
}

// 旧形式 menus:{A:{...},B:{...}} をルーティン配列に変換する(idはA/Bのまま引き継ぐので
// scheduleの参照も壊れない)。routinesが無い/menusも無い場合だけデフォルトを使う
function migrateRoutines(saved) {
  if (saved.routines) return saved.routines
  if (saved.menus) {
    return Object.entries(saved.menus).map(([id, m]) => ({ id, name: m.name, exercises: m.exercises }))
  }
  return DEFAULT_ROUTINES
}

// localStorage/インポートしたバックアップを、常に完全な形のstateに正規化する
export function normalizeState(saved = {}) {
  return {
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
    foods: mergeById(DEFAULT_FOODS, saved.foods),
    routines: migrateRoutines(saved), // [{ id, name, exercises }]
    schedule: saved.schedule || DEFAULT_SCHEDULE,
    logs: saved.logs || {}, // { 'YYYY-MM-DD': { meals: [], weight, workout } }
    mealSets: mergeById(DEFAULT_MEAL_SETS, saved.mealSets), // [{ id, name, slot, items: [{foodId?, custom?, qty}] }]
    chat: saved.chat || [], // [{ role, content }]
  }
}

export function loadState() {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {}
  return normalizeState(saved)
}

// dateKeyの曜日 (0=日, 1=月, ...)
export function dayOfWeekOf(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function isTrainingDay(state, dateKey) {
  return !!state.schedule[dayOfWeekOf(dateKey)]
}

export function targetsOf(state, dateKey) {
  const s = state.settings
  return isTrainingDay(state, dateKey)
    ? { kcal: s.kcalTargetTrain, p: s.pTargetTrain, f: s.fTargetTrain, c: s.cTargetTrain }
    : { kcal: s.kcalTargetOff, p: s.pTargetOff, f: s.fTargetOff, c: s.cTargetOff }
}

export function routineNameOf(state, routineId) {
  return state.routines.find((r) => r.id === routineId)?.name || routineId
}

// 直近n日のうち、何か記録(食事/体重/トレのいずれか)がある日数
export function loggedDaysCount(state, n) {
  return lastDates(n).filter((k) => {
    const l = state.logs[k]
    return !!l && (l.meals?.length > 0 || l.weight != null || l.workout != null)
  }).length
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.error('保存に失敗しました', e)
  }
}

export function getLog(state, dateKey) {
  return state.logs[dateKey] || { meals: [], weight: null, workout: null }
}

// entry: { id, slot, qty, foodId? , custom? {name,kcal,p,f,c} }
export function macrosOf(entry, foods) {
  const base = entry.custom || foods.find((f) => f.id === entry.foodId)
  if (!base) return { name: '?', kcal: 0, p: 0, f: 0, c: 0 }
  const q = entry.qty ?? 1
  return {
    name: base.name,
    kcal: base.kcal * q,
    p: base.p * q,
    f: base.f * q,
    c: base.c * q,
  }
}

export function totalsOf(log, foods) {
  const t = { kcal: 0, p: 0, f: 0, c: 0 }
  for (const e of log.meals) {
    const m = macrosOf(e, foods)
    t.kcal += m.kcal
    t.p += m.p
    t.f += m.f
    t.c += m.c
  }
  return t
}

export function lastDates(n, from = new Date()) {
  const arr = []
  for (let i = 0; i < n; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    arr.push(todayKey(d))
  }
  return arr
}

// 直近の同名種目のセット内容を探す(前回の重量を引き継ぐ)
export function lastSetsFor(state, exerciseName, beforeDate) {
  const keys = Object.keys(state.logs).filter((k) => k < beforeDate).sort().reverse()
  for (const k of keys) {
    const w = state.logs[k]?.workout
    if (!w) continue
    const ex = w.exercises?.find((e) => e.name === exerciseName)
    if (ex?.sets?.length) return ex.sets.map((s) => ({ ...s }))
  }
  return null
}

export function exportJSON(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pfclog-backup-${todayKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
