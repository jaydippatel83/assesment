import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CalculatePage } from './pages/CalculatePage'
import { HistoryPage } from './pages/HistoryPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { IllustrationPage } from './pages/IllustrationPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/calculate" element={<CalculatePage />} />
          <Route path="/illustration/:id" element={<IllustrationPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/calculate" replace />} />
      </Route>
    </Routes>
  )
}
