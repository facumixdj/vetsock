import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'


function Sales() {
  const [products, setProducts] = useState([])
  const [stocks, setStocks] = useState({})
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])

  const [cashOpen, setCashOpen] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  useEffect(() => {
    loadData()
  }, [])


  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const productsResponse = await api.get('/products/')

      const activeProducts = productsResponse.data.filter(
        (product) => product.active
      )

      setProducts(activeProducts)

      const stockResults = await Promise.allSettled(
        activeProducts.map((product) =>
          api.get(
            `/stock-movements/product/${product.id}/stock`
          )
        )
      )

      const stockMap = {}

      stockResults.forEach((result, index) => {
        const product = activeProducts[index]

        if (result.status === 'fulfilled') {
          stockMap[product.id] = result.value.data
        }
      })

      setStocks(stockMap)

      try {
        await api.get('/cash-sessions/current')
        setCashOpen(true)
      } catch {
        setCashOpen(false)
      }

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudieron cargar los datos de ventas'
      )
    } finally {
      setLoading(false)
    }
  }


  const filteredProducts = useMemo(() => {
    const text = search.trim().toLowerCase()

    if (!text) {
      return products
    }

    return products.filter((product) =>
      product.name?.toLowerCase().includes(text) ||
      product.code?.toLowerCase().includes(text) ||
      product.barcode?.toLowerCase().includes(text)
    )
  }, [products, search])


  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(Number(value || 0))
  }


  const formatQuantity = (quantity, unit) => {
    const value = Number(quantity || 0)

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


  const getAvailableLots = (product) => {
    const stockData = stocks[product.id]

    if (!stockData?.lots) {
      return []
    }

    return stockData.lots
      .filter((lot) => Number(lot.stock) > 0)
      .sort((a, b) => {
        if (!a.expiration_date && !b.expiration_date) return 0
        if (!a.expiration_date) return 1
        if (!b.expiration_date) return -1

        return new Date(a.expiration_date) -
          new Date(b.expiration_date)
      })
  }


  const addProduct = (product) => {
    setError('')
    setSuccess('')

    const lots = getAvailableLots(product)

    if (lots.length === 0) {
      setError(
        `El producto "${product.name}" no tiene stock disponible.`
      )
      return
    }

    /*
     * FEFO:
     * por defecto elegimos el lote con vencimiento más próximo.
     */
    const lot = lots[0]

    const existing = cart.find(
      (item) => item.lot_id === lot.lot_id
    )

    if (existing) {
      const nextQuantity = existing.quantity + 1

      if (nextQuantity > lot.stock) {
        setError(
          `Stock insuficiente para "${product.name}".`
        )
        return
      }

      setCart((current) =>
        current.map((item) =>
          item.lot_id === lot.lot_id
            ? {
                ...item,
                quantity: nextQuantity,
              }
            : item
        )
      )

      return
    }


    setCart((current) => [
      ...current,
      {
        product_id: product.id,
        product_name: product.name,
        stock_unit: product.stock_unit,
        sale_price: Number(product.sale_price),
        price_unit_quantity:
          Number(product.price_unit_quantity),

        lot_id: lot.lot_id,
        lot_number: lot.lot_number,
        expiration_date: lot.expiration_date,

        available_stock: Number(lot.stock),
        quantity: 1,
      },
    ])
  }


  const updateQuantity = (lotId, value) => {
    const quantity = Number(value)

    setCart((current) =>
      current.map((item) => {
        if (item.lot_id !== lotId) {
          return item
        }

        if (
          Number.isNaN(quantity) ||
          quantity < 1
        ) {
          return {
            ...item,
            quantity: 1,
          }
        }

        if (quantity > item.available_stock) {
          setError(
            `Stock máximo disponible: ${formatQuantity(
              item.available_stock,
              item.stock_unit
            )}`
          )

          return {
            ...item,
            quantity: item.available_stock,
          }
        }

        return {
          ...item,
          quantity,
        }
      })
    )
  }


  const removeItem = (lotId) => {
    setCart((current) =>
      current.filter(
        (item) => item.lot_id !== lotId
      )
    )
  }


  const itemSubtotal = (item) => {
    return (
      Number(item.quantity) *
      Number(item.sale_price) /
      Number(item.price_unit_quantity)
    )
  }


  const total = cart.reduce(
    (sum, item) =>
      sum + itemSubtotal(item),
    0
  )


  const confirmSale = async () => {
    setError('')
    setSuccess('')

    if (!cashOpen) {
      setError(
        'No se puede realizar una venta porque no hay una caja abierta.'
      )
      return
    }

    if (cart.length === 0) {
      setError(
        'Agregue al menos un producto a la venta.'
      )
      return
    }

    setSaving(true)

    try {
      const response = await api.post(
        '/sales/',
        {
          payment_method: paymentMethod,

          items: cart.map((item) => ({
            lot_id: item.lot_id,
            quantity: Number(item.quantity),
          })),

          notes:
            notes.trim() === ''
              ? null
              : notes.trim(),
        }
      )

      setSuccess(
        `Venta #${response.data.id} registrada correctamente por ${formatMoney(
          response.data.total_amount
        )}.`
      )

      setCart([])
      setNotes('')
      setPaymentMethod('CASH')

      await loadData()

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo registrar la venta'
      )
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border text-primary" />

        <div className="mt-3 text-muted">
          Cargando ventas...
        </div>
      </div>
    )
  }


  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">
            Ventas
          </h1>
          <Link
  to="/sales/history"
  className="btn btn-outline-secondary"
