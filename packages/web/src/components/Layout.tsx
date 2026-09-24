import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Icon } from './Icon'

export function Wordmark({ to }: { to?: string }) {
  const content = (
    <>
      benefit
      <small>Illustration module</small>
    </>
  )
  return to ? (
    <Link to={to} className="wordmark">
      {content}
    </Link>
  ) : (
    <span className="wordmark">{content}</span>
  )
}

const NAV = [
  {
    label: 'Illustrations',
    items: [
      { to: '/calculate', label: 'New illustration' },
      { to: '/history', label: 'Saved illustrations' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile' },
      { to: '/how-it-works', label: 'How it works' },
    ],
  },
]

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuOpen = menuOpenOn === pathname
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null)

  if (pathname === '/login' || !user) return <Outlet />

  return (
    <div className={`shell${menuOpen ? ' menu-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <Wordmark to="/calculate" />
        </div>
        <nav className="side-nav">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="side-group-label">{group.label}</div>
              <ul>
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className="side-link">
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="side-link"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
            >
              Sign out
            </button>
          </div>
        </nav>
        <div className="help-card">
          <Icon name="help" size={30} />
          <h3>Questions?</h3>
          <p>See exactly how premiums, bonuses and benefits are worked out.</p>
          <Link to="/how-it-works">
            How it works <Icon name="arrowUpRight" size={15} />
          </Link>
        </div>
      </aside>
      <div className="scrim" onClick={() => setMenuOpen(false)} />

      <div className="main">
        <header className="mobile-bar">
          <button type="button" className="btn btn-ghost" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={22} />
          </button>
          <Wordmark to="/calculate" />
          <Link to="/profile" className="avatar" aria-label="Profile">
            {user.fullName.charAt(0)}
          </Link>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
