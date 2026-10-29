import { read, utils } from 'xlsx'
import { ChartAgg, ChartConfig, ChartPalette, ColumnType, DataRow, Dataset } from '../api/types'

export type Column = Dataset['columns'][number]

export const MAX_ROWS = 200000
const MAX_SERIES = 12
const MAX_SCATTER_POINTS = 5000
const EMPTY_LABEL = '(хоосон)'
export const OTHERS_LABEL = 'Бусад'

export const PALETTES: Record<ChartPalette, string[]> = {
    blue: ['#1f5eff', '#0aa3b5', '#7a4dd8', '#5b8cff', '#1546c4', '#3fc1d0', '#a98bf0', '#9db8ff', '#0d3a9e', '#5f6b80'],
    warm: ['#e0561f', '#f2a300', '#c4302b', '#f07c4a', '#d64f93', '#ffc95c', '#8f2a1d', '#f5a3c7', '#b36b00', '#5f6b80'],
    green: ['#0f8a5f', '#5fb36b', '#0aa3b5', '#8db600', '#0b5e42', '#9ed8a8', '#2f7f8c', '#c6e07a', '#3e6b2f', '#5f6b80'],
    mono: ['#18202f', '#3b4558', '#5f6b80', '#838da0', '#a8b0bf', '#c8ced9', '#2a3344', '#4d586c', '#717c90', '#969fb0'],
    rainbow: ['#1f5eff', '#0f8a5f', '#e08a00', '#c4302b', '#7a4dd8', '#0aa3b5', '#d64f93', '#8db600', '#5f6b80', '#1546c4']
}

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === ''

