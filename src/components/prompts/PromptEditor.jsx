import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Send, ArrowLeft, Trash2, RotateCcw, Eye, Code, Plus, GitCompare, X, Power, PowerOff } from 'lucide-react'
import Header from '../layout/Header'
import StatusBadge from '../shared/StatusBadge'
import TagInput from '../shared/TagInput'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import { usePrompts } from '../../hooks/usePrompts'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useToast } from '../shared/Toast'
import { useAppContext } from '../../context/AppContext'
import { extractVariables, renderPrompt } from '../../utils/variableParser'
import { formatDateTime, formatRelativeTime } from '../../utils/dateFormatter'
import './prompts.css'
import '../shared/shared.css'

export default function PromptEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useAppContext()
  const {
    getPromptById, createPrompt, saveDraft, publishPrompt,
    createDraftEntry, saveDraftEntry, deleteDraftEntry,
    goOffline, rollbackPrompt, pushToEnvironment, promoteCanary, rollbackCanary, deletePrompt, hasDraftChanges
  } = usePrompts()
  const { addLog } = useAuditLog()
  const toast = useToast()

  const isEdit = !!id
  const existingPrompt = isEdit ? getPromptById(id) : null

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Chat')
  const [subCategory, setSubCategory] = useState('')
  const [tags, setTags] = useState([])

  // Left panel selection
  const [selectedItemId, setSelectedItemId] = useState(null) // null = editing current/new
  const [selectedItemType, setSelectedItemType] = useState(null) // 'draft' | 'version' | null
  const [editingDraftId, setEditingDraftId] = useState(null) // the draft entry being edited
  const [showCompare, setShowCompare] = useState(false)

  // UI state
  const [previewValues, setPreviewValues] = useState({})
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false)
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false)
  const [publishNote, setPublishNote] = useState('')
  const [publishDraftId, setPublishDraftId] = useState(null)
  const [showCanaryModal, setShowCanaryModal] = useState(false)
  const [canaryVersionId, setCanaryVersionId] = useState(null)
  const [canaryMode, setCanaryMode] = useState('canary') // 'canary' | 'full'
  const [canaryUserIds, setCanaryUserIds] = useState('')
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [showABBlockConfirm, setShowABBlockConfirm] = useState(false)

  // Detected variables
  const variables = useMemo(() => extractVariables(content), [content])

  const draftCount = existingPrompt?.drafts?.length || 0
  const isViewingVersion = selectedItemType === 'version'
  const isEditable = !isViewingVersion

  // Whether the prompt has been published at least once (not in initial draft state)
  const isPublished = existingPrompt && existingPrompt.status !== 'draft'

  // Whether the prompt has a running AB test (blocks offline + push to prod)
  const hasRunningABTest = !!(id && state?.abTests?.some(t => t.promptId === id && t.status === 'running'))

  // Compute display status: ab_testing > canary_online > full_online
  const displayStatus = existingPrompt
    ? (hasRunningABTest ? 'ab_testing'
      : existingPrompt.status === 'online' ? (existingPrompt.environments?.prod?.canary ? 'canary_online' : 'full_online')
      : existingPrompt.status)
    : 'draft'

  // Initialize form from existing prompt
  useEffect(() => {
    if (existingPrompt) {
      setName(existingPrompt.name)
      setDescription(existingPrompt.description)
      setContent(existingPrompt.content)
      setCategory(existingPrompt.category)
      setSubCategory(existingPrompt.subCategory || '')
      setTags(existingPrompt.tags || [])
    }
  }, [existingPrompt?.id])

  if (!state) return null

  const categories = state.categories || []
  const subCategories = state.subCategories || {}

  // Select a draft → load into editor
  function handleSelectDraft(draft) {
    setSelectedItemId(draft.id)
    setSelectedItemType('draft')
    setEditingDraftId(draft.id)
    setShowCompare(false)
    // Load draft content into form
    setName(draft.name !== '未命名草稿' ? draft.name : existingPrompt?.name || '')
    setDescription(draft.description || existingPrompt?.description || '')
    setContent(draft.content)
    setCategory(draft.category || existingPrompt?.category || 'Chat')
    setSubCategory(draft.subCategory || existingPrompt?.subCategory || '')
    setTags(draft.tags || existingPrompt?.tags || [])
  }

  // Select a version → show read-only
  function handleSelectVersion(ver) {
    setSelectedItemId(ver.id)
    setSelectedItemType('version')
    setEditingDraftId(null)
    setShowCompare(false)
    // Load version content for display
    setContent(ver.content)
    setName(existingPrompt?.name || '')
    setDescription(ver.changeNote || '')
  }

  // Select "current content" → load published content into editor
  function handleSelectCurrent() {
    setSelectedItemId(null)
    setSelectedItemType(null)
    setEditingDraftId(null)
    setShowCompare(false)
    if (existingPrompt) {
      setName(existingPrompt.name)
      setDescription(existingPrompt.description)
      setContent(existingPrompt.content)
      setCategory(existingPrompt.category)
      setSubCategory(existingPrompt.subCategory || '')
      setTags(existingPrompt.tags || [])
    }
  }

  // Save
  function handleSave() {
    if (!isEdit) {
      // Create new prompt as draft
      const newPrompt = createPrompt({ name, description, content, category, subCategory, tags })
      addLog({ action: 'create', promptId: newPrompt.id, promptName: name, details: `创建了新 Prompt "${name}"（草稿）` })
      toast('已保存为草稿')
      navigate(`/prompts/${newPrompt.id}/edit`, { replace: true })
      return
    }

    if (existingPrompt.status === 'draft') {
      // Draft-status prompt: save directly
      saveDraft(id, { name, description, content, category, subCategory, tags })
      addLog({ action: 'edit', promptId: id, promptName: name, details: `编辑了 Prompt "${name}"` })
      toast('已保存')
      return
    }

    // Published/online/offline prompt
    if (editingDraftId) {
      // Update existing draft entry
      saveDraftEntry(id, editingDraftId, { name, description, content, category, subCategory, tags })
      addLog({ action: 'edit', promptId: id, promptName: name, details: `更新了草稿 "${name}"` })
      toast('草稿已更新')
    } else {
      // Auto-create new draft entry
      const draftName = name || '未命名草稿'
      const newDraft = createDraftEntry(id, {
        name: draftName,
        content,
        description,
        category,
        subCategory,
        tags,
      })
      setEditingDraftId(newDraft.id)
      setSelectedItemId(newDraft.id)
      setSelectedItemType('draft')
      addLog({ action: 'edit', promptId: id, promptName: name, details: `自动保存为新草稿` })
      toast('已保存为新草稿')
    }
  }

  // Publish
  function handlePublish() {
    if (!isEdit) {
      const editorContent = { name, description, content, category, subCategory, tags }
      const newPrompt = createPrompt(editorContent)
      publishPrompt(newPrompt.id, publishNote, '', editorContent)
      addLog({ action: 'publish', promptId: newPrompt.id, promptName: name, details: `发布了 Prompt "${name}"` })
      toast('已发布')
      navigate(`/prompts/${newPrompt.id}/edit`, { replace: true })
    } else if (publishDraftId) {
      // Publishing a specific draft from the list
      publishPrompt(id, publishDraftId, publishNote)
      addLog({ action: 'publish', promptId: id, promptName: name, details: `从草稿发布了新版本` })
      toast('已发布新版本')
      // If the published draft was being edited, reset to current
      if (editingDraftId === publishDraftId) {
        setEditingDraftId(null)
      }
      setSelectedItemId(null)
      setSelectedItemType(null)
      // Reload published content
      const updated = getPromptById(id)
      if (updated) {
        setContent(updated.content)
        setName(updated.name)
        setDescription(updated.description)
        setCategory(updated.category)
        setSubCategory(updated.subCategory || '')
        setTags(updated.tags || [])
      }
    } else if (editingDraftId) {
      // Publishing from the editor with a draft loaded
      const editorContent = { name, description, content, category, subCategory, tags }
      saveDraftEntry(id, editingDraftId, editorContent)
      publishPrompt(id, editingDraftId, publishNote, editorContent)
      addLog({ action: 'publish', promptId: id, promptName: name, details: `发布了 "${name}" 新版本` })
      toast('已发布新版本')
      setEditingDraftId(null)
      setSelectedItemId(null)
      setSelectedItemType(null)
      const updated = getPromptById(id)
      if (updated) {
        setContent(updated.content)
        setName(updated.name)
        setDescription(updated.description)
      }
    } else {
      // Publish current editor content directly
      const editorContent = { name, description, content, category, subCategory, tags }
      saveDraft(id, editorContent)
      publishPrompt(id, publishNote, '', editorContent)
      addLog({ action: 'publish', promptId: id, promptName: name, details: `发布了 "${name}" 新版本` })
      toast('已发布新版本')
    }
    setShowPublishConfirm(false)
    setPublishNote('')
    setPublishDraftId(null)
  }

  // Create new draft from current editor content
  function handleCreateDraft() {
    if (!isEdit) return
    const draftName = window.prompt('草稿名称：', name ? `${name} 的草稿` : '新草稿')
    if (!draftName) return
    const newDraft = createDraftEntry(id, { name: draftName, content, description, category, subCategory, tags })
    setEditingDraftId(newDraft.id)
    setSelectedItemId(newDraft.id)
    setSelectedItemType('draft')
    addLog({ action: 'edit', promptId: id, promptName: name, details: `创建了新草稿 "${draftName}"` })
    toast('已创建新草稿')
  }

  // Create draft from a version
  function handleCreateDraftFromVersion(ver) {
    const draftName = window.prompt('草稿名称：', `基于 v${ver.versionNumber} 的草稿`)
    if (!draftName) return
    const newDraft = createDraftEntry(id, {
      name: draftName,
      content: ver.content,
      description: existingPrompt?.description || '',
      category: existingPrompt?.category || 'Chat',
      subCategory: existingPrompt?.subCategory || '',
      tags: existingPrompt?.tags || [],
    })
    handleSelectDraft(newDraft)
    addLog({ action: 'edit', promptId: id, promptName: name, details: `基于 v${ver.versionNumber} 创建了新草稿` })
    toast('已基于此版本创建草稿')
  }

  // Delete draft entry
  function handleDeleteDraft() {
    if (!selectedItemId || selectedItemType !== 'draft') return
    deleteDraftEntry(id, selectedItemId)
    addLog({ action: 'edit', promptId: id, promptName: name, details: '删除了一个草稿' })
    toast('草稿已删除')
    handleSelectCurrent()
    setShowDeleteDraftConfirm(false)
  }

  // Go offline
  function handleGoOffline() {
    goOffline(id)
    addLog({ action: 'env_push', promptId: id, promptName: name, details: `将 "${name}" 下线` })
    toast('已下线')
    setShowOfflineConfirm(false)
  }

  // Rollback
  function handleRollback(versionId) {
    rollbackPrompt(id, versionId)
    addLog({ action: 'rollback', promptId: id, promptName: name, details: `回滚了 "${name}"` })
    toast('已回滚')
    handleSelectCurrent()
  }

  // Push to environment (optionally with a specific versionId)
  function handlePushToEnv(env, versionId) {
    if (env === 'prod') {
      if (hasRunningABTest) {
        setShowABBlockConfirm(true)
        return
      }
      setCanaryVersionId(versionId)
      setCanaryMode('canary')
      setCanaryUserIds('')
      setShowCanaryModal(true)
      return
    }
    pushToEnvironment(id, env, versionId)
    const ver = versionId ? (existingPrompt?.versions || []).find(v => v.id === versionId) : null
    const verLabel = ver ? ` v${ver.versionNumber}` : ''
    addLog({ action: 'env_push', promptId: id, promptName: name, details: `推送 "${name}"${verLabel} 到测试环境` })
    toast(`已推送${verLabel}到测试环境`)
  }

  function handleCanaryConfirm() {
    const ver = canaryVersionId ? (existingPrompt?.versions || []).find(v => v.id === canaryVersionId) : null
    const verLabel = ver ? ` v${ver.versionNumber}` : ''
    if (canaryMode === 'canary') {
      const ids = canaryUserIds.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean)
      if (ids.length === 0) return
      pushToEnvironment(id, 'prod', canaryVersionId, { canary: true, userIds: ids })
      addLog({ action: 'env_push', promptId: id, promptName: name, details: `灰度推送 "${name}"${verLabel} 到生产环境（${ids.length}人）` })
      toast(`已灰度推送${verLabel}到生产环境（${ids.length}人）`)
    } else {
      pushToEnvironment(id, 'prod', canaryVersionId)
      addLog({ action: 'env_push', promptId: id, promptName: name, details: `全量推送 "${name}"${verLabel} 到生产环境` })
      toast(`已全量推送${verLabel}到生产环境`)
    }
    setShowCanaryModal(false)
  }

  function handlePromoteCanary() {
    if (hasRunningABTest) { setShowABBlockConfirm(true); return }
    const canary = existingPrompt?.environments?.prod?.canary
    const ver = canary?.versionId ? (existingPrompt?.versions || []).find(v => v.id === canary.versionId) : null
    const verLabel = ver ? ` v${ver.versionNumber}` : ''
    promoteCanary(id)
    addLog({ action: 'env_push', promptId: id, promptName: name, details: `全量推送 "${name}"${verLabel}（从灰度提升）` })
    toast(`已全量推送${verLabel}`)
  }

  function handleRollbackCanary() {
    if (hasRunningABTest) { setShowABBlockConfirm(true); return }
    rollbackCanary(id)
    addLog({ action: 'env_push', promptId: id, promptName: name, details: `回退 "${name}" 灰度发布` })
    toast('已回退灰度')
  }

  // Delete prompt
  function handleDelete() {
    deletePrompt(id)
    addLog({ action: 'archive', promptId: id, promptName: name, details: `删除了 "${name}"` })
    toast('已删除')
    navigate('/')
  }

  // Preview
  const previewOutput = renderPrompt(content, previewValues)

  // Map versionId → [{ groupLabel, variantLabel, ended }] for AB tests
  const abTestVersionMap = useMemo(() => {
    if (!id || !state?.abTests) return new Map()
    const map = new Map()
    state.abTests
      .filter(t => t.promptId === id && (t.status === 'running' || t.status === 'completed'))
      .forEach(test => {
        const ended = test.status === 'completed'
        test.variants?.forEach((variant, idx) => {
          if (variant.versionId) {
            if (!map.has(variant.versionId)) map.set(variant.versionId, [])
            const letter = String.fromCharCode(65 + idx)
            const isWinner = ended && test.results?.winner === variant.id
            map.get(variant.versionId).push({
              groupLabel: ended ? `AB-${letter}组(已结束)` : `AB-${letter}组`,
              variantLabel: variant.label + (isWinner ? ' (胜出)' : ''),
              ended,
              isWinner,
            })
          }
        })
      })
    return map
  }, [id, state?.abTests])

  // Compute "active" versions for the top section of the left panel
  const topVersions = useMemo(() => {
    if (!existingPrompt) return []
    const items = []
    const addedIds = new Set()

    const prodVerId = existingPrompt.environments?.prod?.versionId
    const canaryVerId = existingPrompt.environments?.prod?.canary?.versionId

    // 1. Prod full version
    if (prodVerId) {
      const ver = existingPrompt.versions?.find(v => v.id === prodVerId)
      if (ver) { items.push(ver); addedIds.add(ver.id) }
    }

    // 2. Canary version
    if (canaryVerId && !addedIds.has(canaryVerId)) {
      const ver = existingPrompt.versions?.find(v => v.id === canaryVerId)
      if (ver) { items.push(ver); addedIds.add(ver.id) }
    }

    // 3. Running AB test versions
    if (state?.abTests) {
      state.abTests
        .filter(t => t.promptId === id && t.status === 'running')
        .forEach(test => {
          test.variants?.forEach(variant => {
            if (variant.versionId && !addedIds.has(variant.versionId)) {
              const ver = existingPrompt.versions?.find(v => v.id === variant.versionId)
              if (ver) { items.push(ver); addedIds.add(ver.id) }
            }
          })
        })
    }

    return items
  }, [existingPrompt, id, state?.abTests])

  const hasActiveVersions = topVersions.length > 0

  // Get all tags for a version (supports multiple)
  function getVersionTags(ver) {
    if (!existingPrompt) return []
    const tags = []

    const isProdVersion = existingPrompt.environments?.prod?.versionId === ver.id
    const isCanaryVersion = existingPrompt.environments?.prod?.canary?.versionId === ver.id

    // AB test groups for this version
    const abEntries = abTestVersionMap.get(ver.id) || []
    const hasRunningAB = abEntries.some(entry => !entry.ended)

    // Deployment status
    // 全量线上 / 灰度线上 are each mutually exclusive with running AB test tags
    // but 全量线上 and 灰度线上 can coexist (on different versions)
    if (isProdVersion && !hasRunningAB) {
      tags.push({ label: '全量线上', className: 'online' })
    } else if (isCanaryVersion && !hasRunningAB) {
      tags.push({ label: '灰度线上', className: 'canary' })
    } else if (ver.prodDeployedAt && !isProdVersion && !isCanaryVersion) {
      const offlineLabel = ver.prodDeployType === 'canary' ? '已下线(灰度)' : '已下线(全量)'
      tags.push({ label: offlineLabel, className: 'was-online' })
    }

    // Latest published version (not yet in prod)
    if (ver.id === existingPrompt.currentVersionId && !isProdVersion) {
      tags.push({ label: '已发布', className: 'published' })
    }

    // AB test groups
    abEntries.forEach(entry => {
      tags.push({
        label: entry.groupLabel,
        title: entry.variantLabel,
        className: entry.ended ? 'abtest-ended' : 'abtest',
      })
    })

    return tags
  }

  // Get selected version for read-only view
  const selectedVersion = isViewingVersion && existingPrompt
    ? (existingPrompt.versions || []).find(v => v.id === selectedItemId)
    : null

  return (
    <>
      <Header title={isEdit ? existingPrompt?.name || '编辑 Prompt' : '新建 Prompt'} subtitle={isEdit ? existingPrompt?.description : '创建一个新的 Prompt'}>
        <button className="btn btn-ghost" onClick={() => {
          if (!isEdit && (name || description || content)) {
            setShowBackConfirm(true)
          } else {
            navigate(isEdit ? `/prompts/${id}` : '/')
          }
        }}>
          <ArrowLeft size={16} /> {isEdit ? '返回详情' : '返回'}
        </button>
        {isEdit && (
          <button className="btn btn-ghost" onClick={() => navigate(`/prompts/${id}/test`)}>
            <Code size={16} /> API 测试
          </button>
        )}
        {isEditable && (
          <>
            <button className="btn btn-secondary" onClick={handleSave}>
              <Save size={16} /> 保存{isPublished && !editingDraftId ? '为草稿' : ''}
            </button>
            <button className="btn btn-success" onClick={() => { setPublishDraftId(editingDraftId); setShowPublishConfirm(true) }}>
              <Send size={16} /> 发布
            </button>
          </>
        )}
      </Header>

      {/* ===== New Prompt: simple editor without left panel ===== */}
      {!isEdit && (
        <div className="prompt-editor">
          <div className="prompt-editor-main">
            {renderEditorForm()}
          </div>
          <div className="prompt-editor-sidebar">
            {renderVariables()}
            {renderPreview()}
          </div>
        </div>
      )}

      {/* ===== Existing Prompt: unified 3-column layout ===== */}
      {isEdit && existingPrompt && (
        <div className="prompt-editor-unified">
          {/* Left: Draft/Version List */}
          <div className="draft-list">
            {/* Top section: active versions or latest version */}
            {hasActiveVersions ? (
              topVersions.map(ver => {
                const verTags = getVersionTags(ver)
                const isCurrent = ver.id === existingPrompt.currentVersionId
                const isSelected = isCurrent
                  ? (selectedItemId === null && selectedItemType === null)
                  : (selectedItemId === ver.id && selectedItemType === 'version')
                return (
                  <div
                    key={`top-${ver.id}`}
                    className={`draft-item${isSelected ? ' active' : ''}`}
                    onClick={() => isCurrent ? handleSelectCurrent() : handleSelectVersion(ver)}
                  >
                    <div className="draft-item-header">
                      <span className="draft-item-name">v{ver.versionNumber}</span>
                      {verTags.map((tag, i) => (
                        <span key={i} className={`draft-item-tag ${tag.className}`} title={tag.title || tag.label}>{tag.label}</span>
                      ))}
                    </div>
                    <div className="draft-item-meta">{ver.changeNote}</div>
                  </div>
                )
              })
            ) : existingPrompt.versions?.length > 0 ? (
              (() => {
                const currentVer = existingPrompt.versions.find(v => v.id === existingPrompt.currentVersionId) || existingPrompt.versions[0]
                const currentTags = currentVer ? getVersionTags(currentVer) : []
                return (
                  <div
                    className={`draft-item${selectedItemId === null && selectedItemType === null ? ' active' : ''}`}
                    onClick={handleSelectCurrent}
                  >
                    <div className="draft-item-header">
                      <span className="draft-item-name">v{currentVer.versionNumber}</span>
                      {currentTags.map((tag, i) => (
                        <span key={i} className={`draft-item-tag ${tag.className}`} title={tag.title || tag.label}>{tag.label}</span>
                      ))}
                    </div>
                    <div className="draft-item-meta">{formatRelativeTime(existingPrompt.updatedAt)}更新</div>
                  </div>
                )
              })()
            ) : (
              <div
                className={`draft-item${selectedItemId === null && selectedItemType === null ? ' active' : ''}`}
                onClick={handleSelectCurrent}
              >
                <div className="draft-item-header">
                  <span className="draft-item-name">{existingPrompt.name || '未命名 Prompt'}</span>
                  <span className="draft-item-tag draft">草稿</span>
                </div>
                <div className="draft-item-meta">{formatRelativeTime(existingPrompt.updatedAt)}更新</div>
              </div>
            )}

            {/* Drafts section */}
            {(isPublished || draftCount > 0) && (
              <>
                <div className="draft-section-title">
                  未发布草稿 ({draftCount})
                  <button className="draft-section-add" onClick={handleCreateDraft} title="新建草稿">
                    <Plus size={12} />
                  </button>
                </div>
                {draftCount > 0 ? (existingPrompt.drafts || []).map(draft => (
                  <div
                    key={draft.id}
                    className={`draft-item${selectedItemId === draft.id && selectedItemType === 'draft' ? ' active' : ''}`}
                    onClick={() => handleSelectDraft(draft)}
                  >
                    <div className="draft-item-header">
                      <span className="draft-item-name">{draft.name}</span>
                      <span className="draft-item-tag draft">草稿</span>
                    </div>
                    <div className="draft-item-meta">{formatRelativeTime(draft.updatedAt)}更新</div>
                  </div>
                )) : (
                  <div className="draft-item-empty">暂无草稿</div>
                )}
              </>
            )}

            {/* Versions section */}
            {existingPrompt.versions?.length > 0 && (
              <>
                <div className="draft-section-title" style={{ marginTop: 12 }}>
                  已发布版本 ({existingPrompt.versions.length})
                </div>
                {existingPrompt.versions.map(ver => (
                  <div
                    key={ver.id}
                    className={`draft-item${selectedItemId === ver.id && selectedItemType === 'version' ? ' active' : ''}`}
                    onClick={() => handleSelectVersion(ver)}
                  >
                    <div className="draft-item-header">
                      <span className="draft-item-name">v{ver.versionNumber}</span>
                      {getVersionTags(ver).map((tag, i) => (
                        <span key={i} className={`draft-item-tag ${tag.className}`} title={tag.title || tag.label}>{tag.label}</span>
                      ))}
                    </div>
                    <div className="draft-item-meta">{ver.changeNote}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Middle + Right: Editor or Read-only View */}
          {isViewingVersion && selectedVersion ? (() => {
            const versionVars = extractVariables(selectedVersion.content)
            const versionPreview = renderPrompt(selectedVersion.content, previewValues)
            return (
            /* ---- Read-only version view ---- */
            <div className="prompt-editor">
              <div className="prompt-editor-main">
                {/* Version header + actions */}
                <div className="card" style={{ padding: 20 }}>
                  <div className="version-viewer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>v{selectedVersion.versionNumber}</span>
                      {getVersionTags(selectedVersion).map((tag, i) => (
                        <span key={i} className={`draft-item-tag ${tag.className}`} title={tag.title || tag.label}>{tag.label}</span>
                      ))}
                    </div>
                    <div className="version-viewer-meta">
                      <span>{formatDateTime(selectedVersion.createdAt)}</span>
                      <span>{selectedVersion.author}</span>
                      {selectedVersion.changeNote && <span>{selectedVersion.changeNote}</span>}
                    </div>
                  </div>

                  <div className="version-viewer-actions">
                    {selectedVersion.id !== existingPrompt.currentVersionId && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleRollback(selectedVersion.id)}>
                        <RotateCcw size={12} /> 回滚到此版本
                      </button>
                    )}
                    <button className="btn btn-sm btn-secondary" onClick={() => handleCreateDraftFromVersion(selectedVersion)}>
                      <Plus size={12} /> 基于此版本创建草稿
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowCompare(!showCompare)}>
                      <GitCompare size={12} /> {showCompare ? '关闭对比' : '与当前版对比'}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handlePushToEnv('test', selectedVersion.id)}>
                      推送到测试
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => handlePushToEnv('prod', selectedVersion.id)}>
                      <Power size={14} /> 推送到生产（上线）
                    </button>
                  </div>
                </div>

                {/* Name + Description (read-only, current prompt values) */}
                <div className="card" style={{ padding: 20 }}>
                  <div className="form-group">
                    <label className="form-label">名称</label>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{existingPrompt.name}</div>
                  </div>
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">描述</label>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{existingPrompt.description || '—'}</div>
                  </div>
                </div>

                {/* Content or Compare */}
                <div className="card" style={{ padding: 20 }}>
                  <label className="form-label">Prompt 内容</label>
                  {showCompare ? (
                    <div className="compare-grid" style={{ marginTop: 8 }}>
                      <div className="compare-column">
                        <span className={`compare-label ${existingPrompt.status === 'online' ? 'online' : 'published'}`}>
                          当前内容
                        </span>
                        <div className="compare-content">{existingPrompt.content}</div>
                      </div>
                      <div className="compare-column">
                        <span className="compare-label history">v{selectedVersion.versionNumber}</span>
                        <div className="compare-content has-changes">{selectedVersion.content}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="detail-content" style={{ marginTop: 8 }}>{selectedVersion.content}</div>
                  )}
                </div>
              </div>

              <div className="prompt-editor-sidebar">
                {/* Variables */}
                <div className="card" style={{ padding: 16 }}>
                  <span className="form-label">检测到的变量 ({versionVars.length})</span>
                  <div className="variable-list" style={{ marginTop: 8 }}>
                    {versionVars.length > 0 ? versionVars.map(v => (
                      <span key={v} className="variable-chip">{`{{${v}}}`}</span>
                    )) : (
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>无变量</span>
                    )}
                  </div>
                </div>

                {/* Preview */}
                <div className="card" style={{ padding: 16 }}>
                  <span className="form-label"><Eye size={14} style={{ verticalAlign: -2, marginRight: 4 }} />快速预览</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {versionVars.map(v => (
                      <div key={v} className="form-group">
                        <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{v}</label>
                        <input
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          value={previewValues[v] || ''}
                          onChange={e => setPreviewValues(prev => ({ ...prev, [v]: e.target.value }))}
                          placeholder={`输入 ${v} 的值`}
                        />
                      </div>
                    ))}
                  </div>
                  {selectedVersion.content && (
                    <div className="preview-output">{versionPreview}</div>
                  )}
                </div>
              </div>
            </div>
            )
          })() : (
            /* ---- Editable editor ---- */
            <div className="prompt-editor">
              <div className="prompt-editor-main">
                {/* Draft banner */}
                {editingDraftId && (
                  <div className="editing-draft-banner">
                    <span>正在编辑草稿：{(existingPrompt?.drafts || []).find(d => d.id === editingDraftId)?.name || '未命名草稿'}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => setShowDeleteDraftConfirm(true)}>
                        <Trash2 size={12} /> 删除此草稿
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={handleSelectCurrent}>
                        <X size={12} /> 退出
                      </button>
                    </div>
                  </div>
                )}
                {renderEditorForm()}
              </div>
              <div className="prompt-editor-sidebar">
                {renderStatusCard()}
                {renderVariables()}
                {renderPreview()}
                {isEdit && (
                  <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={16} /> 删除 Prompt
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Dialogs ===== */}
      {showPublishConfirm && (
        <Modal title="发布新版本" onClose={() => { setShowPublishConfirm(false); setPublishDraftId(null) }} footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowPublishConfirm(false); setPublishDraftId(null) }}>取消</button>
            <button className="btn btn-success" onClick={handlePublish}><Send size={14} /> 确认发布</button>
          </>
        }>
          {publishDraftId && (
            <p style={{ fontSize: 13, color: 'var(--accent-primary)', marginBottom: 12 }}>
              从草稿发布：{(existingPrompt?.drafts || []).find(d => d.id === publishDraftId)?.name || '当前编辑内容'}
            </p>
          )}
          <div className="form-group">
            <label className="form-label">版本说明（可选）</label>
            <input className="form-input" value={publishNote} onChange={e => setPublishNote(e.target.value)} placeholder="描述本次变更内容..." />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>发布后将生成新版本，并可推送到测试/生产环境。</p>
        </Modal>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog title="确认删除" message={`确定要删除 "${existingPrompt?.name || name}" 吗？此操作不可撤销。`} confirmLabel="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />
      )}

      {showDeleteDraftConfirm && (
        <ConfirmDialog title="删除草稿" message="确定要删除这个草稿吗？此操作不可撤销。" confirmLabel="删除" variant="danger" onConfirm={handleDeleteDraft} onCancel={() => setShowDeleteDraftConfirm(false)} />
      )}

      {showOfflineConfirm && (
        <ConfirmDialog title="确认下线" message={`确定要将 "${existingPrompt?.name}" 从生产环境下线吗？下线后线上将不再使用此 Prompt。`} confirmLabel="下线" variant="danger" onConfirm={handleGoOffline} onCancel={() => setShowOfflineConfirm(false)} />
      )}

      {showCanaryModal && (() => {
        const ver = canaryVersionId ? (existingPrompt?.versions || []).find(v => v.id === canaryVersionId) : null
        return (
          <Modal title="推送到生产环境" onClose={() => setShowCanaryModal(false)} footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowCanaryModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCanaryConfirm} disabled={canaryMode === 'canary' && !canaryUserIds.trim()}>
                <Power size={14} /> 确认推送
              </button>
            </>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ver && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  版本：<strong>v{ver.versionNumber}</strong> — {ver.changeNote}
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>发布方式</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label className={`canary-radio-card${canaryMode === 'canary' ? ' active' : ''}`}>
                    <input type="radio" name="canaryMode" value="canary" checked={canaryMode === 'canary'} onChange={() => setCanaryMode('canary')} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>灰度发布</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>先推送给白名单用户验证</div>
                    </div>
                  </label>
                  <label className={`canary-radio-card${canaryMode === 'full' ? ' active' : ''}`}>
                    <input type="radio" name="canaryMode" value="full" checked={canaryMode === 'full'} onChange={() => setCanaryMode('full')} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>全量发布</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>直接推送给所有用户</div>
                    </div>
                  </label>
                </div>
              </div>
              {canaryMode === 'canary' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>白名单用户ID</label>
                  <textarea
                    style={{ width: '100%', minHeight: 80, fontSize: 13, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                    value={canaryUserIds}
                    onChange={e => setCanaryUserIds(e.target.value)}
                    placeholder="每行一个或逗号分隔，例如：&#10;uid_001, uid_002, uid_003"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    仅白名单用户将使用新版本，其他用户继续使用当前版本
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )
      })()}

      {showBackConfirm && (
        <ConfirmDialog
          title="确认离开"
          message="当前页面有未保存的内容，确定要离开吗？"
          confirmLabel="离开"
          variant="danger"
          onConfirm={() => navigate('/')}
          onCancel={() => setShowBackConfirm(false)}
        />
      )}

      {showABBlockConfirm && (
        <ConfirmDialog
          title="无法推送生产"
          message="该 Prompt 正在进行 AB 实验，无法推送到生产环境。请先结束 AB 实验，再进行推送操作。"
          confirmLabel="我知道了"
          variant="danger"
          onConfirm={() => setShowABBlockConfirm(false)}
          onCancel={() => setShowABBlockConfirm(false)}
        />
      )}
    </>
  )

  // ===== Render helpers =====

  function renderEditorForm() {
    return (
      <>
        <div className="card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">名称</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Prompt 名称" />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">描述</label>
            <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="简要描述这个 Prompt 的用途" />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">分类</label>
              <select className="form-input" value={category} onChange={e => { setCategory(e.target.value); setSubCategory('') }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">子分类</label>
              <select className="form-input" value={subCategory} onChange={e => setSubCategory(e.target.value)}>
                <option value="">选择子分类</option>
                {(subCategories[category] || []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">标签</label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Prompt 内容 <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>（使用 {'{{变量名}}'} 插入变量）</span></label>
            <textarea className="prompt-textarea" value={content} onChange={e => setContent(e.target.value)} placeholder={'在这里编写 Prompt 内容...\n\n使用 {{变量名}} 语法插入变量，例如：\n你好 {{username}}，欢迎来到 {{product}}！'} />
          </div>
        </div>
      </>
    )
  }

  function renderStatusCard() {
    if (!isEdit || !existingPrompt) return null
    if (editingDraftId) {
      return (
        <div className="card" style={{ padding: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>
          草稿只有在发布后才可以推到线上或者测试环境
        </div>
      )
    }
    const prodData = existingPrompt.environments?.prod
    const canary = prodData?.canary
    const SOURCE_LABELS = { db: 'DB', hardcode: 'Hardcode', function: 'Function' }
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="form-label" style={{ margin: 0 }}>状态</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusBadge status={displayStatus} />
            {draftCount > 0 && <span className="draft-indicator">{draftCount} 个草稿</span>}
          </div>
        </div>

        {/* AB test running notice */}
        {hasRunningABTest && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: 8, fontSize: 12, color: '#7c3aed' }}>
            AB 实验进行中，暂不可下线或推送生产
          </div>
        )}

        {/* Only operational controls here, no push-to-env */}
        {existingPrompt.status === 'online' && !hasRunningABTest && (
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowOfflineConfirm(true)}>
              <PowerOff size={14} /> 下线
            </button>
          </div>
        )}

        {/* Environment status */}
        {existingPrompt.environments && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['dev', 'test', 'prod'].map(env => {
              const envData = existingPrompt.environments[env]
              const version = envData?.versionId ? existingPrompt.versions?.find(v => v.id === envData.versionId) : null
              if (env === 'prod' && canary) {
                const canaryVer = existingPrompt.versions?.find(v => v.id === canary.versionId)
                return (
                  <div key={env} className="canary-env-row">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="env-badge prod">PROD</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {version && <span style={{ color: 'var(--text-tertiary)' }}>v{version.versionNumber} 全量</span>}
                        <span className="canary-badge">v{canaryVer?.versionNumber || '?'} 灰度中 ({canary.userIds.length}人)</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }} onClick={handlePromoteCanary}>
                        全量推送
                      </button>
                      <button className="btn btn-sm btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }} onClick={handleRollbackCanary}>
                        回退灰度
                      </button>
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
        )}

        {/* Source type */}
        {existingPrompt.sourceType && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>代码位置</span>
            <span className={`source-badge source-${existingPrompt.sourceType}`}>{SOURCE_LABELS[existingPrompt.sourceType] || existingPrompt.sourceType}</span>
          </div>
        )}
      </div>
    )
  }

  function renderVariables() {
    return (
      <div className="card" style={{ padding: 16 }}>
        <span className="form-label">检测到的变量 ({variables.length})</span>
        <div className="variable-list" style={{ marginTop: 8 }}>
          {variables.length > 0 ? variables.map(v => (
            <span key={v} className="variable-chip">{`{{${v}}}`}</span>
          )) : (
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>在内容中使用 {'{{变量名}}'} 添加变量</span>
          )}
        </div>
      </div>
    )
  }

  function renderPreview() {
    return (
      <div className="card" style={{ padding: 16 }}>
        <span className="form-label"><Eye size={14} style={{ verticalAlign: -2, marginRight: 4 }} />快速预览</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {variables.map(v => (
            <div key={v} className="form-group">
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{v}</label>
              <input
                style={{ fontSize: 12, padding: '4px 8px' }}
                value={previewValues[v] || ''}
                onChange={e => setPreviewValues(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={`输入 ${v} 的值`}
              />
            </div>
          ))}
        </div>
        {content && (
          <div className="preview-output">{previewOutput}</div>
        )}
      </div>
    )
  }
}
