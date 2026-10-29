import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAction } from '../components/useFetch'
import { ErrorBox, Field } from '../components/ui'

/** Зөвхөн сайтын доторх зам руу буцаана */
export const safeNext = (next: string | null): string => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/learning')

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { busy, error, run } = useAction()

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const ok = await run(async () => {
            await login(email, password)
            return true
        })
        if (ok) navigate(safeNext(params.get('next')), { replace: true })
    }

    return (
        <div className="card auth-card">
            <h1>Нэвтрэх</h1>
            <form className="form" onSubmit={submit}>
                <Field label="Имэйл">
                    <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Нууц үг">
                    <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                <ErrorBox message={error} />
                <button className="btn btn-primary" disabled={busy}>
                    {busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
                </button>
            </form>
            <p className="muted small mt">
                Бүртгэлгүй юу? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}>Бүртгүүлэх</Link>
            </p>
        </div>
    )
}
