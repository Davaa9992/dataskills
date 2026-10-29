import { FormEvent, useState } from 'react'
import { api, qs } from '../api/client'
import { refId, Submission, SUBMISSION_LABEL } from '../api/types'
import { useAction, useFetch } from './useFetch'
import { Badge, ErrorBox, Field, formatDateTime } from './ui'

const TONE = { submitted: 'amber', approved: 'green', needs_changes: 'red' } as const

/**
 * Ажил илгээх (дадлагын алхам эсвэл курсын төгсгөлийн төсөл) + өмнөх илгээлтүүд.
 * stepId байхгүй бол төгсгөлийн төсөл
 */
export default function SubmitWork({ courseId, stepId, onChange }: { courseId: string; stepId?: string; onChange?: () => void }) {
    const { data, reload } = useFetch<Submission[]>(`/submission/my${qs({ course_id: courseId })}`)
    const [fileUrl, setFileUrl] = useState('')
    const [note, setNote] = useState('')
    const { busy, error, run } = useAction()

    const mine = (data || []).filter((s) => (stepId ? refId(s.step_id) === stepId : !s.step_id))
    const approved = mine.some((s) => s.status === 'approved')

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const ok = await run(() => api('/submission', 'POST', { course_id: courseId, step_id: stepId, file_url: fileUrl.trim(), note: note || undefined }))
        if (ok) {
            setFileUrl('')
            setNote('')
            await reload()
            onChange?.()
        }
    }

    return (
        <div className="stack">
            {!approved && (
                <form className="form" onSubmit={submit}>
                    <Field label="Ажлын файлын линк" hint="Google Drive, OneDrive, Dropbox зэрэгт байршуулаад 'хуваалцах' линкээ оруулна уу">
                        <input type="url" required placeholder="https://drive.google.com/…" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
                    </Field>
                    <Field label="Тайлбар (заавал биш)">
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
                    </Field>
                    <ErrorBox message={error} />
                    <div>
                        <button className="btn btn-primary" disabled={busy}>{busy ? 'Илгээж байна…' : 'Ажил илгээх'}</button>
                    </div>
                </form>
            )}
            {mine.length > 0 && (
                <div className="stack">
                    <h3>Миний илгээсэн</h3>
                    {mine.map((s) => (
                        <div key={s._id} className="card">
                            <div className="row-between">
                                <a href={s.file_url} target="_blank" rel="noreferrer">Файл нээх ↗</a>
                                <Badge tone={TONE[s.status]}>{SUBMISSION_LABEL[s.status]}</Badge>
                            </div>
                            <p className="muted small">{formatDateTime(s.createdAt)}</p>
                            {s.feedback && <p className="pre"><strong>Багшийн санал:</strong> {s.feedback}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
