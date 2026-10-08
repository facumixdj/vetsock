import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'


function SalesHistory() {
  const user = JSON.parse(
    localStorage.getItem('vetstock_user') || '{}'
  )

  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [selectedSale, setSelectedSale] = useState(null)

  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  useEffect(() => {
    loadData()
  }, [])


  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        salesResponse,
        productsResponse,
      ] = await Promise.all([
        api.get('/sales/'),
        api.get('/products/'),
      ])

      setSales(salesResponse.data)
      setProducts(productsResponse.data)

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo cargar el historial de ventas'
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


  const productUnit = (productId) => {
    const product = products.find(
      (item) => item.id === productId
    )

    return product?.stock_unit || 'UNIT'
  }


  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(Number(value || 0))
  }


  const formatDate = (value) => {
    if (!value) {
      return '-'
    }

    return new Intl.DateTimeFormat(
      'es-AR',
      {
        dateStyle: 'short',
        timeStyle: 'short',
      }
    ).format(new Date(value))
  }


  const formatQuantity = (quantity, productId) => {
    const unit = productUnit(productId)
    const value = Number(quantity)

    if (unit === 'GRAM') {
      return `${value.toLocaleString('es-AR')} g`
    }

    if (unit === 'ML') {
      return `${value.toLocaleString('es-AR')} ml`
    }

    return `${value.toLocaleString('es-AR')} u.`
  }


  const paymentName = (paymentMethod) => {
    const methods = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      DEBIT: 'Débito',
      CREDIT: 'Crédito',
      OTHER: 'Otro',
    }

    return methods[paymentMethod] || paymentMethod
  }


  const filteredSales = useMemo(() => {
    const text = search.trim().toLowerCase()

    return sales.filter((sale) => {
      if (
        statusFilter !== 'ALL' &&
        sale.status !== statusFilter
      ) {
        return false
      }

      if (!text) {
        return true
      }

      const saleId =
        String(sale.id)

      const productMatch =
        sale.items?.some((item) =>
          productName(item.product_id)
            .toLowerCase()
            .includes(text)
        )

      return (
        saleId.includes(text) ||
        sale.payment_method
          ?.toLowerCase()
          .includes(text) ||
        productMatch
      )
    })
  }, [
    sales,
    products,
    search,
    statusFilter,
  ])


  const openDetail = (sale) => {
    setSelectedSale(sale)
    setError('')
    setSuccess('')
  }


  const openCancel = (sale) => {
    setSelectedSale(sale)
    setCancelReason('')
    setError('')
    setSuccess('')
    setShowCancel(true)
  }


  const cancelSale = async (event) => {
    event.preventDefault()

    if (!selectedSale) {
      return
    }

    if (cancelReason.trim().length < 3) {
      setError(
        'El motivo debe tener al menos 3 caracteres.'
      )
      return
    }

    setCanceling(true)
    setError('')
    setSuccess('')

    try {
      await api.post(
        `/sales/${selectedSale.id}/cancel`,
        {
          reason: cancelReason.trim(),
        }
      )

      setShowCancel(false)
      setSelectedSale(null)
      setCancelReason('')

      setSuccess(
        `Venta #${selectedSale.id} anulada correctamente.`
      )

      await loadData()

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo anular la venta'
      )
    } finally {
      setCanceling(false)
    }
  }


  if (loading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border text-primary" />

        <div className="mt-3 text-muted">
          Cargando historial...
        </div>
      </div>
    )
  }


  return (
    <div>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">
            Historial de ventas
          </h1>

          <p className="text-muted mb-0">
            Ventas registradas y anulaciones
          </p>
        </div>

        <Link
          to="/sales"
          className="btn btn-primary"
        >
          <i className="bi bi-cart-plus me-2"></i>
          Nueva venta
        </Link>
      </div>


      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}


      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}


      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">

          <div className="row g-3">

            <div className="col-12 col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Buscar por venta o producto..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            </div>


            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todas
                </option>

                <option value="COMPLETED">
                  Completadas
                </option>

                <option value="CANCELED">
                  Anuladas
                </option>
              </select>
            </div>

          </div>

        </div>
      </div>


      {/* ESCRITORIO */}
      <div className="d-none d-md-block">

        <div className="card border-0 shadow-sm">
          <div className="table-responsive">

            <table className="table table-hover align-middle mb-0">

              <thead className="table-light">
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th className="text-end">
                    Total
                  </th>
                  <th className="text-end">
                    Acciones
                  </th>
                </tr>
              </thead>


              <tbody>

                {filteredSales.map((sale) => (
                  <tr key={sale.id}>

                    <td className="fw-semibold">
                      #{sale.id}
                    </td>

                    <td>
                      {formatDate(
                        sale.created_at
                      )}
                    </td>

                    <td>
                      {paymentName(
                        sale.payment_method
                      )}
                    </td>

                    <td>
                      {sale.status === 'COMPLETED' ? (
                        <span className="badge text-bg-success">
                          Completada
                        </span>
                      ) : (
                        <span className="badge text-bg-danger">
                          Anulada
                        </span>
                      )}
                    </td>

                    <td className="text-end fw-semibold">
                      {formatMoney(
                        sale.total_amount
                      )}
                    </td>

                    <td className="text-end">

                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() =>
                          openDetail(sale)
                        }
                      >
                        <i className="bi bi-eye"></i>
                      </button>


                      {user.role === 'ADMIN' &&
                        sale.status === 'COMPLETED' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              openCancel(sale)
                            }
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        )}

                    </td>

                  </tr>
                ))}


                {filteredSales.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center text-muted py-4"
                    >
                      No se encontraron ventas.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>
        </div>

      </div>


      {/* MÓVIL */}
      <div className="d-md-none">

        <div className="row g-3">

          {filteredSales.map((sale) => (

            <div
              className="col-12"
              key={sale.id}
            >

              <div className="card border-0 shadow-sm">

                <div className="card-body">

                  <div className="d-flex justify-content-between">

                    <div>
                      <div className="fw-bold">
                        Venta #{sale.id}
                      </div>

                      <small className="text-muted">
                        {formatDate(
                          sale.created_at
                        )}
                      </small>
                    </div>


                    {sale.status === 'COMPLETED' ? (
                      <span className="badge text-bg-success align-self-start">
                        Completada
                      </span>
                    ) : (
                      <span className="badge text-bg-danger align-self-start">
                        Anulada
                      </span>
                    )}

                  </div>


                  <hr />


                  <div className="d-flex justify-content-between mb-3">

                    <div>
                      <small className="text-muted d-block">
                        Pago
                      </small>

                      {paymentName(
                        sale.payment_method
                      )}
                    </div>


                    <div className="text-end">
                      <small className="text-muted d-block">
                        Total
                      </small>

                      <strong>
                        {formatMoney(
                          sale.total_amount
                        )}
                      </strong>
                    </div>

                  </div>


                  <div className="d-grid gap-2">

                    <button
                      className="btn btn-outline-primary"
                      onClick={() =>
                        openDetail(sale)
                      }
                    >
                      <i className="bi bi-eye me-2"></i>
                      Ver detalle
                    </button>


                    {user.role === 'ADMIN' &&
                      sale.status === 'COMPLETED' && (
                        <button
                          className="btn btn-outline-danger"
                          onClick={() =>
                            openCancel(sale)
                          }
                        >
                          <i className="bi bi-x-circle me-2"></i>
                          Anular venta
                        </button>
                      )}

                  </div>

                </div>
              </div>

            </div>
          ))}

        </div>

      </div>


      {/* DETALLE */}
      {selectedSale && !showCancel && (
        <>
          <div className="modal fade show d-block">

            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">

              <div className="modal-content">

                <div className="modal-header">

                  <div>
                    <h5 className="modal-title">
                      Venta #{selectedSale.id}
                    </h5>

                    <small className="text-muted">
                      {formatDate(
                        selectedSale.created_at
                      )}
                    </small>
                  </div>

                  <button
                    className="btn-close"
                    onClick={() =>
                      setSelectedSale(null)
                    }
                  />

                </div>


                <div className="modal-body">

                  <div className="row g-3 mb-4">

                    <div className="col-6 col-md-3">
                      <small className="text-muted d-block">
                        Estado
                      </small>

                      {selectedSale.status === 'COMPLETED'
                        ? 'Completada'
                        : 'Anulada'}
                    </div>


                    <div className="col-6 col-md-3">
                      <small className="text-muted d-block">
                        Pago
                      </small>

                      {paymentName(
                        selectedSale.payment_method
                      )}
                    </div>


                    <div className="col-6 col-md-3">
                      <small className="text-muted d-block">
                        Caja
                      </small>

                      #{selectedSale.cash_session_id}
                    </div>


                    <div className="col-6 col-md-3">
                      <small className="text-muted d-block">
                        Usuario
                      </small>

                      #{selectedSale.user_id}
                    </div>

                  </div>


                  <div className="table-responsive">

                    <table className="table align-middle">

                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th className="text-end">
                            Precio
                          </th>
                          <th className="text-end">
                            Subtotal
                          </th>
                        </tr>
                      </thead>


                      <tbody>

                        {selectedSale.items?.map(
                          (item) => (
                            <tr key={item.id}>

                              <td>
                                {productName(
                                  item.product_id
                                )}

                                <div className="small text-muted">
                                  Lote #{item.lot_id}
                                </div>
                              </td>

                              <td>
                                {formatQuantity(
                                  item.quantity,
                                  item.product_id
                                )}
                              </td>

                              <td className="text-end">
                                {formatMoney(
                                  item.unit_price
                                )}
                              </td>

                              <td className="text-end fw-semibold">
                                {formatMoney(
                                  item.subtotal
                                )}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>


                  {selectedSale.notes && (
                    <div className="alert alert-light border">
                      <strong>Notas:</strong>{' '}
                      {selectedSale.notes}
                    </div>
                  )}


                  <div className="text-end border-top pt-3">

                    <span className="text-muted me-3">
                      Total
                    </span>

                    <span className="fs-3 fw-bold">
                      {formatMoney(
                        selectedSale.total_amount
                      )}
                    </span>

                  </div>

                </div>


                <div className="modal-footer">

                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setSelectedSale(null)
                    }
                  >
                    Cerrar
                  </button>


                  {user.role === 'ADMIN' &&
                    selectedSale.status === 'COMPLETED' && (
                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          setShowCancel(true)
                        }
                      >
                        <i className="bi bi-x-circle me-2"></i>
                        Anular venta
                      </button>
                    )}

                </div>

              </div>
            </div>
          </div>

          <div className="modal-backdrop fade show"></div>
        </>
      )}


      {/* ANULACIÓN */}
      {selectedSale && showCancel && (
        <>
          <div className="modal fade show d-block">

            <div className="modal-dialog modal-dialog-centered">

              <div className="modal-content">

                <form onSubmit={cancelSale}>

                  <div className="modal-header">

                    <h5 className="modal-title">
                      Anular venta #{selectedSale.id}
                    </h5>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowCancel(false)
                        setSelectedSale(null)
                      }}
                    />

                  </div>


                  <div className="modal-body">

                    <div className="alert alert-warning">

                      <strong>
                        Esta operación devolverá el stock.
                      </strong>

                      <div className="mt-1">
                        También generará la reversión correspondiente en caja.
                      </div>

                    </div>


                    <div className="mb-3">

                      <label className="form-label">
                        Motivo de anulación
                      </label>

                      <textarea
                        className="form-control"
                        rows="3"
                        minLength="3"
                        maxLength="255"
                        value={cancelReason}
                        onChange={(event) =>
                          setCancelReason(
                            event.target.value
                          )
                        }
                        required
                        autoFocus
                      />

                    </div>

                  </div>


                  <div className="modal-footer">

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={canceling}
                      onClick={() => {
                        setShowCancel(false)
                        setSelectedSale(null)
                      }}
                    >
                      Cancelar
                    </button>


                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={canceling}
                    >
                      {canceling
                        ? 'Anulando...'
                        : 'Confirmar anulación'}
                    </button>

                  </div>

                </form>

              </div>
            </div>

          </div>

          <div className="modal-backdrop fade show"></div>
        </>
      )}

    </div>
  )
}

export default SalesHistory
