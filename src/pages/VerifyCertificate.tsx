import { FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LEVEL_LABEL, Level } from '../api/types'
import { useFetch } from '../components/useFetch'
import { ErrorBox, formatDate, PageHeader, Spinner } from '../components/ui'

interface Verified {
    code: string
    issued_at: string
    student: { full_name: string }
    course: { title: string; track: string; level: Level }
}

export default function VerifyCertificate() {
    const { code } = useParams()
    const navigate = useNavigate()
    const [input, setInput] = useState(code || '')
    const { data, error, loading } = useFetch<Verified>(code ? `/certificate/verify/${encodeURIComponent(code)}` : null)

    const submit = (e: FormEvent) => {
        e.preventDefault()
        if (input.trim()) navigate(`/verify/${input.trim().toUpperCase()}`)
    }

    return (
        <div className="stack" style={{ maxWidth: 600, margin: '0 auto' }}>
            <PageHeader title="Сертификат шалгах" subtitle="Сертификатын кодыг оруулж жинхэнэ эсэхийг шалгана" />
            <form className="card row" onSubmit={submit}>
                <input style={{ flex: 1 }} placeholder="Жишээ: 8F3A1C9B2E" value={input} onChange={(e) => setInput(e.target.value)} />
                <button className="btn btn-primary">Шалгах</button>
            </form>
            {loading && <Spinner />}
            <ErrorBox message={error} />
            {data && (
                <div className="card stack" style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem' }}>🎓</span>
                    <div className="alert alert-success" style={{ justifyContent: 'center' }}>✓ Хүчинтэй сертификат</div>
                    <h2>{data.student.full_name}</h2>
                    <p>
                        <strong>{data.course.title}</strong>
                        <br />
                        <span className="muted">{data.course.track} · {LEVEL_LABEL[data.course.level]}</span>
                    </p>
                    <p className="muted small">Олгосон: {formatDate(data.issued_at)} · Код: {data.code}</p>
                </div>
            )}
        </div>
    )
}
