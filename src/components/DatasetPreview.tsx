import { useEffect, useState } from 'react'
import { DataRow } from '../api/types'
import { Column, inferColumns, parseFile } from '../lib/chartData'

const PREVIEW_ROWS = 10
const SHEET_EXT = /\.(xlsx|xls|xlsm|csv)$/i

/** Линкийн замаас файлын нэр (upload хийсэн файлын санамсаргүй угтварыг хасна) */
export const fileNameOf = (url: string): string => {
    try {
        const last = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
        return last.replace(/^[0-9a-f]{12}-/, '') || 'өгөгдөл'
    } catch {
        return 'өгөгдөл'
    }
}

/**
 * Excel/CSV линкийг татаж эхний мөрүүдийг харуулна. Татаж чадахгүй бол (жишээ нь Google Drive линк) юу ч харуулахгүй,
 * доорх "татах" товч хэвээр ажиллана
 */
export default function DatasetPreview({ url }: { url: string }) {
    const [data, setData] = useState<{ rows: DataRow[]; columns: Column[] } | null>(null)
    const name = fileNameOf(url)

    useEffect(() => {
        if (!SHEET_EXT.test(name)) return
        let cancelled = false
        fetch(url)
            .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
            .then((blob) => parseFile(new File([blob], name)))
            .then((rows) => !cancelled && setData({ rows, columns: inferColumns(rows) }))
            .catch(() => !cancelled && setData(null))
        return () => {
            cancelled = true
        }
    }, [url, name])

    if (!data) return null
    return (
        <div className="stack" style={{ gap: '0.4rem' }}>
            <span className="small muted">
                📄 {name} · {data.rows.length.toLocaleString()} мөр · {data.columns.length} багана
                {data.rows.length > PREVIEW_ROWS && ` · эхний ${PREVIEW_ROWS} мөр`}
            </span>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            {data.columns.map((c) => (
                                <th key={c.name} className={`col-head col-${c.type}`}>
                                    {c.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                            <tr key={i}>
                                {data.columns.map((c) => (
                                    <td key={c.name} className={c.type === 'number' ? 'num' : undefined}>
                                        {String(r[c.name] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
