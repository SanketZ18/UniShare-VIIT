import { useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail, X, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'

export default function LoginModal({ isOpen, onClose }) {
  const { login, authBusy } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [serverWaking, setServerWaking] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let active = true
    const checkServer = async () => {
      // Start a timeout. If the server doesn't respond in 1 second, it is likely cold.
      const timeoutId = setTimeout(() => {
        if (active) {
          setServerWaking(true)
        }
      }, 1000)

      try {
        await api.get('/auth/ping')
        clearTimeout(timeoutId)
        if (active) {
          setServerWaking(false)
        }
      } catch (err) {
        // Even if it failed with error, a response means the container is awake
        clearTimeout(timeoutId)
        if (active) {
          setServerWaking(false)
        }
      }
    }

    checkServer()

    return () => {
      active = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      await login(form)
      onClose()
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Authentication failed. Please verify your credentials.')
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_26%),rgba(255,249,239,0.78)] backdrop-blur-md"
        onClick={onClose}
      />

      <div className="portal-slit-enter relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-white bg-[linear-gradient(180deg,#fffdfa_0%,#fff7eb_100%)] p-8 shadow-[0_32px_90px_rgba(194,65,12,0.16)] sm:p-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_55%,#fb923c_100%)]" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-100 bg-white/80 text-amber-700 transition hover:border-amber-200 hover:bg-amber-50"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-18 w-18 items-center justify-center rounded-[1.75rem] bg-amber-100 text-amber-700 shadow-[0_16px_40px_rgba(245,158,11,0.18)]">
            <Lock size={30} strokeWidth={2.2} />
          </div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Institutional Access</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-[2.1rem]">Sign in to UniShare</h2>
          <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-800">
            Access your academic workspace.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Institutional Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="email"
                required
                autoFocus
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="w-full rounded-[1.35rem] border border-amber-100 bg-white px-4 py-3.5 pl-12 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-amber-50/40 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.14)]"
                placeholder="name@viit.ac.in"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Password</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="w-full rounded-[1.35rem] border border-amber-100 bg-white px-4 py-3.5 pl-12 pr-12 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-amber-50/40 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.14)]"
                placeholder="Enter your access password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-amber-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {serverWaking && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 animate-pulse flex items-center gap-2">
              <Zap size={14} className="text-amber-600 shrink-0" />
              <span>Server is waking up from sleep. First-time login may take a few moments...</span>
            </div>
          )}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={authBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_36px_rgba(249,115,22,0.24)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {authBusy ? 'Authenticating...' : 'Enter Dashboard'}
            {!authBusy && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="mt-8 border-t border-amber-100 pt-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-800">Secured by VIIT Infrastructure</p>
        </div>
      </div>
    </div>
  )
}
