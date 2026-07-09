import { useEffect, useMemo, useRef, useState } from 'react'
import { SLOTS } from './data'
import {
  loadState, saveState, todayKey, getLog, macrosOf, totalsOf, normalizeState,
  lastDates, lastSetsFor, uid, exportJSON, isTrainingDay, targetsOf, dayOfWeekOf, loggedDaysCount, routineNameOf,
} from './store'
import { buildContext, askGemini } from './ai'

const DOW = ['日', '月', '火', '水', '木', '金', '土']

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('home')
  const [showSettings, setShowSettings] = useState(false)
  const [editDate, setEditDate] = useState(null) // 履歴から編集中の日付。nullなら今日
  const dateKey = todayKey()
  const activeDate = editDate || dateKey

  useEffect(() => saveState(state), [state])

  // ログ更新ヘルパー
  const patchDate = (key, fn) =>
    setState((s) => {
      const log = { meals: [], weight: null, workout: null, ...(s.logs[key] || {}) }
      return { ...s, logs: { ...s.logs, [key]: fn(log) } }
    })
  const patchToday = (fn) => patchDate(dateKey, fn)
  const patchActive = (fn) => patchDate(activeDate, fn)

  const log = getLog(state, dateKey)
  const totals = totalsOf(log, state.foods)
  const activeLog = getLog(state, activeDate)
  const activeTotals = totalsOf(activeLog, state.foods)

  // ボトムタブでの直接移動は常に今日に戻す(食事/トレ間の移動では編集中の日付を維持)
  const goto = (t) => {
    if (t !== 'meals' && t !== 'workout') setEditDate(null)
    setTab(t)
  }
  const editHistory = (key, t) => { setEditDate(key); setTab(t) }
  const exitHistoryEdit = () => { setEditDate(null); setTab('history') }

  return (
    <div className="app">
      <main className="main">
        {tab === 'home' && (
          <Home state={state} log={log} totals={totals} dateKey={dateKey}
            patchLog={patchToday} openSettings={() => setShowSettings(true)} goto={goto} />
        )}
        {tab === 'meals' && (
          <Meals state={state} setState={setState} log={activeLog} totals={activeTotals} dateKey={activeDate}
            patchLog={patchActive} editing={!!editDate} onExitEdit={exitHistoryEdit} />
        )}
        {tab === 'workout' && (
          <Workout state={state} setState={setState} log={activeLog} dateKey={activeDate} patchLog={patchActive}
            editing={!!editDate} onExitEdit={exitHistoryEdit} />
        )}
        {tab === 'history' && (
          <History state={state} patchDate={patchDate}
            onEditMeals={(k) => editHistory(k, 'meals')} onEditWorkout={(k) => editHistory(k, 'workout')} />
        )}
        {tab === 'chat' && (
          <Chat state={state} setState={setState} dateKey={dateKey} openSettings={() => setShowSettings(true)} />
        )}
      </main>

      <nav className="tabbar">
        {[
          ['home', 'ホーム', '⌂'],
          ['meals', '食事', '🍚'],
          ['workout', 'トレ', '🏋️'],
          ['history', '履歴', '📈'],
          ['chat', '相談', '💬'],
        ].map(([k, label, icon]) => (
          <button key={k} className={tab === k ? 'tab active' : 'tab'} onClick={() => goto(k)}>
            <span className="tab-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {showSettings && (
        <Settings state={state} setState={setState} close={() => setShowSettings(false)} />
      )}
    </div>
  )
}

/* ================= ホーム ================= */

