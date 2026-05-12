import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  PlusSquare,
  Settings,
  UserRound,
  UserRoundPlus,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import viitLogo from '../assets/logo.png'
import NotificationBell from '../components/ui/NotificationBell'

const navigation = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'DIRECTOR', 'SENIOR_CLERK', 'HOD', 'STAFF', 'STUDENT'] },
  { label: 'Resources', to: '/resources', icon: FolderKanban, roles: ['SUPER_ADMIN', 'DIRECTOR', 'SENIOR_CLERK', 'HOD', 'STAFF', 'STUDENT'] },
  { label: 'Bookmarks', to: '/bookmarks', icon: BookMarked, roles: ['SUPER_ADMIN', 'DIRECTOR', 'SENIOR_CLERK', 'HOD', 'STAFF', 'STUDENT'] },
  { label: 'Upload Content', to: '/upload', icon: PlusSquare, roles: ['SUPER_ADMIN', 'DIRECTOR', 'HOD', 'STAFF'] },
  { label: 'Registration', to: '/register', icon: UserRoundPlus, roles: ['SUPER_ADMIN', 'DIRECTOR', 'SENIOR_CLERK', 'HOD'] },
  { label: 'Account Settings', to: '/profile', icon: UserRound, roles: ['SUPER_ADMIN', 'DIRECTOR', 'SENIOR_CLERK', 'HOD', 'STAFF', 'STUDENT'] },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef(null)
  const settingsButtonRef = useRef(null)

  const activeLabel = navigation.find((item) => location.pathname.startsWith(item.to))?.label || 'Academic Hub'

  useEffect(() => {
    setSettingsOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    sessionStorage.setItem('justLoggedOut', 'true')
    logout()
    navigate('/', { replace: true })
  }

  useEffect(() => {
    if (!settingsOpen) return undefined

    const handlePointerDown = (event) => {
      if (settingsRef.current?.contains(event.target) || settingsButtonRef.current?.contains(event.target)) {
        return
      }

      setSettingsOpen(false)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [settingsOpen])

  return (
    <div className="portal-dashboard-shell flex h-screen overflow-hidden antialiased">
      <aside
        className={`portal-sidebar sticky top-0 z-20 flex h-screen shrink-0 flex-col overflow-hidden border-r border-amber-200/20 transition-all duration-500 ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <button
          onClick={() => setCollapsed((value) => !value)}
          className="portal-button-secondary absolute -right-3 top-8 z-[100] flex h-7 w-7 items-center justify-center rounded-xl text-slate-800 shadow-xl"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="border-b border-amber-200/12 px-5 py-5">
          <div className={`portal-panel portal-3d flex items-center gap-4 rounded-[1.8rem] p-4 ${collapsed ? 'justify-center' : ''}`}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2.5 shadow-[0_16px_36px_rgba(249,115,22,0.12)]">
              <img src={viitLogo} alt="VIIT" className="h-full w-auto object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-display text-xl font-black tracking-tight text-slate-950">UniShare</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">VIIT Academic Portal</p>
              </div>
            )}
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5">
          {navigation
            .filter((item) => item.roles.includes(user?.role))
            .map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl px-4 py-3 text-[13px] font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-[linear-gradient(135deg,#fff8e1,rgba(255,247,237,0.8))] text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_24px_rgba(245,158,11,0.08)]'
                        : 'text-slate-700 hover:bg-amber-50/50 hover:text-amber-900'
                    } ${collapsed ? 'justify-center px-3' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                          isActive
                            ? 'border-amber-200 bg-white text-amber-600 shadow-sm'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 group-hover:border-amber-200 group-hover:text-amber-600'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {isActive && !collapsed && <div className="ml-auto h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]" />}
                    </>
                  )}
                </NavLink>
              )
            })}
        </nav>

        <div className="mt-auto border-t border-amber-200/12 px-4 py-4">
          <div className={`portal-panel rounded-[1.6rem] p-3 ${collapsed ? 'items-center' : ''}`}>
            {!collapsed && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#ea580c_100%)] text-sm font-black text-white shadow-[0_12px_24px_rgba(194,65,12,0.18)]">
                  {user?.fullName?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-black">{user?.fullName}</p>
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-slate-900">{user?.role?.replaceAll('_', ' ')}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`portal-button-secondary mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.18em] ${
                collapsed ? 'px-0' : 'px-3'
              }`}
            >
              <LogOut size={14} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-amber-200/30 bg-white/70 px-2 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">Dashboard</p>
            <h2 className="mt-1 font-display text-lg font-black text-slate-900">{activeLabel}</h2>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            
            <div className="relative">
              <button
                ref={settingsButtonRef}
                onClick={() => setSettingsOpen((value) => !value)}
                className={`portal-button-secondary flex h-10 w-10 items-center justify-center rounded-2xl ${
                  settingsOpen ? 'border-amber-200 bg-white text-amber-600 shadow-sm' : 'text-slate-800'
                }`}
              >
                <Settings size={18} />
              </button>

              {settingsOpen && (
                <div ref={settingsRef} className="portal-panel portal-slit-enter absolute right-0 top-full z-[100] mt-5 w-60 rounded-[1.6rem] p-2 shadow-[0_32px_64px_rgba(15,23,42,0.12)]">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">System Panel</p>
                  </div>
                  <div className="space-y-1 p-2">
                    <NavLink
                      to="/profile"
                      onClick={() => setSettingsOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-800 transition hover:bg-amber-50 hover:text-amber-900"
                    >
                      <UserRound size={15} />
                      Profile Settings
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
          <div className="w-full">
            <Outlet />
          </div>
          <footer className="mt-10 border-t border-amber-200/30 py-8 text-center">
            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.25em] text-slate-950">
              Website Developed By <span className="bg-[linear-gradient(135deg,#f59e0b_0%,#ea580c_100%)] bg-clip-text text-transparent">Sanket Zagade</span>
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
              Email - <a href="mailto:sanketzagade2004@gmail.com" className="text-amber-600 hover:underline">sanketzagade2004@gmail.com</a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
