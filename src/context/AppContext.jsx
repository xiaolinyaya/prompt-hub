import { createContext, useContext, useReducer, useEffect } from 'react'

const AppContext = createContext()

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_PROMPTS':
      return { ...state, prompts: action.payload }
    case 'ADD_PROMPT':
      return { ...state, prompts: [...state.prompts, action.payload] }
    case 'UPDATE_PROMPT':
      return {
        ...state,
        prompts: state.prompts.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      }
    case 'DELETE_PROMPT':
      return {
        ...state,
        prompts: state.prompts.filter((p) => p.id !== action.payload),
      }
    case 'SET_AB_TESTS':
      return { ...state, abTests: action.payload }
    case 'ADD_AB_TEST':
      return { ...state, abTests: [...state.abTests, action.payload] }
    case 'UPDATE_AB_TEST':
      return {
        ...state,
        abTests: state.abTests.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      }
    case 'DELETE_AB_TEST':
      return {
        ...state,
        abTests: state.abTests.filter((t) => t.id !== action.payload),
      }
    case 'ADD_AUDIT_LOG':
      return {
        ...state,
        auditLog: [action.payload, ...state.auditLog],
      }
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload }
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.payload] }
    case 'UPDATE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      }
    case 'DELETE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.filter((t) => t.id !== action.payload),
      }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload }
    case 'INIT_STATE':
      return action.payload
    default:
      return state
  }
}

const STORAGE_KEY = 'prompthub_data'
const DATA_VERSION_KEY = 'prompthub_data_version'
const CURRENT_DATA_VERSION = 10

const emptyState = {
  prompts: [],
  abTests: [],
  auditLog: [],
  templates: [],
  categories: ['Chat', 'Visual', 'Voice', 'Moderation', 'Translation'],
  subCategories: {
    Chat: ['System_prompt', 'Conversation_style', 'Inspiration', 'Character', 'Scene_control'],
    Visual: ['Image', 'Video', 'Image Generation', 'Image Editing', 'Style Transfer', 'OCR'],
    Voice: ['Voice_call', 'TTS', 'ASR', 'Voice Clone', 'Dialogue'],
    Moderation: ['Text', 'Image', 'Content Review', 'Spam Detection', 'Sensitive Info', 'Compliance'],
    Translation: ['General', 'Realtime', 'Document', 'Localization', 'Subtitle'],
  },
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, () => {
    try {
      const savedVersion = window.localStorage.getItem(DATA_VERSION_KEY)
      if (Number(savedVersion) !== CURRENT_DATA_VERSION) {
        window.localStorage.removeItem(STORAGE_KEY)
        window.localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION))
        return null
      }
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...emptyState, ...parsed, categories: emptyState.categories, subCategories: emptyState.subCategories }
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e)
    }
    return null
  })

  useEffect(() => {
    if (state) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        window.localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION))
      } catch (e) {
        console.warn('Failed to save state to localStorage:', e)
      }
    }
  }, [state])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

export { emptyState }
