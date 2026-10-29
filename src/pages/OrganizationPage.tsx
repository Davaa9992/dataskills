import { FormEvent, useState } from 'react'
import { api } from '../api/client'
import { MemberProgress, Organization, OrgMember } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useAction, useFetch } from '../components/useFetch'
import { Badge, Empty, ErrorBox, Field, PageHeader, ProgressBar, Spinner } from '../components/ui'

interface MyOrg {
    organization: Organization
    my_role: 'owner' | 'member'
    members: OrgMember[]
}

export default function OrganizationPage() {
    const { refresh } = useAuth()
    const { data, error, loading, reload } = useFetch<MyOrg | null>('/organization/my')

    if (loading && data === null) return <Spinner />
    if (error) return <ErrorBox message={error} onRetry={reload} />

    if (!data) {
        return (
            <CreateOrganization
                onCreated={async () => {
                    await refresh()
                    reload()
                }}
            />
        )
    }

    const isOwner = data.my_role === 'owner'

    return (
        <div className="stack">
            <PageHeader
                title={data.organization.name}
                subtitle={<>{data.members.length} гишүүн · <Badge tone="blue">{isOwner ? 'Эзэн' : 'Гишүүн'}</Badge></>}
            />
            {isOwner ? (
                <>
                    <Members members={data.members} onChange={reload} />
                    <TeamProgress />
                </>
            ) : (
                <div className="card">
                    <p>Та энэ байгууллагын гишүүн.</p>
                </div>
            )}
        </div>
    )
}

function CreateOrganization({ onCreated }: { onCreated: () => void }) {
    const [form, setForm] = useState({ name: '', register_no: '', email: '', phone: '' })
    const { busy, error, run } = useAction()
    const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim()))
        const ok = await run(() => api('/organization', 'POST', body))
        if (ok) onCreated()
    }

    return (
        <div className="stack" style={{ maxWidth: 640 }}>
            <PageHeader
                title="Байгууллага"
                subtitle="Байгууллагаа бүртгээд ажилтнуудаа нэмж, тэдний сургалтын явцыг хянаарай."
            />
            <form className="card form" onSubmit={submit}>
                <Field label="Байгууллагын нэр"><input required value={form.name} onChange={set('name')} /></Field>
                <div className="grid-2">
                    <Field label="Регистрийн дугаар"><input value={form.register_no} onChange={set('register_no')} /></Field>
                    <Field label="Утас"><input value={form.phone} onChange={set('phone')} /></Field>
                </div>
                <Field label="Имэйл"><input type="email" value={form.email} onChange={set('email')} /></Field>
                <ErrorBox message={error} />
                <div><button className="btn btn-primary" disabled={busy}>Байгууллага үүсгэх</button></div>
            </form>
        </div>
    )
}

function Members({ members, onChange }: { members: OrgMember[]; onChange: () => void }) {
    const [email, setEmail] = useState('')
    const add = useAction()
    const remove = useAction()

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const ok = await add.run(() => api('/organization/my/member', 'POST', { email }))
        if (ok) {
            setEmail('')
            onChange()
        }
    }

    const onRemove = async (m: OrgMember) => {
        if (!window.confirm(`${m.user_id.full_name}-г хасах уу?`)) return
        const ok = await remove.run(() => api(`/organization/my/member/${m.user_id._id}`, 'DELETE'))
        if (ok) onChange()
    }

    return (
        <div className="card stack">
            <h2>Гишүүд</h2>
            <form className="row" onSubmit={submit}>
                <input style={{ flex: 1, minWidth: 220 }} type="email" required placeholder="Ажилтны имэйл (сайтад бүртгэлтэй)" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn btn-primary" disabled={add.busy}>Нэмэх</button>
            </form>
            <ErrorBox message={add.error || remove.error} />
            <div className="table-wrap">
                <table>
                    <thead><tr><th>Нэр</th><th>Имэйл</th><th>Эрх</th><th /></tr></thead>
                    <tbody>
                        {members.map((m) => (
                            <tr key={m._id}>
                                <td>{m.user_id.full_name}</td>
                                <td>{m.user_id.email}</td>
                                <td>{m.role === 'owner' ? <Badge tone="blue">Эзэн</Badge> : 'Гишүүн'}</td>
                                <td>{m.role !== 'owner' && <button className="btn btn-sm btn-danger" onClick={() => onRemove(m)}>Хасах</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function TeamProgress() {
    const { data, error, loading } = useFetch<MemberProgress[]>('/organization/my/progress')

    return (
        <div className="card stack">
            <h2>Сургалтын явц</h2>
            {loading && <Spinner />}
            <ErrorBox message={error} />
            {data && data.every((m) => !m.courses.length) && <Empty>Ажилтнууд одоогоор сургалт эхлээгүй байна</Empty>}
            {data?.filter((m) => m.courses.length).map((m) => (
                <div key={m.user._id} className="stack" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div className="row-between">
                        <strong>{m.user.full_name}</strong>
                        <span className="muted small">🎓 {m.certificates} сертификат</span>
                    </div>
                    {m.courses.map((c) => (
                        <div key={c._id}>
                            <div className="row-between small">
                                <span>{c.title}</span>
                                <span className="muted">{c.progress.percent}%</span>
                            </div>
                            <ProgressBar percent={c.progress.percent} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}
