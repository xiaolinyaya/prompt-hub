import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/idGenerator'

export function useAuditLog() {
  const { state, dispatch } = useAppContext()
  const logs = state?.auditLog || []

  function addLog({ action, promptId, promptName, details }) {
    const entry = {
      id: generateId('log'),
      timestamp: new Date().toISOString(),
      action,
      promptId,
      promptName,
      author: 'Lin',
      details,
    }
    dispatch({ type: 'ADD_AUDIT_LOG', payload: entry })
    return entry
  }

  function filterLogs({ action, promptId, search } = {}) {
    let filtered = logs
    if (action) filtered = filtered.filter((l) => l.action === action)
    if (promptId) filtered = filtered.filter((l) => l.promptId === promptId)
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.promptName?.toLowerCase().includes(s) ||
          l.details?.toLowerCase().includes(s) ||
          l.author?.toLowerCase().includes(s)
      )
    }
    return filtered
  }

  return { logs, addLog, filterLogs }
}
