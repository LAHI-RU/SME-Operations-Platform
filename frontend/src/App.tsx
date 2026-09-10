import { DesignSystemPreview } from './pages/DesignSystemPreview'
import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { navigationItems } from './lib/navigation'
import { ModulePreview, NotFoundPage } from './pages/WorkspacePages'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { useEffect } from 'react'
import { authStore } from './lib/api'
import { AuthGate } from './features/auth/AuthGate'
import { LoginPage } from './features/auth/LoginPage'
import { CapabilityGate } from './features/auth/CapabilityGate'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductDetailPage } from './features/products/ProductDetailPage'
import { ProductFormPage, EditProductPage } from './features/products/ProductFormPage'

function App() {
  useEffect(() => { void authStore.restore() }, [])
  return (
    <QueryClientProvider client={queryClient}><Routes>
      <Route element={<AuthGate guest />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
      <Route element={<AuthGate />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="design-system" element={<DesignSystemPreview />} />
          <Route path="products" element={<CapabilityGate capability="products.view"><ProductsPage /></CapabilityGate>} />
          <Route path="products/new" element={<CapabilityGate capability="products.create"><ProductFormPage /></CapabilityGate>} />
          <Route path="products/:productId" element={<CapabilityGate capability="products.view"><ProductDetailPage /></CapabilityGate>} />
          <Route path="products/:productId/edit" element={<CapabilityGate capability="products.update"><EditProductPage /></CapabilityGate>} />
          {navigationItems.filter((item) => !['/dashboard', '/design-system', '/products'].includes(item.path)).map((item) => (
            <Route key={item.path} path={item.path} element={<CapabilityGate capability={item.capability}><ModulePreview item={item} /></CapabilityGate>} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes></QueryClientProvider>
  )
}

export default App
