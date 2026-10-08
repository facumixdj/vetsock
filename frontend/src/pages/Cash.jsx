import { useEffect, useState } from 'react'
import api from '../services/api'


function Cash() {
  const user = JSON.parse(
    localStorage.getItem('vetstock_user') || '{}'
  )

  const [session, setSession] = useState(null)
  const [summary, setSummary] = useState(null)
  const [movements, setMovements] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [openingAmount, setOpeningAmount] = useState('')
  const [openingNotes, setOpeningNotes] = useState('')

  const [showClose, setShowClose] = useState(false)
  const [closingAmount, setClosingAmount] = useState('')
  const [closingNotes, setClosingNotes] = useState('')

  const [showMovement, setShowMovement] = useState(false)

  const [movementForm, setMovementForm] = useState({
    movement_type: 'INCOME',
    amount: '',
    payment_method: 'CASH',
    description: '',
    reference: '',
  })


  useEffect(() => {
    loadCash()
  }, [])


  const loadCash = async () => {
    setLoading(true)
    setError('')

    try {
      const sessionResponse =
        await api.get('/cash-sessions/current')

      setSession(sessionResponse.data)

      const [
        summaryResponse,
        movementsResponse,
      ] = await Promise.all([
        api.get('/cash-movements/current/summary'),
        api.get('/cash-movements/current'),
      ])

      setSummary(summaryResponse.data)
      setMovements(movementsResponse.data)

    } catch (err) {

      if (err.response?.status === 404) {
        setSession(null)
        setSummary(null)
        setMovements([])
      } else {
        setError(
          err.response?.data?.detail ||
          'No se pudo cargar la caja'
        )
      }

    } finally {
      setLoading(false)
    }
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


  const paymentName = (value) => {
    const names = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      DEBIT: 'Débito',
      CREDIT: 'Crédito',
      OTHER: 'Otro',
    }

    return names[value] || value
  }


  const movementName = (value) => {
    const names = {
      SALE: 'Venta',
      INCOME: 'Ingreso',
      EXPENSE: 'Gasto',
      WITHDRAWAL: 'Retiro',
      ADJUSTMENT_IN: 'Ajuste +',
      ADJUSTMENT_OUT: 'Ajuste -',
    }

    return names[value] || value
  }


  const openCash = async (event) => {
    event.preventDefault()

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.post(
        '/cash-sessions/open',
        {
          opening_amount:
            Number(openingAmount || 0),

          notes:
            openingNotes.trim() === ''
              ? null
              : openingNotes.trim(),
        }
      )

      setOpeningAmount('')
      setOpeningNotes('')

      setSuccess(
        'Caja abierta correctamente.'
      )

      await loadCash()

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo abrir la caja'
      )
    } finally {
      setSaving(false)
    }
  }


  const handleMovementChange = (event) => {
    const { name, value } = event.target

    setMovementForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  const saveMovement = async (event) => {
    event.preventDefault()

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.post(
        '/cash-movements/',
        {
          movement_type:
            movementForm.movement_type,

          amount:
            Number(movementForm.amount),

          payment_method:
            movementForm.payment_method,

          description:
            movementForm.description.trim() === ''
              ? null
              : movementForm.description.trim(),

          reference:
            movementForm.reference.trim() === ''
              ? null
              : movementForm.reference.trim(),
        }
      )

      setMovementForm({
        movement_type: 'INCOME',
        amount: '',
        payment_method: 'CASH',
        description: '',
        reference: '',
      })

      setShowMovement(false)

      setSuccess(
        'Movimiento registrado correctamente.'
      )

      await loadCash()

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo registrar el movimiento'
      )
    } finally {
      setSaving(false)
    }
  }


  const closeCash = async (event) => {
    event.preventDefault()

    if (!session) {
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.post(
        `/cash-sessions/${session.id}/close`,
        {
          closing_amount:
            Number(closingAmount),

          notes:
            closingNotes.trim() === ''
              ? null
              : closingNotes.trim(),
        }
      )

      const result = response.data

      setShowClose(false)
      setClosingAmount('')
      setClosingNotes('')

      setSession(null)
      setSummary(null)
      setMovements([])

      setSuccess(
        `Caja cerrada. Diferencia: ${formatMoney(
          result.cash_difference
        )}`
      )

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo cerrar la caja'
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
          Cargando caja...
        </div>
      </div>
    )
  }


  return (
    <div>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">

        <div>
          <h1 className="h3 mb-1">
            Caja
          </h1>

          <p className="text-muted mb-0">
            Apertura, movimientos y cierre
          </p>
        </div>


        {session ? (
          <span className="badge text-bg-success fs-6">
            Caja abierta #{session.id}
          </span>
        ) : (
          <span className="badge text-bg-secondary fs-6">
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


      {/* CAJA CERRADA */}
      {!session && (

        <div className="row justify-content-center">

          <div className="col-12 col-lg-6">

            <div className="card border-0 shadow-sm">

              <div className="card-body p-4">

                <h2 className="h5 mb-3">
                  Abrir caja
                </h2>


                {user.role !== 'ADMIN' ? (

                  <div className="alert alert-warning mb-0">
                    Solo un administrador puede abrir la caja.
                  </div>

                ) : (

                  <form onSubmit={openCash}>

                    <div className="mb-3">

                      <label className="form-label">
                        Efectivo inicial
                      </label>

                      <div className="input-group">

                        <span className="input-group-text">
                          $
                        </span>

                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="0.01"
                          value={openingAmount}
                          onChange={(event) =>
                            setOpeningAmount(
                              event.target.value
                            )
                          }
                          required
                          autoFocus
                        />

                      </div>

                      <div className="form-text">
                        Dinero físico existente al comenzar el turno.
                      </div>

                    </div>


                    <div className="mb-3">

                      <label className="form-label">
                        Notas
                      </label>

                      <textarea
                        className="form-control"
                        rows="2"
                        value={openingNotes}
                        onChange={(event) =>
                          setOpeningNotes(
                            event.target.value
                          )
                        }
                        placeholder="Opcional"
                      />

                    </div>


                    <div className="d-grid">

                      <button
                        className="btn btn-success btn-lg"
                        type="submit"
                        disabled={saving}
                      >
                        {saving
                          ? 'Abriendo...'
                          : 'Abrir caja'}
                      </button>

                    </div>

                  </form>

                )}

              </div>

            </div>

          </div>

        </div>

      )}


      {/* CAJA ABIERTA */}
      {session && (
        <>

          <div className="row g-3 mb-4">

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">

                  <div className="text-muted small">
                    Apertura
                  </div>

                  <div className="fs-4 fw-bold">
                    {formatMoney(
                      summary?.opening_amount
                    )}
                  </div>

                </div>
              </div>
            </div>


            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">

                  <div className="text-muted small">
                    Ingresos en efectivo
                  </div>

                  <div className="fs-4 fw-bold">
                    {formatMoney(
                      summary?.cash_in
                    )}
                  </div>

                </div>
              </div>
            </div>


            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">

                  <div className="text-muted small">
                    Salidas en efectivo
                  </div>

                  <div className="fs-4 fw-bold">
                    {formatMoney(
                      summary?.cash_out
                    )}
                  </div>

                </div>
              </div>
            </div>


            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">

                  <div className="text-muted small">
                    Efectivo teórico
                  </div>

                  <div className="fs-4 fw-bold">
                    {formatMoney(
                      summary?.theoretical_cash
                    )}
                  </div>

                </div>
              </div>
            </div>

          </div>


          <div className="row g-4">

            <div className="col-12 col-xl-8">

              <div className="card border-0 shadow-sm">

                <div className="card-body">

                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">

                    <div>
                      <h2 className="h5 mb-1">
                        Movimientos
                      </h2>

                      <small className="text-muted">
                        Abierta el {formatDate(
                          session.opened_at
                        )}
                      </small>
                    </div>


                    {user.role === 'ADMIN' && (
                      <button
                        className="btn btn-outline-primary"
                        onClick={() =>
                          setShowMovement(true)
                        }
                      >
                        <i className="bi bi-plus-lg me-2"></i>
                        Movimiento manual
                      </button>
                    )}

                  </div>


                  <div className="table-responsive">

                    <table className="table table-hover align-middle">

                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Medio</th>
                          <th>Descripción</th>
                          <th className="text-end">
                            Importe
                          </th>
                        </tr>
                      </thead>


                      <tbody>

                        {movements.map((movement) => (
                          <tr key={movement.id}>

                            <td>
                              {formatDate(
                                movement.created_at
                              )}
                            </td>

                            <td>
                              {movementName(
                                movement.movement_type
                              )}
                            </td>

                            <td>
                              {paymentName(
                                movement.payment_method
                              )}
                            </td>

                            <td>
                              {movement.description || '-'}

                              {movement.reference && (
                                <div className="small text-muted">
                                  {movement.reference}
                                </div>
                              )}
                            </td>

                            <td className="text-end fw-semibold">
                              {formatMoney(
                                movement.amount
                              )}
                            </td>

                          </tr>
                        ))}


                        {movements.length === 0 && (
                          <tr>
                            <td
                              colSpan="5"
                              className="text-center text-muted py-4"
                            >
                              No hay movimientos todavía.
                            </td>
                          </tr>
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              </div>

            </div>


            <div className="col-12 col-xl-4">

              <div className="card border-0 shadow-sm mb-3">

                <div className="card-body">

                  <h2 className="h5 mb-3">
                    Totales por medio de pago
                  </h2>


                  <div className="d-flex justify-content-between mb-2">
                    <span>Efectivo</span>
                    <strong>
                      {formatMoney(
                        summary?.by_payment_method?.CASH
                      )}
                    </strong>
                  </div>


                  <div className="d-flex justify-content-between mb-2">
                    <span>Transferencia</span>
                    <strong>
                      {formatMoney(
                        summary?.by_payment_method?.TRANSFER
                      )}
                    </strong>
                  </div>


                  <div className="d-flex justify-content-between mb-2">
                    <span>Débito</span>
                    <strong>
                      {formatMoney(
                        summary?.by_payment_method?.DEBIT
                      )}
                    </strong>
                  </div>


                  <div className="d-flex justify-content-between mb-2">
                    <span>Crédito</span>
                    <strong>
                      {formatMoney(
                        summary?.by_payment_method?.CREDIT
                      )}
                    </strong>
                  </div>


                  <div className="d-flex justify-content-between">
                    <span>Otros</span>
                    <strong>
                      {formatMoney(
                        summary?.by_payment_method?.OTHER
                      )}
                    </strong>
                  </div>

                </div>

              </div>


              {user.role === 'ADMIN' && (

                <div className="d-grid">

                  <button
                    className="btn btn-danger btn-lg"
                    onClick={() => {
                      setClosingAmount(
                        summary?.theoretical_cash ?? ''
                      )

                      setShowClose(true)
                    }}
                  >
                    <i className="bi bi-lock me-2"></i>
                    Cerrar caja
                  </button>

                </div>

              )}

            </div>

          </div>

        </>
      )}


      {/* MOVIMIENTO MANUAL */}
      {showMovement && (
        <>
          <div className="modal fade show d-block">

            <div className="modal-dialog modal-dialog-centered">

              <div className="modal-content">

                <form onSubmit={saveMovement}>

                  <div className="modal-header">

                    <h5 className="modal-title">
                      Movimiento de caja
                    </h5>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={() =>
                        setShowMovement(false)
                      }
                    />

                  </div>


                  <div className="modal-body">

                    <div className="mb-3">

                      <label className="form-label">
                        Tipo
                      </label>

                      <select
                        className="form-select"
                        name="movement_type"
                        value={
                          movementForm.movement_type
                        }
                        onChange={
                          handleMovementChange
                        }
                      >
                        <option value="INCOME">
                          Ingreso
                        </option>

                        <option value="EXPENSE">
                          Gasto
                        </option>

                        <option value="WITHDRAWAL">
                          Retiro de efectivo
                        </option>

                        <option value="ADJUSTMENT_IN">
                          Ajuste positivo
                        </option>

                        <option value="ADJUSTMENT_OUT">
                          Ajuste negativo
                        </option>
                      </select>

                    </div>


                    <div className="mb-3">

                      <label className="form-label">
                        Importe
                      </label>

                      <input
                        type="number"
                        className="form-control"
                        name="amount"
                        min="0.01"
                        step="0.01"
                        value={
                          movementForm.amount
                        }
                        onChange={
                          handleMovementChange
                        }
                        required
                      />

                    </div>


                    <div className="mb-3">

                      <label className="form-label">
                        Medio de pago
                      </label>

                      <select
                        className="form-select"
                        name="payment_method"
                        value={
                          movementForm.payment_method
                        }
                        onChange={
                          handleMovementChange
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
                        Descripción
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        name="description"
                        maxLength="255"
                        value={
                          movementForm.description
                        }
                        onChange={
                          handleMovementChange
                        }
                      />

                    </div>


                    <div>

                      <label className="form-label">
                        Referencia
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        name="reference"
                        maxLength="100"
                        value={
                          movementForm.reference
                        }
                        onChange={
                          handleMovementChange
                        }
                      />

                    </div>

                  </div>


                  <div className="modal-footer">

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        setShowMovement(false)
                      }
                      disabled={saving}
                    >
                      Cancelar
                    </button>


                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? 'Guardando...'
                        : 'Registrar'}
                    </button>

                  </div>

                </form>

              </div>

            </div>

          </div>

          <div className="modal-backdrop fade show"></div>
        </>
      )}


      {/* CIERRE */}
      {showClose && session && (
        <>
          <div className="modal fade show d-block">

            <div className="modal-dialog modal-dialog-centered">

              <div className="modal-content">

                <form onSubmit={closeCash}>

                  <div className="modal-header">

                    <h5 className="modal-title">
                      Cerrar caja #{session.id}
                    </h5>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={() =>
                        setShowClose(false)
                      }
                    />

                  </div>


                  <div className="modal-body">

                    <div className="alert alert-info">

                      Efectivo teórico:

                      <strong className="ms-2">
                        {formatMoney(
                          summary?.theoretical_cash
                        )}
                      </strong>

                    </div>


                    <div className="mb-3">

                      <label className="form-label">
                        Efectivo contado
                      </label>

                      <div className="input-group">

                        <span className="input-group-text">
                          $
                        </span>

                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="0.01"
                          value={closingAmount}
                          onChange={(event) =>
                            setClosingAmount(
                              event.target.value
                            )
                          }
                          required
                          autoFocus
                        />

                      </div>

                      <div className="form-text">
                        Ingrese el dinero físico realmente contado.
                      </div>

                    </div>


                    <div>

                      <label className="form-label">
                        Notas de cierre
                      </label>

                      <textarea
                        className="form-control"
                        rows="2"
                        value={closingNotes}
                        onChange={(event) =>
                          setClosingNotes(
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </div>


                  <div className="modal-footer">

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={saving}
                      onClick={() =>
                        setShowClose(false)
                      }
                    >
                      Cancelar
                    </button>


                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={saving}
                    >
                      {saving
                        ? 'Cerrando...'
                        : 'Confirmar cierre'}
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

export default Cash