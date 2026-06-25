import { startTransition, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUser, loginUser, registerUser, updateProfile as apiUpdateProfile } from '../services/authService'
import { setAuthToken } from '../services/api'
import { AuthContext } from './AuthContextValue'

const AUTH_STORAGE_KEY = 'unishare_auth'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    return stored ? JSON.parse(stored).token : null
  })
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    return stored ? JSON.parse(stored).user : null
  })
  const [booting, setBooting] = useState(Boolean(token))
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  useEffect(() => {
    if (!token) {
      return
    }

    let active = true

    fetchCurrentUser()
      .then((profile) => {
        if (!active) {
          return
        }
        startTransition(() => {
          setUser(profile)
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: profile }))
        })
      })
      .catch(() => {
        if (!active) {
          return
        }
        localStorage.removeItem(AUTH_STORAGE_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (active) {
          setBooting(false)
        }
      })

    return () => {
      active = false
    }
  }, [token])

  const login = async (credentials) => {
    setAuthBusy(true)
    setBooting(true)
    try {
      const session = await loginUser(credentials)
      setAuthToken(session.token)
      setToken(session.token)
      setUser(session.user)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: session.token, user: session.user }))
      return session.user
    } catch (error) {
      setBooting(false)
      throw error
    } finally {
      setAuthBusy(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }

  const register = async (payload) => {
    setAuthBusy(true)
    try {
      return await registerUser(payload)
    } finally {
      setAuthBusy(false)
    }
  }

  const updateProfile = async (payload) => {
    setAuthBusy(true)
    try {
      const updatedUser = await apiUpdateProfile(payload)
      setUser(updatedUser)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: updatedUser }))
      return updatedUser
    } finally {
      setAuthBusy(false)
    }
  }

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      authBusy,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      register,
      updateProfile,
    }),
    [token, user, booting, authBusy],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
