import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function MainLayout() {
  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar />

      <div className="flex-grow-1 min-vh-100">
        <Topbar />

        <main className="container-fluid py-4 px-3 px-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout