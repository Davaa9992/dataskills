import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { qs } from '../api/client'
import { Course, LEVEL_LABEL, LEVELS, TRACKS } from '../api/types'
import CourseCard from '../components/CourseCard'
import { useFetch } from '../components/useFetch'
import { Empty, ErrorBox, PageHeader, Spinner } from '../components/ui'

export default function Courses() {
    const [params, setParams] = useSearchParams()
    const track = params.get('track') || ''
    const level = params.get('level') || ''
    const search = params.get('search') || ''
    const [searchInput, setSearchInput] = useState(search)

    useEffect(() => setSearchInput(search), [search])

    const { data: courses, error, loading, reload } = useFetch<Course[]>(`/course${qs({ track, level, search })}`)

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value)
        else next.delete(key)
        setParams(next, { replace: true })
    }

    return (
        <>
            <PageHeader title="Сургалтууд" subtitle="Excel, Power BI, Tableau, Data Analyst — анхан шатнаас ахисан түвшин хүртэл" />
            <form
                className="card row"
                onSubmit={(e) => {
                    e.preventDefault()
                    setParam('search', searchInput.trim())
                }}
            >
                <input style={{ flex: '2 1 220px' }} placeholder="Сургалт хайх…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                <select style={{ flex: '1 1 160px' }} value={track} onChange={(e) => setParam('track', e.target.value)}>
                    <option value="">Бүх чиглэл</option>
                    {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select style={{ flex: '1 1 140px' }} value={level} onChange={(e) => setParam('level', e.target.value)}>
                    <option value="">Бүх түвшин</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                </select>
                <button className="btn btn-primary">Хайх</button>
            </form>

            <div className="mt">
                {loading && <Spinner />}
                <ErrorBox message={error} onRetry={reload} />
                {courses && !courses.length && <Empty>Тохирох сургалт олдсонгүй</Empty>}
                {courses && (
                    <div className="grid">
                        {courses.map((c) => <CourseCard key={c._id} course={c} />)}
                    </div>
                )}
            </div>
        </>
    )
}