function Home({ state, log, totals, dateKey, patchLog, openSettings, goto }) {
  const d = new Date()
  const routineId = state.schedule[d.getDay()] || null
  const routine = routineId ? state.routines.find((r) => r.id === routineId) : null
  const trainDay = isTrainingDay(state, dateKey)
  const target = targetsOf(state, dateKey)
  const remaining = target.kcal - totals.kcal
  const streak = loggedDaysCount(state, 7)

  return (
    <div className="page">
      <header className="pagehead">
        <div>
          <div className="date">{dateKey}({DOW[d.getDay()]}) ・ {trainDay ? 'トレ日' : 'オフ日'}</div>
          <h1>今日の残り</h1>
        </div>
        <button className="ghost" onClick={openSettings}>⚙︎ 設定</button>
      </header>

      <div className="streak-chip">🔥 直近7日 {streak}/7日記録</div>

      <section className="card hero">
        <div className="kcal-big">
          <span className={remaining < 0 ? 'over' : ''}>{Math.round(remaining)}</span>
          <small>kcal</small>
        </div>
        <div className="kcal-sub">
          摂取 {Math.round(totals.kcal)} / 目標 {target.kcal} kcal
        </div>
        <div className="pfc-bars">
          <Bar label="P" val={totals.p} target={target.p} cls="p" />
          <Bar label="F" val={totals.f} target={target.f} cls="f" />
          <Bar label="C" val={totals.c} target={target.c} cls="c" />
        </div>
      </section>

      <section className="card">
        <div className="row between">
          <h2>今日のジム</h2>
          {routine && <span className="badge">{routine.name}</span>}
        </div>
        {routine ? (
          <>
            <ul className="plainlist">
              {routine.exercises.map((ex) => (
                <li key={ex.name}>
                  {ex.name}{' '}
                  <span className="muted">
                    {ex.type === 'cardio'
                      ? `傾斜${ex.incline}・速度${ex.speed}・${ex.minutes}分`
                      : `${ex.sets}set × ${ex.reps}回`}
                  </span>
                </li>
              ))}
            </ul>
            <button className="primary wide" onClick={() => goto('workout')}>
              {log.workout ? '記録を続ける' : '記録を始める'}
            </button>
          </>
        ) : (
          <p className="muted">今日は休養日です。トレタブから手動で始めることもできます。</p>
        )}
      </section>

      <section className="card">
        <h2>体重</h2>
        <div className="row">
          <input
            type="number" inputMode="decimal" step="0.1" placeholder="例: 72.5"
            value={log.weight ?? ''}
            onChange={(e) => patchLog((l) => ({ ...l, weight: e.target.value === '' ? null : Number(e.target.value) }))}
          />
          <span className="muted">kg</span>
        </div>
      </section>
    </div>
  )
}

