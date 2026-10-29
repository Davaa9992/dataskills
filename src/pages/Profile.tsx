import { FormEvent, useState } from 'react'
import { api } from '../api/client'
import { TeacherApplication } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useAction, useFetch } from '../components/useFetch'
import { Badge, ErrorBox, Field, formatDate, PageHeader } from '../components/ui'

const ROLE_LABEL = { student: 'Сурагч', teacher: 'Багш', admin: 'Админ' } as const

export default function Profile() {
    const { user, refresh } = useAuth()
    const [name, setName] = useState(user?.full_name || '')
    const [pw, setPw] = useState({ password: '', newPassword: '' })
    const [saved, setSaved] = useState<string | null>(null)
    const profile = useAction()
    const password = useAction()

    if (!user) return null

    const saveProfile = async (e: FormEvent) => {
        e.preventDefault()
        setSaved(null)
        const ok = await profile.run(() => api('/user/profile', 'PATCH', { full_name: name }))
        if (ok) {
            await refresh()
            setSaved('Хадгаллаа')
        }
    }

    const changePassword = async (e: FormEvent) => {
        e.preventDefault()
        setSaved(null)
        const ok = await password.run(() => api('/user/password', 'PATCH', pw))
        if (ok) {
            setPw({ password: '', newPassword: '' })
            setSaved('Нууц үг солигдлоо')
        }
    }

    return (
        <div className="stack" style={{ maxWidth: 760 }}>
            <PageHeader title="Профайл" subtitle={<>{user.email} · <Badge tone="blue">{ROLE_LABEL[user.role]}</Badge></>} />
            {saved && <div className="alert alert-success">{saved}</div>}

            <div className="grid-2">
                <form className="card form" onSubmit={saveProfile}>
                    <h3>Хувийн мэдээлэл</h3>
                    <Field label="Овог нэр">
                        <input required value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <ErrorBox message={profile.error} />
                    <div><button className="btn btn-primary" disabled={profile.busy}>Хадгалах</button></div>
                </form>

                <form className="card form" onSubmit={changePassword}>
                    <h3>Нууц үг солих</h3>
                    <Field label="Одоогийн нууц үг">
                        <input type="password" required autoComplete="current-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
                    </Field>
                    <Field label="Шинэ нууц үг" hint="8+ тэмдэгт, үсэг ба тоо">
                        <input type="password" required autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
                    </Field>
                    <ErrorBox message={password.error} />
                    <div><button className="btn" disabled={password.busy}>Солих</button></div>
                </form>
            </div>

            {user.role === 'student' && <TeacherApplicationCard name={user.full_name} email={user.email} />}
        </div>
    )
}

function TeacherApplicationCard({ name, email }: { name: string; email: string }) {
    const apps = useFetch<TeacherApplication[]>('/teacher_application/my')
    const [form, setForm] = useState({ name, email, specialty: '' })
    const { busy, error, run } = useAction()
    const pending = apps.data?.find((a) => a.status === 'pending')

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const ok = await run(() => api('/teacher_application', 'POST', form))
        if (ok) apps.reload()
    }

    return (
        <div className="card stack">
            <div>
                <h3>Багш болох</h3>
                <p className="muted small">Excel, Power BI, Tableau зэрэгт мэргэшсэн бол сургалт заах хүсэлт илгээгээрэй.</p>
            </div>
            {pending ? (
                <div className="alert alert-info">Таны хүсэлт ({formatDate(pending.createdAt)}) хянагдаж байна.</div>
            ) : (
                <form className="form" onSubmit={submit}>
                    <div className="grid-2">
                        <Field label="Нэр"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                        <Field label="Имэйл"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                    </div>
                    <Field label="Мэргэшил" hint="Жишээ: Power BI, DAX, 5 жил санхүүгийн шинжээч">
                        <input required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                    </Field>
                    <ErrorBox message={error} />
                    <div><button className="btn btn-primary" disabled={busy}>Хүсэлт илгээх</button></div>
                </form>
            )}
            {apps.data?.some((a) => a.status === 'rejected') && !pending && (
                <p className="muted small">Өмнөх хүсэлт тань татгалзагдсан. Дахин илгээж болно.</p>
            )}
        </div>
    )
}
