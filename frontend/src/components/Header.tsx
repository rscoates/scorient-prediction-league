import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-brand-950 text-white shadow-md">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <img src="/scorient-logo.png" alt="Scorient" className="h-8 w-auto" />
          <div className="hidden sm:block">
            <div className="text-base font-semibold leading-tight">Scorient</div>
            <div className="text-xs text-brand-300 italic leading-tight">Dignitatem in Proelio</div>
          </div>
        </Link>

        <nav className="flex gap-4 ml-4 text-sm">
          <Link to="/" className="text-brand-200 hover:text-white transition-colors">Home</Link>
          <Link to="/predictions" className="text-brand-200 hover:text-white transition-colors">Predictions</Link>
          {user?.is_admin ? (
            <Link to="/admin" className="text-brand-300 hover:text-brand-200 transition-colors">Admin</Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full border-2 border-brand-700" />
          )}
          <span className="text-sm text-brand-300 hidden sm:block">
            {user?.display_name ?? user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-brand-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
