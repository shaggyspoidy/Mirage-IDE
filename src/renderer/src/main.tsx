import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { useTheme } from './hooks/useTheme'

/**
 * RootWrapper applies the useTheme hook which must run within a React component
 * to access the Zustand store, but needs to sit above the rest of the app.
 */
function RootWrapper() {
  useTheme()
  return <App />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>
)
