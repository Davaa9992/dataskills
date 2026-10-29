import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import {
    Dataset,
    SERVICE_STATUS_LABEL,
    SERVICE_TYPE_LABEL,
    SERVICE_TYPES,
    ServiceRequest,
    ServiceStatus,
    ServiceType,
    refName
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useAction, useFetch } from '../components/useFetch'
import { Badge, Empty, ErrorBox, Field, formatDate, PageHeader } from '../components/ui'

const SERVICES: { type: ServiceType; icon: string; text: string }[] = [
    { type: 'dashboard', icon: '📊', text: 'Таны датаас Power BI / Tableau dashboard бүтээж, сар бүр автоматаар шинэчлэгддэг болгоно.' },
    { type: 'data_analysis', icon: '🔎', text: 'Борлуулалт, санхүү, хүний нөөцийн датанд шинжилгээ хийж, дүгнэлт, зөвлөмж гаргана.' },
    { type: 'data_engineering', icon: '🛠', text: 'Өөр өөр системийн датаг нэгтгэх ETL pipeline, data warehouse байгуулна.' },
    { type: 'corporate_training', icon: '🏢', text: 'Ажилтнуудад тань Excel, Power BI сургалтыг танай өгөгдөл дээр зохион байгуулна.' }
]

export const STATUS_TONE: Record<ServiceStatus, 'blue' | 'amber' | 'green' | 'neutral' | 'red'> = {
    new: 'blue',
    in_progress: 'amber',
    delivered: 'green',
    closed: 'neutral',
    cancelled: 'red'
}

export default function Services() {
    const { user } = useAuth()
    const [type, setType] = useState<ServiceType>('dashboard')

    return (
        <div className="stack">
            <PageHeader
                title="Дата аналист, дата инженерийн үйлчилгээ"
                subtitle="Датагаа илгээгээд мэргэжлийн аналистуудаар dashboard, анализ, pipeline хийлгээрэй"
            />
            <div className="grid">
                {SERVICES.map((s) => (
                    <button
                        key={s.type}
                        type="button"
                        className="card card-link"
                        style={{ textAlign: 'left', cursor: 'pointer', borderColor: type === s.type ? 'var(--primary)' : undefined }}
                        onClick={() => setType(s.type)}
                    >
                        <div className="feature-icon">{s.icon}</div>
                        <h3>{SERVICE_TYPE_LABEL[s.type]}</h3>
                        <p className="muted small">{s.text}</p>
                    </button>
                ))}
            </div>

            {user ? (
                <>
                    <RequestForm type={type} onType={setType} />
                    <MyRequests />
                </>
            ) : (
                <div className="card row-between">
                    <span>Үйлчилгээ захиалахын тулд нэвтэрнэ үү.</span>
                    <Link to="/login?next=/services" className="btn btn-primary">Нэвтрэх</Link>
                </div>
            )}
        </div>
    )
}

