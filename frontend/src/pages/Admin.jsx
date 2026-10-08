import { useEffect, useState } from 'react'
import api from '../services/api'


const emptySupplier = {
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  active: true,
}


function Admin() {
  const user = JSON.parse(
    localStorage.getItem('vetstock_user') || '{}'
  )

  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')

  const [supplierForm, setSupplierForm] = useState(emptySupplier)
  const [editingSupplier, setEditingSupplier] = useState(null)

  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)

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
        categoriesResponse,
        suppliersResponse,
      ] = await Promise.all([
        api.get('/categories/'),
        api.get('/suppliers/'),
      ])

      setCategories(categoriesResponse.data)
      setSuppliers(suppliersResponse.data)

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudieron cargar los datos'
      )
    } finally {
      setLoading(false)
    }
  }


  const createCategory = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')
    setSavingCategory(true)

    try {
      await api.post('/categories/', {
        name: categoryName.trim(),
        description:
          categoryDescription.trim() === ''
            ? null
            : categoryDescription.trim(),
      })

      setCategoryName('')
      setCategoryDescription('')

      setSuccess(
        'Categoría creada correctamente.'
      )

      await loadData()

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo crear la categoría'
      )
    } finally {
      setSavingCategory(false)
    }
  }


  const deleteCategory = async (category) => {
    const confirmed = window.confirm(
      `¿Eliminar la categoría "${category.name}"?`
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await api.delete(
        `/categories/${category.id}`
      )

      setSuccess(
        'Categoría eliminada correctamente.'
      )

      await loadData()

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo eliminar la categoría'
      )
    }
  }


  const handleSupplierChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setSupplierForm((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }


  const editSupplier = (supplier) => {
    setEditingSupplier(supplier)

    setSupplierForm({
      name: supplier.name || '',
      contact_name:
        supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      active: supplier.active ?? true,
    })

    setError('')
    setSuccess('')
  }


  const cancelSupplierEdit = () => {
    setEditingSupplier(null)
    setSupplierForm(emptySupplier)
  }


  const saveSupplier = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')
    setSavingSupplier(true)

    const payload = {
      name: supplierForm.name.trim(),

      contact_name:
        supplierForm.contact_name.trim() === ''
          ? null
          : supplierForm.contact_name.trim(),

      phone:
        supplierForm.phone.trim() === ''
          ? null
          : supplierForm.phone.trim(),

      email:
        supplierForm.email.trim() === ''
          ? null
          : supplierForm.email.trim(),

      address:
        supplierForm.address.trim() === ''
          ? null
          : supplierForm.address.trim(),

      notes:
        supplierForm.notes.trim() === ''
          ? null
          : supplierForm.notes.trim(),

      active: Boolean(supplierForm.active),
    }

    try {
      if (editingSupplier) {
        await api.patch(
          `/suppliers/${editingSupplier.id}`,
          payload
        )

        setSuccess(
          'Proveedor actualizado correctamente.'
        )

      } else {
        await api.post(
          '/suppliers/',
          payload
        )

        setSuccess(
          'Proveedor creado correctamente.'
        )
      }

      setEditingSupplier(null)
      setSupplierForm(emptySupplier)

      await loadData()

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudo guardar el proveedor'
      )
    } finally {
      setSavingSupplier(false)
    }
  }


  if (user.role !== 'ADMIN') {
    return (
      <div className="alert alert-danger">
        No tiene permisos para acceder a esta sección.
      </div>
    )
  }


  if (loading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border text-primary" />

        <div className="mt-3 text-muted">
          Cargando administración...
        </div>
      </div>
    )
  }


  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 mb-1">
          Administración
        </h1>

        <p className="text-muted mb-0">
          Categorías y proveedores
        </p>
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


      <div className="row g-4">

        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body">

              <h2 className="h5 mb-3">
                Categorías
              </h2>


              <form
                onSubmit={createCategory}
                className="mb-4"
              >
                <div className="mb-3">
                  <label className="form-label">
                    Nombre
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={categoryName}
                    onChange={(event) =>
                      setCategoryName(
                        event.target.value
                      )
                    }
                    required
                  />
                </div>


                <div className="mb-3">
                  <label className="form-label">
                    Descripción
                  </label>

                  <textarea
                    className="form-control"
                    rows="2"
                    value={categoryDescription}
                    onChange={(event) =>
                      setCategoryDescription(
                        event.target.value
                      )
                    }
                  />
                </div>


                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={savingCategory}
                >
                  {savingCategory
                    ? 'Guardando...'
                    : 'Agregar categoría'}
                </button>
              </form>


              <div className="list-group list-group-flush">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="list-group-item px-0 d-flex justify-content-between align-items-start gap-3"
                  >
                    <div>
                      <div className="fw-semibold">
                        {category.name}
                      </div>

                      {category.description && (
                        <small className="text-muted">
                          {category.description}
                        </small>
                      )}
                    </div>


                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() =>
                        deleteCategory(category)
                      }
                      title="Eliminar categoría"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                ))}

                {categories.length === 0 && (
                  <div className="text-muted py-3">
                    No hay categorías.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>


        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm">
            <div className="card-body">

              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">
                  Proveedores
                </h2>

                {editingSupplier && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={cancelSupplierEdit}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>


              <form
                onSubmit={saveSupplier}
                className="mb-4"
              >
                <div className="row g-3">

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Nombre
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={supplierForm.name}
                      onChange={handleSupplierChange}
                      required
                    />
                  </div>


                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Contacto
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      name="contact_name"
                      value={
                        supplierForm.contact_name
                      }
                      onChange={handleSupplierChange}
                    />
                  </div>


                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Teléfono
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      name="phone"
                      value={supplierForm.phone}
                      onChange={handleSupplierChange}
                    />
                  </div>


                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Email
                    </label>

                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={supplierForm.email}
                      onChange={handleSupplierChange}
                    />
                  </div>


                  <div className="col-12">
                    <label className="form-label">
                      Dirección
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      name="address"
                      value={supplierForm.address}
                      onChange={handleSupplierChange}
                    />
                  </div>


                  <div className="col-12">
                    <label className="form-label">
                      Notas
                    </label>

                    <textarea
                      className="form-control"
                      rows="2"
                      name="notes"
                      value={supplierForm.notes}
                      onChange={handleSupplierChange}
                    />
                  </div>


                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="supplierActive"
                        name="active"
                        checked={supplierForm.active}
                        onChange={handleSupplierChange}
                      />

                      <label
                        className="form-check-label"
                        htmlFor="supplierActive"
                      >
                        Proveedor activo
                      </label>
                    </div>
                  </div>


                  <div className="col-12">
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={savingSupplier}
                    >
                      {savingSupplier
                        ? 'Guardando...'
                        : editingSupplier
                          ? 'Guardar cambios'
                          : 'Agregar proveedor'}
                    </button>
                  </div>

                </div>
              </form>


              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Contacto</th>
                      <th>Estado</th>
                      <th className="text-end">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td>
                          <div className="fw-semibold">
                            {supplier.name}
                          </div>

                          {supplier.phone && (
                            <small className="text-muted">
                              {supplier.phone}
                            </small>
                          )}
                        </td>

                        <td>
                          {supplier.contact_name || '-'}
                        </td>

                        <td>
                          {supplier.active ? (
                            <span className="badge text-bg-success">
                              Activo
                            </span>
                          ) : (
                            <span className="badge text-bg-secondary">
                              Inactivo
                            </span>
                          )}
                        </td>

                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() =>
                              editSupplier(supplier)
                            }
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {suppliers.length === 0 && (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center text-muted py-4"
                        >
                          No hay proveedores.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Admin