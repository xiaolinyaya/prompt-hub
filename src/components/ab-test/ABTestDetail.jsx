import { useState, useEffect, useMemo, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit3, Plus, Trash2, Power } from 'lucide-react'
import { useAppContext, emptyState } from '../../context/AppContext'
import { useABTests } from '../../hooks/useABTests'
import { usePrompts } from '../../hooks/usePrompts'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useToast } from '../shared/Toast'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import { generateMockABResults, VARIANT_COLORS, variantLetter } from '../../data/mockABResults'
import Header from '../layout/Header'
import StatusBadge from '../shared/StatusBadge'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import { formatDateTime } from '../../utils/dateFormatter'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import './ab-test.css'

const WINDOWS = ['d1', 'd3', 'd7', 'd14', 'd30']
const WINDOW_LABELS = { d1: 'Day 1', d3: 'Day 3', d7: 'Day 7', d14: 'Day 14', d30: 'Day 30' }
const TREND_METRICS = [
  { key: 'enrolled', label: '进组人数', hasWindow: false },
  { key: 'calls', label: '日均调用', hasWindow: false },
  { key: 'callsPerUser', label: '人均调用', hasWindow: false },
  { key: 'roi', label: 'ROI', hasWindow: true },
  { key: 'retention', label: '留存率', hasWindow: true },
  { key: 'payRate', label: '付费率', hasWindow: true },
  { key: 'arpu', label: 'ARPU', hasWindow: false },
  { key: 'arppu', label: 'ARPPU', hasWindow: false },
]

function fmtNum(v) { return typeof v === 'number' ? v.toLocaleString() : v }
function fmtPct(v) { return typeof v === 'number' ? v.toFixed(1) + '%' : v }
function fmtCurrency(v) { return typeof v === 'number' ? '¥' + v.toFixed(2) : v }
function diffPct(a, b) { return a === 0 ? 0 : ((b - a) / a * 100) }

function distributeTraffic(variants) {
  const n = variants.length
  const each = Math.floor(100 / n)
  return variants.map((v, i) => ({ ...v, trafficPercent: i === n - 1 ? 100 - each * (n - 1) : each }))
}
function relabelVariants(variants) {
  return variants.map((v, i) => ({ ...v, label: i === 0 ? '对照组 (A)' : `实验组 (${variantLetter(i)})` }))
}

