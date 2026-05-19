// 组别颜色（共享常量，ABTestDetail 也引用）
export const VARIANT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function variantLetter(i) { return String.fromCharCode(65 + i) }

function vary(base, pct = 0.15) {
  return Math.round(base * (1 + (Math.random() * 2 - 1) * pct) * 100) / 100
}

// 为 N 个组别生成一个 { A: val, B: val, ... } 对象
// offsets 控制各组相对基准的偏移方向
const GROUP_OFFSETS = [0, 0.15, 0.08, -0.05, 0.20, 0.12]

function genGroups(count, base, intMode) {
  const out = {}
  for (let i = 0; i < count; i++) {
    const k = variantLetter(i)
    const v = base * (1 + GROUP_OFFSETS[i % GROUP_OFFSETS.length]) + (Math.random() - 0.5) * base * 0.05
    out[k] = intMode ? Math.round(v) : Math.round(v * 100) / 100
  }
  return out
}

function buildSegmentData(baseSummary, baseWindows, baseDaily, count) {
  const varyGroups = (obj, pctVal) => {
    const out = {}
    for (const k of Object.keys(obj)) out[k] = vary(obj[k], pctVal || 0.15)
    return out
  }
  const varyGroupsInt = (obj) => {
    const out = {}
    for (const k of Object.keys(obj)) out[k] = Math.round(vary(obj[k], 0.3))
    return out
  }
  // Derive callsPerUser from calls / enrolled
  const deriveCallsPerUser = (calls, enrolled) => {
    const out = {}
    for (const k of Object.keys(calls)) out[k] = enrolled[k] ? Math.round(calls[k] / enrolled[k] * 10) / 10 : 0
    return out
  }
  const segEnrolled = varyGroupsInt(baseSummary.enrolled)
  const segCalls = varyGroupsInt(baseSummary.calls)
  return {
    summary: {
      enrolled: segEnrolled,
      calls: segCalls,
      callsPerUser: deriveCallsPerUser(segCalls, segEnrolled),
      arpu: varyGroups(baseSummary.arpu),
      arppu: varyGroups(baseSummary.arppu),
      payRate: varyGroups(baseSummary.payRate, 0.1),
    },
    windows: {
      roi: Object.fromEntries(Object.entries(baseWindows.roi).map(([w, obj]) => [w, varyGroups(obj)])),
      retention: Object.fromEntries(Object.entries(baseWindows.retention).map(([w, obj]) => [w, varyGroups(obj)])),
      payRate: Object.fromEntries(Object.entries(baseWindows.payRate).map(([w, obj]) => [w, varyGroups(obj)])),
    },
    daily: baseDaily.map(d => {
      const row = { date: d.date }
      for (const field of Object.keys(d)) {
        if (field === 'date') continue
        if (field === 'enrolled' || field === 'calls') row[field] = varyGroupsInt(d[field])
        else row[field] = varyGroups(d[field])
      }
      // Derive daily callsPerUser
      if (row.calls && row.enrolled) {
        const cpu = {}
        for (const k of Object.keys(row.calls)) cpu[k] = row.enrolled[k] ? Math.round(row.calls[k] / row.enrolled[k] * 10) / 10 : 0
        row.callsPerUser = cpu
      }
      return row
    }),
  }
}

function makeDaily14(startDate, seed, count) {
  const days = []
  const s = seed || 1
  const WINDOWS = ['d1', 'd3', 'd7', 'd14', 'd30']
  for (let i = 0; i < 14; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const progress = (i + 1) / 14
    const row = { date: `${mm}-${dd}` }
    row.enrolled = genGroups(count, 420 + i * 15 * s, true)
    row.calls = genGroups(count, 3200 + i * 120 * s, true)
    row.arpu = genGroups(count, 2.0 + progress * 0.5)
    row.arppu = genGroups(count, 14.0 + progress * 2.0)

    const roiBases = { d1: 4.5 + progress * 1.5, d3: 7.0 + progress * 2.0, d7: 11.0 + progress * 3.0, d14: 16.0 + progress * 4.0, d30: 22.0 + progress * 5.0 }
    const retBases = { d1: 43.0, d3: 30.0, d7: 20.0, d14: 14.0, d30: 9.0 }
    const payBases = { d1: 2.8, d3: 4.5, d7: 7.0, d14: 9.5, d30: 11.5 }

    for (const w of WINDOWS) {
      row[`roi_${w}`] = genGroups(count, roiBases[w])
      row[`retention_${w}`] = genGroups(count, retBases[w])
      row[`payRate_${w}`] = genGroups(count, payBases[w])
    }
    // Derive callsPerUser
    const cpu = {}
    for (const k of Object.keys(row.calls)) cpu[k] = row.enrolled[k] ? Math.round(row.calls[k] / row.enrolled[k] * 10) / 10 : 0
    row.callsPerUser = cpu
    days.push(row)
  }
  return days
}

function buildWindows(count, roiBase, retBase, payBase) {
  const WINDOWS = ['d1', 'd3', 'd7', 'd14', 'd30']
  const roi = {}, retention = {}, payRate = {}
  for (const w of WINDOWS) {
    roi[w] = genGroups(count, roiBase[w])
    retention[w] = genGroups(count, retBase[w])
    payRate[w] = genGroups(count, payBase[w])
  }
  return { roi, retention, payRate }
}

const SEGMENT_KEYS = ['new', 'existing', 'tier_A', 'tier_B', 'tier_C', 'male', 'female', 'non-binary']

function buildAllSegments(summary, windows, daily, count) {
  const segs = {}
  for (const key of SEGMENT_KEYS) {
    segs[key] = buildSegmentData(summary, windows, daily, count)
  }
  return segs
}

function deriveCallsPerUser(summary) {
  const out = {}
  for (const k of Object.keys(summary.calls)) {
    out[k] = summary.enrolled[k] ? Math.round(summary.calls[k] / summary.enrolled[k] * 10) / 10 : 0
  }
  summary.callsPerUser = out
  return summary
}

const testData = {
  ab_001: (count = 2) => {
    const summary = deriveCallsPerUser({
      enrolled: genGroups(count, 12000, true),
      calls: genGroups(count, 6350, true),
      arpu: genGroups(count, 2.34),
      arppu: genGroups(count, 15.60),
      payRate: genGroups(count, 3.2),
    })
    const windows = buildWindows(count,
      { d1: 5.2, d3: 8.1, d7: 12.4, d14: 18.7, d30: 25.3 },
      { d1: 45.0, d3: 32.1, d7: 22.5, d14: 15.8, d30: 10.2 },
      { d1: 3.2, d3: 5.1, d7: 7.8, d14: 10.2, d30: 12.5 },
    )
    const daily = makeDaily14(new Date('2026-04-20'), 1, count)
    return { summary, windows, daily, segments: buildAllSegments(summary, windows, daily, count) }
  },
  ab_002: (count = 2) => {
    const summary = deriveCallsPerUser({
      enrolled: genGroups(count, 9000, true),
      calls: genGroups(count, 4430, true),
      arpu: genGroups(count, 1.85),
      arppu: genGroups(count, 12.40),
      payRate: genGroups(count, 2.8),
    })
    const windows = buildWindows(count,
      { d1: 4.1, d3: 6.5, d7: 10.2, d14: 15.3, d30: 21.0 },
      { d1: 42.0, d3: 29.5, d7: 20.1, d14: 14.2, d30: 9.5 },
      { d1: 2.8, d3: 4.2, d7: 6.5, d14: 8.8, d30: 10.8 },
    )
    const daily = makeDaily14(new Date('2026-04-09'), 0.9, count)
    return { summary, windows, daily, segments: buildAllSegments(summary, windows, daily, count) }
  },
  ab_003: (count = 3) => {
    const summary = deriveCallsPerUser({
      enrolled: genGroups(count, 3200, true),
      calls: genGroups(count, 1500, true),
      arpu: genGroups(count, 1.55),
      arppu: genGroups(count, 10.80),
      payRate: genGroups(count, 2.1),
    })
    const windows = buildWindows(count,
      { d1: 3.0, d3: 5.2, d7: 8.5, d14: 12.0, d30: 16.5 },
      { d1: 40.0, d3: 28.0, d7: 19.0, d14: 13.5, d30: 8.8 },
      { d1: 2.1, d3: 3.5, d7: 5.5, d14: 7.2, d30: 9.0 },
    )
    const daily = makeDaily14(new Date('2026-05-20'), 0.7, count)
    return { summary, windows, daily, segments: buildAllSegments(summary, windows, daily, count) }
  },
}

export function generateMockABResults(testId, variantCount) {
  const factory = testData[testId]
  if (!factory) return testData.ab_001(variantCount || 2)
  return factory(variantCount)
}
