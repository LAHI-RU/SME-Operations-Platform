import { DesignSystemPreview } from './pages/DesignSystemPreview'
import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { navigationItems } from './lib/navigation'
import { DashboardPreview, ModulePreview, NotFoundPage } from './pages/WorkspacePages'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPreview />} />
        <Route path="design-system" element={<DesignSystemPreview />} />
        {navigationItems.filter((item) => !['/dashboard', '/design-system'].includes(item.path)).map((item) => (
          <Route key={item.path} path={item.path} element={<ModulePreview item={item} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
