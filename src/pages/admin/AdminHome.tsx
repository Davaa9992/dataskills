import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, qs } from '../../api/client'
import {
    AdminUser,
    Organization,
    refName,
    Role,
    SERVICE_STATUS_LABEL,
    SERVICE_STATUSES,
    SERVICE_TYPE_LABEL,
    ServiceRequest,
    ServiceStatus,
    TeacherApplication
} from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { useAction, useFetch, usePaged } from '../../components/useFetch'
import { Badge, Empty, ErrorBox, formatDate, PageHeader, Pager, Spinner } from '../../components/ui'
import { STATUS_TONE } from '../Services'

const TABS = [
    { key: 'overview', label: 'Тойм' },
    { key: 'users', label: 'Хэрэглэгчид' },
    { key: 'applications', label: 'Багшийн хүсэлт' },
    { key: 'services', label: 'Үйлчилгээ' },
    { key: 'organizations', label: 'Байгууллагууд' }
] as const

export default function AdminHome() {
    const [params, setParams] = useSearchParams()
    const tab = params.get('tab') || 'overview'

    return (
        <div>
            <PageHeader title="Админ" subtitle="Курс, алхам, шалгалтыг 'Багш' хэсгээс удирдана" />
            <div className="tabs">
                {TABS.map((t) => (
                    <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setParams({ tab: t.key })}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'overview' && <Overview />}
            {tab === 'users' && <Users />}
            {tab === 'applications' && <Applications />}
            {tab === 'services' && <Services />}
            {tab === 'organizations' && <Organizations />}
        </div>
    )
}

const STATS: { key: string; label: string }[] = [
    { key: 'students', label: 'Сурагч' },
    { key: 'teachers', label: 'Багш' },
    { key: 'published_courses', label: 'Нийтэлсэн курс' },
    { key: 'organizations', label: 'Байгууллага' },
    { key: 'pending_submissions', label: 'Шалгах ажил' },
    { key: 'certificates', label: 'Сертификат' },
    { key: 'exam_attempts', label: 'Шалгалт өгсөн' },
    { key: 'open_service_requests', label: 'Нээлттэй үйлчилгээ' }
]

function Overview() {
    const { data, error, loading, reload } = useFetch<Record<string, number>>('/admin/report/overview')
    if (loading) return <Spinner />
    if (error) return <ErrorBox message={error} onRetry={reload} />
    return (
        <div className="grid">
            {STATS.map((s) => (
                <div key={s.key} className="card stat">
                    <div className="muted small">{s.label}</div>
                    <div className="stat-value">{data?.[s.key] ?? 0}</div>
                </div>
            ))}
        </div>
    )
}

const ROLE_LABEL: Record<Role, string> = { student: 'Сурагч', teacher: 'Багш', admin: 'Админ' }

function Users() {
    const { user: me } = useAuth()
    const [page, setPage] = useState(1)
    const [role, setRole] = useState('')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const { items, pagination, error, loading, reload } = usePaged<AdminUser>(`/admin/user${qs({ page, role, search: query })}`)
    const action = useAction()

    const changeRole = async (u: AdminUser, next: Role) => {
        if (!window.confirm(`${u.full_name}-г "${ROLE_LABEL[next]}" болгох уу?`)) return
        const ok = await action.run(() => api(`/admin/user/${u._id}/role`, 'PATCH', { role: next }))
        if (ok) reload()
    }
    const toggleBlock = async (u: AdminUser) => {
        const ok = await action.run(() => api(`/admin/user/${u._id}/block`, 'PATCH', { blocked: u.blocked ? 0 : 1 }))
        if (ok) reload()
    }

    return (
        <div className="stack">
            <form className="row" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()) }}>
                <input style={{ flex: 1, minWidth: 200 }} placeholder="Нэр, имэйлээр хайх" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select style={{ maxWidth: 180 }} value={role} onChange={(e) => { setPage(1); setRole(e.target.value) }}>
                    <option value="">Бүх эрх</option>
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <button className="btn">Хайх</button>
            </form>
            {loading && <Spinner />}
            <ErrorBox message={error || action.error} onRetry={reload} />
            {items.length > 0 && (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Нэр</th><th>Имэйл</th><th>Эрх</th><th>Бүртгүүлсэн</th><th>Төлөв</th><th /></tr></thead>
                        <tbody>
                            {items.map((u) => (
                                <tr key={u._id}>
                                    <td>{u.full_name}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <select value={u.role} disabled={u._id === me?._id} onChange={(e) => changeRole(u, e.target.value as Role)}>
                                            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                        </select>
                                    </td>
                                    <td>{formatDate(u.createdAt)}</td>
                                    <td>{u.blocked ? <Badge tone="red">Хаагдсан</Badge> : <Badge tone="green">Идэвхтэй</Badge>}</td>
                                    <td>
                                        {u._id !== me?._id && (
                                            <button className={`btn btn-sm ${u.blocked ? '' : 'btn-danger'}`} onClick={() => toggleBlock(u)}>
                                                {u.blocked ? 'Нээх' : 'Хаах'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pager pagination={pagination} onPage={setPage} />
        </div>
    )
}

function Applications() {
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState('pending')
    const { items, pagination, error, loading, reload } = usePaged<TeacherApplication>(`/admin/teacher_application${qs({ page, status })}`)
    const action = useAction()

    const decide = async (a: TeacherApplication, decision: 'approve' | 'reject') => {
        const ok = await action.run(() => api(`/admin/teacher_application/${a._id}/${decision}`, 'POST'))
        if (ok) reload()
    }

    return (
        <div className="stack">
            <select style={{ maxWidth: 200 }} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }}>
                <option value="pending">Хүлээгдэж буй</option>
                <option value="approved">Зөвшөөрсөн</option>
                <option value="rejected">Татгалзсан</option>
                <option value="">Бүгд</option>
            </select>
            {loading && <Spinner />}
            <ErrorBox message={error || action.error} onRetry={reload} />
            {!loading && !items.length && <Empty>Хүсэлт алга</Empty>}
            {items.map((a) => (
                <div key={a._id} className="card row-between">
                    <div>
                        <strong>{a.name}</strong> <span className="muted small">{a.email}</span>
                        <p className="small">{a.specialty}</p>
                        <span className="muted small">{formatDate(a.createdAt)} · Бүртгэл: {refName(a.user_id, 'email')}</span>
                    </div>
                    {a.status === 'pending' ? (
                        <div className="row">
                            <button className="btn btn-success" disabled={action.busy} onClick={() => decide(a, 'approve')}>Зөвшөөрөх</button>
                            <button className="btn btn-danger" disabled={action.busy} onClick={() => decide(a, 'reject')}>Татгалзах</button>
                        </div>
                    ) : (
                        <Badge tone={a.status === 'approved' ? 'green' : 'red'}>{a.status === 'approved' ? 'Зөвшөөрсөн' : 'Татгалзсан'}</Badge>
                    )}
                </div>
            ))}
            <Pager pagination={pagination} onPage={setPage} />
        </div>
    )
}

function Services() {
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<ServiceStatus | ''>('new')
    const { items, pagination, error, loading, reload } = usePaged<ServiceRequest>(`/admin/service${qs({ page, status })}`)
    // Гүйцэтгэгч сонгох жагсаалт: багш, админууд
    const teachers = usePaged<AdminUser>('/admin/user?role=teacher&limit=100')
    const admins = usePaged<AdminUser>('/admin/user?role=admin&limit=100')
    const staff = [...teachers.items, ...admins.items]

    return (
        <div className="stack">
            <select style={{ maxWidth: 220 }} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as ServiceStatus | '') }}>
                <option value="">Бүгд</option>
                {SERVICE_STATUSES.map((s) => <option key={s} value={s}>{SERVICE_STATUS_LABEL[s]}</option>)}
            </select>
            {loading && <Spinner />}
            <ErrorBox message={error} onRetry={reload} />
            {!loading && !items.length && <Empty>Хүсэлт алга</Empty>}
            {items.map((r) => <ServiceCard key={r._id} request={r} staff={staff} onDone={reload} />)}
            <Pager pagination={pagination} onPage={setPage} />
        </div>
    )
}

function ServiceCard({ request: r, staff, onDone }: { request: ServiceRequest; staff: AdminUser[]; onDone: () => void }) {
    const [assignee, setAssignee] = useState(r.assigned_to?._id || '')
    const { busy, error, run } = useAction()

    const patch = async (body: Record<string, unknown>) => {
        const ok = await run(() => api(`/admin/service/${r._id}`, 'PATCH', body))
        if (ok) onDone()
    }

    return (
        <div className="card stack">
            <div className="row-between">
                <div>
                    <Badge>{SERVICE_TYPE_LABEL[r.service_type]}</Badge>
                    <h3 className="mt">{r.title}</h3>
                    <span className="muted small">
                        {refName(r.user_id)} ({refName(r.user_id, 'email')}) {refName(r.organization_id, 'name') && `· ${refName(r.organization_id, 'name')}`} · {formatDate(r.createdAt)}
                        {r.deadline && ` · Хугацаа: ${formatDate(r.deadline)}`}
                    </span>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{SERVICE_STATUS_LABEL[r.status]}</Badge>
            </div>
            <p className="pre small">{r.description}</p>
            {r.data_files.length > 0 && (
                <div className="row">{r.data_files.map((f, i) => <a key={f} href={f} target="_blank" rel="noreferrer" className="btn btn-sm">Файл {i + 1} ↗</a>)}</div>
            )}
            {r.result_url && <a href={r.result_url} target="_blank" rel="noreferrer">Үр дүн ↗</a>}
            <ErrorBox message={error} />
            <div className="row">
                <select style={{ maxWidth: 260 }} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">— гүйцэтгэгч сонгох —</option>
                    {staff.map((s) => <option key={s._id} value={s._id}>{s.full_name} ({s.role === 'admin' ? 'админ' : 'багш'})</option>)}
                </select>
                <button className="btn btn-primary" disabled={busy || !assignee || assignee === r.assigned_to?._id} onClick={() => patch({ assigned_to: assignee })}>
                    Хуваарилах
                </button>
                {r.status === 'delivered' && <button className="btn" disabled={busy} onClick={() => patch({ status: 'closed' })}>Хаах</button>}
                {(r.status === 'new' || r.status === 'in_progress') && (
                    <button className="btn btn-danger" disabled={busy} onClick={() => patch({ status: 'cancelled' })}>Цуцлах</button>
                )}
            </div>
        </div>
    )
}

function Organizations() {
    const [page, setPage] = useState(1)
    const { items, pagination, error, loading, reload } = usePaged<Organization>(`/admin/organization${qs({ page })}`)

    return (
        <div className="stack">
            {loading && <Spinner />}
            <ErrorBox message={error} onRetry={reload} />
            {!loading && !items.length && <Empty>Байгууллага алга</Empty>}
            {items.length > 0 && (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Нэр</th><th>Регистр</th><th>Эзэн</th><th>Холбоо барих</th><th>Бүртгүүлсэн</th></tr></thead>
                        <tbody>
                            {items.map((o) => (
                                <tr key={o._id}>
                                    <td>{o.name}</td>
                                    <td>{o.register_no || '—'}</td>
                                    <td>{refName(o.owner_id)} <span className="muted small">{refName(o.owner_id, 'email')}</span></td>
                                    <td className="small">{[o.email, o.phone].filter(Boolean).join(' · ') || '—'}</td>
                                    <td>{formatDate(o.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pager pagination={pagination} onPage={setPage} />
        </div>
    )
}
