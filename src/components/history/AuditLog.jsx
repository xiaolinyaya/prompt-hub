import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext, emptyState } from '../../context/AppContext'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import Header from '../layout/Header'
import EmptyState from '../shared/EmptyState'
import { formatDateTime } from '../../utils/dateFormatter'

const ACTION_LABELS = {
  create: { label: 'Created', color: '#22c55e' },
  edit: { label: 'Edited', color: '#3b82f6' },
  publish: { label: 'Published', color: '#8b5cf6' },
  archive: { label: 'Archived', color: '#6b7280' },
  rollback: { label: 'Rollback', color: '#f59e0b' },
  ab_start: { label: 'AB Start', color: '#06b6d4' },
  ab_stop: { label: 'AB Stop', color: '#06b6d4' },
  env_push: { label: 'Env Push', color: '#ec4899' },
}

export default function AuditLog() {
  const { state, dispatch } = useAppContext()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

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

  const logs = state.auditLog || []

  const filtered = logs.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !log.promptName?.toLowerCase().includes(q) &&
        !log.details?.toLowerCase().includes(q) &&
        !log.author?.toLowerCase().includes(q)
      ) return false
    }
    return true
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  function handleClear() {
    setSearch('')
    setActionFilter('')
  }

  return (
    <div className="page">
      <Header title="Change History" subtitle={`共 ${logs.length} 条记录`} />

      <div className="table-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompt, details, author..."
        />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="create">创建</option>
          <option value="edit">编辑</option>
          <option value="publish">发布</option>
          <option value="archive">归档</option>
          <option value="rollback">回滚</option>
          <option value="ab_start">AB 开始</option>
          <option value="ab_stop">AB 结束</option>
          <option value="env_push">环境推送</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => {}}>SEARCH</button>
        <button className="btn btn-secondary btn-sm" onClick={handleClear}>CLEAR</button>
      </div>

      {filtered.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Prompt</th>
              <th>Details</th>
              <th>Author</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280' }
              return (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>{formatDateTime(log.timestamp)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      background: `${actionInfo.color}15`,
                      color: actionInfo.color,
                    }}>
                      {actionInfo.label}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => navigate(`/prompts/${log.promptId}`)}
                    >
                      {log.promptName}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{log.details}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{log.author}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <EmptyState title="没有找到匹配的记录" description="尝试调整搜索条件" />
      )}
    </div>
  )
}