>
  <i className="bi bi-clock-history me-2"></i>
  Historial
</Link>

          <p className="text-muted mb-0">
            Punto de venta
          </p>
        </div>
        

        {cashOpen ? (
          <span className="badge text-bg-success fs-6">
            Caja abierta
          </span>
        ) : (
          <span className="badge text-bg-danger fs-6">
            Caja cerrada
          </span>
        )}
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


      {!cashOpen && (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Debe abrir una caja antes de registrar ventas.
        </div>
      )}


      <div className="row g-4">

        {/* PRODUCTOS */}
        <div className="col-12 col-xl-7">

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar producto, código o código de barras..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  autoFocus
                />
              </div>

            </div>
          </div>


          <div className="row g-3">

            {filteredProducts.map((product) => {
              const stockData = stocks[product.id]

              const stock =
                Number(stockData?.total_stock || 0)

              return (
                <div
                  className="col-12 col-md-6"
                  key={product.id}
                >
                  <div className="card border-0 shadow-sm h-100">

                    <div className="card-body">

                      <div className="d-flex justify-content-between gap-3 mb-2">
                        <div>
                          <div className="small text-muted">
                            {product.code}
                          </div>

                          <div className="fw-semibold">
                            {product.name}
                          </div>
                        </div>

                        <div className="text-end">
                          <div className="fw-bold">
                            {formatMoney(
                              product.sale_price
                            )}
                          </div>

                          {product.price_unit_quantity > 1 && (
                            <small className="text-muted">
                              por {
                                product.price_unit_quantity
                              } {
                                product.stock_unit === 'GRAM'
                                  ? 'g'
                                  : product.stock_unit === 'ML'
                                    ? 'ml'
                                    : 'u.'
                              }
                            </small>
                          )}
                        </div>
                      </div>


                      <div className="small mb-3">
                        Stock:{' '}
                        <strong>
                          {formatQuantity(
                            stock,
                            product.stock_unit
                          )}
                        </strong>
                      </div>


                      <div className="d-grid">
                        <button
                          className="btn btn-outline-primary"
                          disabled={
                            !cashOpen ||
                            stock <= 0
                          }
                          onClick={() =>
                            addProduct(product)
                          }
                        >
                          <i className="bi bi-cart-plus me-2"></i>
                          Agregar
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              )
            })}


            {filteredProducts.length === 0 && (
              <div className="col-12">
                <div className="alert alert-secondary">
                  No se encontraron productos.
                </div>
              </div>
            )}

          </div>

        </div>


        {/* CARRITO */}
        <div className="col-12 col-xl-5">

          <div className="card border-0 shadow-sm position-sticky"
            style={{ top: '90px' }}
          >

            <div className="card-body">

              <h2 className="h5 mb-3">
                Venta actual
              </h2>


              {cart.length === 0 ? (
                <div className="text-muted text-center py-4">
                  <i className="bi bi-cart3 fs-1 d-block mb-2"></i>
                  No hay productos agregados.
                </div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div
                      key={item.lot_id}
                      className="border-bottom pb-3 mb-3"
                    >

                      <div className="d-flex justify-content-between gap-3">
                        <div>
                          <div className="fw-semibold">
                            {item.product_name}
                          </div>

                          <small className="text-muted">
                            Lote {item.lot_number}
                          </small>
                        </div>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            removeItem(item.lot_id)
                          }
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>


                      <div className="row g-2 align-items-end mt-2">

                        <div className="col-7">
                          <label className="form-label small">
                            Cantidad {
                              item.stock_unit === 'GRAM'
                                ? '(gramos)'
                                : item.stock_unit === 'ML'
                                  ? '(ml)'
                                  : '(unidades)'
                            }
                          </label>

                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            max={item.available_stock}
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(
                                item.lot_id,
                                event.target.value
                              )
                            }
                          />

                          <small className="text-muted">
                            Disponible: {
                              formatQuantity(
                                item.available_stock,
                                item.stock_unit
                              )
                            }
                          </small>
                        </div>


                        <div className="col-5 text-end">
                          <small className="text-muted d-block">
                            Subtotal
                          </small>

                          <strong>
                            {formatMoney(
                              itemSubtotal(item)
                            )}
                          </strong>
                        </div>

                      </div>

                    </div>
                  ))}


                  <div className="mb-3">
                    <label className="form-label">
                      Medio de pago
                    </label>

                    <select
                      className="form-select"
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value
                        )
                      }
                    >
                      <option value="CASH">
                        Efectivo
                      </option>

                      <option value="TRANSFER">
                        Transferencia
                      </option>

                      <option value="DEBIT">
                        Débito
                      </option>

                      <option value="CREDIT">
                        Crédito
                      </option>

                      <option value="OTHER">
                        Otro
                      </option>
                    </select>
                  </div>


                  <div className="mb-3">
                    <label className="form-label">
                      Notas
                    </label>

                    <textarea
                      className="form-control"
                      rows="2"
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                    />
                  </div>


                  <div className="border-top pt-3">

                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="fs-5">
                        Total
                      </span>

                      <span className="fs-3 fw-bold">
                        {formatMoney(total)}
                      </span>
                    </div>


                    <div className="d-grid">
                      <button
                        className="btn btn-success btn-lg"
                        disabled={
                          saving ||
                          !cashOpen ||
                          cart.length === 0
                        }
                        onClick={confirmSale}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Procesando...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Confirmar venta
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

export default Sales