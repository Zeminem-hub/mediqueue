import { Activity, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AppShell({
  children,
  eyebrow,
  title,
  subtitle,
  action,
  compact = false,
}) {
  const { profile, user, signOut } = useAuth()
  const displayName = profile?.full_name || profile?.name || user?.email || 'MediQueue user'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark"><Activity size={20} strokeWidth={2.5} /></span>
          <span>MediQueue</span>
        </a>

        <div className="topbar-user">
          <div className="topbar-user-copy">
            <strong>{displayName}</strong>
            <span>{profile?.role || 'Account'}</span>
          </div>
          <span className="avatar">{initials}</span>
          <button className="icon-button icon-button--light" onClick={signOut} title="Sign out" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className={compact ? 'page page--compact' : 'page'}>
        {(title || eyebrow) && (
          <div className="page-heading">
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              {title && <h1>{title}</h1>}
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {action && <div className="page-action">{action}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