/** 1200, "1 200", "1,200.5" → тоо. Тоо биш бол null (backend-ийн DataHelpers.toNumber-тэй ижил) */
export function toNumber(v: unknown): number | null {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null
    if (typeof v !== 'string') return null
    const s = v.replace(/[\s,]/g, '')
    if (!s || !/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
    return Number(s)
}

const isDateLike = (v: unknown): boolean => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(Date.parse(v))

/** Эхний 1000 мөрөөс баганын төрлийг тодорхойлно (backend-тэй ижил дүрэм) */
export function inferColumns(rows: DataRow[]): Column[] {
    const sample = rows.slice(0, 1000)
    const names: string[] = []
    for (const row of sample) for (const key of Object.keys(row)) if (!names.includes(key)) names.push(key)
    return names.slice(0, 100).map((name) => {
        const values = sample.map((r) => r[name]).filter((v) => !isEmpty(v))
        let type: ColumnType = 'string'
        if (values.length && values.every((v) => toNumber(v) !== null)) type = 'number'
        else if (values.length && values.every(isDateLike)) type = 'date'
        return { name, type }
    })
}

/** SheetJS огноог орон нутгийн шөнө дундаар үүсгэдэг тул toISOString() (UTC) нэг өдрөөр ухраана */
const toIsoDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Excel/CSV-г хөтөч дээр уншина. Эхний sheet-ийн эхний мөр нь баганын нэр */
export async function parseFile(file: File): Promise<DataRow[]> {
    // CSV-г UTF-8 текстээр уншина, эс бөгөөс BOM-гүй файлын кирилл баганын нэр эвдэрнэ
    const wb = /\.csv$/i.test(file.name)
        ? read(await file.text(), { type: 'string', cellDates: true })
        : read(await file.arrayBuffer(), { cellDates: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const parsed = utils.sheet_to_json<DataRow>(sheet, { defval: '', raw: true })
    const rows: DataRow[] = []
    for (const r of parsed) {
        const out: DataRow = {}
        let filled = false
        for (const [k, v] of Object.entries(r)) {
            const key = k.trim()
            if (!key || key.startsWith('__EMPTY')) continue
            out[key] = v instanceof Date ? toIsoDate(v) : v
            if (!isEmpty(v)) filled = true
        }
        if (filled) rows.push(out)
    }
    if (!rows.length) throw new Error('Файлд өгөгдөлтэй мөр алга')
    if (rows.length > MAX_ROWS) throw new Error(`Хамгийн ихдээ ${MAX_ROWS.toLocaleString()} мөр оруулна (${rows.length.toLocaleString()} байна)`)
    return rows
}

/** Датанд тохирох анхны график: огноо байвал шугам, эс бөгөөс текст баганаар багана */
export function defaultConfig(columns: Column[]): ChartConfig {
    const date = columns.find((c) => c.type === 'date')
    const text = columns.find((c) => c.type === 'string')
    const y = columns.find((c) => c.type === 'number')?.name
    const x = (text ?? date ?? columns[0]).name
    const isLine = !text && !!date
    return {
        type: isLine ? 'line' : 'bar',
        x,
        y,
        agg: y ? 'sum' : 'count',
        sort: isLine ? 'label' : 'value_desc',
        limit: isLine ? 100 : 15,
        palette: 'blue',
        show_values: false
    }
}

const round = (n: number): number => Math.round(n * 100) / 100

export function aggregate(values: number[], agg: ChartAgg): number | null {
    if (agg === 'count') return values.length
    if (!values.length) return null
    switch (agg) {
        case 'sum':
            return round(values.reduce((a, b) => a + b, 0))
        case 'avg':
            return round(values.reduce((a, b) => a + b, 0) / values.length)
        case 'min':
            return values.reduce((a, b) => (b < a ? b : a))
        case 'max':
            return values.reduce((a, b) => (b > a ? b : a))
        case 'median': {
            const s = [...values].sort((a, b) => a - b)
            const m = Math.floor(s.length / 2)
            return round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2)
        }
    }
}

/** "Бусад"-д нэгтгэж болох нэгтгэл (нийлбэр, тоо). Дундаж, медиан зэргийг нэгтгэвэл утгагүй */
const mergeable = (agg: ChartAgg): boolean => agg === 'sum' || agg === 'count'

export interface ChartResult {
    labels: string[]
    series: { name: string; values: (number | null)[] }[]
    scatter: { name: string; points: { x: number; y: number }[] }[]
    /** Хязгаараас хэтэрсэн x утгын тоо ("Бусад"-д нэгтгэсэн эсвэл хасагдсан) */
    hidden: number
    hiddenMerged: boolean
    /** Утга нь тоо биш тул алгассан мөр */
    skipped: number
}

/** Мөрүүдийг x-ээр бүлэглэж (series байвал цуваа бүрээр) y-г нэгтгэнэ */
export function buildChart(rows: DataRow[], config: ChartConfig): ChartResult {
    const result: ChartResult = { labels: [], series: [], scatter: [], hidden: 0, hiddenMerged: false, skipped: 0 }
    const seriesOf = (row: DataRow): string =>
        config.series ? (isEmpty(row[config.series]) ? EMPTY_LABEL : String(row[config.series])) : config.y || 'Тоо'

    if (config.type === 'scatter') {
        const groups = new Map<string, { x: number; y: number }[]>()
        for (const row of rows) {
            const x = toNumber(row[config.x])
            const y = toNumber(row[config.y ?? ''])
            if (x === null || y === null) {
                result.skipped++
                continue
            }
            const key = seriesOf(row)
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push({ x, y })
        }
        const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
        result.hidden = Math.max(sorted.length - MAX_SERIES, 0)
        // Олон цэг хөтчийг удаашруулна: цуваа бүрээс жигд түүвэр авна
        const total = sorted.reduce((n, [, p]) => n + p.length, 0)
        const step = Math.max(1, Math.ceil(total / MAX_SCATTER_POINTS))
        result.scatter = sorted
            .slice(0, MAX_SERIES)
            .map(([name, points]) => ({ name, points: step > 1 ? points.filter((_, i) => i % step === 0) : points }))
        return result
    }

    const useSeries = !!config.series && config.type !== 'pie' && config.type !== 'doughnut'
    // label → series → утгууд
    const groups = new Map<string, Map<string, number[]>>()
    const seriesTotals = new Map<string, number[]>()
    for (const row of rows) {
        let value = 1
        if (config.agg !== 'count') {
            const n = toNumber(row[config.y ?? ''])
            if (n === null) {
                result.skipped++
                continue
            }
            value = n
        }
        const label = isEmpty(row[config.x]) ? EMPTY_LABEL : String(row[config.x])
        const key = useSeries ? seriesOf(row) : config.y || 'Тоо'
        if (!groups.has(label)) groups.set(label, new Map())
        const bySeries = groups.get(label)!
        if (!bySeries.has(key)) bySeries.set(key, [])
        bySeries.get(key)!.push(value)
        if (!seriesTotals.has(key)) seriesTotals.set(key, [])
        seriesTotals.get(key)!.push(value)
    }

    let entries = [...groups.entries()].map(([label, bySeries]) => ({
        label,
        bySeries,
        total: aggregate([...bySeries.values()].flat(), config.agg) ?? 0
    }))
    if (config.sort === 'label') entries.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    else if (config.sort === 'value_asc') entries.sort((a, b) => a.total - b.total)
    else entries.sort((a, b) => b.total - a.total)

    const limit = Math.max(1, config.limit || 20)
    if (entries.length > limit) {
        const rest = entries.slice(limit)
        entries = entries.slice(0, limit)
        result.hidden = rest.length
        // Шугам, талбай нь дараалал харуулдаг тул "Бусад" цэг нэмэхгүй
        if (mergeable(config.agg) && config.type !== 'line' && config.type !== 'area') {
            const merged = new Map<string, number[]>()
            for (const e of rest) for (const [k, v] of e.bySeries) merged.set(k, [...(merged.get(k) ?? []), ...v])
            entries.push({ label: OTHERS_LABEL, bySeries: merged, total: aggregate([...merged.values()].flat(), config.agg) ?? 0 })
            result.hiddenMerged = true
        }
    }

    // Цуваануудыг нийт хэмжээгээр эрэмбэлж, MAX_SERIES-ээс хэтэрвэл үлдсэнийг нь "Бусад" болгоно
    let keys = [...seriesTotals.entries()]
        .sort((a, b) => (aggregate(b[1], config.agg) ?? 0) - (aggregate(a[1], config.agg) ?? 0))
        .map(([k]) => k)
    let otherKeys: string[] = []
    if (keys.length > MAX_SERIES) {
        otherKeys = keys.slice(MAX_SERIES - 1)
        keys = keys.slice(0, MAX_SERIES - 1)
    }

    result.labels = entries.map((e) => e.label)
    result.series = keys.map((name) => ({ name, values: entries.map((e) => aggregate(e.bySeries.get(name) ?? [], config.agg)) }))
    if (otherKeys.length && mergeable(config.agg)) {
        result.series.push({
            name: OTHERS_LABEL,
            values: entries.map((e) => aggregate(otherKeys.flatMap((k) => e.bySeries.get(k) ?? []), config.agg))
        })
    }
    return result
}

const csvCell = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Графикт харагдаж буй нэгтгэсэн өгөгдөл. BOM-той тул Excel кирилл үсгийг зөв уншина */
export function chartToCsv(result: ChartResult, config: ChartConfig): string {
    const lines: string[][] = []
    if (config.type === 'scatter') {
        lines.push([...(config.series ? [config.series] : []), config.x, config.y ?? ''])
        for (const s of result.scatter) for (const p of s.points) lines.push([...(config.series ? [s.name] : []), String(p.x), String(p.y)])
    } else {
        lines.push([config.x, ...result.series.map((s) => s.name)])
        result.labels.forEach((label, i) => lines.push([label, ...result.series.map((s) => String(s.values[i] ?? ''))]))
    }
    return '﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\n')
}

export function downloadFile(name: string, data: Blob | string, type = 'text/csv;charset=utf-8') {
    const blob = typeof data === 'string' ? new Blob([data], { type }) : data
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Нэвтрэхээр гарахад файлын мөрүүдийг санах ойд түр хадгална (sessionStorage-д том файл багтахгүй) */
export interface DraftChart {
    fileName: string
    rows: DataRow[]
    config: ChartConfig
    title: string
    subtitle: string
}
let draft: DraftChart | null = null
export const saveDraft = (d: DraftChart) => {
    draft = d
}
export const takeDraft = (): DraftChart | null => {
    const d = draft
    draft = null
    return d
}

/** Туршиж үзэх жишээ дата */
export const SAMPLE_ROWS: DataRow[] = (() => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
    const branches = ['Улаанбаатар', 'Дархан', 'Эрдэнэт', 'Ховд']
    const products = ['Кофе', 'Цай', 'Бялуу']
    const rows: DataRow[] = []
    months.forEach((m, mi) =>
        branches.forEach((b, bi) =>
            products.forEach((p, pi) => {
                const qty = 120 + ((mi * 37 + bi * 53 + pi * 29) % 90) - bi * 20 + mi * 8
                const price = [5500, 4000, 8500][pi]
                rows.push({ Сар: m, Салбар: b, Бүтээгдэхүүн: p, Борлуулалт: qty * price, Тоо: qty })
            })
        )
    )
    return rows
})()
