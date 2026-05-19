import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAppContext, emptyState } from '../../context/AppContext'
import { usePrompts } from '../../hooks/usePrompts'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useToast } from '../shared/Toast'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import Header from '../layout/Header'
import StatusBadge from '../shared/StatusBadge'
import ConfirmDialog from '../shared/ConfirmDialog'
import EmptyState from '../shared/EmptyState'
import { formatRelativeTime } from '../../utils/dateFormatter'
import './prompts.css'

const CATEGORY_MAP = {
  Chat: 'chat',
  Visual: 'visual',
  Voice: 'voice',
  Moderation: 'moderation',
  Translation: 'translation',
}

export default function PromptList() {
  const { state, dispatch } = useAppContext()
  const { deletePrompt } = usePrompts()
  const { addLog } = useAuditLog()
  const toast = useToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

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

  const prompts = state.prompts || []
  const categories = state.categories || []
  const subCategories = state.subCategories || {}

  // Prompt IDs with running AB tests
  const abTestingPromptIds = new Set(
    (state.abTests || []).filter(t => t.status === 'running').map(t => t.promptId)
  )

  function getDisplayStatus(prompt) {
    if (abTestingPromptIds.has(prompt.id)) return 'ab_testing'
    if (prompt.status === 'online') {
      const hasCanary = !!prompt.environments?.prod?.canary
      return hasCanary ? 'canary_online' : 'full_online'
    }
    return prompt.status
  }

  const filteredPrompts = prompts.filter((prompt) => {
    if (search) {
      const q = search.toLowerCase()
      const matchName = prompt.name.toLowerCase().includes(q)
      const matchDesc = prompt.description?.toLowerCase().includes(q)
      const matchTags = prompt.tags?.some((tag) => tag.toLowerCase().includes(q))
      if (!matchName && !matchDesc && !matchTags) return false
    }
    if (selectedCategory && prompt.category !== selectedCategory) return false
    if (selectedSubCategory && prompt.subCategory !== selectedSubCategory) return false
    if (selectedStatus) {
      const displayStatus = getDisplayStatus(prompt)
      if (displayStatus !== selectedStatus) return false
    }
    return true
  })

  function handleClear() {
    setSearch('')
    setSelectedCategory('')
    setSelectedSubCategory('')
    setSelectedStatus('')
  }

  function handleDelete() {
    if (!deleteTarget) return
    deletePrompt(deleteTarget.id)
    addLog({ action: 'archive', promptId: deleteTarget.id, promptName: deleteTarget.name, details: `删除了 "${deleteTarget.name}"` })
    toast('已删除')
    setDeleteTarget(null)
  }

  return (
    <div className="page">
      <Header title="Prompt Manager" subtitle={`共 ${prompts.length} 个 Prompt`}>
        <button className="btn btn-primary" onClick={() => navigate('/prompts/new')}>
          <Plus size={16} />
          CREATE PROMPT
        </button>
      </Header>

      <div className="table-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or description..."
        />
        <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('') }}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)}>
          <option value="">All Sub-Categories</option>
          {(selectedCategory ? (subCategories[selectedCategory] || []) : Object.values(subCategories).flat()).map((sc) => (
            <option key={sc} value={sc}>{sc}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="full_online">全量线上</option>
          <option value="canary_online">灰度线上</option>
          <option value="ab_testing">AB实验中</option>
          <option value="offline">已下线</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => {}}>SEARCH</button>
        <button className="btn btn-secondary btn-sm" onClick={handleClear}>CLEAR</button>
      </div>

      {filteredPrompts.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Sub-Category</th>
              <th>Status</th>
              <th>Variables</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrompts.map((prompt) => (
              <tr key={prompt.id}>
                <td>
                  <div style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate(`/prompts/${prompt.id}`)}>
                    {prompt.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{prompt.description?.slice(0, 60)}{prompt.description?.length > 60 ? '...' : ''}</div>
                </td>
                <td>
                  <span className={`category-badge ${CATEGORY_MAP[prompt.category] || ''}`}>
                    {prompt.category}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{prompt.subCategory || '-'}</td>
                <td>
                  <StatusBadge status={getDisplayStatus(prompt)} />
                  {prompt.drafts?.length > 0 && <span className="draft-indicator">{prompt.drafts.length} 个草稿</span>}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{prompt.variables?.length || 0}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatRelativeTime(prompt.updatedAt)}</td>
                <td>
                  <div className="actions-cell">
                    <span className="action-link view" onClick={() => navigate(`/prompts/${prompt.id}`)}>VIEW</span>
                    <span className="action-link edit" onClick={() => navigate(`/prompts/${prompt.id}/edit`)}>EDIT</span>
                    <span className="action-link preview" onClick={() => navigate(`/prompts/${prompt.id}/test`)}>TEST</span>
                    <span className="action-link delete" onClick={() => setDeleteTarget(prompt)}>DELETE</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState title="没有找到匹配的 Prompt" description="尝试调整搜索条件或筛选器" />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除 "${deleteTarget.name}" 吗？此操作不可撤销。`}
          confirmLabel="删除"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
