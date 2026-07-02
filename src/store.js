import { DEFAULT_FOODS, DEFAULT_MENUS, DEFAULT_SCHEDULE, DEFAULT_SETTINGS } from './data'

const KEY = 'pfclog.v1'

export const uid = () => Math.random().toString(36).slice(2, 10)

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function loadState() {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {}
  return {
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
    foods: saved.foods?.length ? saved.foods : DEFAULT_FOODS,
    menus: saved.menus || DEFAULT_MENUS,
    schedule: saved.schedule || DEFAULT_SCHEDULE,
    logs: saved.logs || {}, // { 'YYYY-MM-DD': { meals: [], weight, workout } }
    mealSets: saved.mealSets || [], // [{ id, name, slot, items: [{foodId?, custom?, qty}] }]
    chat: saved.chat || [], // [{ role, content }]
  }
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
