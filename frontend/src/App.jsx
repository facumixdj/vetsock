import SalesHistory from './pages/SalesHistory'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import Admin from './pages/Admin'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Cash from './pages/Cash'
import Alerts from './pages/Alerts'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

      </Route>

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route path="/products" element={<Products />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/sales/history" element={<SalesHistory />} />
      <Route path="/cash" element={<Cash />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

export default App
