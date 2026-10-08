import { Link, useNavigate } from 'react-router-dom'

function Topbar() {
  const navigate = useNavigate()

  const user = JSON.parse(
    localStorage.getItem('vetstock_user') || '{}'
  )

  const logout = () => {
    localStorage.removeItem('vetstock_token')
    localStorage.removeItem('vetstock_user')

    navigate('/login')
  }

  return (
    <nav className="navbar bg-white border-bottom shadow-sm px-3 sticky-top">
      <div className="container-fluid px-0">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary d-lg-none"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobileMenu"
          >
            <i className="bi bi-list fs-4"></i>
          </button>

          <span className="navbar-brand mb-0 d-lg-none">
            VetStock
          </span>
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          <div className="text-end d-none d-sm-block">
            <div className="fw-semibold">
              {user.full_name || user.username}
            </div>

            <small className="text-muted">
              {user.role === 'ADMIN'
                ? 'Administrador'
                : 'Vendedor'}
            </small>
          </div>
          

          <div
            className="rounded-circle bg-light border d-flex align-items-center justify-content-center"
            style={{
              width: '40px',
              height: '40px',
            }}
          >
            <i className="bi bi-person"></i>
          </div>

          <button
            className="btn btn-outline-danger"
            onClick={logout}
            title="Cerrar sesión"
          >
            <i className="bi bi-box-arrow-right"></i>

            <span className="d-none d-md-inline ms-2">
              Salir
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Topbar