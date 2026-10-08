import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'


const emptyForm = {
  code: '',
  barcode: '',
  name: '',
  description: '',
  category_id: '',
  purchase_price: '',
  sale_price: '',
  minimum_stock: 0,
  stock_unit: 'UNIT',
  price_unit_quantity: 1,
  active: true,
}


function Products() {
  const user = JSON.parse(
    localStorage.getItem('vetstock_user') || '{}'
  )

  const [products, setProducts] = useState([])
  const [stocks, setStocks] = useState({})
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [productSuppliers, setProductSuppliers] = useState([])
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([])
  const [initialStock, setInitialStock] = useState({
  enabled: false,
  quantity: '',
  lot_number: '',
  supplier_id: '',
  expiration_date: '',
})

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')


  useEffect(() => {
    loadProducts()
  }, [])


  const loadProducts = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        productsResponse,
        categoriesResponse,
        suppliersResponse,
        productSuppliersResponse,
      ] = await Promise.all([
        api.get('/products/'),
        api.get('/categories/'),
        api.get('/suppliers/'),
        api.get('/product-suppliers/'),
      ])

      const productList = productsResponse.data

      setProducts(productList)
      setCategories(categoriesResponse.data)
      setSuppliers(suppliersResponse.data)
      setProductSuppliers(productSuppliersResponse.data)

      const stockResults = await Promise.allSettled(
        productList.map((product) =>
          api.get(
            `/stock-movements/product/${product.id}/stock`
          )
        )
      )

      const stockMap = {}

      stockResults.forEach((result, index) => {
        const product = productList[index]

        if (result.status === 'fulfilled') {
          stockMap[product.id] = result.value.data
        } else {
          stockMap[product.id] = {
            total_stock: 0,
            unit: product.stock_unit,
          }
        }
      })

      setStocks(stockMap)

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No se pudieron cargar los productos'
      )
    } finally {
      setLoading(false)
    }
  }


  const categoryName = (categoryId) => {
    const category = categories.find(
      (item) => item.id === categoryId
    )

    return category?.name || '-'
  }


  const filteredProducts = useMemo(() => {
    const text = search.trim().toLowerCase()

    if (!text) {
      return products
    }

    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(text) ||
        product.code?.toLowerCase().includes(text) ||
        product.barcode?.toLowerCase().includes(text)
      )
    })
  }, [products, search])


  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(Number(value || 0))
  }


  const formatStock = (product) => {
    const stockData = stocks[product.id]

    if (!stockData) {
      return '-'
    }

    const stock = Number(
      stockData.total_stock ??
      stockData.stock ??
      0
    )

    const unit =
      stockData.unit ||
      product.stock_unit

    if (unit === 'GRAM') {
      if (stock >= 1000) {
        return `${(stock / 1000).toLocaleString(
          'es-AR',
          {
            maximumFractionDigits: 3,
          }
        )} kg`
      }

      return `${stock.toLocaleString('es-AR')} g`
    }

    if (unit === 'ML') {
      if (stock >= 1000) {
        return `${(stock / 1000).toLocaleString(
          'es-AR',
          {
            maximumFractionDigits: 3,
          }
        )} L`
      }

      return `${stock.toLocaleString('es-AR')} ml`
    }

    return `${stock.toLocaleString('es-AR')} u.`
  }


