import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import {
    CHART_AGG_LABEL,
    CHART_AGGS,
    CHART_PALETTES,
    CHART_TYPE_LABEL,
    CHART_TYPES,
    ChartAgg,
    ChartConfig,
    ChartSort,
    ChartType,
    DataRow,
    SavedChart
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import ChartCanvas, { ChartCanvasHandle } from '../components/ChartCanvas'
import { useAction } from '../components/useFetch'
import { ErrorBox, Field, formatNumber, Spinner } from '../components/ui'
import {
    buildChart,
    chartToCsv,
    Column,
    defaultConfig,
    downloadFile,
    inferColumns,
    MAX_ROWS,
    OTHERS_LABEL,
    PALETTES,
    parseFile,
    SAMPLE_ROWS,
    saveDraft,
    takeDraft
} from '../lib/chartData'

const TYPE_ICON: Record<ChartType, string> = {
    bar: '▮▮▯',
    hbar: '☰',
    stacked: '▤',
    line: '⟋',
    area: '◭',
    pie: '◔',
    doughnut: '◯',
    scatter: '⁘'
}

const COLUMN_TYPE_LABEL = { number: 'Тоо', date: 'Огноо', string: 'Текст' } as const

const SORT_LABEL: Record<ChartSort, string> = {
    value_desc: 'Их нь эхэндээ',
    value_asc: 'Бага нь эхэндээ',
    label: 'X-ийн дарааллаар'
}

const safeFileName = (s: string) => (s.trim() || 'chart').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80)