function RequestForm({ type, onType }: { type: ServiceType; onType: (t: ServiceType) => void }) {
    const datasets = useFetch<Dataset[]>('/dataset')
    const [form, setForm] = useState({ title: '', description: '', files: '', dataset_id: '', deadline: '' })
    const [sent, setSent] = useState(false)
    const { busy, error, run } = useAction()

    const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        setSent(false)
        const data_files = form.files.split(/\s+/).map((s) => s.trim()).filter(Boolean)
        const ok = await run(() =>
            api('/service', 'POST', {
                service_type: type,
                title: form.title,
                description: form.description,
                data_files,
                dataset_id: form.dataset_id || undefined,
                deadline: form.deadline || undefined
            })
        )
        if (ok) {
            setForm({ title: '', description: '', files: '', dataset_id: '', deadline: '' })
            setSent(true)
            window.dispatchEvent(new Event('service-requests-changed'))
        }
    }

    return (
        <form className="card form" onSubmit={submit}>
            <h2>Хүсэлт илгээх</h2>
            {sent && <div className="alert alert-success">Хүсэлт илгээгдлээ. Манай баг удахгүй холбогдоно.</div>}
            <div className="grid-2">
                <Field label="Үйлчилгээ">
                    <select value={type} onChange={(e) => onType(e.target.value as ServiceType)}>
                        {SERVICE_TYPES.map((t) => <option key={t} value={t}>{SERVICE_TYPE_LABEL[t]}</option>)}
                    </select>
                </Field>
                <Field label="Хүсэх хугацаа (заавал биш)">
                    <input type="date" value={form.deadline} onChange={set('deadline')} />
                </Field>
            </div>
            <Field label="Гарчиг">
                <input required placeholder="Жишээ: Сарын борлуулалтын Power BI dashboard" value={form.title} onChange={set('title')} />
            </Field>
            <Field label="Дэлгэрэнгүй" hint="Ямар асуултад хариулт авмаар байна, ямар үзүүлэлт харах вэ, датаны эх сурвалж">
                <textarea required value={form.description} onChange={set('description')} />
            </Field>
            <Field label="Датаны файлын линкүүд (заавал биш)" hint="Google Drive, OneDrive линк. Нэгээс олон бол зайгаар тусгаарлана">
                <input value={form.files} onChange={set('files')} />
            </Field>
            {datasets.data && datasets.data.length > 0 && (
                <Field label="Оруулсан датагаас хавсаргах (заавал биш)">
                    <select value={form.dataset_id} onChange={set('dataset_id')}>
                        <option value="">— хавсаргахгүй —</option>
                        {datasets.data.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                </Field>
            )}
            <ErrorBox message={error} />
            <div><button className="btn btn-primary" disabled={busy}>{busy ? 'Илгээж байна…' : 'Хүсэлт илгээх'}</button></div>
        </form>
    )
}

function MyRequests() {
    const { data, error, reload } = useFetch<ServiceRequest[]>('/service/my')
    const cancel = useAction()

    // Шинэ хүсэлт илгээхэд жагсаалтыг шинэчилнэ
    useServiceRefresh(reload)

    const onCancel = async (id: string) => {
        if (!window.confirm('Хүсэлтийг цуцлах уу?')) return
        const ok = await cancel.run(() => api(`/service/${id}/cancel`, 'PATCH'))
        if (ok) reload()
    }

    return (
        <section className="stack">
            <h2>Миний хүсэлтүүд</h2>
            <ErrorBox message={error || cancel.error} />
            {data && !data.length && <Empty>Хүсэлт алга</Empty>}
            {data?.map((r) => (
                <div key={r._id} className="card stack">
                    <div className="row-between">
                        <div>
                            <Badge>{SERVICE_TYPE_LABEL[r.service_type]}</Badge>
                            <h3 className="mt">{r.title}</h3>
                        </div>
                        <Badge tone={STATUS_TONE[r.status]}>{SERVICE_STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="pre small">{r.description}</p>
                    <p className="muted small">
                        {formatDate(r.createdAt)}
                        {refName(r.user_id) && ` · ${refName(r.user_id)}`}
                        {r.assigned_to && ` · Гүйцэтгэгч: ${r.assigned_to.full_name}`}
                        {r.deadline && ` · Хугацаа: ${formatDate(r.deadline)}`}
                    </p>
                    {r.result_url && (
                        <div className="alert alert-success">
                            <span>{r.result_note || 'Үр дүн бэлэн боллоо'}</span>
                            <a className="btn btn-sm" href={r.result_url} target="_blank" rel="noreferrer">Үр дүн нээх ↗</a>
                        </div>
                    )}
                    {r.status === 'new' && (
                        <div><button className="btn btn-sm btn-danger" disabled={cancel.busy} onClick={() => onCancel(r._id)}>Цуцлах</button></div>
                    )}
                </div>
            ))}
        </section>
    )
}

function useServiceRefresh(reload: () => void) {
    useEffect(() => {
        window.addEventListener('service-requests-changed', reload)
        return () => window.removeEventListener('service-requests-changed', reload)
    }, [reload])
}
