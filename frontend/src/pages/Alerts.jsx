import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'


function Alerts() {
  const [lowStock, setLowStock] = useState([])
  const [expiring, setExpiring] = useState([])
  const [expired, setExpired] = useState([])

  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [activeTab, setActiveTab] = useState('low-stock')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  useEffect(() => {
    loadAlerts()
  }, [])


  const loadAlerts = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        lowStockResponse,
        expiringResponse,
        expiredResponse,
        productsResponse,
        suppliersResponse,
      ] = await Promise.all([
        api.get('/alerts/low-stock'),
        api.get('/alerts/expiring?days=60'),
        api.get('/alerts/expired'),
        api.get('/products/'),
        api.get('/suppliers/'),
      ])

      setLowStock(
        lowStockResponse.data.items ??
        lowStockResponse.data
      )

      setExpiring(
        expiringResponse.data.items ??
        expiringResponse.data
      )

      setExpired(
        expiredResponse.data.items ??
        expiredResponse.data
      )

      setProducts(productsResponse.data)
      setSuppliers(suppliersResponse.data)

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudieron cargar las alertas'
      )
    } finally {
      setLoading(false)
    }
  }


  const productName = (productId) => {
    const product = products.find(
      (item) => item.id === productId
    )

    return product?.name || `Producto #${productId}`
  }


  const productCode = (productId) => {
    const product = products.find(
      (item) => item.id === productId
    )

    return product?.code || '-'
  }


  const productUnit = (productId) => {
    const product = products.find(
      (item) => item.id === productId
    )

    return product?.stock_unit || 'UNIT'
  }


  const supplierName = (supplierId) => {
    if (!supplierId) {
      return '-'
    }

    const supplier = suppliers.find(
      (item) => item.id === supplierId
    )

    return supplier?.name || `Proveedor #${supplierId}`
  }


  const formatQuantity = (quantity, productId) => {
    const value = Number(quantity || 0)
    const unit = productUnit(productId)

    if (unit === 'GRAM') {
      if (value >= 1000) {
        return `${(value / 1000).toLocaleString(
          'es-AR',
          { maximumFractionDigits: 3 }
        )} kg`
      }

      return `${value.toLocaleString('es-AR')} g`
    }

    if (unit === 'ML') {
      if (value >= 1000) {
        return `${(value / 1000).toLocaleString(
          'es-AR',
          { maximumFractionDigits: 3 }
        )} L`
      }

      return `${value.toLocaleString('es-AR')} ml`
    }

    return `${value.toLocaleString('es-AR')} u.`
  }


  const formatDate = (value) => {
    if (!value) {
      return '-'
    }

    return new Intl.DateTimeFormat(
      'es-AR'
    ).format(new Date(value))
  }


  const daysUntil = (value) => {
    if (!value) {
      return null
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const target = new Date(value)
    target.setHours(0, 0, 0, 0)

    const diff =
      target.getTime() -
      today.getTime()

    return Math.ceil(
      diff / (1000 * 60 * 60 * 24)
    )
  }


  const filteredLowStock = useMemo(() => {
    const text = search.trim().toLowerCase()

    if (!text) {
      return lowStock
    }

    return lowStock.filter((item) => {
      const name =
        productName(item.product_id)
          .toLowerCase()

      const code =
        productCode(item.product_id)
          .toLowerCase()

      return (
        name.includes(text) ||
        code.includes(text)
      )
    })
  }, [lowStock, products, search])


  const filteredExpiring = useMemo(() => {
    const text = search.trim().toLowerCase()

    if (!text) {
      return expiring
    }

    return expiring.filter((item) => {
      const name =
        productName(item.product_id)
          .toLowerCase()

      const lot =
        String(item.lot_number || '')
          .toLowerCase()

      return (
        name.includes(text) ||
        lot.includes(text)
      )
    })
  }, [expiring, products, search])


  const filteredExpired = useMemo(() => {
    const text = search.trim().toLowerCase()

    if (!text) {
      return expired
    }

    return expired.filter((item) => {
      const name =
        productName(item.product_id)
          .toLowerCase()

      const lot =
        String(item.lot_number || '')
          .toLowerCase()

      return (
        name.includes(text) ||
        lot.includes(text)
      )
    })
  }, [expired, products, search])


  if (loading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border text-primary" />

        <div className="mt-3 text-muted">
          Cargando alertas...
        </div>
      </div>
    )
  }


  return (
    <div>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">

        <div>
          <h1 className="h3 mb-1">
            Alertas
          </h1>

          <p className="text-muted mb-0">
            Stock y vencimientos
          </p>
        </div>


        <button
          className="btn btn-outline-secondary"
          onClick={loadAlerts}
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


      <div className="row g-3 mb-4">

        <div className="col-12 col-md-4">
          <button
            className={`card border-0 shadow-sm w-100 text-start ${
              activeTab === 'low-stock'
                ? 'border border-warning'
                : ''
            }`}
            onClick={() =>
              setActiveTab('low-stock')
            }
          >
            <div className="card-body">

              <div className="d-flex justify-content-between">

                <div>
                  <div className="text-muted small">
                    Stock bajo
                  </div>

                  <div className="fs-3 fw-bold">
                    {lowStock.length}
                  </div>
                </div>

                <i className="bi bi-box-seam fs-2"></i>

              </div>

            </div>
          </button>
        </div>


        <div className="col-12 col-md-4">
          <button
            className={`card border-0 shadow-sm w-100 text-start ${
              activeTab === 'expiring'
                ? 'border border-info'
                : ''
            }`}
            onClick={() =>
              setActiveTab('expiring')
            }
          >
            <div className="card-body">

              <div className="d-flex justify-content-between">

                <div>
                  <div className="text-muted small">
                    Próximos a vencer
                  </div>

                  <div className="fs-3 fw-bold">
                    {expiring.length}
                  </div>
                </div>

                <i className="bi bi-clock-history fs-2"></i>

              </div>

            </div>
          </button>
        </div>


        <div className="col-12 col-md-4">
          <button
            className={`card border-0 shadow-sm w-100 text-start ${
              activeTab === 'expired'
                ? 'border border-danger'
                : ''
            }`}
            onClick={() =>
              setActiveTab('expired')
            }
          >
            <div className="card-body">

              <div className="d-flex justify-content-between">

                <div>
                  <div className="text-muted small">
                    Vencidos
                  </div>

                  <div className="fs-3 fw-bold">
                    {expired.length}
                  </div>
                </div>

                <i className="bi bi-exclamation-octagon fs-2"></i>

              </div>

            </div>
          </button>
        </div>

      </div>


      <div className="card border-0 shadow-sm mb-3">

        <div className="card-body">

          <div className="input-group">

            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>

            <input
              className="form-control"
              placeholder="Buscar producto o lote..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

          </div>

        </div>

      </div>


      {/* STOCK BAJO */}
      {activeTab === 'low-stock' && (

        <div className="card border-0 shadow-sm">

          <div className="card-body">

            <h2 className="h5 mb-3">
              Productos con stock bajo
            </h2>


            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Código</th>
                    <th className="text-end">
                      Stock actual
                    </th>
                    <th className="text-end">
                      Stock mínimo
                    </th>
                    <th>Estado</th>
                  </tr>
                </thead>


                <tbody>

                  {filteredLowStock.map((item) => (

                    <tr key={item.product_id}>

                      <td className="fw-semibold">
                        {productName(
                          item.product_id
                        )}
                      </td>

                      <td>
                        {productCode(
                          item.product_id
                        )}
                      </td>

                      <td className="text-end">
                        {formatQuantity(
                          item.total_stock ??
                          item.stock ??
                          0,
                          item.product_id
                        )}
                      </td>

                      <td className="text-end">
                        {formatQuantity(
                          item.minimum_stock ??
                          0,
                          item.product_id
                        )}
                      </td>

                      <td>
                        <span className="badge text-bg-warning">
                          Stock bajo
                        </span>
                      </td>

                    </tr>

                  ))}


                  {filteredLowStock.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center text-muted py-4"
                      >
                        No hay productos con stock bajo.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}


      {/* PRÓXIMOS A VENCER */}
      {activeTab === 'expiring' && (

        <div className="card border-0 shadow-sm">

          <div className="card-body">

            <h2 className="h5 mb-3">
              Lotes próximos a vencer
            </h2>


            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Proveedor</th>
                    <th>Vencimiento</th>
                    <th className="text-end">
                      Stock
                    </th>
                    <th>Tiempo</th>
                  </tr>
                </thead>


                <tbody>

                  {filteredExpiring.map((item) => {
                    const days =
                      daysUntil(
                        item.expiration_date
                      )

                    return (
                      <tr key={item.lot_id}>

                        <td className="fw-semibold">
                          {productName(
                            item.product_id
                          )}
                        </td>

                        <td>
                          {item.lot_number}
                        </td>

                        <td>
                          {supplierName(
                            item.supplier_id
                          )}
                        </td>

                        <td>
                          {formatDate(
                            item.expiration_date
                          )}
                        </td>

                        <td className="text-end">
                          {formatQuantity(
                            item.stock,
                            item.product_id
                          )}
                        </td>

                        <td>
                          <span className="badge text-bg-info">
                            {days === 0
                              ? 'Vence hoy'
                              : `${days} días`}
                          </span>
                        </td>

                      </tr>
                    )
                  })}


                  {filteredExpiring.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center text-muted py-4"
                      >
                        No hay lotes próximos a vencer.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}


      {/* VENCIDOS */}
      {activeTab === 'expired' && (

        <div className="card border-0 shadow-sm">

          <div className="card-body">

            <h2 className="h5 mb-3">
              Lotes vencidos
            </h2>


            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Proveedor</th>
                    <th>Vencimiento</th>
                    <th className="text-end">
                      Stock
                    </th>
                    <th>Estado</th>
                  </tr>
                </thead>


                <tbody>

                  {filteredExpired.map((item) => (

                    <tr key={item.lot_id}>

                      <td className="fw-semibold">
                        {productName(
                          item.product_id
                        )}
                      </td>

                      <td>
                        {item.lot_number}
                      </td>

                      <td>
                        {supplierName(
                          item.supplier_id
                        )}
                      </td>

                      <td>
                        {formatDate(
                          item.expiration_date
                        )}
                      </td>

                      <td className="text-end">
                        {formatQuantity(
                          item.stock,
                          item.product_id
                        )}
                      </td>

                      <td>
                        <span className="badge text-bg-danger">
                          Vencido
                        </span>
                      </td>

                    </tr>

                  ))}


                  {filteredExpired.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center text-muted py-4"
                      >
                        No hay lotes vencidos con stock.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default Alerts