export default function ABTestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()
  const { getTestById, updateTest, startTest, pauseTest, completeTest } = useABTests()
  const { getPromptById, prompts, pushToEnvironment } = usePrompts()
  const { addLog } = useAuditLog()
  const toast = useToast()

  // Dashboard state
  const [segmentFilter, setSegmentFilter] = useState([])
  const [tierFilter, setTierFilter] = useState([])
  const [genderFilter, setGenderFilter] = useState([])
  const [trendMetric, setTrendMetric] = useState('enrolled')
  const [trendWindow, setTrendWindow] = useState('d7')

  // Edit state
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(null)

  // Complete modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completeForm, setCompleteForm] = useState({
    summary: '', winner: '', deployMode: 'none', canaryUserIds: '',
  })

  // Pause confirm state
  const [showPauseConfirm, setShowPauseConfirm] = useState(false)

  useEffect(() => {
    if (!state) {
      dispatch({
        type: 'INIT_STATE',
        payload: {
          ...emptyState,
          prompts: generateMockPrompts(),
          templates: generateMockTemplates(),
          abTests: generateMockABTests(),
          auditLog: generateMockAuditLog(),
        }
      })
    }
  }, [state, dispatch])

  if (!state) return null

  const test = getTestById(id)
  if (!test) {
    return (
      <div className="page">
        <Header title="AB 测试详情" />
        <div className="ab-empty">测试不存在或已被删除</div>
      </div>
    )
  }

  const prompt = getPromptById(test.promptId)
  const variants = test.variants || []
  const variantCount = variants.length
  const keys = variants.map((_, i) => variantLetter(i))

  // Resolve version content per variant
  const varVersions = variants.map(v => prompt?.versions?.find(ver => ver.id === v.versionId))

  // Mock results — pass variant count
  const resultsData = useMemo(() => id ? generateMockABResults(id, variantCount) : null, [id, variantCount])

  // Get filtered data
  function getFilteredData() {
    if (!resultsData) return null
    const segs = resultsData.segments || {}
    const activeKeys = [...segmentFilter, ...tierFilter.map(t => 'tier_' + t), ...genderFilter]
    if (activeKeys.length === 0) return resultsData
    for (const key of activeKeys) {
      if (segs[key]) return segs[key]
    }
    return resultsData
  }

  const filtered = getFilteredData()

  function handleAction(action) {
    if (action === 'start') {
      startTest(id)
      addLog({ action: 'ab_start', promptId: test.promptId, promptName: prompt?.name, details: `启动 AB 测试 "${test.name}"` })
      toast('测试已启动')
    } else if (action === 'pause') {
      setShowPauseConfirm(true)
    } else if (action === 'complete') {
      setCompleteForm({ summary: '', winner: variants[0]?.id || '', deployMode: 'none', canaryUserIds: '' })
      setShowCompleteModal(true)
    }
  }

  function handlePauseConfirm() {
    pauseTest(id)
    addLog({ action: 'ab_start', promptId: test.promptId, promptName: prompt?.name, details: `暂停 AB 测试 "${test.name}"` })
    toast('测试已暂停')
    setShowPauseConfirm(false)
  }

  function handleCompleteConfirm() {
    if (!completeForm.winner) return
    const winnerVariant = variants.find(v => v.id === completeForm.winner)

    completeTest(id, {
      winner: completeForm.winner,
      summary: completeForm.summary,
    })
    addLog({ action: 'ab_stop', promptId: test.promptId, promptName: prompt?.name, details: `结束 AB 测试 "${test.name}"，胜出: ${winnerVariant?.label || completeForm.winner}` })

    if (completeForm.deployMode === 'full' && winnerVariant?.versionId && test.promptId) {
      pushToEnvironment(test.promptId, 'prod', winnerVariant.versionId)
      addLog({ action: 'env_push', promptId: test.promptId, promptName: prompt?.name, details: `AB 测试胜出版本全量推送到生产` })
      toast('测试已结束，胜出版本已全量推送到生产')
    } else if (completeForm.deployMode === 'canary' && winnerVariant?.versionId && test.promptId) {
      const ids = completeForm.canaryUserIds.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean)
      if (ids.length > 0) {
        pushToEnvironment(test.promptId, 'prod', winnerVariant.versionId, { canary: true, userIds: ids })
        addLog({ action: 'env_push', promptId: test.promptId, promptName: prompt?.name, details: `AB 测试胜出版本灰度推送到生产（${ids.length}人）` })
        toast(`测试已结束，胜出版本已灰度推送（${ids.length}人）`)
      } else {
        toast('测试已结束')
      }
    } else {
      toast('测试已结束')
    }

    setShowCompleteModal(false)
  }

  function toLocalDatetime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function openEdit() {
    setEditForm({
      name: test.name,
      promptId: test.promptId,
      variants: variants.map(v => ({ label: v.label, versionId: v.versionId || '', trafficPercent: v.trafficPercent })),
      startTime: toLocalDatetime(test.schedule?.startTime),
      endTime: toLocalDatetime(test.schedule?.endTime),
      userType: test.targeting?.userType || 'all',
      countryTier: test.targeting?.countryTier || [],
      gender: test.targeting?.gender || [],
    })
    setShowEdit(true)
  }

  function editAddVariant() {
    const next = [...editForm.variants, { label: '', versionId: '', trafficPercent: 0 }]
    setEditForm({ ...editForm, variants: distributeTraffic(relabelVariants(next)) })
  }
  function editRemoveVariant(idx) {
    if (editForm.variants.length <= 2) return
    const next = editForm.variants.filter((_, i) => i !== idx)
    setEditForm({ ...editForm, variants: distributeTraffic(relabelVariants(next)) })
  }
  function editUpdateVariant(idx, field, value) {
    const next = editForm.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v)
    setEditForm({ ...editForm, variants: next })
  }

  function handleSaveEdit() {
    if (!editForm.name) return
    const editPrompt = prompts.find(p => p.id === editForm.promptId)
    const builtVariants = editForm.variants.map((v, i) => ({
      id: `var_${variantLetter(i).toLowerCase()}`,
      label: v.label,
      versionId: v.versionId,
      trafficPercent: v.trafficPercent,
    }))
    updateTest(id, {
      name: editForm.name,
      promptId: editForm.promptId,
      variants: builtVariants,
      startTime: editForm.startTime || null,
      endTime: editForm.endTime || null,
      userType: editForm.userType,
      countryTier: editForm.countryTier,
      gender: editForm.gender,
    })
    addLog({ action: 'ab_start', promptId: editForm.promptId, promptName: editPrompt?.name, details: `编辑了 AB 测试 "${editForm.name}"` })
    toast('测试已更新')
    setShowEdit(false)
  }

  const editPromptObj = editForm ? prompts.find(p => p.id === editForm.promptId) : null
  const showDashboard = (test.status === 'running' || test.status === 'completed') && filtered

  // Build trend chart data
  function getTrendChartData() {
    if (!filtered?.daily) return []
    const metricDef = TREND_METRICS.find(m => m.key === trendMetric)
    if (!metricDef) return []
    return filtered.daily.map(d => {
      const dataKey = metricDef.hasWindow ? `${trendMetric}_${trendWindow}` : trendMetric
      const val = d[dataKey] || {}
      const row = { date: d.date }
      for (const k of keys) {
        row[k] = typeof val[k] === 'string' ? Number(val[k]) : val[k]
      }
      return row
    })
  }

  // Render metric card — N groups, diff vs A
  function renderMetricCard(title, metricKey, formatter) {
    if (!filtered?.summary?.[metricKey]) return null
    const data = filtered.summary[metricKey]
    const baseVal = data[keys[0]]
    return (
      <div className="ab-metric-card">
        <div className="ab-metric-card-title">{title}</div>
        <div className="ab-metric-card-rows">
          {keys.map((k, i) => (
            <div key={k} className="ab-metric-row">
              <span className="label" style={{ color: VARIANT_COLORS[i % VARIANT_COLORS.length] }}>{k}</span>
              <span className="value">{formatter(data[k])}</span>
              {i > 0 && (() => {
                const d = diffPct(baseVal, data[k])
                return <span style={{ fontSize: 12, fontWeight: 600, color: d >= 0 ? '#16a34a' : '#dc2626' }}>{(d >= 0 ? '+' : '') + d.toFixed(1) + '%'}</span>
              })()}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render windows table
  function renderWindowsTable() {
    if (!filtered?.windows) return null
    const metrics = [
      { key: 'roi', label: 'ROI' },
      { key: 'retention', label: '留存率' },
      { key: 'payRate', label: '付费率' },
    ]
    return (
      <table className="ab-windows-table">
        <thead>
          <tr>
            <th>指标</th>
            <th></th>
            {WINDOWS.map(w => <th key={w}>{WINDOW_LABELS[w]}</th>)}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, mi) => {
            const wData = filtered.windows[m.key]
            if (!wData) return null
            const groupRows = keys.length
            const totalRows = groupRows + (keys.length > 1 ? keys.length - 1 : 0) // group rows + diff rows
            return (
              <Fragment key={m.key}>
                {/* Group value rows */}
                {keys.map((k, ki) => (
                  <tr key={`${m.key}-${k}`} className={mi > 0 && ki === 0 ? 'row-metric' : undefined} style={ki === 0 ? undefined : undefined}>
                    {ki === 0 && <td className="col-metric" rowSpan={totalRows}>{m.label}</td>}
                    <td className="col-group" style={{ color: VARIANT_COLORS[ki % VARIANT_COLORS.length] }}>{k}</td>
                    {WINDOWS.map(w => (
                      <td key={w} style={{ color: VARIANT_COLORS[ki % VARIANT_COLORS.length], fontWeight: 500 }}>{fmtPct(wData[w]?.[k])}</td>
                    ))}
                  </tr>
                ))}
                {/* Diff rows vs A */}
                {keys.slice(1).map((k, di) => (
                  <tr key={`${m.key}-diff-${k}`} className="row-diff">
                    <td className="col-group">{k}-{keys[0]}</td>
                    {WINDOWS.map(w => {
                      const d = (wData[w]?.[k] || 0) - (wData[w]?.[keys[0]] || 0)
                      return <td key={w} className={d >= 0 ? 'diff-positive' : 'diff-negative'}>{(d >= 0 ? '+' : '') + d.toFixed(1) + '%'}</td>
                    })}
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    )
  }

  const currentTrendMetric = TREND_METRICS.find(m => m.key === trendMetric)

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={() => navigate('/ab-tests')}>
        <ArrowLeft size={16} /> 返回列表
      </button>

      <Header title={test.name} subtitle={prompt?.name || test.promptId}>
        {test.status !== 'completed' && (
          <button className="btn btn-secondary" onClick={openEdit}>
            <Edit3 size={14} /> 编辑
          </button>
        )}
        {test.status === 'draft' && <button className="btn btn-primary" onClick={() => handleAction('start')}>START</button>}
        {test.status === 'running' && (
          <>
            <button className="btn btn-secondary" onClick={() => handleAction('pause')}>PAUSE</button>
            <button className="btn btn-danger" onClick={() => handleAction('complete')}>COMPLETE</button>
          </>
        )}
        {test.status === 'paused' && (
          <>
            <button className="btn btn-primary" onClick={() => handleAction('start')}>RESUME</button>
            <button className="btn btn-danger" onClick={() => handleAction('complete')}>COMPLETE</button>
          </>
        )}
      </Header>

      <div className="ab-info-bar">
        <div className="ab-info-item">
          <span className="ab-info-label">Status</span>
          <StatusBadge status={test.status} />
        </div>
        <div className="ab-info-item">
          <span className="ab-info-label">Groups</span>
          <span>{variantCount} 组</span>
        </div>
        <div className="ab-info-item">
          <span className="ab-info-label">Created</span>
          <span>{formatDateTime(test.createdAt)}</span>
        </div>
        {test.startedAt && (
          <div className="ab-info-item">
            <span className="ab-info-label">Started</span>
            <span>{formatDateTime(test.startedAt)}</span>
          </div>
        )}
        {test.endedAt && (
          <div className="ab-info-item">
            <span className="ab-info-label">Ended</span>
            <span>{formatDateTime(test.endedAt)}</span>
          </div>
        )}
      </div>

      {/* Schedule & Targeting */}
      <div className="ab-info-bar" style={{ marginTop: 0 }}>
        <div className="ab-info-item">
          <span className="ab-info-label">计划开始</span>
          <span>{test.schedule?.startTime ? formatDateTime(test.schedule.startTime) : '手动控制'}</span>
        </div>
        <div className="ab-info-item">
          <span className="ab-info-label">计划结束</span>
          <span>{test.schedule?.endTime ? formatDateTime(test.schedule.endTime) : '手动控制'}</span>
        </div>
        <div className="ab-info-item">
          <span className="ab-info-label">用户类型</span>
          <span className="ab-targeting-badge">{test.targeting?.userType === 'new' ? '新用户' : test.targeting?.userType === 'existing' ? '老用户' : '全部用户'}</span>
        </div>
        <div className="ab-info-item">
          <span className="ab-info-label">国家等级</span>
          <span className="ab-targeting-badge">{test.targeting?.countryTier?.length > 0 ? test.targeting.countryTier.map(t => `${t} 级`).join('、') : '全部'}</span>
        </div>
        <div className="ab-info-item">
          <span className="ab-info-label">用户性别</span>
          <span className="ab-targeting-badge">{test.targeting?.gender?.length > 0 ? test.targeting.gender.map(g =>
            g === 'male' ? '男' : g === 'female' ? '女' : '非二元'
          ).join('、') : '全部'}</span>
        </div>
      </div>

      {/* Traffic Bar — N groups */}
      <div className="card ab-section">
        <h3 className="ab-section-title">Traffic Split</h3>
        <div className="ab-traffic-bar">
          {variants.map((v, i) => (
            <div key={i} style={{ width: `${v.trafficPercent}%`, background: VARIANT_COLORS[i % VARIANT_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 600 }}>
              {variantLetter(i)}: {v.trafficPercent}%
            </div>
          ))}
        </div>
      </div>

      {/* Variants — dynamic grid */}
      <div className="ab-variants-grid" style={{ gridTemplateColumns: `repeat(${Math.min(variantCount, 3)}, 1fr)` }}>
        {variants.map((v, i) => (
          <div key={i} className="card ab-section" style={{ borderTop: `3px solid ${VARIANT_COLORS[i % VARIANT_COLORS.length]}` }}>
            <h3 className="ab-section-title">{v.label || `组别 ${variantLetter(i)}`}</h3>
            <pre className="ab-version-content">{varVersions[i]?.content || '版本内容不可用'}</pre>
            {varVersions[i] && <div className="ab-version-meta">v{varVersions[i].versionNumber} · {varVersions[i].changeNote}</div>}
          </div>
        ))}
      </div>

      {/* Dashboard */}
      {showDashboard && (
        <>
          {/* Filter bar */}
          <div className="ab-filter-bar">
            <div className="ab-filter-group">
              <span className="ab-filter-label">人群</span>
              <div className="ab-filter-pills">
                <button className={`ab-filter-pill ${segmentFilter.length === 0 ? 'active' : ''}`} onClick={() => setSegmentFilter([])}>全部</button>
                {[['new', '新用户'], ['existing', '老用户']].map(([val, label]) => (
                  <button key={val} className={`ab-filter-pill ${segmentFilter.includes(val) ? 'active' : ''}`} onClick={() => {
                    setSegmentFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div className="ab-filter-group">
              <span className="ab-filter-label">国家等级</span>
              <div className="ab-filter-pills">
                <button className={`ab-filter-pill ${tierFilter.length === 0 ? 'active' : ''}`} onClick={() => setTierFilter([])}>全部</button>
                {[['A', 'A 级'], ['B', 'B 级'], ['C', 'C 级']].map(([val, label]) => (
                  <button key={val} className={`ab-filter-pill ${tierFilter.includes(val) ? 'active' : ''}`} onClick={() => {
                    setTierFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div className="ab-filter-group">
              <span className="ab-filter-label">性别</span>
              <div className="ab-filter-pills">
                <button className={`ab-filter-pill ${genderFilter.length === 0 ? 'active' : ''}`} onClick={() => setGenderFilter([])}>全部</button>
                {[['male', '男'], ['female', '女'], ['non-binary', '非二元']].map(([val, label]) => (
                  <button key={val} className={`ab-filter-pill ${genderFilter.includes(val) ? 'active' : ''}`} onClick={() => {
                    setGenderFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                  }}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="ab-metric-cards">
            {renderMetricCard('进组人数', 'enrolled', fmtNum)}
            {renderMetricCard('日均调用次数', 'calls', fmtNum)}
            {renderMetricCard('人均调用次数', 'callsPerUser', fmtNum)}
            {renderMetricCard('ARPU', 'arpu', fmtCurrency)}
            {renderMetricCard('ARPPU', 'arppu', fmtCurrency)}
            {renderMetricCard('付费率（累计）', 'payRate', fmtPct)}
          </div>

          {/* Windows table */}
          <div className="card ab-section">
            <h3 className="ab-section-title">窗口期指标对比</h3>
            {renderWindowsTable()}
          </div>

          {/* Trend chart */}
          <div className="card ab-section">
            <h3 className="ab-section-title">每日趋势</h3>
            <div className="ab-trend-tabs">
              {TREND_METRICS.map(m => (
                <button key={m.key} className={`ab-trend-tab ${trendMetric === m.key ? 'active' : ''}`} onClick={() => setTrendMetric(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
            {currentTrendMetric?.hasWindow && (
              <div className="ab-window-tabs">
                {WINDOWS.map(w => (
                  <button key={w} className={`ab-window-tab ${trendWindow === w ? 'active' : ''}`} onClick={() => setTrendWindow(w)}>
                    {WINDOW_LABELS[w]}
                  </button>
                ))}
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getTrendChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                {keys.map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={VARIANT_COLORS[i % VARIANT_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEdit && editForm && (
        <Modal title="编辑 AB 测试" onClose={() => setShowEdit(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>保存</button>
          </>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>测试名称</label>
              <input style={{ width: '100%' }} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>选择 Prompt</label>
              <select style={{ width: '100%' }} value={editForm.promptId} onChange={e => {
                const next = editForm.variants.map(v => ({ ...v, versionId: '' }))
                setEditForm({...editForm, promptId: e.target.value, variants: next})
              }}>
                <option value="">选择 Prompt</option>
                {prompts.filter(p => p.versions?.length > 0).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* 组别 */}
            {editPromptObj && (
              <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>实验组别</div>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={editAddVariant}>
                    <Plus size={12} /> 添加组别
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {editForm.variants.map((v, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${VARIANT_COLORS[idx % VARIANT_COLORS.length]}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: VARIANT_COLORS[idx % VARIANT_COLORS.length], marginBottom: 6 }}>{v.label}</div>
                        <select style={{ width: '100%', fontSize: 13 }} value={v.versionId} onChange={e => editUpdateVariant(idx, 'versionId', e.target.value)}>
                          <option value="">选择版本</option>
                          {editPromptObj.versions.map(ver => <option key={ver.id} value={ver.id}>v{ver.versionNumber} - {ver.changeNote}</option>)}
                        </select>
                      </div>
                      <div style={{ width: 70, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>流量</div>
                        <input type="number" min={1} max={99} value={v.trafficPercent} onChange={e => editUpdateVariant(idx, 'trafficPercent', Number(e.target.value))} style={{ width: 56, textAlign: 'center', fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>%</span>
                      </div>
                      {idx > 0 && editForm.variants.length > 2 && (
                        <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--text-tertiary)' }} onClick={() => editRemoveVariant(idx)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                  流量合计: {editForm.variants.reduce((s, v) => s + (v.trafficPercent || 0), 0)}%
                </div>
              </div>
            )}

            {/* 实验时间 */}
            <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>实验时间</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>开始时间（可选）</label>
                  <input type="datetime-local" style={{ width: '100%' }} value={editForm.startTime} onChange={e => setEditForm({...editForm, startTime: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>结束时间（可选）</label>
                  <input type="datetime-local" style={{ width: '100%' }} value={editForm.endTime} onChange={e => setEditForm({...editForm, endTime: e.target.value})} />
                </div>
              </div>
            </div>

            {/* 目标人群 */}
            <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>目标人群</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>用户类型</label>
                  <select style={{ width: '100%' }} value={editForm.userType} onChange={e => setEditForm({...editForm, userType: e.target.value})}>
                    <option value="all">全部用户</option>
                    <option value="new">新用户</option>
                    <option value="existing">老用户</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>国家等级</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[['A', 'A 级'], ['B', 'B 级'], ['C', 'C 级']].map(([val, label]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editForm.countryTier.includes(val)} onChange={e => {
                          const next = e.target.checked ? [...editForm.countryTier, val] : editForm.countryTier.filter(v => v !== val)
                          setEditForm({...editForm, countryTier: next})
                        }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>用户性别</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[['male', '男'], ['female', '女'], ['non-binary', '非二元']].map(([val, label]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editForm.gender.includes(val)} onChange={e => {
                          const next = e.target.checked ? [...editForm.gender, val] : editForm.gender.filter(v => v !== val)
                          setEditForm({...editForm, gender: next})
                        }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Pause Confirm */}
      {showPauseConfirm && (() => {
        const controlVariant = variants[0]
        const controlVer = varVersions[0]
        const versionLabel = controlVer ? `v${controlVer.versionNumber}` : '对照组版本'
        return (
          <ConfirmDialog
            title="确认暂停"
            message={`暂停后，线上将全量使用对照组 (A) 的 Prompt（${versionLabel}）。确认暂停 "${test.name}"？`}
            confirmLabel="确认暂停"
            variant="danger"
            onConfirm={handlePauseConfirm}
            onCancel={() => setShowPauseConfirm(false)}
          />
        )
      })()}

      {/* Complete Modal */}
      {showCompleteModal && (
        <Modal title="结束 AB 测试" onClose={() => setShowCompleteModal(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>取消</button>
            <button className="btn btn-danger" onClick={handleCompleteConfirm} disabled={!completeForm.winner || (completeForm.deployMode === 'canary' && !completeForm.canaryUserIds.trim())}>
              确认结束
            </button>
          </>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>实验结论（可选）</label>
              <textarea
                style={{ width: '100%', minHeight: 80, fontSize: 13, resize: 'vertical' }}
                value={completeForm.summary}
                onChange={e => setCompleteForm({ ...completeForm, summary: e.target.value })}
                placeholder="记录实验发现和结论..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>选择胜出组别</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {variants.map((v, i) => {
                  const ver = varVersions[i]
                  return (
                    <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: completeForm.winner === v.id ? 'var(--bg-selected)' : 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer', borderLeft: `3px solid ${VARIANT_COLORS[i % VARIANT_COLORS.length]}` }}>
                      <input type="radio" name="completeWinner" value={v.id} checked={completeForm.winner === v.id} onChange={() => setCompleteForm({ ...completeForm, winner: v.id })} style={{ accentColor: VARIANT_COLORS[i % VARIANT_COLORS.length] }} />
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{v.label}</span>
                      {ver && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>— v{ver.versionNumber}</span>}
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>推送胜出版本到生产</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['none', '不推送'], ['full', '全量推送'], ['canary', '灰度推送']].map(([val, label]) => (
                  <label key={val} className={`canary-radio-card${completeForm.deployMode === val ? ' active' : ''}`} style={{ flex: 1 }}>
                    <input type="radio" name="completeDeployMode" value={val} checked={completeForm.deployMode === val} onChange={() => setCompleteForm({ ...completeForm, deployMode: val })} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {completeForm.deployMode === 'canary' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>白名单用户ID</label>
                <textarea
                  style={{ width: '100%', minHeight: 60, fontSize: 13, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                  value={completeForm.canaryUserIds}
                  onChange={e => setCompleteForm({ ...completeForm, canaryUserIds: e.target.value })}
                  placeholder={'每行一个或逗号分隔，例如：\nuid_001, uid_002, uid_003'}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
