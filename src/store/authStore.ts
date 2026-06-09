import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

type AuthState = {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser, remember: boolean) => void
  clearAuth: () => void
}

const localAuthStorageKey = 'preproute-auth'
const sessionAuthStorageKey = 'preproute-auth-session'

const clearBothStorages = () => {
  localStorage.removeItem(localAuthStorageKey)
  sessionStorage.removeItem(sessionAuthStorageKey)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user, remember) => {
        const nextStorage = remember ? localStorage : sessionStorage
        const inactiveStorageKey = remember ? sessionAuthStorageKey : localAuthStorageKey

        localStorage.removeItem(inactiveStorageKey)
        nextStorage.setItem(
          remember ? localAuthStorageKey : sessionAuthStorageKey,
          JSON.stringify({ state: { token, user }, version: 0 }),
        )

        set({ token, user })
      },
      clearAuth: () => {
        clearBothStorages()
        set({ token: null, user: null })
      },
    }),
    {
      name: localAuthStorageKey,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)

export const hydrateAuthFromStorage = () => {
  const localRaw = localStorage.getItem(localAuthStorageKey)
  const sessionRaw = sessionStorage.getItem(sessionAuthStorageKey)
  const source = localRaw ?? sessionRaw

  if (!source) {
    return
  }

  try {
    const parsed = JSON.parse(source) as {
      state?: { token?: string | null; user?: AuthUser | null }
    }
    useAuthStore.setState({
      token: parsed.state?.token ?? null,
      user: parsed.state?.user ?? null,
    })
  } catch {
    clearBothStorages()
    useAuthStore.setState({ token: null, user: null })
  }
}
