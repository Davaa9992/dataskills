import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'
import { Me } from '../api/types'

interface AuthState {
    user: Me | null
    loading: boolean
    refresh: () => Promise<void>
    login: (email: string, password: string) => Promise<void>
    signup: (data: { email: string; password: string; full_name: string }) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Me | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            setUser(await api<Me>('/user/info'))
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const login = async (email: string, password: string) => {
        await api('/user/login', 'POST', { email, password })
        await refresh()
    }

    const signup = async (data: { email: string; password: string; full_name: string }) => {
        await api('/user/sign_up', 'POST', data)
        await refresh()
    }

    const logout = async () => {
        await api('/user/logout', 'POST').catch(() => undefined)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, refresh, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth нь AuthProvider дотор ашиглагдана')
    return ctx
}
