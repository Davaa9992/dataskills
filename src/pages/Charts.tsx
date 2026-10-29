import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { CHART_TYPE_LABEL, SavedChart } from '../api/types'
import { useAction, useFetch } from '../components/useFetch'
import { Badge, Empty, ErrorBox, formatDate, PageHeader, Spinner } from '../components/ui'

/** Хадгалсан графикууд */
export default function Charts() {
    const charts = useFetch<SavedChart[]>('/chart')
    const remove = useAction()

    const onDelete = async (c: SavedChart) => {
        if (!window.confirm(`"${c.title}"-г устгах уу?`)) return
        const ok = await remove.run(() => api(`/chart/${c._id}`, 'DELETE'))
        if (ok) charts.setData((list) => (list || []).filter((x) => x._id !== c._id))
    }

    return (
        <div className="stack">
            <PageHeader
                title="Миний chart"
                subtitle="Excel, CSV файлаасаа гаргаж хадгалсан графикууд"
                actions={<Link to="/charts/new" className="btn btn-primary">+ Шинэ chart</Link>}
            />
            {charts.loading && <Spinner />}
            <ErrorBox message={charts.error || remove.error} onRetry={charts.error ? charts.reload : undefined} />
            {charts.data && !charts.data.length && (
                <Empty>
                    Одоохондоо хадгалсан график алга. <Link to="/charts/new">Файлаа оруулаад эхний графикаа гаргаарай.</Link>
                </Empty>
            )}
            {charts.data && charts.data.length > 0 && (
                <div className="grid">
                    {charts.data.map((c) => {
                        const ds = typeof c.dataset_id === 'object' ? c.dataset_id : null
                        return (
                            <div key={c._id} className="card chart-card">
                                <Link to={`/charts/${c._id}`} className="chart-card-link">
                                    <Badge tone="blue">{CHART_TYPE_LABEL[c.config.type]}</Badge>
                                    <h3>{c.title}</h3>
                                    {c.subtitle && <span className="muted small">{c.subtitle}</span>}
                                    {ds && (
                                        <span className="muted small">
                                            📄 {ds.name} · {ds.row_count.toLocaleString()} мөр
                                        </span>
                                    )}
                                    <span className="muted small">Шинэчилсэн: {formatDate(c.updatedAt)}</span>
                                </Link>
                                <div>
                                    <button className="btn btn-sm btn-danger" onClick={() => onDelete(c)} disabled={remove.busy}>
                                        Устгах
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
