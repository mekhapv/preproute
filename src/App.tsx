import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { TestListPage } from './pages/TestListPage'
import { TestPreviewPage } from './pages/TestPreviewPage'
import { useAuthStore } from './store/authStore'

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const token = useAuthStore((state) => state.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const token = useAuthStore((state) => state.token)

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <TestListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-creation"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-creation/questions"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-creation/preview"
        element={
          <ProtectedRoute>
            <TestPreviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={token ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  )
}

export default App
