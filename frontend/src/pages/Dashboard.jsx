import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function Dashboard() {
  const user = JSON.parse(
    localStorage.getItem('vetstock_user') || '{}'
  )

  const [cashSession, setCashSession] = useState(null)
  const [cashSummary, setCashSummary] = useState(null)

  const [lowStock, setLowStock] = useState(null)
  const [expiring, setExpiring] = useState(null)
  const [expired, setExpired] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        cashResult,
        lowStockResult,
        expiringResult,
        expiredResult,
      ] = await Promise.allSettled([
        api.get('/cash-sessions/current'),
        api.get('/alerts/low-stock'),
        api.get('/alerts/expiring?days=60'),
        api.get('/alerts/expired'),
      ])

      if (cashResult.status === 'fulfilled') {
        setCashSession(cashResult.value.data)

        try {
          const summary = await api.get(
            '/cash-movements/current/summary'
          )

          setCashSummary(summary.data)
        } catch {
          setCashSummary(null)
        }
      } else {
        setCashSession(null)
        setCashSummary(null)
      }

      if (lowStockResult.status === 'fulfilled') {
        setLowStock(lowStockResult.value.data)
      }

      if (expiringResult.status === 'fulfilled') {
        setExpiring(expiringResult.value.data)
      }

      if (expiredResult.status === 'fulfilled') {
        setExpired(expiredResult.value.data)
      }

    } catch {
      setError('No se pudo cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (value) => {
    const amount = Number(value || 0)

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="py-5 text-center">
        <div
          className="spinner-border text-primary"
          role="status"
        />

        <div className="mt-3 text-muted">
          Cargando dashboard...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">
            Inicio
          </h1>

          <p className="text-muted mb-0">
            Bienvenido, {user.full_name || user.username}
          </p>
        </div>

        <button
          className="btn btn-outline-secondary"
          onClick={loadDashboard}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small">
                    Caja
                  </div>

                  <div className="fs-4 fw-bold">
                    {cashSession ? 'Abierta' : 'Cerrada'}
                  </div>

                  {cashSummary && (
                    <div className="small text-muted mt-1">
                      {formatMoney(
                        cashSummary.theoretical_cash
                      )}
                    </div>
                  )}
                </div>

                <i className="bi bi-cash-stack fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small">
                    Stock bajo
                  </div>

                  <div className="fs-4 fw-bold">
                    {lowStock?.count ?? 0}
                  </div>
                </div>

                <i className="bi bi-box-seam fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small">
                    Por vencer
                  </div>

                  <div className="fs-4 fw-bold">
                    {expiring?.count ?? 0}
                  </div>
                </div>

                <i className="bi bi-clock-history fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small">
                    Vencidos
                  </div>

                  <div className="fs-4 fw-bold">
                    {expired?.count ?? 0}
                  </div>
                </div>

                <i className="bi bi-exclamation-octagon fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">
                  Estado de caja
                </h2>

                <Link
                  to="/cash"
                  className="btn btn-sm btn-outline-primary"
                >
                  Ver caja
                </Link>
              </div>

              {cashSession ? (
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <div className="text-muted small">
                      Apertura
                    </div>

                    <div className="fw-semibold">
                      {formatMoney(
                        cashSession.opening_amount
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="text-muted small">
                      Efectivo teórico
                    </div>

                    <div className="fw-semibold">
                      {formatMoney(
                        cashSummary?.theoretical_cash
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="text-muted small">
                      Estado
                    </div>

                    <span className="badge text-bg-success">
                      ABIERTA
                    </span>
                  </div>
                </div>
              ) : (
                <div className="alert alert-secondary mb-0">
                  No hay una caja abierta.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5">
                Accesos rápidos
              </h2>

              <div className="d-grid gap-2 mt-3">
                <Link
                  to="/sales"
                  className="btn btn-primary"
                >
                  <i className="bi bi-cart-plus me-2"></i>
                  Nueva venta
                </Link>

                <Link
                  to="/products"
                  className="btn btn-outline-secondary"
                >
                  <i className="bi bi-box-seam me-2"></i>
                  Ver stock
                </Link>

                <Link
                  to="/alerts"
                  className="btn btn-outline-warning"
                >
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Ver alertas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(lowStock?.count > 0 ||
        expiring?.count > 0 ||
        expired?.count > 0) && (
        <div className="card border-0 shadow-sm mt-3">
          <div className="card-body">
            <h2 className="h5 mb-3">
              Atención requerida
            </h2>

            <div className="d-flex flex-wrap gap-2">
              {lowStock?.count > 0 && (
                <span className="badge text-bg-warning fs-6">
                  {lowStock.count} con stock bajo
                </span>
              )}

              {expiring?.count > 0 && (
                <span className="badge text-bg-info fs-6">
                  {expiring.count} por vencer
                </span>
              )}

              {expired?.count > 0 && (
                <span className="badge text-bg-danger fs-6">
                  {expired.count} vencidos
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard