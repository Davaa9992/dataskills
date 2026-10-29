import { useCallback, useEffect, useState } from 'react'
import { api, apiPage, Pagination } from '../api/client'

/** GET хүсэлт. path null бол хүлээнэ */
export function useFetch<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(!!path)

    const reload = useCallback(async () => {
        if (!path) return
        setLoading(true)
        setError(null)
        try {
            setData(await api<T>(path))
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
        }
    }, [path])

    useEffect(() => {
        reload()
    }, [reload])

    return { data, error, loading, reload, setData }
}

/** Хуудаслалттай GET */
export function usePaged<T>(path: string) {
    const [items, setItems] = useState<T[]>([])
    const [pagination, setPagination] = useState<Pagination | undefined>()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const reload = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiPage<T>(path)
            setItems(res.items)
            setPagination(res.pagination)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
        }
    }, [path])

    useEffect(() => {
        reload()
    }, [reload])

    return { items, pagination, error, loading, reload }
}

/** POST/PATCH товчны төлөв: busy, error */
export function useAction() {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const run = async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
        setBusy(true)
        setError(null)
        try {
            return await fn()
        } catch (e) {
            setError((e as Error).message)
            return undefined
        } finally {
            setBusy(false)
        }
    }

    return { busy, error, setError, run }
}
