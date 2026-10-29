import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, qs } from '../../api/client'
import {
    Course,
    LEVEL_LABEL,
    refId,
    refName,
    SERVICE_STATUS_LABEL,
    SERVICE_TYPE_LABEL,
    ServiceRequest,
    Submission,
    SUBMISSION_LABEL,
    SubmissionStatus
} from '../../api/types'
import { useAction, usePaged } from '../../components/useFetch'
import { Badge, Empty, ErrorBox, Field, formatDate, PageHeader, Pager, Spinner } from '../../components/ui'
import { STATUS_TONE } from '../Services'

const TABS = [
    { key: 'courses', label: 'Курсууд' },
    { key: 'submissions', label: 'Ажил шалгах' },
    { key: 'services', label: 'Дата үйлчилгээ' }
] as const

export default function TeacherHome() {
    const [params, setParams] = useSearchParams()
    const tab = params.get('tab') || 'courses'

    return (
        <div>
            <PageHeader title="Багшийн самбар" actions={<Link to="/teacher/courses/new" className="btn btn-primary">+ Шинэ курс</Link>} />
            <div className="tabs">
                {TABS.map((t) => (
                    <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setParams({ tab: t.key })}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'courses' && <MyCourses />}
            {tab === 'submissions' && <ReviewSubmissions />}
            {tab === 'services' && <AssignedServices />}
        </div>
    )
}

function MyCourses() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const { items, pagination, error, loading, reload } = usePaged<Course>(`/teacher/course${qs({ page, search: query })}`)

    return (
        <div className="stack">
            <form className="row" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()) }}>
                <input style={{ flex: 1, minWidth: 200 }} placeholder="Курс хайх…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <button className="btn">Хайх</button>
            </form>
            {loading && <Spinner />}
            <ErrorBox message={error} onRetry={reload} />
            {!loading && !items.length && <Empty>Курс алга. "+ Шинэ курс" дарж эхлээрэй.</Empty>}
            {items.length > 0 && (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Нэр</th><th>Чиглэл</th><th>Түвшин</th><th>Багш</th><th>Төлөв</th><th /></tr></thead>
                        <tbody>
                            {items.map((c) => (
                                <tr key={c._id}>
                                    <td><Link to={`/teacher/courses/${c._id}`}>{c.title}</Link></td>
                                    <td>{c.track}</td>
                                    <td>{LEVEL_LABEL[c.level]}</td>
                                    <td>{refName(c.teacher_id)}</td>
                                    <td>{c.published ? <Badge tone="green">Нийтэлсэн</Badge> : <Badge tone="amber">Ноорог</Badge>}</td>
                                    <td className="row">
                                        <Link to={`/teacher/courses/${c._id}`} className="btn btn-sm">Засах</Link>
                                        {c.published === 1 && <Link to={`/courses/${c._id}`} className="btn btn-sm btn-ghost">Харах</Link>}
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

function ReviewSubmissions() {
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<SubmissionStatus | ''>('submitted')
    const { items, pagination, error, loading, reload } = usePaged<Submission>(`/teacher/submission${qs({ page, status })}`)

    return (
        <div className="stack">
            <div className="row">
                <select style={{ maxWidth: 240 }} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as SubmissionStatus | '') }}>
                    <option value="">Бүгд</option>
                    {(Object.keys(SUBMISSION_LABEL) as SubmissionStatus[]).map((s) => <option key={s} value={s}>{SUBMISSION_LABEL[s]}</option>)}
                </select>
            </div>
            {loading && <Spinner />}
            <ErrorBox message={error} onRetry={reload} />
            {!loading && !items.length && <Empty>Шалгах ажил алга</Empty>}
            {items.map((s) => <ReviewCard key={s._id} submission={s} onDone={reload} />)}
            <Pager pagination={pagination} onPage={setPage} />
        </div>
    )
}

function ReviewCard({ submission: s, onDone }: { submission: Submission; onDone: () => void }) {
    const [feedback, setFeedback] = useState(s.feedback || '')
    const { busy, error, run } = useAction()

    const review = async (status: 'approved' | 'needs_changes') => {
        const ok = await run(() => api(`/teacher/submission/${s._id}/review`, 'PATCH', { status, feedback: feedback || undefined }))
        if (ok) onDone()
    }

    return (
        <div className="card stack">
            <div className="row-between">
                <div>
                    <strong>{refName(s.user_id)}</strong> <span className="muted small">{refName(s.user_id, 'email')}</span>
                    <div className="small">
                        <Link to={`/courses/${refId(s.course_id)}`}>{refName(s.course_id, 'title')}</Link> ·{' '}
                        {s.step_id ? `Алхам ${refName(s.step_id, 'position')}: ${refName(s.step_id, 'title')}` : 'Төгсгөлийн төсөл'}
                    </div>
                </div>
                <Badge tone={s.status === 'approved' ? 'green' : s.status === 'needs_changes' ? 'red' : 'amber'}>{SUBMISSION_LABEL[s.status]}</Badge>
            </div>
            <div className="row">
                <a href={s.file_url} target="_blank" rel="noreferrer" className="btn btn-sm">Ажил нээх ↗</a>
                <span className="muted small">{formatDate(s.createdAt)}</span>
            </div>
            {s.note && <p className="pre small">{s.note}</p>}
            <Field label="Санал">
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Засах зүйл, сайн хийсэн зүйл…" />
            </Field>
            <ErrorBox message={error} />
            <div className="row">
                <button className="btn btn-success" disabled={busy} onClick={() => review('approved')}>✓ Зөвшөөрөх</button>
                <button className="btn btn-danger" disabled={busy} onClick={() => review('needs_changes')}>Засвар хэрэгтэй</button>
            </div>
        </div>
    )
}

function AssignedServices() {
    const [page, setPage] = useState(1)
    const { items, pagination, error, loading, reload } = usePaged<ServiceRequest>(`/teacher/service${qs({ page })}`)

    return (
        <div className="stack">
            {loading && <Spinner />}
            <ErrorBox message={error} onRetry={reload} />
            {!loading && !items.length && <Empty>Танд хуваарилагдсан үйлчилгээ алга</Empty>}
            {items.map((r) => <AssignedCard key={r._id} request={r} onDone={reload} />)}
            <Pager pagination={pagination} onPage={setPage} />
        </div>
    )
}

function AssignedCard({ request: r, onDone }: { request: ServiceRequest; onDone: () => void }) {
    const [resultUrl, setResultUrl] = useState(r.result_url || '')
    const [note, setNote] = useState(r.result_note || '')
    const { busy, error, run } = useAction()
    const editable = r.status === 'in_progress' || r.status === 'delivered'

    const update = async (status: 'in_progress' | 'delivered') => {
        const ok = await run(() =>
            api(`/teacher/service/${r._id}`, 'PATCH', { status, result_url: resultUrl || undefined, result_note: note || undefined })
        )
        if (ok) onDone()
    }

    return (
        <div className="card stack">
            <div className="row-between">
                <div>
                    <Badge>{SERVICE_TYPE_LABEL[r.service_type]}</Badge>
                    <h3 className="mt">{r.title}</h3>
                    <span className="muted small">
                        {refName(r.user_id)} {refName(r.organization_id, 'name') && `· ${refName(r.organization_id, 'name')}`} · {formatDate(r.createdAt)}
                        {r.deadline && ` · Хугацаа: ${formatDate(r.deadline)}`}
                    </span>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{SERVICE_STATUS_LABEL[r.status]}</Badge>
            </div>
            <p className="pre small">{r.description}</p>
            {r.data_files.length > 0 && (
                <div className="row">
                    {r.data_files.map((f, i) => <a key={f} href={f} target="_blank" rel="noreferrer" className="btn btn-sm">Файл {i + 1} ↗</a>)}
                </div>
            )}
            {editable && (
                <>
                    <div className="grid-2">
                        <Field label="Үр дүнгийн линк" hint="Power BI publish линк, тайлангийн файл">
                            <input type="url" value={resultUrl} onChange={(e) => setResultUrl(e.target.value)} />
                        </Field>
                        <Field label="Тайлбар">
                            <input value={note} onChange={(e) => setNote(e.target.value)} />
                        </Field>
                    </div>
                    <ErrorBox message={error} />
                    <div className="row">
                        <button className="btn" disabled={busy} onClick={() => update('in_progress')}>Хадгалах</button>
                        <button className="btn btn-success" disabled={busy || !resultUrl} onClick={() => update('delivered')}>Хүлээлгэн өгөх</button>
                    </div>
                </>
            )}
        </div>
    )
}
