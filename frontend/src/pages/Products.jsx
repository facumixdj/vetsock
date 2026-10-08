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
  const [productConversions, setProductConversions] = useState([])

const [showConversion, setShowConversion] = useState(false)
const [conversionProduct, setConversionProduct] = useState(null)

const [selectedConversionId, setSelectedConversionId] = useState('')
const [selectedConversionLotId, setSelectedConversionLotId] = useState('')
const [conversionTimes, setConversionTimes] = useState(1)

const [converting, setConverting] = useState(false)
const [showStockEntry, setShowStockEntry] = useState(false)
const [stockEntryProduct, setStockEntryProduct] = useState(null)
const [savingStockEntry, setSavingStockEntry] = useState(false)

const [stockEntry, setStockEntry] = useState({
  quantity: '',
  lot_number: '',
  supplier_id: '',
  expiration_date: '',
  purchase_cost: '',
})
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
        productConversionsResponse,
      ] = await Promise.all([
        api.get('/products/'),
        api.get('/categories/'),
        api.get('/suppliers/'),
        api.get('/product-suppliers/'),
        api.get('/product-conversions/'),
      ])

      const productList = productsResponse.data

      setProducts(productList)
      setCategories(categoriesResponse.data)
      setSuppliers(suppliersResponse.data)
      setProductSuppliers(productSuppliersResponse.data)
      setProductConversions(productConversionsResponse.data)

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
const getProduct = (productId) => {
  return products.find(
    (product) => product.id === productId
  )
}


const getProductConversions = (productId) => {
  return productConversions.filter(
    (conversion) =>
      conversion.source_product_id === productId
  )
}


const hasConversion = (productId) => {
  return getProductConversions(productId).length > 0
}


const openConversion = (product) => {
  const conversions =
    getProductConversions(product.id)

  if (conversions.length === 0) {
    setError(
      `El producto "${product.name}" no tiene una regla de fraccionamiento configurada.`
    )
    return
  }

  const availableLots =
    stocks[product.id]?.lots?.filter(
      (lot) => Number(lot.stock) > 0
    ) || []

  if (availableLots.length === 0) {
    setError(
      `El producto "${product.name}" no tiene stock disponible para fraccionar.`
    )
    return
  }

  setConversionProduct(product)

  setSelectedConversionId(
    String(conversions[0].id)
  )

  setSelectedConversionLotId(
    String(availableLots[0].lot_id)
  )

  setConversionTimes(1)

  setError('')
  setSuccess('')
  setShowConversion(true)
}


const executeConversion = async (event) => {
  event.preventDefault()

  if (
    !selectedConversionId ||
    !selectedConversionLotId
  ) {
    setError(
      'Debe seleccionar una conversión y un lote.'
    )
    return
  }

  setConverting(true)
  setError('')
  setSuccess('')

  try {
    const response = await api.post(
      `/product-conversions/${selectedConversionId}/execute`,
      {
        source_lot_id:
          Number(selectedConversionLotId),

        times:
          Number(conversionTimes),
      }
    )

    setShowConversion(false)
    setConversionProduct(null)

    setSuccess(
      response.data.message ||
      'Producto fraccionado correctamente.'
    )

    await loadProducts()

  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'No se pudo realizar el fraccionamiento'
    )
  } finally {
    setConverting(false)
  }
}
  const openStockEntry = (product) => {
  const habitualSupplierIds = productSuppliers
    .filter(
      (relation) =>
        relation.product_id === product.id
    )
    .map(
      (relation) =>
        relation.supplier_id
    )

  const firstSupplier =
    suppliers.find(
      (supplier) =>
        habitualSupplierIds.includes(
          supplier.id
        ) &&
        supplier.active !== false
    )

  setStockEntryProduct(product)

  setStockEntry({
    quantity: '',
    lot_number: '',
    supplier_id:
      firstSupplier?.id
        ? String(firstSupplier.id)
        : '',
    expiration_date: '',
    purchase_cost:
      product.purchase_price ?? '',
  })

  setError('')
  setSuccess('')
  setShowStockEntry(true)
}


