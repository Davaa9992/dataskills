const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/v1'

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number
    ) {
        super(message)
    }
}

export interface Pagination {
    page: number
    limit: number
    total?: number
    total_page?: number
}

interface Envelope<T> {
    data: T
    pagination?: Pagination
    message?: string
    status: 'success' | 'error'
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

async function request<T>(path: string, method: Method = 'GET', body?: unknown): Promise<Envelope<T>> {
    let res: Response
    try {
        res = await fetch(BASE + path, {
            method,
            // token нь httpOnly cookie-д хадгалагдана
            credentials: 'include',
            headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined
        })
    } catch {
        throw new ApiError('Сервертэй холбогдож чадсангүй. Backend асаалттай эсэхийг шалгана уу.', 0)
    }
    const json = (await res.json().catch(() => null)) as Envelope<T> | null
    if (!res.ok || !json || json.status === 'error') {
        throw new ApiError(json?.message || `Алдаа гарлаа (${res.status})`, res.status)
    }
    return json
}

/** Хариуны data-г буцаана */
export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
    return (await request<T>(path, method, body)).data
}

/** data + pagination хоёуланг нь буцаана (жишээ: dataset-ийн мэдээлэл + мөрийн хуудаслалт) */
export async function apiWithPagination<T>(path: string): Promise<{ data: T; pagination?: Pagination }> {
    const res = await request<T>(path)
    return { data: res.data, pagination: res.pagination }
}

/** Хуудаслалттай жагсаалт */
export async function apiPage<T>(path: string): Promise<{ items: T[]; pagination?: Pagination }> {
    const res = await request<T[]>(path)
    return { items: res.data, pagination: res.pagination }
}

/** Файлыг агуулгаар нь (JSON биш) илгээнэ. Нэрийг ?name=-ээр дамжуулна */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
    let res: Response
    try {
        res = await fetch(`${BASE}${path}?name=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: file
        })
    } catch {
        throw new ApiError('Сервертэй холбогдож чадсангүй. Backend асаалттай эсэхийг шалгана уу.', 0)
    }
    if (res.status === 413) throw new ApiError('Файл хэт том байна', 413)
    const json = (await res.json().catch(() => null)) as Envelope<T> | null
    if (!res.ok || !json || json.status === 'error') {
        throw new ApiError(json?.message || `Алдаа гарлаа (${res.status})`, res.status)
    }
    return json.data
}

/** Query string үүсгэнэ, хоосон утгыг алгасна */
export function qs(params: Record<string, string | number | undefined | null>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    if (!entries.length) return ''
    return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
}
