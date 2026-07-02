import { getLog, totalsOf, lastDates, macrosOf, isTrainingDay, targetsOf } from './store'
import { SLOTS } from './data'

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
      `メニュー${log.workout.menu}:`,
      ...log.workout.exercises.map((ex) =>
        ex.type === 'cardio'
          ? `- ${ex.name}: ${ex.done ? '実施済み' : '未実施'}(${ex.minutes || ex.targetMinutes}分, 傾斜${ex.incline}, 速度${ex.speed})`
          : `- ${ex.name}: ${ex.sets.map((st) => `${st.kg}kg×${st.reps}`).join(', ')}`
      ),
    ]
  }

  const week = lastDates(7, new Date())
    .map((k) => {
      const l = state.logs[k]
      if (!l) return null
      const tt = totalsOf(l, state.foods)
      const w = l.weight ? ` 体重${l.weight}kg` : ''
      const g = l.workout ? ` ジム${l.workout.menu}` : ''
      return `${k}: ${Math.round(tt.kcal)}kcal (P${Math.round(tt.p)}/F${Math.round(tt.f)}/C${Math.round(tt.c)})${w}${g}`
    })
    .filter(Boolean)

  return [
    `あなたはユーザー専属のダイエット・筋トレコーチです。簡潔に、実用的に日本語で答えてください。`,
    ``,
    `## 目標(今日は${trainDay ? 'トレーニング日' : 'オフ日'})`,
    `1日 ${target.kcal}kcal / P ${target.p}g / F ${target.f}g / C ${target.c}g`,
    `トレーニング: 全身法A(ベンチ重視)/B(バランス重視)の2分割、週3(火A・木B・土A)`,
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

export async function askClaude(apiKey, systemPrompt, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}
