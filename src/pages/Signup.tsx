import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAction } from '../components/useFetch'
import { ErrorBox, Field } from '../components/ui'
import { safeNext } from './Login'

export default function Signup() {
    const { signup } = useAuth()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [form, setForm] = useState({ full_name: '', email: '', password: '' })
    const { busy, error, setError, run } = useAction()

    const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(form.password)) {
            setError('Нууц үг хамгийн багадаа 8 тэмдэгт, үсэг болон тоо агуулсан байна')
            return
        }
        const ok = await run(async () => {
            await signup(form)
            return true
        })
        if (ok) navigate(safeNext(params.get('next')), { replace: true })
    }

    return (
        <div className="card auth-card">
            <h1>Бүртгүүлэх</h1>
            <form className="form" onSubmit={submit}>
                <Field label="Овог нэр">
                    <input required autoComplete="name" value={form.full_name} onChange={set('full_name')} />
                </Field>
                <Field label="Имэйл">
                    <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
                </Field>
                <Field label="Нууц үг" hint="8+ тэмдэгт, үсэг ба тоо">
                    <input type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} />
                </Field>
                <ErrorBox message={error} />
                <button className="btn btn-primary" disabled={busy}>
                    {busy ? 'Бүртгэж байна…' : 'Бүртгүүлэх'}
                </button>
            </form>
            <p className="muted small mt">
                Бүртгэлтэй юу? <Link to="/login">Нэвтрэх</Link>
            </p>
        </div>
    )
}
