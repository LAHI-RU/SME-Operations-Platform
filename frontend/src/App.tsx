const DesignSystemPreview = lazy(() =>
  import('./pages/DesignSystemPreview').then((module) => ({ default: module.DesignSystemPreview })),
)
import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { NotFoundPage } from './pages/WorkspacePages'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { lazy, Suspense, useEffect } from 'react'
import { authStore } from './lib/api'
import { AuthGate } from './features/auth/AuthGate'
import { LoginPage } from './features/auth/LoginPage'
import { CapabilityGate } from './features/auth/CapabilityGate'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductDetailPage } from './features/products/ProductDetailPage'
import { ProductFormPage, EditProductPage } from './features/products/ProductFormPage'

import { DirectoryList, DirectoryDetail, DirectoryForm } from './features/directory/DirectoryPages'
import { directoryKinds } from './features/operations/api'
import { InventoryPage, InventoryDetailPage } from './features/inventory/InventoryPages'
import { Toasts } from './components/ui/Toasts'
import { ApplicationBoundary } from './components/ui/ApplicationBoundary'
import { OrdersPage } from './features/orders/OrdersPage'
const OrderFormPage = lazy(() =>
  import('./features/orders/OrderFormPage').then((module) => ({ default: module.OrderFormPage })),
)
const OrderDetailPage = lazy(() =>
  import('./features/orders/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })),
)

function App() {
  useEffect(() => {
    void authStore.restore()
  }, [])
  return (
    <ApplicationBoundary>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route element={<AuthGate guest />}>
            <Route path="login" element={<LoginPage />} />
          </Route>
          <Route element={<AuthGate />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route
                path="design-system"
                element={
                  <Suspense fallback={<p role="status">Loading design system...</p>}>
                    <DesignSystemPreview />
                  </Suspense>
                }
              />
              <Route
                path="products"
                element={
                  <CapabilityGate capability="products.view">
                    <ProductsPage />
                  </CapabilityGate>
                }
              />
              <Route
                path="products/new"
                element={
                  <CapabilityGate capability="products.create">
                    <ProductFormPage />
                  </CapabilityGate>
                }
              />
              <Route
                path="products/:productId"
                element={
                  <CapabilityGate capability="products.view">
                    <ProductDetailPage />
                  </CapabilityGate>
                }
              />
              <Route
                path="products/:productId/edit"
                element={
                  <CapabilityGate capability="products.update">
                    <EditProductPage />
                  </CapabilityGate>
                }
              />
              {directoryKinds.flatMap((kind) => [
                <Route
                  key={kind}
                  path={kind}
                  element={
                    <CapabilityGate capability={`${kind}.view`}>
                      <DirectoryList kind={kind} />
                    </CapabilityGate>
                  }
                />,
                <Route
                  key={kind + '-new'}
                  path={kind + '/new'}
                  element={
                    <CapabilityGate capability={`${kind}.create`}>
                      <DirectoryForm key={kind} kind={kind} />
                    </CapabilityGate>
                  }
                />,
                <Route
                  key={kind + '-detail'}
                  path={kind + '/:recordId'}
                  element={
                    <CapabilityGate capability={`${kind}.view`}>
                      <DirectoryDetail kind={kind} />
                    </CapabilityGate>
                  }
                />,
                <Route
                  key={kind + '-edit'}
                  path={kind + '/:recordId/edit'}
                  element={
                    <CapabilityGate capability={`${kind}.update`}>
                      <DirectoryDetail kind={kind} edit />
                    </CapabilityGate>
                  }
                />,
              ])}
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/:productId" element={<InventoryDetailPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route
                path="orders/new"
                element={
                  <CapabilityGate capability="orders.create">
                    <Suspense fallback={<p role="status">Loading order workspace...</p>}>
                      <OrderFormPage />
                    </Suspense>
                  </CapabilityGate>
                }
              />
              <Route
                path="orders/:orderId"
                element={
                  <Suspense fallback={<p role="status">Loading order workspace...</p>}>
                    <OrderDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="fulfillment"
                element={
                  <CapabilityGate capability="fulfillment.start">
                    <OrdersPage key="fulfillment" mode="fulfillment" />
                  </CapabilityGate>
                }
              />
              <Route path="delivery" element={<OrdersPage key="delivery" mode="delivery" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
        <Toasts />
      </QueryClientProvider>
    </ApplicationBoundary>
  )
}

export default App