const openNewProduct = () => {
  setEditingProduct(null)

  setForm({
    ...emptyForm,
    category_id: categories[0]?.id || '',
  })
  setSelectedSupplierIds([])
  setInitialStock({
    enabled: false,
    quantity: '',
    lot_number: '',
    supplier_id: '',
    expiration_date: '',
  })

  setFormError('')
  setSuccess('')
  setShowForm(true)
}


  const openEditProduct = (product) => {
  setEditingProduct(product)

  setForm({
    code: product.code || '',
    barcode: product.barcode || '',
    name: product.name || '',
    description: product.description || '',
    category_id: product.category_id || '',
    purchase_price: product.purchase_price ?? '',
    sale_price: product.sale_price ?? '',
    minimum_stock: product.minimum_stock ?? 0,
    stock_unit: product.stock_unit || 'UNIT',
    price_unit_quantity:
      product.price_unit_quantity ?? 1,
    active: product.active ?? true,
  })

  const associatedSupplierIds = productSuppliers
    .filter(
      (relation) =>
        relation.product_id === product.id
    )
    .map(
      (relation) =>
        relation.supplier_id
    )

  setSelectedSupplierIds(
    associatedSupplierIds
  )

  setFormError('')
  setSuccess('')
  setShowForm(true)
}


  const closeForm = () => {
    if (saving) {
      return
    }

    setShowForm(false)
    setEditingProduct(null)
    setForm(emptyForm)
    setFormError('')
  }


  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox'
        ? checked
        : value,
    }))
  }
  const handleInitialStockChange = (event) => {
  const { name, value, type, checked } = event.target

  setInitialStock((current) => ({
    ...current,
    [name]: type === 'checkbox'
      ? checked
      : value,
  }))
}
const toggleSupplier = (supplierId) => {
  setSelectedSupplierIds((current) => {
    if (current.includes(supplierId)) {

      if (
        Number(initialStock.supplier_id) === supplierId
      ) {
        setInitialStock((stock) => ({
          ...stock,
          supplier_id: '',
        }))
      }

      return current.filter(
        (id) => id !== supplierId
      )
    }

    return [
      ...current,
      supplierId,
    ]
  })
}

  const handleUnitChange = (event) => {
    const unit = event.target.value

    let priceUnitQuantity = 1

    if (unit === 'GRAM' || unit === 'ML') {
      priceUnitQuantity = 1000
    }

    setForm((current) => ({
      ...current,
      stock_unit: unit,
      price_unit_quantity: priceUnitQuantity,
    }))
  }


