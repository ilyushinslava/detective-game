import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n/context'
import { AuthProvider } from './contexts/AuthContext'
import { TvErrorBoundary } from './components/TvErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <TvErrorBoundary>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </TvErrorBoundary>,
)