/** Instacharts маягийн: файл оруулах → график автоматаар гарна → тохируулах → татах/хадгалах */
export default function ChartMaker() {
    const { id } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()
    const chartRef = useRef<ChartCanvasHandle>(null)

    const [fileName, setFileName] = useState('')
    const [rows, setRows] = useState<DataRow[] | null>(null)
    const [config, setConfig] = useState<ChartConfig | null>(null)
    const [title, setTitle] = useState('')
    const [subtitle, setSubtitle] = useState('')
    const [parsing, setParsing] = useState(false)
    const [parseError, setParseError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const [savedAt, setSavedAt] = useState<string | null>(null)
    const save = useAction()

    const columns = useMemo<Column[]>(() => (rows ? inferColumns(rows) : []), [rows])
    const result = useMemo(() => (rows && config ? buildChart(rows, config) : null), [rows, config])

    const start = (name: string, data: DataRow[], cfg?: ChartConfig, t?: string, st?: string) => {
        const cols = inferColumns(data)
        const base = cfg ?? defaultConfig(cols)
        setFileName(name)
        setRows(data)
        setConfig(base)
        setTitle(t ?? name)
        setSubtitle(st ?? '')
        setSavedAt(null)
    }

    // Шинэ: нэвтэрч ирсэн бол ноорогоо сэргээнэ. Хадгалсан: серверээс ачаална
    useEffect(() => {
        if (!id) {
            const d = takeDraft()
            if (d) start(d.fileName, d.rows, d.config, d.title, d.subtitle)
            return
        }
        let cancelled = false
        api<SavedChart>(`/chart/${id}`)
            .then((c) => {
                if (cancelled) return
                setFileName(c.dataset?.name ?? c.title)
                setRows(c.rows ?? [])
                setConfig(c.config)
                setTitle(c.title)
                setSubtitle(c.subtitle ?? '')
            })
            .catch((e) => !cancelled && setLoadError((e as Error).message))
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const openFile = async (file?: File) => {
        if (!file) return
        setParseError(null)
        setParsing(true)
        try {
            start(file.name.replace(/\.[^.]+$/, ''), await parseFile(file))
        } catch (err) {
            setParseError((err as Error).message || 'Файлыг уншиж чадсангүй')
        } finally {
            setParsing(false)
        }
    }

    const onDrop = (e: DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        openFile(e.dataTransfer.files?.[0])
    }

    const update = (patch: Partial<ChartConfig>) => setConfig((c) => (c ? { ...c, ...patch } : c))

    /** Төрөл солиход утгагүй болох тохиргоог засна */
    const changeType = (type: ChartType) => {
        if (!config) return
        const patch: Partial<ChartConfig> = { type }
        const numeric = columns.filter((c) => c.type === 'number')
        if (type === 'line' || type === 'area') {
            patch.sort = 'label'
            if (config.limit < 50) patch.limit = 100
        } else if (config.type === 'line' || config.type === 'area') {
            patch.sort = 'value_desc'
            patch.limit = 15
        }
        if (type === 'scatter') {
            const x = numeric.find((c) => c.name === config.x) ?? numeric.find((c) => c.name !== config.y) ?? numeric[0]
            const y = numeric.find((c) => c.name !== x?.name) ?? numeric[0]
            patch.x = x?.name ?? config.x
            patch.y = y?.name
            patch.agg = 'sum'
        } else if (config.type === 'scatter') {
            Object.assign(patch, defaultConfig(columns), { type, palette: config.palette, show_values: config.show_values })
        }
        update(patch)
    }

    const exportPng = () => {
        const png = chartRef.current?.toPng()
        if (!png) return
        fetch(png)
            .then((r) => r.blob())
            .then((b) => downloadFile(`${safeFileName(title)}.png`, b))
    }

    const exportCsv = () => result && config && downloadFile(`${safeFileName(title)}.csv`, chartToCsv(result, config))

    const onSave = async () => {
        if (!rows || !config) return
        if (!user) {
            saveDraft({ fileName, rows, config, title, subtitle })
            navigate(`/login?next=${encodeURIComponent('/charts/new')}`)
            return
        }
        if (id) {
            const ok = await save.run(() => api<SavedChart>(`/chart/${id}`, 'PATCH', { title, subtitle, config }))
            if (ok) setSavedAt(new Date().toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }))
            return
        }
        const created = await save.run(() => api<SavedChart>('/chart', 'POST', { title, subtitle, file_name: fileName, config, rows }))
        if (created) navigate(`/charts/${created._id}`, { replace: true })
    }

    if (loadError) return <ErrorBox message={loadError} />
    if (id && (!rows || !config)) return <Spinner />

    // 1. Файл оруулах
    if (!rows || !config || !result) {
        return (
            <div className="stack">
                <div>
                    <h1>Excel-ээс график гаргах</h1>
                    <p className="muted">Файлаа оруулахад график шууд гарна. Дараа нь төрөл, багана, өнгийг нь сольж тохируулаад PNG эсвэл CSV-ээр татаж аваарай.</p>
                </div>
                <label
                    className={`dropzone ${dragOver ? 'dropzone-over' : ''}`}
                    onDragOver={(e) => {
                        e.preventDefault()
                        setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                >
                    <input
                        id="chart-file"
                        type="file"
                        accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => openFile(e.target.files?.[0])}
                    />
                    <span className="dropzone-icon" aria-hidden>📈</span>
                    <strong>{parsing ? 'Файлыг уншиж байна…' : 'Excel эсвэл CSV файлаа энд чирж оруулна уу'}</strong>
                    <span className="muted small">эсвэл дарж файлаа сонгоно уу · .xlsx, .xls, .csv · {MAX_ROWS.toLocaleString()} мөр хүртэл</span>
                    <span className="btn btn-primary">Файл сонгох</span>
                </label>
                <ErrorBox message={parseError} />
                <div className="row-between">
                    <p className="muted small">
                        Эхний sheet-ийн эхний мөр нь баганын нэр байна. Файл таны browser дотор уншигдах бөгөөд «Хадгалах» дарах хүртэл серверт илгээгдэхгүй.
                    </p>
                    <button className="btn" onClick={() => start('Жишээ: Салбарын борлуулалт', SAMPLE_ROWS)}>
                        Жишээ датагаар турших
                    </button>
                </div>
            </div>
        )
    }

    // 2. Тохируулах
    const numberCols = columns.filter((c) => c.type === 'number')
    const xOptions = config.type === 'scatter' ? numberCols : columns
    const isPie = config.type === 'pie' || config.type === 'doughnut'
    const needsY = config.type === 'scatter' || config.agg !== 'count'
    const empty = config.type === 'scatter' ? !result.scatter.length : !result.labels.length
    const colLabel = (c: Column) => `${c.name} · ${COLUMN_TYPE_LABEL[c.type]}`

    return (
        <div className="stack">
            <div className="page-header">
                <div>
                    {user && (
                        <Link to="/charts" className="small">
                            ← Миний chart
                        </Link>
                    )}
                    <h1>{id ? 'График засах' : 'Шинэ график'}</h1>
                    <p className="muted">
                        📄 {fileName} · {rows.length.toLocaleString()} мөр · {columns.length} багана
                    </p>
                </div>
                {!id && (
                    <button
                        className="btn"
                        onClick={() => {
                            setRows(null)
                            setConfig(null)
                        }}
                    >
                        Өөр файл оруулах
                    </button>
                )}
            </div>

            <div className="chart-maker">
                <aside className="card chart-controls form">
                    <div className="field">
                        <span className="field-label">Графикийн төрөл</span>
                        <div className="type-grid" role="radiogroup" aria-label="Графикийн төрөл">
                            {CHART_TYPES.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    role="radio"
                                    aria-checked={config.type === t}
                                    className={`type-btn ${config.type === t ? 'type-btn-active' : ''}`}
                                    disabled={t === 'scatter' && numberCols.length < 2}
                                    title={t === 'scatter' && numberCols.length < 2 ? 'Хоёр тоон багана хэрэгтэй' : undefined}
                                    onClick={() => changeType(t)}
                                >
                                    <span aria-hidden>{TYPE_ICON[t]}</span>
                                    {CHART_TYPE_LABEL[t]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Field label={config.type === 'scatter' ? 'X тэнхлэг (тоо)' : 'X тэнхлэг (бүлэглэх)'}>
                        <select id="chart-x" value={config.x} onChange={(e) => update({ x: e.target.value })}>
                            {xOptions.map((c) => (
                                <option key={c.name} value={c.name}>
                                    {colLabel(c)}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {config.type !== 'scatter' && (
                        <Field label="Тооцоо">
                            <select id="chart-agg" value={config.agg} onChange={(e) => update({ agg: e.target.value as ChartAgg, y: config.y ?? numberCols[0]?.name })}>
                                {CHART_AGGS.map((a) => (
                                    <option key={a} value={a} disabled={a !== 'count' && !numberCols.length}>
                                        {CHART_AGG_LABEL[a]}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {needsY && (
                        <Field label="Y тэнхлэг (утга)">
                            <select id="chart-y" value={config.y ?? ''} onChange={(e) => update({ y: e.target.value })}>
                                {numberCols.map((c) => (
                                    <option key={c.name} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {!isPie && (
                        <Field label="Задаргаа (цуваа)" hint="Сонгосон баганын утга бүр тусдаа өнгөөр гарна">
                            <select id="chart-series" value={config.series ?? ''} onChange={(e) => update({ series: e.target.value || undefined })}>
                                <option value="">— байхгүй —</option>
                                {columns
                                    .filter((c) => c.name !== config.x && c.type !== 'number')
                                    .map((c) => (
                                        <option key={c.name} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                            </select>
                        </Field>
                    )}

                    {config.type !== 'scatter' && (
                        <div className="grid-tight">
                            <Field label="Эрэмбэ">
                                <select id="chart-sort" value={config.sort} onChange={(e) => update({ sort: e.target.value as ChartSort })}>
                                    {(Object.keys(SORT_LABEL) as ChartSort[]).map((s) => (
                                        <option key={s} value={s}>
                                            {SORT_LABEL[s]}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Хамгийн ихдээ">
                                <input
                                    id="chart-limit"
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={config.limit}
                                    onChange={(e) => update({ limit: Math.min(500, Math.max(1, Number(e.target.value) || 1)) })}
                                />
                            </Field>
                        </div>
                    )}

                    <div className="field">
                        <span className="field-label">Өнгө</span>
                        <div className="row">
                            {CHART_PALETTES.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={`swatch ${config.palette === p ? 'swatch-active' : ''}`}
                                    aria-label={`Өнгө: ${p}`}
                                    aria-pressed={config.palette === p}
                                    onClick={() => update({ palette: p })}
                                >
                                    {PALETTES[p].slice(0, 4).map((c) => (
                                        <span key={c} style={{ background: c }} />
                                    ))}
                                </button>
                            ))}
                        </div>
                    </div>

                    {config.type !== 'scatter' && (
                        <label className="row small">
                            <input id="chart-values" type="checkbox" checked={config.show_values} onChange={(e) => update({ show_values: e.target.checked })} />
                            Утгыг график дээр бичих
                        </label>
                    )}

                    <Field label="Гарчиг">
                        <input id="chart-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
                    </Field>
                    <Field label="Дэд гарчиг">
                        <input id="chart-subtitle" value={subtitle} maxLength={200} placeholder="Жишээ: 2026 оны 1-6 сар, ₮" onChange={(e) => setSubtitle(e.target.value)} />
                    </Field>
                </aside>

                <section className="stack chart-preview">
                    <div className="card">
                        {empty ? (
                            <div className="empty">Сонгосон баганад тоон утга алга. Өөр Y багана эсвэл «Мөрийн тоо» тооцоо сонгоно уу.</div>
                        ) : (
                            <ChartCanvas ref={chartRef} config={config} result={result} title={title} subtitle={subtitle} />
                        )}
                        <ChartNotes result={result} type={config.type} />
                    </div>
                    <div className="row-between">
                        <div className="row">
                            <button className="btn" onClick={exportPng} disabled={empty}>
                                ⬇ PNG зураг
                            </button>
                            <button className="btn" onClick={exportCsv} disabled={empty}>
                                ⬇ CSV (нэгтгэсэн)
                            </button>
                        </div>
                        <div className="row">
                            {savedAt && <span className="muted small">{savedAt}-д хадгаллаа</span>}
                            <button className="btn btn-primary" onClick={onSave} disabled={save.busy || !title.trim()}>
                                {save.busy ? 'Хадгалж байна…' : user ? 'Хадгалах' : 'Нэвтэрч хадгалах'}
                            </button>
                        </div>
                    </div>
                    <ErrorBox message={save.error} />
                </section>
            </div>

            <DataPreview rows={rows} columns={columns} />
        </div>
    )
}

function ChartNotes({ result, type }: { result: ReturnType<typeof buildChart>; type: ChartType }) {
    const notes: string[] = []
    if (result.hidden) {
        notes.push(
            type === 'scatter'
                ? `Цуваа олон тул эхний 12-ыг харууллаа (${result.hidden} нуугдсан).`
                : result.hiddenMerged
                  ? `${formatNumber(result.hidden)} утгыг «${OTHERS_LABEL}»-д нэгтгэлээ. «Хамгийн ихдээ»-г өсгөвөл бүгд харагдана.`
                  : `${formatNumber(result.hidden)} утга харагдахгүй байна. «Хамгийн ихдээ»-г өсгөнө үү.`
        )
    }
    if (result.skipped) notes.push(`Тоо биш утгатай ${formatNumber(result.skipped)} мөрийг алгаслаа.`)
    if (!notes.length) return null
    return <p className="muted small chart-notes">{notes.join(' ')}</p>
}

/** Эхний 100 мөр, баганын төрлийг өнгөөр ялгана */
function DataPreview({ rows, columns }: { rows: DataRow[]; columns: Column[] }) {
    return (
        <details className="card data-preview">
            <summary>
                <strong>Дата</strong> <span className="muted small">— эхний {Math.min(100, rows.length)} мөр</span>
                <span className="row small legend-types">
                    <span className="col-tag col-number">Тоо</span>
                    <span className="col-tag col-date">Огноо</span>
                    <span className="col-tag col-string">Текст</span>
                </span>
            </summary>
            <div className="table-wrap mt">
                <table>
                    <thead>
                        <tr>
                            {columns.map((c) => (
                                <th key={c.name} className={`col-head col-${c.type}`}>
                                    {c.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 100).map((r, i) => (
                            <tr key={i}>
                                {columns.map((c) => (
                                    <td key={c.name} className={c.type === 'number' ? 'num' : undefined}>
                                        {String(r[c.name] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    )
}
