import { forwardRef, useImperativeHandle, useRef } from 'react'
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    ChartData,
    ChartOptions,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    Plugin,
    PointElement,
    SubTitle,
    Title,
    Tooltip
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { ChartConfig } from '../api/types'
import { ChartResult, PALETTES } from '../lib/chartData'
import { formatNumber } from './ui'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler, Title, SubTitle)

/** PNG-д ил тод биш, цагаан дэвсгэртэй гарна */
const whiteBackground: Plugin = {
    id: 'whiteBackground',
    beforeDraw(chart) {
        const { ctx, width, height } = chart
        ctx.save()
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
    }
}

/** Багана, цэг, зүсэм бүр дээр утгыг бичнэ */
const valueLabels: Plugin = {
    id: 'valueLabels',
    afterDatasetsDraw(chart, _args, opts: { enabled?: boolean; pie?: boolean; stacked?: boolean; horizontal?: boolean }) {
        if (!opts?.enabled) return
        const { ctx } = chart
        ctx.save()
        ctx.font = '600 11px Inter, "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        chart.data.datasets.forEach((ds, di) => {
            const meta = chart.getDatasetMeta(di)
            if (meta.hidden) return
            meta.data.forEach((el, i) => {
                const v = ds.data[i] as number | null
                if (v === null || v === undefined || typeof v !== 'number') return
                const text = formatNumber(v)
                if (opts.pie) {
                    const { x, y } = el.tooltipPosition(true)
                    ctx.fillStyle = '#ffffff'
                    ctx.fillText(text, x as number, y as number)
                    return
                }
                const { x, y, base } = el.getProps(['x', 'y', 'base'], true) as { x: number; y: number; base: number }
                if (opts.stacked) {
                    // Сегментийн голд, багтахгүй бол бичихгүй
                    if (Math.abs(y - base) < 16) return
                    ctx.fillStyle = '#ffffff'
                    ctx.fillText(text, x, (y + base) / 2)
                } else if (opts.horizontal) {
                    ctx.fillStyle = '#18202f'
                    ctx.textAlign = 'left'
                    ctx.fillText(text, x + 4, y)
                    ctx.textAlign = 'center'
                } else {
                    ctx.fillStyle = '#18202f'
                    ctx.fillText(text, x, y - 9)
                }
            })
        })
        ctx.restore()
    }
}

export interface ChartCanvasHandle {
    toPng: () => string | undefined
}

interface Props {
    config: ChartConfig
    result: ChartResult
    title: string
    subtitle?: string
}

/** Тохиргоо + нэгтгэсэн өгөгдлөөс Chart.js график зурна */
const ChartCanvas = forwardRef<ChartCanvasHandle, Props>(function ChartCanvas({ config, result, title, subtitle }, ref) {
    const chartRef = useRef<ChartJS | null>(null)
    useImperativeHandle(ref, () => ({ toPng: () => chartRef.current?.toBase64Image('image/png', 1) }))

    const colors = PALETTES[config.palette] ?? PALETTES.blue
    const isPie = config.type === 'pie' || config.type === 'doughnut'
    const multi = isPie || result.series.length > 1 || result.scatter.length > 1
    const tick = (v: string | number) => formatNumber(Number(v))

    let type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter'
    let data: ChartData
    if (config.type === 'scatter') {
        type = 'scatter'
        data = {
            datasets: result.scatter.map((s, i) => ({
                label: s.name,
                data: s.points,
                backgroundColor: colors[i % colors.length] + 'b3',
                pointRadius: 3
            }))
        }
    } else if (isPie) {
        type = config.type as 'pie' | 'doughnut'
        data = {
            labels: result.labels,
            datasets: [{ label: config.y || 'Тоо', data: result.series[0]?.values ?? [], backgroundColor: result.labels.map((_, i) => colors[i % colors.length]) }]
        }
    } else if (config.type === 'line' || config.type === 'area') {
        type = 'line'
        data = {
            labels: result.labels,
            datasets: result.series.map((s, i) => ({
                label: s.name,
                data: s.values,
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length] + (result.series.length > 1 ? '33' : '26'),
                fill: config.type === 'area' ? 'origin' : false,
                tension: 0.3,
                pointRadius: result.labels.length > 60 ? 0 : 3,
                spanGaps: true
            }))
        }
    } else {
        type = 'bar'
        data = {
            labels: result.labels,
            datasets: result.series.map((s, i) => ({
                label: s.name,
                data: s.values,
                backgroundColor: colors[i % colors.length],
                borderRadius: config.type === 'stacked' ? 0 : 5
            }))
        }
    }

    const horizontal = config.type === 'hbar'
    const stacked = config.type === 'stacked'
    const valueAxis = { beginAtZero: true, stacked, ticks: { callback: tick }, grid: { color: '#e9ecf3' } }
    const labelAxis = { stacked, grid: { display: false }, ticks: { autoSkip: true, maxRotation: 50 } }

    const options: ChartOptions = {
        maintainAspectRatio: false,
        animation: { duration: 250 },
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
            title: { display: !!title, text: title, align: 'start', color: '#18202f', font: { size: 17, weight: 'bold' } },
            subtitle: { display: !!subtitle, text: subtitle ?? '', align: 'start', color: '#5f6b80', font: { size: 13 }, padding: { bottom: 12 } },
            legend: { display: multi, position: isPie ? 'right' : 'bottom' },
            tooltip: {
                callbacks: {
                    label: (c) => {
                        const raw = c.raw as number | { x: number; y: number }
                        const v = typeof raw === 'object' && raw ? `${formatNumber(raw.x)}, ${formatNumber(raw.y)}` : formatNumber(Number(raw))
                        return `${c.dataset.label ?? ''}: ${v}`
                    }
                }
            },
            // @ts-expect-error — өөрийн plugin-ий тохиргоо
            valueLabels: { enabled: config.show_values, pie: isPie, stacked: config.type === 'stacked', horizontal: config.type === 'hbar' }
        },
        scales: isPie
            ? {}
            : config.type === 'scatter'
              ? {
                    x: { type: 'linear', title: { display: true, text: config.x }, ticks: { callback: tick } },
                    y: { title: { display: true, text: config.y ?? '' }, ticks: { callback: tick }, grid: { color: '#e9ecf3' } }
                }
              : horizontal
                ? { x: valueAxis, y: labelAxis }
                : { x: labelAxis, y: valueAxis }
    }

    return (
        <div className="chart-stage">
            <Chart ref={chartRef} type={type} data={data} options={options} plugins={[whiteBackground, valueLabels]} />
        </div>
    )
})

export default ChartCanvas
