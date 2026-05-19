import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/idGenerator'
import { extractVariables } from '../utils/variableParser'

export function useTemplates() {
  const { state, dispatch } = useAppContext()
  const templates = state?.templates || []

  function createTemplate(data) {
    const now = new Date().toISOString()
    const template = {
      id: generateId('tpl'),
      name: data.name,
      description: data.description || '',
      content: data.content || '',
      variables: extractVariables(data.content),
      category: data.category || '',
      tags: data.tags || [],
      usageCount: 0,
      createdAt: now,
    }
    dispatch({ type: 'ADD_TEMPLATE', payload: template })
    return template
  }

  function deleteTemplate(id) {
    dispatch({ type: 'DELETE_TEMPLATE', payload: id })
  }

  function incrementUsage(id) {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    dispatch({ type: 'UPDATE_TEMPLATE', payload: { ...tpl, usageCount: tpl.usageCount + 1 } })
  }

  return { templates, createTemplate, deleteTemplate, incrementUsage }
}
