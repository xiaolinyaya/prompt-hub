import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/idGenerator'
import { extractVariables } from '../utils/variableParser'

/**
 * Prompt Status Machine:
 *   draft      → 草稿态（未发布）
 *   published  → 已发布，线上未运行
 *   online     → 已发布，线上运行中
 *   offline    → 已下线
 *
 * Data model (multi-draft):
 *   content      = last published version content
 *   drafts[]     = array of draft entries (each with id, name, content, etc.)
 */
export function usePrompts() {
  const { state, dispatch } = useAppContext()
  const prompts = state?.prompts || []

  function getPromptById(id) {
    return prompts.find((p) => p.id === id) || null
  }

  function createPrompt(data) {
    const now = new Date().toISOString()
    const variables = extractVariables(data.content)
    const prompt = {
      id: generateId('p'),
      name: data.name || '未命名 Prompt',
      description: data.description || '',
      content: data.content || '',
      drafts: [],
      variables,
      tags: data.tags || [],
      category: data.category || 'Chat',
      subCategory: data.subCategory || '',
      status: 'draft',
      currentVersionId: null,
      versions: [],
      environments: {
        dev: { versionId: null, deployedAt: null },
        test: { versionId: null, deployedAt: null },
        prod: { versionId: null, deployedAt: null },
      },
      createdAt: now,
      updatedAt: now,
    }
    dispatch({ type: 'ADD_PROMPT', payload: prompt })
    return prompt
  }

  // Save edits directly to the prompt (for draft-status prompts)
  function saveDraft(id, updates) {
    const prompt = getPromptById(id)
    if (!prompt) return null
    const now = new Date().toISOString()

    if (prompt.status === 'draft') {
      const variables = updates.content
        ? extractVariables(updates.content)
        : prompt.variables
      const updated = {
        ...prompt,
        ...updates,
        variables,
        updatedAt: now,
      }
      dispatch({ type: 'UPDATE_PROMPT', payload: updated })
      return updated
    }

    // For non-draft prompts, save edits directly too (backwards compat)
    const variables = updates.content
      ? extractVariables(updates.content)
      : prompt.variables
    const updated = {
      ...prompt,
      ...updates,
      variables,
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  function updatePrompt(id, updates) {
    return saveDraft(id, updates)
  }

  // Create a new draft entry in the drafts[] array
  function createDraftEntry(promptId, data) {
    const prompt = getPromptById(promptId)
    if (!prompt) return null
    const now = new Date().toISOString()
    const draftId = generateId('d')
    const newDraft = {
      id: draftId,
      name: data.name || '未命名草稿',
      content: data.content || '',
      description: data.description || '',
      category: data.category || prompt.category,
      subCategory: data.subCategory || prompt.subCategory || '',
      tags: data.tags || prompt.tags || [],
      createdAt: now,
      updatedAt: now,
    }
    const updated = {
      ...prompt,
      drafts: [...(prompt.drafts || []), newDraft],
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return newDraft
  }

  // Save changes to an existing draft entry
  function saveDraftEntry(promptId, draftId, data) {
    const prompt = getPromptById(promptId)
    if (!prompt) return null
    const now = new Date().toISOString()
    const updated = {
      ...prompt,
      drafts: (prompt.drafts || []).map((d) =>
        d.id === draftId
          ? { ...d, ...data, updatedAt: now }
          : d
      ),
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  // Delete a draft entry
  function deleteDraftEntry(promptId, draftId) {
    const prompt = getPromptById(promptId)
    if (!prompt) return null
    const now = new Date().toISOString()
    const updated = {
      ...prompt,
      drafts: (prompt.drafts || []).filter((d) => d.id !== draftId),
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  // Publish: creates a new version from a specific draft entry (or from current content)
  // If draftId is provided, publish that draft and remove it from drafts[]
  // If contentOverride is provided, publish that content directly (for unsaved editor content)
  function publishPrompt(id, draftIdOrNote = '', changeNote = '', contentOverride = null) {
    const prompt = getPromptById(id)
    if (!prompt) return null
    const now = new Date().toISOString()
    const newVersionId = generateId('v')

    // Determine what to publish
    let publishContent, publishName, publishDescription, publishCategory, publishSubCategory, publishTags
    let note = changeNote
    let draftToRemove = null

    // Check if draftIdOrNote is a draft ID
    const draftEntry = (prompt.drafts || []).find((d) => d.id === draftIdOrNote)
    if (contentOverride) {
      // Use provided content directly (editor state)
      publishContent = contentOverride.content
      publishName = contentOverride.name || prompt.name
      publishDescription = contentOverride.description || prompt.description
      publishCategory = contentOverride.category || prompt.category
      publishSubCategory = contentOverride.subCategory || prompt.subCategory
      publishTags = contentOverride.tags || prompt.tags
      note = changeNote || (draftEntry ? '' : draftIdOrNote)
      if (draftEntry) draftToRemove = draftEntry.id
    } else if (draftEntry) {
      publishContent = draftEntry.content
      publishName = draftEntry.name !== '未命名草稿' ? draftEntry.name : prompt.name
      publishDescription = draftEntry.description || prompt.description
      publishCategory = draftEntry.category || prompt.category
      publishSubCategory = draftEntry.subCategory || prompt.subCategory
      publishTags = draftEntry.tags || prompt.tags
      draftToRemove = draftEntry.id
      if (!note) note = changeNote || draftIdOrNote
    } else {
      // draftIdOrNote is actually the changeNote (backwards compat)
      publishContent = prompt.content
      publishName = prompt.name
      publishDescription = prompt.description
      publishCategory = prompt.category
      publishSubCategory = prompt.subCategory
      publishTags = prompt.tags
      note = draftIdOrNote || changeNote
    }

    const variables = extractVariables(publishContent)
    const maxVersion = Math.max(...prompt.versions.map((v) => v.versionNumber), 0)

    const newVersion = {
      id: newVersionId,
      versionNumber: maxVersion + 1,
      content: publishContent,
      variables,
      createdAt: now,
      publishedAt: now,
      author: 'Lin',
      changeNote: note || `发布版本 ${maxVersion + 1}`,
    }

    const newStatus = prompt.status === 'online' ? 'online' : 'published'

    const updated = {
      ...prompt,
      name: publishName,
      description: publishDescription,
      content: publishContent,
      category: publishCategory,
      subCategory: publishSubCategory,
      tags: publishTags,
      variables,
      status: newStatus,
      currentVersionId: newVersionId,
      versions: [newVersion, ...prompt.versions],
      drafts: draftToRemove
        ? (prompt.drafts || []).filter((d) => d.id !== draftToRemove)
        : (prompt.drafts || []),
      environments: {
        ...prompt.environments,
        dev: { versionId: newVersionId, deployedAt: now },
      },
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  // Discard draft — now just an alias for deleteDraftEntry
  function discardDraft(id, draftId) {
    if (draftId) {
      return deleteDraftEntry(id, draftId)
    }
    return null
  }

  function goOffline(id) {
    const prompt = getPromptById(id)
    if (!prompt) return null
    const now = new Date().toISOString()
    const updated = {
      ...prompt,
      status: 'offline',
      environments: {
        ...prompt.environments,
        prod: { versionId: null, deployedAt: null },
      },
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  function archivePrompt(id) {
    return updatePrompt(id, { status: 'archived' })
  }

  function rollbackPrompt(id, targetVersionId) {
    const prompt = getPromptById(id)
    if (!prompt) return null
    const targetVersion = prompt.versions.find((v) => v.id === targetVersionId)
    if (!targetVersion) return null
    const now = new Date().toISOString()
    const newVersionId = generateId('v')
    const maxVersion = Math.max(...prompt.versions.map((v) => v.versionNumber), 0)
    const rollbackVersion = {
      id: newVersionId,
      versionNumber: maxVersion + 1,
      content: targetVersion.content,
      variables: targetVersion.variables,
      createdAt: now,
      publishedAt: now,
      author: 'Lin',
      changeNote: `回滚至版本 ${targetVersion.versionNumber}`,
    }
    const updated = {
      ...prompt,
      content: targetVersion.content,
      variables: targetVersion.variables,
      currentVersionId: newVersionId,
      versions: [rollbackVersion, ...prompt.versions],
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  function pushToEnvironment(id, env, versionId, options) {
    const prompt = getPromptById(id)
    if (!prompt) return null
    const now = new Date().toISOString()
    const targetVersionId = versionId || prompt.currentVersionId

    // Canary (whitelist) deploy to prod
    if (env === 'prod' && options?.canary && options?.userIds?.length > 0) {
      const updated = {
        ...prompt,
        versions: prompt.versions.map(v => v.id === targetVersionId && !v.prodDeployedAt
          ? { ...v, prodDeployedAt: now, prodDeployType: 'canary' }
          : v),
        environments: {
          ...prompt.environments,
          prod: {
            ...prompt.environments.prod,
            canary: {
              versionId: targetVersionId,
              userIds: options.userIds,
              deployedAt: now,
            },
          },
        },
        updatedAt: now,
      }
      dispatch({ type: 'UPDATE_PROMPT', payload: updated })
      return updated
    }

    // Full deploy
    const newStatus = env === 'prod' ? 'online' : prompt.status
    const envData = { versionId: targetVersionId, deployedAt: now }
    const updatedVersions = env === 'prod'
      ? prompt.versions.map(v => v.id === targetVersionId && !v.prodDeployedAt ? { ...v, prodDeployedAt: now, prodDeployType: 'full' } : v)
      : prompt.versions
    const updated = {
      ...prompt,
      status: newStatus,
      versions: updatedVersions,
      environments: {
        ...prompt.environments,
        [env]: envData,
      },
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  function promoteCanary(id) {
    const prompt = getPromptById(id)
    if (!prompt) return null
    const canary = prompt.environments?.prod?.canary
    if (!canary) return null
    const now = new Date().toISOString()
    const updated = {
      ...prompt,
      status: 'online',
      versions: prompt.versions.map(v => v.id === canary.versionId
        ? { ...v, prodDeployedAt: v.prodDeployedAt || now, prodDeployType: 'full' }
        : v),
      environments: {
        ...prompt.environments,
        prod: { versionId: canary.versionId, deployedAt: now },
      },
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  function rollbackCanary(id) {
    const prompt = getPromptById(id)
    if (!prompt) return null
    const now = new Date().toISOString()
    const { canary, ...prodWithoutCanary } = prompt.environments?.prod || {}
    const updated = {
      ...prompt,
      environments: {
        ...prompt.environments,
        prod: prodWithoutCanary,
      },
      updatedAt: now,
    }
    dispatch({ type: 'UPDATE_PROMPT', payload: updated })
    return updated
  }

  function deletePrompt(id) {
    dispatch({ type: 'DELETE_PROMPT', payload: id })
  }

  function hasDraftChanges(prompt) {
    if (!prompt) return false
    return (prompt.drafts || []).length > 0
  }

  return {
    prompts,
    getPromptById,
    createPrompt,
    updatePrompt,
    saveDraft,
    publishPrompt,
    discardDraft,
    createDraftEntry,
    saveDraftEntry,
    deleteDraftEntry,
    goOffline,
    archivePrompt,
    rollbackPrompt,
    pushToEnvironment,
    promoteCanary,
    rollbackCanary,
    deletePrompt,
    hasDraftChanges,
  }
}
