import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Power } from 'lucide-react'
import { useAppContext, emptyState } from '../../context/AppContext'
import { useABTests } from '../../hooks/useABTests'
import { usePrompts } from '../../hooks/usePrompts'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useToast } from '../shared/Toast'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import { VARIANT_COLORS, variantLetter } from '../../data/mockABResults'
import Header from '../layout/Header'
import StatusBadge from '../shared/StatusBadge'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import EmptyState from '../shared/EmptyState'
import { formatRelativeTime } from '../../utils/dateFormatter'

function defaultVariants() {
  return [
    { label: '对照组 (A)', versionId: '', trafficPercent: 50 },
    { label: '实验组 (B)', versionId: '', trafficPercent: 50 },
  ]
}

function distributeTraffic(variants) {
  const n = variants.length
  const each = Math.floor(100 / n)
  return variants.map((v, i) => ({
    ...v,
    trafficPercent: i === n - 1 ? 100 - each * (n - 1) : each,
  }))
}

function relabelVariants(variants) {
  return variants.map((v, i) => ({
    ...v,
    label: i === 0 ? '对照组 (A)' : `实验组 (${variantLetter(i)})`,
  }))
}

export default function ABTestList() {
  const { state, dispatch } = useAppContext()
  const { createTest, startTest, pauseTest, completeTest } = useABTests()
  const { prompts, pushToEnvironment } = usePrompts()
  const { addLog } = useAuditLog()
  const toast = useToast()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [newTest, setNewTest] = useState({
    name: '', promptId: '',
    variants: defaultVariants(),
    startTime: '', endTime: '',
    userType: 'all', countryTier: [], gender: [],
  })

  // Complete modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completingTest, setCompletingTest] = useState(null)
  const [completeForm, setCompleteForm] = useState({
    summary: '', winner: '', deployMode: 'none', canaryUserIds: '',
  })

  // Pause confirm state
  const [showPauseConfirm, setShowPauseConfirm] = useState(false)
  const [pausingTest, setPausingTest] = useState(null)

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

  const tests = state.abTests || []
  const publishedPrompts = prompts.filter(p => p.status === 'published')
  const selectedPrompt = prompts.find(p => p.id === newTest.promptId)

  function addVariant() {
    const next = [...newTest.variants, { label: '', versionId: '', trafficPercent: 0 }]
    setNewTest({ ...newTest, variants: distributeTraffic(relabelVariants(next)) })
  }

  function removeVariant(idx) {
    if (newTest.variants.length <= 2) return
    const next = newTest.variants.filter((_, i) => i !== idx)
    setNewTest({ ...newTest, variants: distributeTraffic(relabelVariants(next)) })
  }

  function updateVariant(idx, field, value) {
    const next = newTest.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v)
    setNewTest({ ...newTest, variants: next })
  }

  function handleCreate() {
    if (!newTest.name || !newTest.promptId) return
    const variants = newTest.variants.map((v, i) => ({
      id: `var_${variantLetter(i).toLowerCase()}`,
      label: v.label,
      versionId: v.versionId,
      trafficPercent: v.trafficPercent,
    }))
    createTest({
      name: newTest.name,
      promptId: newTest.promptId,
      variants,
      startTime: newTest.startTime || null,
      endTime: newTest.endTime || null,
      userType: newTest.userType,
      countryTier: newTest.countryTier,
      gender: newTest.gender,
    })
    addLog({ action: 'ab_start', promptId: newTest.promptId, promptName: selectedPrompt?.name, details: `创建 AB 测试 "${newTest.name}"` })
    toast('AB 测试已创建')
    setShowCreate(false)
    setNewTest({ name: '', promptId: '', variants: defaultVariants(), startTime: '', endTime: '', userType: 'all', countryTier: [], gender: [] })
  }

  function handleAction(test, action) {
    const prompt = prompts.find(p => p.id === test.promptId)
    if (action === 'start') {
      startTest(test.id)
      addLog({ action: 'ab_start', promptId: test.promptId, promptName: prompt?.name, details: `启动 AB 测试 "${test.name}"` })
      toast('测试已启动')
    } else if (action === 'pause') {
      setPausingTest(test)
      setShowPauseConfirm(true)
    } else if (action === 'complete') {
      setCompletingTest(test)
      setCompleteForm({ summary: '', winner: test.variants?.[0]?.id || '', deployMode: 'none', canaryUserIds: '' })
      setShowCompleteModal(true)
    }
  }

  function handlePauseConfirm() {
    if (!pausingTest) return
    pauseTest(pausingTest.id)
    addLog({ action: 'ab_start', promptId: pausingTest.promptId, promptName: prompts.find(p => p.id === pausingTest.promptId)?.name, details: `暂停 AB 测试 "${pausingTest.name}"` })
    toast('测试已暂停')
    setShowPauseConfirm(false)
    setPausingTest(null)
  }

  function handleCompleteConfirm() {
    if (!completingTest || !completeForm.winner) return
    const prompt = prompts.find(p => p.id === completingTest.promptId)
    const winnerVariant = completingTest.variants?.find(v => v.id === completeForm.winner)

    // Complete the test with results
    completeTest(completingTest.id, {
      winner: completeForm.winner,
      summary: completeForm.summary,
    })
    addLog({ action: 'ab_stop', promptId: completingTest.promptId, promptName: prompt?.name, details: `结束 AB 测试 "${completingTest.name}"，胜出: ${winnerVariant?.label || completeForm.winner}` })

    // Optional deploy
    if (completeForm.deployMode === 'full' && winnerVariant?.versionId && completingTest.promptId) {
      pushToEnvironment(completingTest.promptId, 'prod', winnerVariant.versionId)
      addLog({ action: 'env_push', promptId: completingTest.promptId, promptName: prompt?.name, details: `AB 测试胜出版本全量推送到生产` })
      toast('测试已结束，胜出版本已全量推送到生产')
    } else if (completeForm.deployMode === 'canary' && winnerVariant?.versionId && completingTest.promptId) {
      const ids = completeForm.canaryUserIds.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean)
      if (ids.length > 0) {
        pushToEnvironment(completingTest.promptId, 'prod', winnerVariant.versionId, { canary: true, userIds: ids })
        addLog({ action: 'env_push', promptId: completingTest.promptId, promptName: prompt?.name, details: `AB 测试胜出版本灰度推送到生产（${ids.length}人）` })
        toast(`测试已结束，胜出版本已灰度推送（${ids.length}人）`)
      } else {
        toast('测试已结束')
      }
    } else {
      toast('测试已结束')
    }

    setShowCompleteModal(false)
    setCompletingTest(null)
  }

  return (
    <div className="page">
      <Header title="AB Test Manager" subtitle={`共 ${tests.length} 个测试`}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          CREATE TEST
        </button>
      </Header>

      {tests.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prompt</th>
              <th>Status</th>
              <th>Groups</th>
              <th>Traffic Split</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => {
              const prompt = prompts.find(p => p.id === test.promptId)
              const vars = test.variants || []
              return (
                <tr key={test.id}>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => navigate(`/ab-tests/${test.id}`)}>
                      {test.name}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{prompt?.name || test.promptId}</td>
                  <td><StatusBadge status={test.status} /></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{vars.length} 组</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 120, height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: 'var(--bg-hover)' }}>
                        {vars.map((v, i) => (
                          <div key={i} style={{ width: `${v.trafficPercent}%`, background: VARIANT_COLORS[i % VARIANT_COLORS.length], height: '100%' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {vars.map(v => v.trafficPercent + '%').join('/')}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatRelativeTime(test.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <span className="action-link preview" onClick={() => navigate(`/ab-tests/${test.id}`)}>VIEW</span>
                      {test.status === 'draft' && <span className="action-link edit" onClick={() => handleAction(test, 'start')}>START</span>}
                      {test.status === 'running' && <span className="action-link edit" onClick={() => handleAction(test, 'pause')}>PAUSE</span>}
                      {test.status === 'running' && <span className="action-link delete" onClick={() => handleAction(test, 'complete')}>COMPLETE</span>}
                      {test.status === 'paused' && <span className="action-link edit" onClick={() => handleAction(test, 'start')}>RESUME</span>}
                      {test.status === 'paused' && <span className="action-link delete" onClick={() => handleAction(test, 'complete')}>COMPLETE</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <EmptyState title="暂无 AB 测试" description="创建你的第一个 AB 测试" />
      )}

      {showCreate && (
        <Modal title="创建 AB 测试" onClose={() => setShowCreate(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleCreate}>创建</button>
          </>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>测试名称</label>
              <input style={{ width: '100%' }} value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} placeholder="例：欢迎消息 A/B 测试" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>选择 Prompt</label>
              <select style={{ width: '100%' }} value={newTest.promptId} onChange={e => {
                const next = newTest.variants.map(v => ({ ...v, versionId: '' }))
                setNewTest({...newTest, promptId: e.target.value, variants: next})
              }}>
                <option value="">选择一个已发布的 Prompt</option>
                {publishedPrompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* 组别 */}
            {selectedPrompt && (
              <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>实验组别</div>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={addVariant}>
                    <Plus size={12} /> 添加组别
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {newTest.variants.map((v, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${VARIANT_COLORS[idx % VARIANT_COLORS.length]}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: VARIANT_COLORS[idx % VARIANT_COLORS.length], marginBottom: 6 }}>{v.label}</div>
                        <select style={{ width: '100%', fontSize: 13 }} value={v.versionId} onChange={e => updateVariant(idx, 'versionId', e.target.value)}>
                          <option value="">选择版本</option>
                          {selectedPrompt.versions.map(ver => <option key={ver.id} value={ver.id}>v{ver.versionNumber} - {ver.changeNote}</option>)}
                        </select>
                      </div>
                      <div style={{ width: 70, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>流量</div>
                        <input type="number" min={1} max={99} value={v.trafficPercent} onChange={e => updateVariant(idx, 'trafficPercent', Number(e.target.value))} style={{ width: 56, textAlign: 'center', fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>%</span>
                      </div>
                      {idx > 0 && newTest.variants.length > 2 && (
                        <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--text-tertiary)' }} onClick={() => removeVariant(idx)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                  流量合计: {newTest.variants.reduce((s, v) => s + (v.trafficPercent || 0), 0)}%
                </div>
              </div>
            )}

            {/* 实验时间 */}
            <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>实验时间</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>开始时间（可选）</label>
                  <input type="datetime-local" style={{ width: '100%' }} value={newTest.startTime} onChange={e => setNewTest({...newTest, startTime: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>结束时间（可选）</label>
                  <input type="datetime-local" style={{ width: '100%' }} value={newTest.endTime} onChange={e => setNewTest({...newTest, endTime: e.target.value})} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>不填则手动控制启停</div>
            </div>

            {/* 目标人群 */}
            <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>目标人群</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>用户类型</label>
                  <select style={{ width: '100%' }} value={newTest.userType} onChange={e => setNewTest({...newTest, userType: e.target.value})}>
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
                        <input type="checkbox" checked={newTest.countryTier.includes(val)} onChange={e => {
                          const next = e.target.checked ? [...newTest.countryTier, val] : newTest.countryTier.filter(v => v !== val)
                          setNewTest({...newTest, countryTier: next})
                        }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>不勾选则全部</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-tertiary)' }}>用户性别</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[['male', '男'], ['female', '女'], ['non-binary', '非二元']].map(([val, label]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={newTest.gender.includes(val)} onChange={e => {
                          const next = e.target.checked ? [...newTest.gender, val] : newTest.gender.filter(v => v !== val)
                          setNewTest({...newTest, gender: next})
                        }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>不勾选则全部</div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Pause Confirm */}
      {showPauseConfirm && pausingTest && (() => {
        const pausePrompt = prompts.find(p => p.id === pausingTest.promptId)
        const controlVariant = pausingTest.variants?.[0]
        const controlVer = controlVariant?.versionId ? pausePrompt?.versions?.find(v => v.id === controlVariant.versionId) : null
        const versionLabel = controlVer ? `v${controlVer.versionNumber}` : '对照组版本'
        return (
          <ConfirmDialog
            title="确认暂停"
            message={`暂停后，线上将全量使用对照组 (A) 的 Prompt（${versionLabel}）。确认暂停 "${pausingTest.name}"？`}
            confirmLabel="确认暂停"
            variant="danger"
            onConfirm={handlePauseConfirm}
            onCancel={() => { setShowPauseConfirm(false); setPausingTest(null) }}
          />
        )
      })()}

      {/* Complete Modal */}
      {showCompleteModal && completingTest && (() => {
        const ctPrompt = prompts.find(p => p.id === completingTest.promptId)
        return (
          <Modal title="结束 AB 测试" onClose={() => { setShowCompleteModal(false); setCompletingTest(null) }} footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowCompleteModal(false); setCompletingTest(null) }}>取消</button>
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
                  {(completingTest.variants || []).map((v, i) => {
                    const ver = ctPrompt?.versions?.find(ver => ver.id === v.versionId)
                    return (
                      <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: completeForm.winner === v.id ? 'var(--bg-selected)' : 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer', borderLeft: `3px solid ${VARIANT_COLORS[i % VARIANT_COLORS.length]}` }}>
                        <input type="radio" name="winner" value={v.id} checked={completeForm.winner === v.id} onChange={() => setCompleteForm({ ...completeForm, winner: v.id })} style={{ accentColor: VARIANT_COLORS[i % VARIANT_COLORS.length] }} />
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
                      <input type="radio" name="deployMode" value={val} checked={completeForm.deployMode === val} onChange={() => setCompleteForm({ ...completeForm, deployMode: val })} />
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
        )
      })()}
    </div>
  )
}
