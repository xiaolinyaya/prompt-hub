import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit3, Code } from 'lucide-react'
import Header from '../layout/Header'
import StatusBadge from '../shared/StatusBadge'
import { useAppContext, emptyState } from '../../context/AppContext'
import { usePrompts } from '../../hooks/usePrompts'
import { extractVariables } from '../../utils/variableParser'
import { formatDateTime } from '../../utils/dateFormatter'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import './prompts.css'
import '../shared/shared.css'

const CATEGORY_MAP = {
  Chat: 'chat',
  Visual: 'visual',
  Voice: 'voice',
  Moderation: 'moderation',
  Translation: 'translation',
}

export default function PromptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()
  const { getPromptById, hasDraftChanges } = usePrompts()

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

  const prompt = getPromptById(id)
  if (!prompt) {
    return (
      <div className="page">
        <Header title="Prompt Detail" />
        <div className="api-empty">Prompt 不存在或已被删除</div>
      </div>
    )
  }

  const variables = extractVariables(prompt.content)
  const isDraftDirty = hasDraftChanges(prompt)

  // Compute display status: ab_testing > canary_online > full_online
  const abTestingIds = new Set(
    (state.abTests || []).filter(t => t.status === 'running').map(t => t.promptId)
  )
  const displayStatus = abTestingIds.has(prompt.id) ? 'ab_testing'
    : prompt.status === 'online' ? (prompt.environments?.prod?.canary ? 'canary_online' : 'full_online')
    : prompt.status

  return (
    <>
      <Header title={prompt.name} subtitle={prompt.description}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> 返回
        </button>
        <button className="btn btn-primary" onClick={() => navigate(`/prompts/${id}/edit`)}>
          <Edit3 size={16} /> 编辑
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(`/prompts/${id}/test`)}>
          <Code size={16} /> API 测试
        </button>
      </Header>

      {/* Draft notice banner */}
      {isDraftDirty && (
        <div className="card detail-draft-notice">
          <span>此 Prompt 有 {prompt.drafts?.length || 0} 个未发布的草稿</span>
          <button onClick={() => navigate(`/prompts/${id}/edit`)}>
            前往草稿箱查看 →
          </button>
        </div>
      )}

      <div className="prompt-editor">
        {/* Left Column - Main Content */}
        <div className="prompt-editor-main">
          {/* Metadata */}
          <div className="card" style={{ padding: 20 }}>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span className="detail-meta-label">分类</span>
                <span className={`category-badge ${CATEGORY_MAP[prompt.category] || ''}`}>
                  {prompt.category}
                </span>
              </div>
              {prompt.subCategory && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">子分类</span>
                  <span className="detail-meta-value">{prompt.subCategory}</span>
                </div>
              )}
              <div className="detail-meta-item">
                <span className="detail-meta-label">创建时间</span>
                <span className="detail-meta-value">{formatDateTime(prompt.createdAt)}</span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">更新时间</span>
                <span className="detail-meta-value">{formatDateTime(prompt.updatedAt)}</span>
              </div>
            </div>
            {prompt.tags?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="detail-meta-label">标签</span>
                <div className="detail-tags">
                  {prompt.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prompt Content */}
          <div className="card" style={{ padding: 20 }}>
            <span className="form-label">Prompt 内容</span>
            <div className="detail-content">{prompt.content}</div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="prompt-editor-sidebar">
          {/* Status & Environment */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="form-label" style={{ margin: 0 }}>状态</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusBadge status={displayStatus} />
                {isDraftDirty && <span className="draft-indicator">有草稿</span>}
              </div>
            </div>
            {prompt.environments && (() => {
              const prodCanary = prompt.environments.prod?.canary
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['dev', 'test', 'prod'].map(env => {
                    const envData = prompt.environments[env]
                    const version = envData?.versionId ? prompt.versions?.find(v => v.id === envData.versionId) : null
                    if (env === 'prod' && prodCanary) {
                      const canaryVer = prompt.versions?.find(v => v.id === prodCanary.versionId)
                      return (
                        <div key={env} className="canary-env-row">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="env-badge prod">PROD</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              {version && <span style={{ color: 'var(--text-tertiary)' }}>v{version.versionNumber} 全量</span>}
                              <span className="canary-badge">v{canaryVer?.versionNumber || '?'} 灰度中 ({prodCanary.userIds.length}人)</span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={env} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <span className={`env-badge ${env}`}>{env.toUpperCase()}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>
                          {version ? `v${version.versionNumber}` : '未部署'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            {prompt.sourceType && (() => {
              const SOURCE_LABELS = { db: 'DB', hardcode: 'Hardcode', function: 'Function' }
              return (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>代码位置</span>
                  <span className={`source-badge source-${prompt.sourceType}`}>{SOURCE_LABELS[prompt.sourceType] || prompt.sourceType}</span>
                </div>
              )
            })()}
          </div>

          {/* Variables */}
          <div className="card" style={{ padding: 16 }}>
            <span className="form-label">变量 ({variables.length})</span>
            <div className="variable-list" style={{ marginTop: 8 }}>
              {variables.length > 0 ? variables.map(v => (
                <span key={v} className="variable-chip">{`{{${v}}}`}</span>
              )) : (
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>无变量</span>
              )}
            </div>
          </div>

          {/* Version History */}
          {prompt.versions?.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <span className="form-label">版本历史</span>
              <div className="version-list" style={{ marginTop: 8 }}>
                {prompt.versions.map((ver) => (
                  <div key={ver.id} className={`version-item${ver.id === prompt.currentVersionId ? ' version-current' : ''}`}>
                    <span className="version-number">v{ver.versionNumber}</span>
                    <div className="version-info">
                      <div className="version-note">{ver.changeNote}</div>
                      <div className="version-date">{formatDateTime(ver.createdAt)} · {ver.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
