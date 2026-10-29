import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Role } from '../api/types'
import { useAuth } from './AuthContext'
import { Spinner } from '../components/ui'

/** Нэвтрээгүй бол /login руу, эрх хүрэхгүй бол нүүр хуудас руу */
export default function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) return <Spinner />
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
    return <>{children}</>
}
