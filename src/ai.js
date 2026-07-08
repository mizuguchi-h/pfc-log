import { getLog, totalsOf, lastDates, macrosOf, isTrainingDay, targetsOf, routineNameOf } from './store'
import { SLOTS } from './data'

const DOW = ['日', '月', '火', '水', '木', '金', '土']

// 直近の記録からAIに渡すコンテキストを組み立てる
export function buildContext(state, dateKey) {
  const log = getLog(state, dateKey)
  const t = totalsOf(log, state.foods)
  const trainDay = isTrainingDay(state, dateKey)
  const target = targetsOf(state, dateKey)

  const slotLabel = (k) => SLOTS.find((s2) => s2.key === k)?.label || k
  const mealLines = log.meals.map((e) => {
    const m = macrosOf(e, state.foods)
    return `- [${slotLabel(e.slot)}] ${m.name} ×${e.qty} (${Math.round(m.kcal)}kcal P${m.p.toFixed(1)} F${m.f.toFixed(1)} C${m.c.toFixed(1)})`
  })

  let workoutLines = []
  if (log.workout) {
    workoutLines = [
      `${routineNameOf(state, log.workout.menu)}:`,
      ...log.workout.exercises.map((ex) => {
        if (ex.type === 'cardio') {
          return `- ${ex.name}: ${ex.done ? '実施済み' : '未実施'}(${ex.minutes || ex.targetMinutes}分, 傾斜${ex.incline}, 速度${ex.speed})`
        }
        if (ex.type === 'bodyweight') {
          return `- ${ex.name}(自重): ${ex.sets.map((st) => `${st.reps}回`).join(', ')}`
        }
        return `- ${ex.name}: ${ex.sets.map((st) => `${st.kg}kg×${st.reps}`).join(', ')}`
      }),
    ]
  }

  const week = lastDates(7, new Date())
    .map((k) => {
      const l = state.logs[k]
      if (!l) return null
      const tt = totalsOf(l, state.foods)
      const w = l.weight ? ` 体重${l.weight}kg` : ''
      const g = l.workout ? ` ジム${routineNameOf(state, l.workout.menu)}` : ''
      return `${k}: ${Math.round(tt.kcal)}kcal (P${Math.round(tt.p)}/F${Math.round(tt.f)}/C${Math.round(tt.c)})${w}${g}`
    })
    .filter(Boolean)

  const routineSummary = state.routines.map((r) => r.name).join(' / ') || '未設定'
  const scheduleSummary = Object.entries(state.schedule)
    .map(([dow, id]) => `${DOW[dow]}${routineNameOf(state, id)}`)
    .join('・') || 'なし'

  return [
    `あなたはユーザー専属のダイエット・筋トレコーチです。簡潔に、実用的に日本語で答えてください。`,
    ``,
    `## 目標(今日は${trainDay ? 'トレーニング日' : 'オフ日'})`,
    `1日 ${target.kcal}kcal / P ${target.p}g / F ${target.f}g / C ${target.c}g`,
    `トレーニングルーティン: ${routineSummary}`,
    `スケジュール: ${scheduleSummary}`,
    ``,
    `## 今日 (${dateKey}) の記録`,
    `合計: ${Math.round(t.kcal)}kcal / P ${t.p.toFixed(1)}g / F ${t.f.toFixed(1)}g / C ${t.c.toFixed(1)}g`,
    ...(mealLines.length ? mealLines : ['(まだ食事の記録なし)']),
    ...(workoutLines.length ? ['', '## 今日のトレーニング', ...workoutLines] : []),
    ``,
    `## 直近7日間`,
    ...(week.length ? week : ['(記録なし)']),
  ].join('\n')
}

// 無料枠のあるモデル(Google AI Studioで取得したAPIキーで利用可能)
const GEMINI_MODEL = 'gemini-2.5-flash'

export async function askGemini(apiKey, systemPrompt, messages) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 1500 },
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let message = body.slice(0, 300)
    try { message = JSON.parse(body).error?.message || message } catch {}
    throw new Error(`API error ${res.status}: ${message}`)
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const text = parts.map((p) => p.text || '').join('\n')
  if (!text) throw new Error('応答が空でした(セーフティフィルタ等で拒否された可能性があります)')
  return text
}
