import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './components/shared/Toast'
import Layout from './components/layout/Layout'
import HomePage from './components/home/HomePage'
import PromptHubLayout from './components/layout/PromptHubLayout'
import PromptList from './components/prompts/PromptList'
import PromptDetail from './components/prompts/PromptDetail'
import PromptEditor from './components/prompts/PromptEditor'
import ABTestList from './components/ab-test/ABTestList'
import ABTestDetail from './components/ab-test/ABTestDetail'
import AuditLog from './components/history/AuditLog'
import APITestPanel from './components/api-tester/APITestPanel'

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter basename="/prompt-hub">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route element={<PromptHubLayout />}>
                <Route index element={<PromptList />} />
                <Route path="prompts/new" element={<PromptEditor />} />
                <Route path="prompts/:id" element={<PromptDetail />} />
                <Route path="prompts/:id/edit" element={<PromptEditor />} />
                <Route path="prompts/:id/test" element={<APITestPanel />} />
                <Route path="ab-tests" element={<ABTestList />} />
                <Route path="ab-tests/:id" element={<ABTestDetail />} />
                <Route path="history" element={<AuditLog />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  )
}