const handleSubmit = async (event) => {
  event.preventDefault()

  setFormError('')
  setSuccess('')
  setSaving(true)

  const payload = {
    code: form.code.trim(),

    barcode:
      form.barcode.trim() === ''
        ? null
        : form.barcode.trim(),

    name: form.name.trim(),

    description:
      form.description.trim() === ''
        ? null
        : form.description.trim(),

    category_id: Number(form.category_id),

    purchase_price: Number(form.purchase_price),

    sale_price: Number(form.sale_price),

    minimum_stock: Number(form.minimum_stock),

    stock_unit: form.stock_unit,

    price_unit_quantity:
      Number(form.price_unit_quantity),

    active: Boolean(form.active),
  }

  try {
    if (editingProduct) {

      /*
       * 1. Actualizar producto
       */
      await api.patch(
        `/products/${editingProduct.id}`,
        payload
      )


      /*
       * 2. Obtener asociaciones actuales
       */
      const existingRelations =
        productSuppliers.filter(
          (relation) =>
            relation.product_id ===
            editingProduct.id
        )


      const existingSupplierIds =
        existingRelations.map(
          (relation) =>
            relation.supplier_id
        )


      /*
       * 3. Detectar proveedores nuevos
       */
      const suppliersToAdd =
        selectedSupplierIds.filter(
          (supplierId) =>
            !existingSupplierIds.includes(
              supplierId
            )
        )


      /*
       * 4. Detectar proveedores quitados
       */
      const relationsToDelete =
        existingRelations.filter(
          (relation) =>
            !selectedSupplierIds.includes(
              relation.supplier_id
            )
        )


      /*
       * 5. Crear nuevas asociaciones
       */
      for (const supplierId of suppliersToAdd) {
        await api.post(
          '/product-suppliers/',
          {
            product_id: editingProduct.id,
            supplier_id: supplierId,
          }
        )
      }


      /*
       * 6. Eliminar asociaciones quitadas
       */
      for (const relation of relationsToDelete) {
        await api.delete(
          `/product-suppliers/${relation.id}`
        )
      }


      setSuccess(
        'Producto actualizado correctamente.'
      )

    } else {

      /*
       * 1. Crear producto
       */
      const productResponse = await api.post(
        '/products/',
        payload
      )

      const newProduct = productResponse.data


      /*
       * 2. Asociar proveedores habituales
       */
      for (const supplierId of selectedSupplierIds) {
        await api.post(
          '/product-suppliers/',
          {
            product_id: newProduct.id,
            supplier_id: supplierId,
          }
        )
      }


      /*
       * 3. Stock inicial opcional
       */
      if (
        initialStock.enabled &&
        Number(initialStock.quantity) > 0
      ) {

        if (!initialStock.lot_number.trim()) {
          throw new Error(
            'Para cargar stock inicial debe indicar un número de lote.'
          )
        }


        /*
         * Crear lote
         */
        const lotResponse = await api.post(
          '/lots/',
          {
            product_id: newProduct.id,

            supplier_id:
              initialStock.supplier_id
                ? Number(initialStock.supplier_id)
                : null,

            lot_number:
              initialStock.lot_number.trim(),

            entry_date:
              new Date()
                .toISOString()
                .slice(0, 10),

            expiration_date:
              initialStock.expiration_date ||
              null,

            purchase_cost:
              Number(form.purchase_price),
          }
        )


        const newLot = lotResponse.data


        /*
         * Crear movimiento de entrada
         */
        await api.post(
          '/stock-movements/',
          {
            lot_id: newLot.id,

            movement_type: 'IN',

            quantity:
              Number(initialStock.quantity),

            reason:
              'Stock inicial',

            reference:
              `INIT-${newProduct.id}`,
          }
        )
      }


      setSuccess(
        initialStock.enabled
          ? 'Producto y stock inicial creados correctamente.'
          : 'Producto creado correctamente.'
      )
    }


    /*
     * Limpiar formulario
     */
    setShowForm(false)

    setEditingProduct(null)

    setForm(emptyForm)

    setSelectedSupplierIds([])

    setInitialStock({
      enabled: false,
      quantity: '',
      lot_number: '',
      supplier_id: '',
      expiration_date: '',
    })


    /*
     * Recargar productos, stock y asociaciones
     */
    await loadProducts()

  } catch (err) {

    console.error(err)

    setFormError(
      err.response?.data?.detail ||
      err.message ||
      'No se pudo guardar el producto'
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
          Cargando productos...
        </div>
      </div>
    )
  }


  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            Productos
          </h1>

          <p className="text-muted mb-0">
            Consulta de productos y stock disponible
          </p>
        </div>

        {user.role === 'ADMIN' && (
          <button
            className="btn btn-primary"
            onClick={openNewProduct}
          >
            <i className="bi bi-plus-lg me-2"></i>
            Nuevo producto
          </button>
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


      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="input-group">
            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>

            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, código o código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>


      <div className="d-none d-md-block">
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-end">
                    Precio
                  </th>
                  <th className="text-end">
                    Stock
                  </th>
                  <th>Estado</th>

                  {user.role === 'ADMIN' && (
                    <th className="text-end">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <span className="fw-semibold">
                        {product.code}
                      </span>
                    </td>

                    <td>
                      <div className="fw-semibold">
                        {product.name}
                      </div>

                      {product.barcode && (
                        <small className="text-muted">
                          {product.barcode}
                        </small>
                      )}
                    </td>

                    <td>
                      {categoryName(
                        product.category_id
                      )}
                    </td>

                    <td className="text-end">
                      {formatMoney(
                        product.sale_price
                      )}
                    </td>

                    <td className="text-end fw-semibold">
                      {formatStock(product)}
                    </td>

                    <td>
                      {product.active ? (
                        <span className="badge text-bg-success">
                          Activo
                        </span>
                      ) : (
                        <span className="badge text-bg-secondary">
                          Inactivo
                        </span>
                      )}
                    </td>

                    {user.role === 'ADMIN' && (
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          title="Editar producto"
                          onClick={() =>
                            openEditProduct(product)
                          }
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        user.role === 'ADMIN'
                          ? 7
                          : 6
                      }
                      className="text-center py-4 text-muted"
                    >
                      No se encontraron productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      <div className="d-md-none">
        <div className="row g-3">
          {filteredProducts.map((product) => (
            <div
              className="col-12"
              key={product.id}
            >
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-3">
                    <div>
                      <div className="small text-muted">
                        {product.code}
                      </div>

                      <h2 className="h6 mb-1">
                        {product.name}
                      </h2>

                      <div className="small text-muted">
                        {categoryName(
                          product.category_id
                        )}
                      </div>
                    </div>

                    {product.active ? (
                      <span className="badge text-bg-success align-self-start">
                        Activo
                      </span>
                    ) : (
                      <span className="badge text-bg-secondary align-self-start">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <hr />

                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted d-block">
                        Precio
                      </small>

                      <strong>
                        {formatMoney(
                          product.sale_price
                        )}
                      </strong>
                    </div>

                    <div className="col-6 text-end">
                      <small className="text-muted d-block">
                        Stock
                      </small>

                      <strong>
                        {formatStock(product)}
                      </strong>
                    </div>
                  </div>

                  {user.role === 'ADMIN' && (
                    <div className="d-grid mt-3">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() =>
                          openEditProduct(product)
                        }
                      >
                        <i className="bi bi-pencil me-2"></i>
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {showForm && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">

                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingProduct
                      ? 'Editar producto'
                      : 'Nuevo producto'}
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeForm}
                  />
                </div>


                <form onSubmit={handleSubmit}>
                  <div className="modal-body">

                    {formError && (
                      <div className="alert alert-danger">
                        {formError}
                      </div>
                    )}


                    <div className="row g-3">

                      <div className="col-12 col-md-4">
                        <label className="form-label">
                          Código
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="code"
                          value={form.code}
                          onChange={handleChange}
                          required
                        />
                      </div>


                      <div className="col-12 col-md-8">
                        <label className="form-label">
                          Nombre
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                        />
                      </div>


                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Código de barras
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="barcode"
                          value={form.barcode}
                          onChange={handleChange}
                        />
                      </div>


                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Categoría
                        </label>

                        <select
                          className="form-select"
                          name="category_id"
                          value={form.category_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">
                            Seleccionar...
                          </option>

                          {categories.map((category) => (
                            <option
                              key={category.id}
                              value={category.id}
                            >
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>


                      <div className="col-12">
                        <label className="form-label">
                          Descripción
                        </label>

                        <textarea
                          className="form-control"
                          name="description"
                          rows="2"
                          value={form.description}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-12">
  <label className="form-label fw-semibold">
    Proveedores habituales
  </label>

  <div className="form-text mb-2">
    Seleccione uno o varios proveedores que comercializan este producto.
  </div>

  <div className="card bg-light border-0">
    <div className="card-body py-3">

      {suppliers
        .filter(
          (supplier) =>
            supplier.active !== false ||
            selectedSupplierIds.includes(
              supplier.id
            )
        )
        .map((supplier) => (
          <div
            className="form-check mb-2"
            key={supplier.id}
          >
            <input
              className="form-check-input"
              type="checkbox"
              id={`supplier-${supplier.id}`}
              checked={
                selectedSupplierIds.includes(
                  supplier.id
                )
              }
              onChange={() =>
                toggleSupplier(
                  supplier.id
                )
              }
            />

            <label
              className="form-check-label"
              htmlFor={`supplier-${supplier.id}`}
            >
              {supplier.name}

              {supplier.active === false && (
                <span className="badge text-bg-secondary ms-2">
                  Inactivo
                </span>
              )}
            </label>
          </div>
        ))}

      {suppliers.length === 0 && (
        <span className="text-muted">
          No hay proveedores registrados.
        </span>
      )}

    </div>
  </div>
</div>

                      <div className="col-6 col-md-3">
                        <label className="form-label">
                          Costo
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          name="purchase_price"
                          min="0"
                          step="0.01"
                          value={form.purchase_price}
                          onChange={handleChange}
                          required
                        />
                      </div>


                      <div className="col-6 col-md-3">
                        <label className="form-label">
                          Precio venta
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          name="sale_price"
                          min="0.01"
                          step="0.01"
                          value={form.sale_price}
                          onChange={handleChange}
                          required
                        />
                      </div>


                      <div className="col-6 col-md-3">
                        <label className="form-label">
                          Unidad stock
                        </label>

                        <select
                          className="form-select"
                          name="stock_unit"
                          value={form.stock_unit}
                          onChange={handleUnitChange}
                        >
                          <option value="UNIT">
                            Unidad
                          </option>

                          <option value="GRAM">
                            Gramos
                          </option>

                          <option value="ML">
                            Mililitros
                          </option>
                        </select>
                      </div>


                      <div className="col-6 col-md-3">
                        <label className="form-label">
                          Precio por cantidad
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          name="price_unit_quantity"
                          min="1"
                          step="1"
                          value={form.price_unit_quantity}
                          onChange={handleChange}
                          required
                        />
                      </div>


                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Stock mínimo
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          name="minimum_stock"
                          min="0"
                          step="1"
                          value={form.minimum_stock}
                          onChange={handleChange}
                          required
                        />
                      </div>


                      <div className="col-12 col-md-6 d-flex align-items-end">
                        <div className="form-check form-switch mb-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="productActive"
                            name="active"
                            checked={form.active}
                            onChange={handleChange}
                          />

                          <label
                            className="form-check-label"
                            htmlFor="productActive"
                          >
                            Producto activo
                          </label>
                        </div>
                      </div>
                      {!editingProduct && (
  <div className="col-12">
    <hr className="my-2" />

    <div className="form-check form-switch mb-3">
      <input
        className="form-check-input"
        type="checkbox"
        id="initialStockEnabled"
        name="enabled"
        checked={initialStock.enabled}
        onChange={handleInitialStockChange}
      />

      <label
        className="form-check-label fw-semibold"
        htmlFor="initialStockEnabled"
      >
        Cargar stock inicial
      </label>
    </div>

    {initialStock.enabled && (
      <div className="card bg-light border-0">
        <div className="card-body">

          <h6 className="mb-3">
            <i className="bi bi-box-arrow-in-down me-2"></i>
            Ingreso inicial
          </h6>

          <div className="row g-3">

            <div className="col-12 col-md-3">
              <label className="form-label">
                Cantidad
              </label>

              <input
                type="number"
                className="form-control"
                name="quantity"
                min="1"
                step="1"
                value={initialStock.quantity}
                onChange={handleInitialStockChange}
                required={initialStock.enabled}
              />

              <div className="form-text">
                {form.stock_unit === 'GRAM'
                  ? 'Cantidad en gramos'
                  : form.stock_unit === 'ML'
                    ? 'Cantidad en mililitros'
                    : 'Cantidad de unidades'}
              </div>
            </div>


            <div className="col-12 col-md-3">
              <label className="form-label">
                Número de lote
              </label>

              <input
                type="text"
                className="form-control"
                name="lot_number"
                value={initialStock.lot_number}
                onChange={handleInitialStockChange}
                required={initialStock.enabled}
              />
            </div>


            <div className="col-12 col-md-3">
              <label className="form-label">
                Proveedor
              </label>

              <select
                className="form-select"
                name="supplier_id"
                value={initialStock.supplier_id}
                onChange={handleInitialStockChange}
              >
                <option value="">
                  Sin proveedor
                </option>

                {suppliers
  .filter(
    (supplier) =>
      supplier.active !== false &&
      selectedSupplierIds.includes(
        supplier.id
      )
  )
                  .map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  ))}
              </select>
            </div>


            <div className="col-12 col-md-3">
              <label className="form-label">
                Vencimiento
              </label>

              <input
                type="date"
                className="form-control"
                name="expiration_date"
                value={initialStock.expiration_date}
                onChange={handleInitialStockChange}
              />
            </div>

          </div>

        </div>
      </div>
    )}
  </div>
)}

                    </div>


                    {(form.stock_unit === 'GRAM' ||
                      form.stock_unit === 'ML') && (
                      <div className="alert alert-info mt-3 mb-0">
                        {form.stock_unit === 'GRAM'
                          ? `El precio ingresado corresponde a ${form.price_unit_quantity} gramos.`
                          : `El precio ingresado corresponde a ${form.price_unit_quantity} ml.`}
                      </div>
                    )}

                  </div>


                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeForm}
                      disabled={saving}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-2"></i>
                          Guardar
                        </>
                      )}
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

export default Products