import { NavLink } from 'react-router-dom'

function Sidebar() {
  const user = JSON.parse(
    localStorage.getItem('vetstock_user') || '{}'
  )

  const linkClass = ({ isActive }) =>
    `nav-link text-white rounded px-3 py-2 ${
      isActive ? 'bg-primary' : ''
    }`

  const menu = (
    <nav className="nav nav-pills flex-column gap-1">
      <NavLink to="/dashboard" className={linkClass}>
        <i className="bi bi-speedometer2 me-2"></i>
        Inicio
      </NavLink>

      <NavLink to="/sales" className={linkClass}>
        <i className="bi bi-cart3 me-2"></i>
        Ventas
      </NavLink>

      <NavLink to="/cash" className={linkClass}>
        <i className="bi bi-cash-stack me-2"></i>
        Caja
      </NavLink>

      <NavLink to="/products" className={linkClass}>
        <i className="bi bi-box-seam me-2"></i>
        Productos
      </NavLink>

      <NavLink to="/alerts" className={linkClass}>
        <i className="bi bi-exclamation-triangle me-2"></i>
        Alertas
      </NavLink>

      {user.role === 'ADMIN' && (
        <>
          <hr className="border-secondary" />

          <div className="text-uppercase small text-secondary px-3 mb-1">
            Administración
          </div>

          <NavLink to="/admin" className={linkClass}>
            <i className="bi bi-gear me-2"></i>
            Configuración
          </NavLink>
        </>
      )}
    </nav>
  )

  return (
    <>
      <aside
        className="d-none d-lg-flex flex-column bg-dark text-white p-3"
        style={{
          width: '260px',
          minHeight: '100vh',
        }}
      >
        <div className="mb-4 px-2">
          <h4 className="mb-0">
            <i className="bi bi-heart-pulse me-2"></i>
            VetStock
          </h4>

          <small className="text-secondary">
            Gestión veterinaria
          </small>
        </div>

        {menu}
      </aside>

      <div
        className="offcanvas offcanvas-start bg-dark text-white"
        tabIndex="-1"
        id="mobileMenu"
      >
        <div className="offcanvas-header">
          <div>
            <h5 className="offcanvas-title mb-0">
              VetStock
            </h5>

            <small className="text-secondary">
              Gestión veterinaria
            </small>
          </div>

          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
          />
        </div>

        <div className="offcanvas-body">
          {menu}
        </div>
      </div>
    </>
  )
}

export default Sidebar