const handleStockEntryChange = (event) => {
  const { name, value } = event.target

  setStockEntry((current) => ({
    ...current,
    [name]: value,
  }))
}


const saveStockEntry = async (event) => {
  event.preventDefault()

  if (!stockEntryProduct) {
    return
  }

  const quantity = Number(stockEntry.quantity)
  const lotNumber = stockEntry.lot_number.trim()
  const purchaseCost = Number(stockEntry.purchase_cost || 0)

  if (!Number.isFinite(quantity) || quantity <= 0) {
    setError('La cantidad debe ser mayor que cero.')
    return
  }

  if (!lotNumber) {
    setError('Debe indicar un número de lote.')
    return
  }

  if (!Number.isFinite(purchaseCost) || purchaseCost < 0) {
    setError('El costo de compra no es válido.')
    return
  }

  setSavingStockEntry(true)
  setError('')
  setSuccess('')

  try {
    const existingLot =
      stocks[stockEntryProduct.id]?.lots?.find(
        (lot) =>
          String(lot.lot_number || '').trim().toLowerCase() ===
          lotNumber.toLowerCase()
      )

    let lotId

    if (existingLot) {
      lotId = existingLot.lot_id
    } else {
      const lotResponse = await api.post(
        '/lots/',
        {
          product_id: stockEntryProduct.id,
          supplier_id:
            stockEntry.supplier_id
              ? Number(stockEntry.supplier_id)
              : null,
          lot_number: lotNumber,
          entry_date:
            new Date().toISOString().slice(0, 10),
          expiration_date:
            stockEntry.expiration_date || null,
          purchase_cost: purchaseCost,
        }
      )

      lotId = lotResponse.data.id
    }

    await api.post(
      '/stock-movements/',
      {
        lot_id: lotId,
        movement_type: 'IN',
        quantity,
        reason: 'Ingreso de mercadería',
        reference: `COMPRA-${Date.now()}`,
      }
    )

    setShowStockEntry(false)
    setStockEntryProduct(null)

    setStockEntry({
      quantity: '',
      lot_number: '',
      supplier_id: '',
      expiration_date: '',
      purchase_cost: '',
    })

    setSuccess(
      existingLot
        ? `Stock agregado al lote ${lotNumber} correctamente.`
        : `Nuevo lote ${lotNumber} ingresado correctamente.`
    )

    await loadProducts()

  } catch (err) {
    console.error(err)

    setError(
      err.response?.data?.detail ||
      err.message ||
      'No se pudo ingresar el stock'
    )
  } finally {
    setSavingStockEntry(false)
  }
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

<th className="text-end">
  Acciones
</th>
                  
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

                    <td className="text-end">

                      {user.role === 'ADMIN' && (
                        <button
                          className="btn btn-sm btn-outline-dark me-2"
                          title="Ingresar stock"
                          onClick={() =>
                            openStockEntry(product)
                          }
                        >
                          <i className="bi bi-box-arrow-in-down"></i>
                        </button>
                      )}

                      {hasConversion(product.id) && (
                        <button
                          className="btn btn-sm btn-outline-success me-2"
                          title="Abrir / Fraccionar"
                          onClick={() =>
                            openConversion(product)
                          }
                        >
                          <i className="bi bi-box-arrow-up-right"></i>
                        </button>
                      )}

                      {user.role === 'ADMIN' && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          title="Editar producto"
                          onClick={() =>
                            openEditProduct(product)
                          }
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                      )}

                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
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

                  <div className="d-grid gap-2 mt-3">

                    {user.role === 'ADMIN' && (
                      <button
                        className="btn btn-outline-dark"
                        onClick={() =>
                          openStockEntry(product)
                        }
                      >
                        <i className="bi bi-box-arrow-in-down me-2"></i>
                        Ingresar stock
                      </button>
                    )}

                    {hasConversion(product.id) && (
                      <button
                        className="btn btn-outline-success"
                        onClick={() =>
                          openConversion(product)
                        }
                      >
                        <i className="bi bi-box-arrow-up-right me-2"></i>
                        Abrir / Fraccionar
                      </button>
                    )}

                    {user.role === 'ADMIN' && (
                      <button
                        className="btn btn-outline-primary"
                        onClick={() =>
                          openEditProduct(product)
                        }
                      >
                        <i className="bi bi-pencil me-2"></i>
                        Editar
                      </button>
                    )}

                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {showConversion && conversionProduct && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">

                <form onSubmit={executeConversion}>

                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title">
                        Abrir / Fraccionar
                      </h5>

                      <small className="text-muted">
                        {conversionProduct.name}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      disabled={converting}
                      onClick={() =>
                        setShowConversion(false)
                      }
                    />
                  </div>


                  <div className="modal-body">

                    <div className="mb-3">
                      <label className="form-label">
                        Conversión
                      </label>

                      <select
                        className="form-select"
                        value={selectedConversionId}
                        onChange={(event) =>
                          setSelectedConversionId(
                            event.target.value
                          )
                        }
                        required
                      >
                        {getProductConversions(
                          conversionProduct.id
                        ).map((conversion) => {
                          const target =
                            getProduct(
                              conversion.target_product_id
                            )

                          return (
                            <option
                              key={conversion.id}
                              value={conversion.id}
                            >
                              {conversion.name}
                              {' - '}
                              {conversion.source_quantity}
                              {' → '}
                              {conversion.target_quantity}
                              {' '}
                              {target?.stock_unit === 'GRAM'
                                ? 'g'
                                : target?.stock_unit === 'ML'
                                  ? 'ml'
                                  : 'u.'}
                            </option>
                          )
                        })}
                      </select>
                    </div>


                    <div className="mb-3">
                      <label className="form-label">
                        Lote a abrir
                      </label>

                      <select
                        className="form-select"
                        value={selectedConversionLotId}
                        onChange={(event) =>
                          setSelectedConversionLotId(
                            event.target.value
                          )
                        }
                        required
                      >
                        {(
                          stocks[
                            conversionProduct.id
                          ]?.lots || []
                        )
                          .filter(
                            (lot) =>
                              Number(lot.stock) > 0
                          )
                          .map((lot) => (
                            <option
                              key={lot.lot_id}
                              value={lot.lot_id}
                            >
                              {lot.lot_number}
                              {' - Stock: '}
                              {lot.stock}
                              {' '}
                              {conversionProduct.stock_unit === 'UNIT'
                                ? 'u.'
                                : conversionProduct.stock_unit === 'GRAM'
                                  ? 'g'
                                  : 'ml'}
                            </option>
                          ))}
                      </select>
                    </div>


                    <div className="mb-3">
                      <label className="form-label">
                        Cantidad a abrir
                      </label>

                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        step="1"
                        value={conversionTimes}
                        onChange={(event) =>
                          setConversionTimes(
                            event.target.value
                          )
                        }
                        required
                      />

                      <div className="form-text">
                        Normalmente será 1 bolsa.
                      </div>
                    </div>


                    {selectedConversionId && (() => {
                      const conversion =
                        productConversions.find(
                          (item) =>
                            item.id ===
                            Number(selectedConversionId)
                        )

                      if (!conversion) {
                        return null
                      }

                      const target =
                        getProduct(
                          conversion.target_product_id
                        )

                      return (
                        <div className="alert alert-info mb-0">

                          <div>
                            Se descontará:
                            <strong className="ms-2">
                              {
                                conversion.source_quantity *
                                Number(conversionTimes || 1)
                              }
                              {' '}
                              {conversionProduct.stock_unit === 'UNIT'
                                ? 'u.'
                                : conversionProduct.stock_unit === 'GRAM'
                                  ? 'g'
                                  : 'ml'}
                            </strong>
                          </div>

                          <div className="mt-2">
                            Se generará:
                            <strong className="ms-2">
                              {
                                conversion.target_quantity *
                                Number(conversionTimes || 1)
                              }
                              {' '}
                              {target?.stock_unit === 'GRAM'
                                ? 'g'
                                : target?.stock_unit === 'ML'
                                  ? 'ml'
                                  : 'u.'}
                            </strong>
                          </div>

                          {target && (
                            <div className="mt-2">
                              Producto destino:
                              <strong className="ms-2">
                                {target.name}
                              </strong>
                            </div>
                          )}

                        </div>
                      )
                    })()}

                  </div>


                  <div className="modal-footer">

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={converting}
                      onClick={() =>
                        setShowConversion(false)
                      }
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={converting}
                    >
                      {converting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-up-right me-2"></i>
                          Confirmar apertura
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


      {showStockEntry && stockEntryProduct && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">

                <form onSubmit={saveStockEntry}>

                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title">
                        Ingresar stock
                      </h5>

                      <small className="text-muted">
                        {stockEntryProduct.name}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      disabled={savingStockEntry}
                      onClick={() =>
                        setShowStockEntry(false)
                      }
                    />
                  </div>


                  <div className="modal-body">

                    <div className="alert alert-light border">
                      Stock actual:
                      <strong className="ms-2">
                        {formatStock(stockEntryProduct)}
                      </strong>
                    </div>


                    <div className="row g-3">

                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Cantidad
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          name="quantity"
                          min="1"
                          step="1"
                          value={stockEntry.quantity}
                          onChange={handleStockEntryChange}
                          required
                          autoFocus
                        />

                        <div className="form-text">
                          {stockEntryProduct.stock_unit === 'GRAM'
                            ? 'Ingresar cantidad en gramos'
                            : stockEntryProduct.stock_unit === 'ML'
                              ? 'Ingresar cantidad en mililitros'
                              : 'Ingresar cantidad de unidades'}
                        </div>
                      </div>


                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Número de lote
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="lot_number"
                          value={stockEntry.lot_number}
                          onChange={handleStockEntryChange}
                          required
                        />

                        <div className="form-text">
                          Si el lote ya existe, el stock se suma al mismo lote.
                        </div>
                      </div>


                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Proveedor
                        </label>

                        <select
                          className="form-select"
                          name="supplier_id"
                          value={stockEntry.supplier_id}
                          onChange={handleStockEntryChange}
                        >
                          <option value="">
                            Sin proveedor
                          </option>

                          {suppliers
                            .filter(
                              (supplier) =>
                                supplier.active !== false
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


                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Vencimiento
                        </label>

                        <input
                          type="date"
                          className="form-control"
                          name="expiration_date"
                          value={stockEntry.expiration_date}
                          onChange={handleStockEntryChange}
                        />
                      </div>


                      <div className="col-12">
                        <label className="form-label">
                          Costo de compra
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            $
                          </span>

                          <input
                            type="number"
                            className="form-control"
                            name="purchase_cost"
                            min="0"
                            step="0.01"
                            value={stockEntry.purchase_cost}
                            onChange={handleStockEntryChange}
                            required
                          />
                        </div>

                        <div className="form-text">
                          Para un lote nuevo se guardará este costo.
                          Si el lote ya existe, se conserva el costo registrado del lote.
                        </div>
                      </div>

                    </div>

                  </div>


                  <div className="modal-footer">

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={savingStockEntry}
                      onClick={() =>
                        setShowStockEntry(false)
                      }
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn btn-dark"
                      disabled={savingStockEntry}
                    >
                      {savingStockEntry ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Ingresando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-down me-2"></i>
                          Confirmar ingreso
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