function Bar({ label, val, target, cls }) {
  const pct = Math.min(100, (val / target) * 100)
  return (
    <div className="bar-row">
      <span className={`bar-label ${cls}`}>{label}</span>
      <div className="bar-track">
        <div className={`bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-num">{Math.round(val)}<span className="muted">/{target}g</span></span>
    </div>
  )
}

/* ================= 食事 ================= */

function Meals({ state, setState, log, totals, patchLog, dateKey, editing, onExitEdit }) {
  const [slot, setSlot] = useState('breakfast')
  const [showCustom, setShowCustom] = useState(false)
  const [custom, setCustom] = useState({ name: '', kcal: '', p: '', f: '', c: '', unitGrams: '', saveToList: true })
  const [setName, setSetName] = useState('')
  const [gramFood, setGramFood] = useState(null) // { food, grams } グラム数を指定して追加中の食品

  const slotEntries = log.meals.filter((e) => e.slot === slot)
  const slotSets = state.mealSets.filter((ms) => ms.slot === slot)

  const addFood = (foodId) =>
    patchLog((l) => ({ ...l, meals: [...l.meals, { id: uid(), slot, foodId, qty: 1 }] }))

  const tapFood = (food) =>
    food.unitGrams ? setGramFood({ food, grams: String(food.unitGrams) }) : addFood(food.id)

  const confirmGramFood = () => {
    const g = Number(gramFood.grams)
    if (!g || g <= 0) return
    patchLog((l) => ({
      ...l,
      meals: [...l.meals, { id: uid(), slot, foodId: gramFood.food.id, qty: g / gramFood.food.unitGrams }],
    }))
    setGramFood(null)
  }

  const addCustom = () => {
    if (!custom.name || custom.kcal === '') return
    const macros = {
      name: custom.name,
      kcal: Number(custom.kcal) || 0,
      p: Number(custom.p) || 0,
      f: Number(custom.f) || 0,
      c: Number(custom.c) || 0,
    }
    const unitGrams = custom.unitGrams === '' ? null : Number(custom.unitGrams) || null

    if (custom.saveToList) {
      const foodId = uid()
      setState((s) => ({ ...s, foods: [...s.foods, { id: foodId, ...macros, ...(unitGrams ? { unitGrams } : {}) }] }))
      patchLog((l) => ({ ...l, meals: [...l.meals, { id: uid(), slot, foodId, qty: 1 }] }))
    } else {
      patchLog((l) => ({ ...l, meals: [...l.meals, { id: uid(), slot, qty: 1, custom: macros }] }))
    }
    setCustom({ name: '', kcal: '', p: '', f: '', c: '', unitGrams: '', saveToList: true })
    setShowCustom(false)
  }

  const deleteFood = (id) => {
    if (confirm('食品リストから削除しますか?過去に記録した分の表示にも影響します。')) {
      setState((s) => ({ ...s, foods: s.foods.filter((f) => f.id !== id) }))
    }
  }

  const setQty = (id, delta) =>
    patchLog((l) => ({
      ...l,
      meals: l.meals.map((e) => (e.id === id ? { ...e, qty: Math.max(0.5, Math.round((e.qty + delta) * 2) / 2) } : e)),
    }))

  const remove = (id) => patchLog((l) => ({ ...l, meals: l.meals.filter((e) => e.id !== id) }))

  const saveAsSet = () => {
    if (!setName || !slotEntries.length) return
    const items = slotEntries.map(({ foodId, custom: cu, qty }) => ({ foodId, custom: cu, qty }))
    setState((s) => ({ ...s, mealSets: [...s.mealSets, { id: uid(), name: setName, slot, items }] }))
    setSetName('')
  }

  const applySet = (ms) =>
    patchLog((l) => ({
      ...l,
      meals: [...l.meals, ...ms.items.map((it) => ({ ...it, id: uid(), slot }))],
    }))

  const deleteSet = (id) =>
    setState((s) => ({ ...s, mealSets: s.mealSets.filter((ms) => ms.id !== id) }))

  return (
    <div className="page">
      <header className="pagehead">
        <h1>食事記録</h1>
        <div className="muted">合計 {Math.round(totals.kcal)} kcal</div>
      </header>

      {editing && (
        <div className="editbar row between">
          <span className="muted small">編集中: {dateKey}</span>
          <button className="ghost" onClick={onExitEdit}>履歴に戻る</button>
        </div>
      )}

      <div className="seg">
        {SLOTS.map((sl) => (
          <button key={sl.key} className={slot === sl.key ? 'seg-btn active' : 'seg-btn'} onClick={() => setSlot(sl.key)}>
            {sl.label}
          </button>
        ))}
      </div>

      {/* この枠の記録済み */}
      <section className="card">
        <h2>{SLOTS.find((s2) => s2.key === slot).label}に食べたもの</h2>
        {slotEntries.length === 0 && <p className="muted">下のリストからタップで追加</p>}
        {slotEntries.map((e) => {
          const m = macrosOf(e, state.foods)
          const food = e.foodId ? state.foods.find((f) => f.id === e.foodId) : null
          const amountLabel = food?.unitGrams ? `${Math.round(e.qty * food.unitGrams)}g` : `×${e.qty}`
          return (
            <div className="entry" key={e.id}>
              <div className="entry-main">
                <div>{m.name}</div>
                <div className="muted small">
                  {Math.round(m.kcal)}kcal / P{m.p.toFixed(1)} F{m.f.toFixed(1)} C{m.c.toFixed(1)}
                </div>
              </div>
              <div className="qty">
                <button onClick={() => setQty(e.id, -0.5)}>−</button>
                <span>{amountLabel}</span>
                <button onClick={() => setQty(e.id, 0.5)}>＋</button>
              </div>
              <button className="del" onClick={() => remove(e.id)}>✕</button>
            </div>
          )
        })}
        {slotEntries.length > 0 && (
          <div className="row">
            <input placeholder="セット名(例: いつもの朝)" value={setName} onChange={(e) => setSetName(e.target.value)} />
            <button className="ghost" onClick={saveAsSet}>セット保存</button>
          </div>
        )}
      </section>

      {/* ワンタップセット */}
      {slotSets.length > 0 && (
        <section className="card">
          <h2>ワンタップ追加</h2>
          {slotSets.map((ms) => (
            <div className="entry" key={ms.id}>
              <div className="entry-main">
                <div>{ms.name}</div>
                <div className="muted small">{ms.items.length}品</div>
              </div>
              <button className="primary" onClick={() => applySet(ms)}>追加</button>
              <button className="del" onClick={() => deleteSet(ms.id)}>✕</button>
            </div>
          ))}
        </section>
      )}

      {/* 食品マスタ */}
      <section className="card">
        <div className="row between">
          <h2>食品リスト</h2>
          <button className="ghost" onClick={() => setShowCustom((v) => !v)}>
            {showCustom ? '閉じる' : '＋ 食品を追加'}
          </button>
        </div>
        {showCustom && (
          <div className="customform">
            <input placeholder="名前(例: コンビニおにぎり)" value={custom.name}
              onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <div className="grid4">
              {['kcal', 'p', 'f', 'c'].map((k) => (
                <input key={k} type="number" inputMode="decimal" placeholder={k.toUpperCase()}
                  value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} />
              ))}
            </div>
            <input type="number" inputMode="decimal" placeholder="グラム数(gで量が変わる食品のみ、任意)"
              value={custom.unitGrams} onChange={(e) => setCustom({ ...custom, unitGrams: e.target.value })} />
            <label className="row">
              <input type="checkbox" checked={custom.saveToList}
                onChange={(e) => setCustom({ ...custom, saveToList: e.target.checked })} />
              <span className="muted small">食品リストに保存する(次回からタップで使える)</span>
            </label>
            <button className="primary wide" onClick={addCustom}>この内容で追加</button>
            <p className="muted small">PFCが不明なら「相談」タブでAIに推定してもらえます。</p>
          </div>
        )}
        <div className="foodgrid">
          {state.foods.map((f) => (
            <div className="foodcell" key={f.id}>
              <button className="food" onClick={() => tapFood(f)}>
                <span>{f.name}</span>
                <span className="muted small">{f.kcal}kcal</span>
              </button>
              <button className="food-del" onClick={() => deleteFood(f.id)}>✕</button>
            </div>
          ))}
        </div>
      </section>

      {gramFood && (
        <div className="modal-back" onClick={() => setGramFood(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="pagehead">
              <h1>{gramFood.food.name}</h1>
              <button className="ghost" onClick={() => setGramFood(null)}>閉じる</button>
            </header>
            <div className="row">
              <input type="number" inputMode="decimal" autoFocus value={gramFood.grams}
                onChange={(e) => setGramFood({ ...gramFood, grams: e.target.value })} />
              <span className="muted">g</span>
            </div>
            {(() => {
              const g = Number(gramFood.grams) || 0
              const ratio = g / gramFood.food.unitGrams
              return (
                <p className="muted small">
                  {Math.round(gramFood.food.kcal * ratio)}kcal
                  {' '}/ P{(gramFood.food.p * ratio).toFixed(1)} F{(gramFood.food.f * ratio).toFixed(1)} C{(gramFood.food.c * ratio).toFixed(1)}
                </p>
              )
            })()}
            <button className="primary wide" onClick={confirmGramFood}>追加</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= トレーニング ================= */

// 目標reps表記("8〜10"等)から、新規セットの初期回数を取り出す
const repsDefault = (reps) => {
  const n = parseInt(String(reps), 10)
  return Number.isNaN(n) ? 10 : n
}

function Workout({ state, setState, log, dateKey, patchLog, editing, onExitEdit }) {
  const [showManage, setShowManage] = useState(false)
  const scheduled = state.schedule[dayOfWeekOf(dateKey)] || null
  const isToday = dateKey === todayKey()
  const dayLabel = isToday ? '今日' : dateKey

  const start = (routineId) => {
    const routine = state.routines.find((r) => r.id === routineId)
    const exercises = routine.exercises.map((ex) => {
      if (ex.type === 'cardio') {
        return {
          name: ex.name, type: 'cardio',
          incline: ex.incline, speed: ex.speed, targetMinutes: ex.minutes,
          minutes: '', done: false,
        }
      }
      const prev = lastSetsFor(state, ex.name, dateKey)
      const sets = prev
        ? prev.map((s) => (ex.type === 'bodyweight' ? { reps: s.reps } : { ...s }))
        : Array.from({ length: ex.sets }, () => (
            ex.type === 'bodyweight' ? { reps: repsDefault(ex.reps) } : { kg: ex.kg ?? '', reps: repsDefault(ex.reps) }
          ))
      return { name: ex.name, type: ex.type, repsTarget: ex.reps, sets }
    })
    patchLog((l) => ({ ...l, workout: { menu: routineId, exercises } }))
  }

  const updateSet = (exIdx, setIdx, field, value) =>
    patchLog((l) => {
      const w = structuredClone(l.workout)
      w.exercises[exIdx].sets[setIdx][field] = value === '' ? '' : Number(value)
      return { ...l, workout: w }
    })

  const addSet = (exIdx) =>
    patchLog((l) => {
      const w = structuredClone(l.workout)
      const sets = w.exercises[exIdx].sets
      sets.push({ ...(sets[sets.length - 1] || { kg: '', reps: 10 }) })
      return { ...l, workout: w }
    })

  const removeSet = (exIdx) =>
    patchLog((l) => {
      const w = structuredClone(l.workout)
      w.exercises[exIdx].sets.pop()
      return { ...l, workout: w }
    })

  const updateCardio = (exIdx, field, value) =>
    patchLog((l) => {
      const w = structuredClone(l.workout)
      w.exercises[exIdx][field] = field === 'minutes' ? (value === '' ? '' : Number(value)) : value
      return { ...l, workout: w }
    })

  const clear = () => {
    if (confirm(`${dayLabel}のトレーニング記録を削除しますか?`)) {
      patchLog((l) => ({ ...l, workout: null }))
    }
  }

  if (!log.workout) {
    return (
      <div className="page">
        <header className="pagehead"><h1>トレーニング</h1></header>
        {editing && (
          <div className="editbar row between">
            <span className="muted small">編集中: {dateKey}</span>
            <button className="ghost" onClick={onExitEdit}>履歴に戻る</button>
          </div>
        )}
        <section className="card">
          <p className="muted">
            {scheduled
              ? `${dayLabel}は「${routineNameOf(state, scheduled)}」の日です。`
              : `${dayLabel}は予定なしの日です。手動で始められます。`}
          </p>
          {state.routines.length > 0 ? (
            <div className="col">
              {state.routines.map((r) => (
                <button key={r.id} className={scheduled === r.id ? 'primary wide' : 'ghost wide'} onClick={() => start(r.id)}>
                  {r.name}を始める
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">ルーティンがまだありません。下の「ルーティンを管理」から追加してください。</p>
          )}
        </section>

        <section className="card">
          <div className="row between">
            <h2>ルーティン管理</h2>
            <button className="ghost" onClick={() => setShowManage((v) => !v)}>{showManage ? '閉じる' : '編集する'}</button>
          </div>
          {showManage && <RoutineManager state={state} setState={setState} />}
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="pagehead">
        <h1>{routineNameOf(state, log.workout.menu)}</h1>
        <button className="ghost" onClick={clear}>削除</button>
      </header>
      {editing && (
        <div className="editbar row between">
          <span className="muted small">編集中: {dateKey}</span>
          <button className="ghost" onClick={onExitEdit}>履歴に戻る</button>
        </div>
      )}
      {log.workout.exercises.map((ex, i) => (
        <section className="card" key={ex.name}>
          <h2>{ex.name}</h2>
          {ex.type === 'cardio' ? (
            <>
              <p className="muted small">傾斜{ex.incline}・速度{ex.speed}・目標{ex.targetMinutes}分</p>
              <div className="row">
                <input type="number" inputMode="decimal" placeholder="実施分数" value={ex.minutes}
                  onChange={(e) => updateCardio(i, 'minutes', e.target.value)} />
                <span className="muted">分</span>
              </div>
              <label className="row">
                <input type="checkbox" checked={ex.done}
                  onChange={(e) => updateCardio(i, 'done', e.target.checked)} />
                <span>完了</span>
              </label>
            </>
          ) : ex.type === 'bodyweight' ? (
            <>
              {ex.repsTarget && <p className="muted small">目標 {ex.repsTarget}回(自重)</p>}
              <div className="sethead-bw"><span>#</span><span>回数</span></div>
              {ex.sets.map((st, j) => (
                <div className="setrow-bw" key={j}>
                  <span className="muted">{j + 1}</span>
                  <input type="number" inputMode="numeric" value={st.reps}
                    onChange={(e) => updateSet(i, j, 'reps', e.target.value)} />
                </div>
              ))}
              <div className="row">
                <button className="ghost" onClick={() => addSet(i)}>＋ セット</button>
                {ex.sets.length > 1 && <button className="ghost" onClick={() => removeSet(i)}>− セット</button>}
              </div>
            </>
          ) : (
            <>
              {ex.repsTarget && <p className="muted small">目標 {ex.repsTarget}回</p>}
              <div className="sethead"><span>#</span><span>kg</span><span>回数</span></div>
              {ex.sets.map((st, j) => (
                <div className="setrow" key={j}>
                  <span className="muted">{j + 1}</span>
                  <input type="number" inputMode="decimal" step="0.25" value={st.kg}
                    onChange={(e) => updateSet(i, j, 'kg', e.target.value)} />
                  <input type="number" inputMode="numeric" value={st.reps}
                    onChange={(e) => updateSet(i, j, 'reps', e.target.value)} />
                </div>
              ))}
              <div className="row">
                <button className="ghost" onClick={() => addSet(i)}>＋ セット</button>
                {ex.sets.length > 1 && <button className="ghost" onClick={() => removeSet(i)}>− セット</button>}
              </div>
            </>
          )}
        </section>
      ))}
      <p className="muted small">前回の重量が自動で入ります。記録は入力と同時に保存されます。</p>
    </div>
  )
}

// ルーティン(種目構成)の自由な追加・削除。曜日への割り当ては設定画面で行う
function RoutineManager({ state, setState }) {
  const [openRoutine, setOpenRoutine] = useState(null)
  const [newRoutineName, setNewRoutineName] = useState('')
  const emptyExForm = { type: 'weight', name: '', sets: '4', kg: '', reps: '', incline: '', speed: '', minutes: '' }
  const [exForm, setExForm] = useState(emptyExForm)

  const addRoutine = () => {
    if (!newRoutineName.trim()) return
    const id = uid()
    setState((s) => ({ ...s, routines: [...s.routines, { id, name: newRoutineName.trim(), exercises: [] }] }))
    setNewRoutineName('')
    setOpenRoutine(id)
  }

  const deleteRoutine = (id) => {
    if (!confirm('このルーティンを削除しますか?(曜日設定からも外れます)')) return
    setState((s) => ({
      ...s,
      routines: s.routines.filter((r) => r.id !== id),
      schedule: Object.fromEntries(Object.entries(s.schedule).filter(([, v]) => v !== id)),
    }))
    if (openRoutine === id) setOpenRoutine(null)
  }

  const addExercise = (routineId) => {
    if (!exForm.name.trim()) return
    const exercise = exForm.type === 'cardio'
      ? { name: exForm.name.trim(), type: 'cardio', incline: Number(exForm.incline) || 0, speed: exForm.speed || '', minutes: Number(exForm.minutes) || 20 }
      : exForm.type === 'bodyweight'
        ? { name: exForm.name.trim(), type: 'bodyweight', sets: Number(exForm.sets) || 3, reps: exForm.reps || '10' }
        : { name: exForm.name.trim(), sets: Number(exForm.sets) || 3, kg: Number(exForm.kg) || 0, reps: exForm.reps || '10' }
    setState((s) => ({
      ...s,
      routines: s.routines.map((r) => (r.id === routineId ? { ...r, exercises: [...r.exercises, exercise] } : r)),
    }))
    setExForm({ ...emptyExForm, type: exForm.type })
  }

  const deleteExercise = (routineId, idx) =>
    setState((s) => ({
      ...s,
      routines: s.routines.map((r) => (r.id === routineId ? { ...r, exercises: r.exercises.filter((_, i) => i !== idx) } : r)),
    }))

  return (
    <div className="col">
      {state.routines.map((r) => (
        <div key={r.id}>
          <div className="entry">
            <button className="entry-main linklike" onClick={() => setOpenRoutine(openRoutine === r.id ? null : r.id)}>
              <div>{r.name}</div>
              <div className="muted small">{r.exercises.length}種目</div>
            </button>
            <button className="del" onClick={() => deleteRoutine(r.id)}>✕</button>
          </div>
          {openRoutine === r.id && (
            <div className="dayedit">
              {r.exercises.map((ex, i) => (
                <div className="entry" key={i}>
                  <div className="entry-main">
                    <div>{ex.name}</div>
                    <div className="muted small">
                      {ex.type === 'cardio'
                        ? `有酸素・傾斜${ex.incline}・速度${ex.speed}・${ex.minutes}分`
                        : ex.type === 'bodyweight'
                          ? `自重・${ex.sets}set×${ex.reps}回`
                          : `${ex.sets}set×${ex.kg}kg×${ex.reps}回`}
                    </div>
                  </div>
                  <button className="del" onClick={() => deleteExercise(r.id, i)}>✕</button>
                </div>
              ))}
              <div className="customform">
                <div className="seg">
                  {[['weight', '重量'], ['bodyweight', '自重'], ['cardio', '有酸素']].map(([v, label]) => (
                    <button key={v} className={exForm.type === v ? 'seg-btn active' : 'seg-btn'}
                      onClick={() => setExForm({ ...exForm, type: v })}>{label}</button>
                  ))}
                </div>
                <input placeholder="種目名(例: スクワット)" value={exForm.name}
                  onChange={(e) => setExForm({ ...exForm, name: e.target.value })} />
                {exForm.type === 'cardio' ? (
                  <div className="grid4">
                    <input type="number" inputMode="numeric" placeholder="傾斜" value={exForm.incline}
                      onChange={(e) => setExForm({ ...exForm, incline: e.target.value })} />
                    <input placeholder="速度" value={exForm.speed}
                      onChange={(e) => setExForm({ ...exForm, speed: e.target.value })} />
                    <input type="number" inputMode="numeric" placeholder="分" value={exForm.minutes}
                      onChange={(e) => setExForm({ ...exForm, minutes: e.target.value })} />
                  </div>
                ) : (
                  <div className="grid4">
                    <input type="number" inputMode="numeric" placeholder="セット数" value={exForm.sets}
                      onChange={(e) => setExForm({ ...exForm, sets: e.target.value })} />
                    {exForm.type === 'weight' && (
                      <input type="number" inputMode="decimal" placeholder="kg" value={exForm.kg}
                        onChange={(e) => setExForm({ ...exForm, kg: e.target.value })} />
                    )}
                    <input placeholder="回数(例: 8〜10)" value={exForm.reps}
                      onChange={(e) => setExForm({ ...exForm, reps: e.target.value })} />
                  </div>
                )}
                <button className="primary wide" onClick={() => addExercise(r.id)}>種目を追加</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="row">
        <input placeholder="新しいルーティン名(例: 上半身の日)" value={newRoutineName}
          onChange={(e) => setNewRoutineName(e.target.value)} />
        <button className="primary" onClick={addRoutine}>追加</button>
      </div>
    </div>
  )
}

/* ================= 履歴 ================= */

function History({ state, patchDate, onEditMeals, onEditWorkout }) {
  const days = lastDates(14)
  const weights = lastDates(30).reverse()
    .map((k) => ({ k, w: state.logs[k]?.weight }))
    .filter((x) => x.w != null)
  const [openDay, setOpenDay] = useState(null)

  return (
    <div className="page">
      <header className="pagehead"><h1>履歴</h1></header>

      <section className="card">
        <h2>体重(30日・太線は7日移動平均)</h2>
        {weights.length >= 2 ? (
          <WeightChart points={weights} />
        ) : (
          <p className="muted small">
            体重を2日分以上記録するとグラフが表示されます(現在{weights.length}日分)。ホームの「体重」欄や、下の日付をタップして記録できます。
          </p>
        )}
      </section>

      <section className="card">
        <h2>直近14日(タップで編集)</h2>
        {days.map((k) => {
          const l = state.logs[k]
          const t = l ? totalsOf(l, state.foods) : null
          const over = t && t.kcal > targetsOf(state, k).kcal
          return (
            <div className="histrow-wrap" key={k}>
              <div className="histrow" onClick={() => setOpenDay(openDay === k ? null : k)}>
                <span className="muted">{k.slice(5)}</span>
                {l ? (
                  <>
                    <span className={over ? 'over' : ''}>{Math.round(t.kcal)}kcal</span>
                    <span className="muted small">P{Math.round(t.p)}/F{Math.round(t.f)}/C{Math.round(t.c)}</span>
                    <span>{l.workout ? '🏋️' : ''}</span>
                    <span className="muted small">{l.weight ? `${l.weight}kg` : ''}</span>
                  </>
                ) : (
                  <span className="muted">記録なし</span>
                )}
              </div>
              {openDay === k && (
                <div className="dayedit">
                  {l?.workout && <p className="muted small">トレ: {routineNameOf(state, l.workout.menu)}</p>}
                  <div className="row">
                    <input type="number" inputMode="decimal" step="0.1" placeholder="体重kg"
                      value={l?.weight ?? ''}
                      onChange={(e) => patchDate(k, (log) => ({ ...log, weight: e.target.value === '' ? null : Number(e.target.value) }))} />
                    <span className="muted">kg</span>
                  </div>
                  <div className="row">
                    <button className="ghost wide" onClick={() => onEditMeals(k)}>食事を編集</button>
                    <button className="ghost wide" onClick={() => onEditWorkout(k)}>トレを編集</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

// 直近window件(不足時はそこまで)の単純移動平均
function movingAverage(points, window = 7) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1)
    return { k: p.k, w: slice.reduce((sum, x) => sum + x.w, 0) / slice.length }
  })
}

function WeightChart({ points }) {
  const W = 320, H = 120, pad = 8
  const avgPoints = movingAverage(points, 7)
  const ws = points.map((p) => p.w)
  const min = Math.min(...ws) - 0.5
  const max = Math.max(...ws) + 0.5
  const x = (i) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (w) => H - pad - ((w - min) / (max - min)) * (H - pad * 2)
  const avgPath = avgPoints.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="体重の推移(点は実測値、線は7日移動平均)">
      <defs>
        <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: 'var(--accent-2)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.w)} r="2" fill="var(--muted)" opacity="0.55" />
      ))}
      <path d={avgPath} fill="none" stroke="url(#trendLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x={pad} y={12} className="chart-label">{max.toFixed(1)}kg</text>
      <text x={pad} y={H - 2} className="chart-label">{min.toFixed(1)}kg</text>
    </svg>
  )
}

/* ================= AI相談 ================= */

function Chat({ state, setState, dateKey, openSettings }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [state.chat, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    if (!state.settings.apiKey) {
      setError('先に設定画面でGoogle Gemini APIキーを登録してください。')
      return
    }
    setError('')
    setInput('')
    const history = [...state.chat, { role: 'user', content: text }]
    setState((s) => ({ ...s, chat: history }))
    setBusy(true)
    try {
      const system = buildContext(state, dateKey)
      const reply = await askGemini(state.settings.apiKey, system, history.slice(-12))
      setState((s) => ({ ...s, chat: [...history, { role: 'assistant', content: reply }] }))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  const clearChat = () => {
    if (confirm('会話履歴を消しますか?')) setState((s) => ({ ...s, chat: [] }))
  }

  return (
    <div className="page chatpage">
      <header className="pagehead">
        <h1>AI相談</h1>
        <button className="ghost" onClick={clearChat}>履歴クリア</button>
      </header>
      <p className="muted small">
        今日の記録・直近7日・目標は毎回自動で共有されるので、状況説明は不要です。
      </p>
      <div className="chatlog">
        {state.chat.length === 0 && (
          <div className="muted small suggestions">
            例:「今日の夜、何を食べればPFCが収まる?」<br />
            「昨日のトレの重量、次はどう上げるべき?」<br />
            「カレーライス一皿のPFCを推定して」
          </div>
        )}
        {state.chat.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>{m.content}</div>
        ))}
        {busy && <div className="msg assistant muted">考え中…</div>}
        <div ref={bottomRef} />
      </div>
      {error && (
        <div className="error">
          {error} {!state.settings.apiKey && <button className="ghost" onClick={openSettings}>設定を開く</button>}
        </div>
      )}
      <div className="chatinput">
        <textarea rows={1} value={input} placeholder="コーチに相談…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }} />
        <button className="primary" onClick={send} disabled={busy}>送信</button>
      </div>
    </div>
  )
}

/* ================= 設定 ================= */

function Settings({ state, setState, close }) {
  const [s, setS] = useState(state.settings)
  const [sched, setSched] = useState(state.schedule)
  const fileRef = useRef(null)

  const saveAll = () => {
    setState((st) => ({
      ...st,
      settings: {
        ...s,
        kcalTargetTrain: Number(s.kcalTargetTrain) || 1900,
        pTargetTrain: Number(s.pTargetTrain) || 140,
        fTargetTrain: Number(s.fTargetTrain) || 40,
        cTargetTrain: Number(s.cTargetTrain) || 210,
        kcalTargetOff: Number(s.kcalTargetOff) || 1750,
        pTargetOff: Number(s.pTargetOff) || 140,
        fTargetOff: Number(s.fTargetOff) || 40,
        cTargetOff: Number(s.cTargetOff) || 165,
      },
      schedule: Object.fromEntries(Object.entries(sched).filter(([, v]) => v)),
    }))
    close()
  }

  const importFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!data.logs) throw new Error('形式が違います')
        if (confirm('現在のデータをバックアップの内容で上書きします。よろしいですか?')) {
          setState(normalizeState(data))
          close()
        }
      } catch (err) {
        alert('読み込みに失敗しました: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="modal-back" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="pagehead">
          <h1>設定</h1>
          <button className="ghost" onClick={close}>閉じる</button>
        </header>

        <h2>1日の目標(トレーニング日)</h2>
        <div className="grid4">
          {[['kcalTargetTrain', 'kcal'], ['pTargetTrain', 'P(g)'], ['fTargetTrain', 'F(g)'], ['cTargetTrain', 'C(g)']].map(([k, label]) => (
            <label key={k} className="field">
              <span className="muted small">{label}</span>
              <input type="number" inputMode="numeric" value={s[k]}
                onChange={(e) => setS({ ...s, [k]: e.target.value })} />
            </label>
          ))}
        </div>

        <h2>1日の目標(オフ日)</h2>
        <div className="grid4">
          {[['kcalTargetOff', 'kcal'], ['pTargetOff', 'P(g)'], ['fTargetOff', 'F(g)'], ['cTargetOff', 'C(g)']].map(([k, label]) => (
            <label key={k} className="field">
              <span className="muted small">{label}</span>
              <input type="number" inputMode="numeric" value={s[k]}
                onChange={(e) => setS({ ...s, [k]: e.target.value })} />
            </label>
          ))}
        </div>

        <h2>曜日ごとのジムメニュー</h2>
        <div className="col">
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <div className="row between" key={dow}>
              <span className="muted small">{DOW[dow]}曜日</span>
              <select value={sched[dow] || ''} onChange={(e) => setSched({ ...sched, [dow]: e.target.value || undefined })}>
                <option value="">オフ日</option>
                {state.routines.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="muted small">種目の追加・削除は「トレ」タブの「ルーティン管理」から行えます。</p>

        <h2>AI相談(Google Gemini APIキー)</h2>
        <input type="password" placeholder="AQ.Ab... または AIza..." value={s.apiKey}
          onChange={(e) => setS({ ...s, apiKey: e.target.value })} />
        <p className="muted small">
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>
          で無料取得できます。キーはこの端末のローカルストレージにのみ保存されます。
        </p>

        <h2>バックアップ</h2>
        <p className="muted small">データはこの端末にのみ保存されます。機種変更やブラウザのデータ削除に備えて定期的にエクスポートしてください。</p>
        <div className="row">
          <button className="ghost wide" onClick={() => exportJSON(state)}>エクスポート</button>
          <button className="ghost wide" onClick={() => fileRef.current?.click()}>インポート</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importFile} />
        </div>

        <button className="primary wide" onClick={saveAll}>保存する</button>
      </div>
    </div>
  )
}
