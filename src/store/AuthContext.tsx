
// store/AuthContext.tsx
// Global authentication state.
// Private key lives ONLY in this context — in JS memory.
// Never written to localStorage, sessionStorage, or IndexedDB.

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type { UserProfile } from '../api/client'

interface AuthState {
  user: UserProfile | null
  privateKey: CryptoKey | null  // in memory only, never persisted
  isLoading: boolean
}

type AuthAction =
  | { type: 'SET_AUTH'; user: UserProfile; privateKey: CryptoKey }
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_LOADING'; value: boolean }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, user: action.user, privateKey: action.privateKey, isLoading: false }
    case 'CLEAR_AUTH':
      return { user: null, privateKey: null, isLoading: false }
    case 'SET_LOADING':
      return { ...state, isLoading: action.value }
    default:
      return state
  }
}

interface AuthContextValue extends AuthState {
  setAuth: (user: UserProfile, privateKey: CryptoKey) => void
  clearAuth: () => void
  setLoading: (v: boolean) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    privateKey: null,
    isLoading: true,
  })

  const setAuth = useCallback((user: UserProfile, privateKey: CryptoKey) => {
    dispatch({ type: 'SET_AUTH', user, privateKey })
  }, [])

  const clearAuth = useCallback(() => {
    dispatch({ type: 'CLEAR_AUTH' })
  }, [])

  const setLoading = useCallback((value: boolean) => {
    dispatch({ type: 'SET_LOADING', value })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth, setLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}