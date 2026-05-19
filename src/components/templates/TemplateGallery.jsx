import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext, emptyState } from '../../context/AppContext'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import Header from '../layout/Header'
import EmptyState from '../shared/EmptyState'

const CATEGORIES = ['', '客服', '翻译', '内容生成', '代码', '分析']

export default function TemplateGallery() {
  const { state, dispatch } = useAppContext()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

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

  const templates = state.templates || []

  const filtered = templates.filter((tpl) => {
    if (search) {
      const q = search.toLowerCase()
      if (!tpl.name.toLowerCase().includes(q) && !tpl.description?.toLowerCase().includes(q)) return false
    }
    if (selectedCategory && tpl.category !== selectedCategory) return false
    return true
  })

  function handleUseTemplate(tpl) {
    navigate('/prompts/new', {
      state: {
        fromTemplate: true,
        templateId: tpl.id,
        name: tpl.name,
        description: tpl.description,
        content: tpl.content,
        category: tpl.category,
        tags: tpl.tags || [],
      }
    })
  }

  function handleClear() {
    setSearch('')
    setSelectedCategory('')
  }

  return (
    <div className="page">
      <Header title="Template Manager" subtitle={`共 ${templates.length} 个模板`} />

      <div className="table-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search description..."
        />
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => {}}>SEARCH</button>
        <button className="btn btn-secondary btn-sm" onClick={handleClear}>CLEAR</button>
      </div>

      {filtered.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Description</th>
              <th>Variables</th>
              <th>Usage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tpl) => (
              <tr key={tpl.id}>
                <td style={{ fontWeight: 500 }}>{tpl.name}</td>
                <td>
                  <span className="category-badge">{tpl.category}</span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{tpl.description?.slice(0, 80)}{tpl.description?.length > 80 ? '...' : ''}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{tpl.variables?.length || 0}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{tpl.usageCount}</td>
                <td>
                  <div className="actions-cell">
                    <span className="action-link preview" onClick={() => handleUseTemplate(tpl)}>USE</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState title="没有找到匹配的模板" description="尝试调整搜索条件或筛选类别" />
      )}
    </div>
  )
}
