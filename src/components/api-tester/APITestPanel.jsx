import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext, emptyState } from '../../context/AppContext'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import Header from '../layout/Header'
import { usePrompts } from '../../hooks/usePrompts'
import { useToast } from '../shared/Toast'
import { extractVariables, renderPrompt } from '../../utils/variableParser'
import { ArrowLeft, Play, Loader2, Copy } from 'lucide-react'
import './api-tester.css'

const MODELS = [
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'claude', name: 'Claude' },
  { id: 'general', name: '通用' },
]

const MOCK_RESPONSES = {
  default: '您好！我已经收到了您的请求并进行了处理。以下是根据您提供的信息生成的回复：\n\n根据当前的上下文和参数，我为您生成了一份详细的分析结果。主要发现如下：\n\n1. 输入内容已被正确解析并理解\n2. 各项参数均在正常范围内\n3. 建议根据具体业务场景进行微调\n\n如果您需要进一步的调整或有其他问题，请随时告诉我。',
  客服: '您好！感谢您的耐心等待。我已经仔细查看了您反馈的问题，以下是我的分析和建议：\n\n经过排查，我发现问题出在配置环节。建议您按以下步骤操作：\n1. 首先确认网络连接正常\n2. 清除浏览器缓存后重新尝试\n3. 如果问题仍然存在，我会为您升级处理\n\n请问还有其他需要帮助的吗？',
  推荐: '根据您的偏好和浏览历史，我为您精选了以下推荐：\n\n- 商品A：性价比极高，用户好评率95%\n- 商品B：新品上市，限时优惠中\n- 商品C：与您之前购买的商品搭配使用效果更佳\n\n以上推荐均在您的预算范围内，如需了解更多详情，请点击具体商品查看。',
  审核: '审核结果如下：\n\n判定：通过\n\n分析详情：\n- 违规词汇检查：未发现\n- 敏感信息检测：未发现涉及个人隐私或敏感分类的内容\n- 垃圾信息特征：未检测到典型垃圾信息模式\n\n综合评分：安全\n\n建议：内容符合当前审核级别的要求，可以正常发布。',
}

export default function APITestPanel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()
  const { getPromptById } = usePrompts()
  const toast = useToast()
  const [selectedModel, setSelectedModel] = useState('gpt-4')
  const [variableValues, setVariableValues] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [displayedText, setDisplayedText] = useState('')
  const [stats, setStats] = useState(null)
  const typingRef = useRef(null)

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

  useEffect(() => {
    return () => { if (typingRef.current) clearInterval(typingRef.current) }
  }, [])

  if (!state) return null

  const prompt = getPromptById(id)
  if (!prompt) {
    return (
      <div className="page">
        <Header title="API Test" />
        <div className="api-empty">Prompt 不存在或已被删除</div>
      </div>
    )
  }

  const variables = extractVariables(prompt.content)
  const renderedContent = renderPrompt(prompt.content, variableValues)

  function getMockResponse() {
    if (prompt.category === 'Chat' && prompt.subCategory === 'Conversation_style') return MOCK_RESPONSES['客服']
    if (prompt.category === 'Chat' && prompt.subCategory === 'Inspiration') return MOCK_RESPONSES['推荐']
    if (prompt.category === 'Moderation') return MOCK_RESPONSES['审核']
    return MOCK_RESPONSES.default
  }

  function handleSimulate() {
    if (isLoading) return
    setIsLoading(true)
    setResponse(null)
    setDisplayedText('')
    setStats(null)
    if (typingRef.current) clearInterval(typingRef.current)

    const latency = 800 + Math.round(Math.random() * 1200)
    setTimeout(() => {
      setIsLoading(false)
      const fullResponse = getMockResponse()
      setResponse(fullResponse)
      setStats({ latency, tokens: Math.round(fullResponse.length * 0.6) + Math.round(renderedContent.length * 0.5), model: selectedModel })

      let index = 0
      typingRef.current = setInterval(() => {
        index += 3
        if (index >= fullResponse.length) {
          setDisplayedText(fullResponse)
          clearInterval(typingRef.current)
        } else {
          setDisplayedText(fullResponse.slice(0, index))
        }
      }, 20)
    }, latency)
  }

  function handleCopy() {
    if (response) { navigator.clipboard.writeText(response); toast('已复制到剪贴板') }
  }

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={() => navigate(`/prompts/${id}`)}>
        <ArrowLeft size={16} /> 返回 Prompt
      </button>

      <Header title="API Simulation" subtitle={prompt.name} />

      <div className="api-grid">
        <div className="api-input-panel">
          <div className="card api-section">
            <h3 className="api-section-title">Prompt Content</h3>
            <pre className="api-prompt-preview">{renderedContent}</pre>
          </div>

          <div className="card api-section">
            <h3 className="api-section-title">Model</h3>
            <select className="api-model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {variables.length > 0 && (
            <div className="card api-section">
              <h3 className="api-section-title">Variables</h3>
              <div className="api-var-list">
                {variables.map((v) => (
                  <div key={v} className="api-var-item">
                    <label className="api-var-label">{`{{${v}}}`}</label>
                    <input type="text" value={variableValues[v] || ''} onChange={(e) => setVariableValues({...variableValues, [v]: e.target.value})} placeholder={`输入 ${v} 的值...`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary api-simulate-btn" onClick={handleSimulate} disabled={isLoading}>
            {isLoading ? <Loader2 size={16} className="api-spinner" /> : <Play size={16} />}
            {isLoading ? '调用中...' : '模拟调用'}
          </button>
        </div>

        <div className="card api-response-panel">
          <div className="api-response-header">
            <h3 className="api-section-title" style={{ margin: 0 }}>Response</h3>
            {response && (
              <button className="btn btn-sm btn-ghost" onClick={handleCopy}><Copy size={12} /> 复制</button>
            )}
          </div>

          <div className="api-response-body">
            {isLoading && (
              <div className="api-loading"><Loader2 size={16} className="api-spinner" /> 正在生成响应...</div>
            )}
            {!isLoading && !response && (
              <div className="api-placeholder">点击「模拟调用」查看响应结果</div>
            )}
            {displayedText && (
              <pre className="api-response-text">
                {displayedText}
                {displayedText.length < (response?.length || 0) && <span className="api-cursor">|</span>}
              </pre>
            )}
          </div>

          {stats && (
            <div className="api-stats">
              <span>模型: {stats.model}</span>
              <span>延迟: {stats.latency}ms</span>
              <span>Token: {stats.tokens}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
