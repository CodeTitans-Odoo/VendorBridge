import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary: '#0284c7', secondary: '#e0f2fe' } },
            error: {
              style: {
                background: '#fff1f2',
                color: '#be123c',
                border: '1px solid #fecdd3',
              },
            },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected — all wrapped in the DashboardPage shell */}
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/vendors" element={<ProtectedRoute><DashboardPage page="vendors" /></ProtectedRoute>} />
          <Route path="/rfqs" element={<ProtectedRoute><DashboardPage page="rfqs" /></ProtectedRoute>} />
          <Route path="/quotations" element={<ProtectedRoute><DashboardPage page="quotations" /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute><DashboardPage page="purchase-orders" /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><DashboardPage page="invoices" /></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute><DashboardPage page="approvals" /></ProtectedRoute>} />
          <Route path="/workflows" element={<ProtectedRoute><DashboardPage page="workflows" /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute><DashboardPage page="logs" /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><DashboardPage page="users" /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><DashboardPage page="analytics" /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><DashboardPage page="analytics" /></ProtectedRoute>} />

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <div className="glass-card p-10 text-center max-w-md">
                  <p className="text-4xl mb-4">🚫</p>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                  <p className="text-gray-500 text-sm">You don't have permission to view this page.</p>
                </div>
              </div>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}
