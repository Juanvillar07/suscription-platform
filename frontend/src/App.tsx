import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/RouteGuards'
import { AdminPage } from '@/pages/AdminPage'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { CheckoutResultPage } from '@/pages/CheckoutResultPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { HomePage } from '@/pages/HomePage'
import { PremiumPage } from '@/pages/PremiumPage'
import { PricingPage } from '@/pages/PricingPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="pricing" element={<PricingPage />} />

        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="checkout/result" element={<CheckoutResultPage />} />
          <Route path="checkout/:planId" element={<CheckoutPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="premium" element={<PremiumPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
