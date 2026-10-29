import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Attempt, ExamInfo, ExamResult, Progress, Question } from '../api/types'
import { useAction, useFetch } from '../components/useFetch'
import { Badge, ErrorBox, PageHeader, Spinner } from '../components/ui'

interface ExamOverview {
    exam: ExamInfo
    my_attempts: Attempt[]
    can_start: boolean
    progress: Progress
}

interface StartResponse {
    attempt_id: string
    deadline: string
    remaining_seconds: number
    questions: Question[]
}

type Answers = Record<string, string>

const storageKey = (attemptId: string) => `exam-answers:${attemptId}`

const loadAnswers = (attemptId: string): Answers => {
    try {
        return JSON.parse(localStorage.getItem(storageKey(attemptId)) || '{}')
    } catch {
        return {}
    }
}

export default function ExamPage() {
    const { courseId } = useParams()
    const overview = useFetch<ExamOverview>(`/exam/course/${courseId}`)
    const [session, setSession] = useState<StartResponse | null>(null)
    const [result, setResult] = useState<ExamResult | null>(null)
    const start = useAction()

    const begin = async () => {
        const res = await start.run(() => api<StartResponse>(`/exam/course/${courseId}/start`, 'POST'))
        if (res) {
            setResult(null)
            setSession(res)
        }
    }

    if (overview.loading && !overview.data) return <Spinner />
    if (overview.error) return <ErrorBox message={overview.error} onRetry={overview.reload} />
    if (!overview.data) return null

    const { exam, my_attempts, can_start, progress } = overview.data

    if (session) {
        return (
            <ExamSession
                session={session}
                onFinished={(r) => {
                    setSession(null)
                    setResult(r)
                    overview.reload()
                }}
            />
        )
    }

    if (result) return <ExamResultView result={result} courseId={courseId!} onRetry={result.attempts_left > 0 && !result.passed ? begin : undefined} />

    const inProgress = my_attempts.find((a) => a.status === 'in_progress')
    const passed = my_attempts.some((a) => a.passed)
    const used = my_attempts.length
    const left = Math.max(exam.max_attempts - used, 0)

    return (
        <div className="stack" style={{ maxWidth: 720 }}>
            <Link to={`/courses/${courseId}`} className="small">← Курс руу</Link>
            <PageHeader title={exam.title} />
            <div className="card stack">
                <div className="grid">
                    <div><div className="muted small">Асуулт</div><strong>{exam.question_count}</strong></div>
                    <div><div className="muted small">Хугацаа</div><strong>{exam.duration_minutes} минут</strong></div>
                    <div><div className="muted small">Тэнцэх</div><strong>{exam.pass_percent}%</strong></div>
                    <div><div className="muted small">Оролдлого үлдсэн</div><strong>{left} / {exam.max_attempts}</strong></div>
                </div>

                {passed ? (
                    <div className="alert alert-success">Та энэ шалгалтад тэнцсэн байна. Курсын хуудаснаас сертификатаа аваарай.</div>
                ) : !can_start ? (
                    <div className="alert alert-info">
                        Шалгалт өгөхийн өмнө бүх алхмыг дуусгана уу ({progress.done}/{progress.total}).
                    </div>
                ) : inProgress ? (
                    <button className="btn btn-primary btn-lg" disabled={start.busy} onClick={begin}>Үргэлжлүүлэх</button>
                ) : left > 0 ? (
                    <>
                        <p className="muted small">Эхлүүлмэгц хугацаа гүйж эхэлнэ. Хугацаа дуусахад хариу автоматаар илгээгдэнэ.</p>
                        <button className="btn btn-primary btn-lg" disabled={start.busy} onClick={begin}>Шалгалт эхлүүлэх</button>
                    </>
                ) : (
                    <div className="alert alert-error">Оролдлогын тоо дууссан байна.</div>
                )}
                <ErrorBox message={start.error} />
            </div>

            {my_attempts.length > 0 && (
                <div className="card">
                    <h3>Өмнөх оролдлогууд</h3>
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Огноо</th><th>Оноо</th><th>Төлөв</th></tr></thead>
                            <tbody>
                                {my_attempts.map((a) => (
                                    <tr key={a._id}>
                                        <td>{new Date(a.started_at).toLocaleString('mn-MN')}</td>
                                        <td>{a.status === 'submitted' ? `${a.score}/${a.max_score} (${a.percent}%)` : '—'}</td>
                                        <td>
                                            {a.status === 'in_progress' ? <Badge tone="blue">Үргэлжилж байна</Badge>
                                                : a.status === 'expired' ? <Badge tone="red">Хугацаа дууссан</Badge>
                                                : a.passed ? <Badge tone="green">Тэнцсэн</Badge> : <Badge tone="amber">Тэнцээгүй</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function ExamSession({ session, onFinished }: { session: StartResponse; onFinished: (r: ExamResult) => void }) {
    const [answers, setAnswers] = useState<Answers>(() => loadAnswers(session.attempt_id))
    const [remaining, setRemaining] = useState(session.remaining_seconds)
    const submitAction = useAction()
    const endAt = useRef(Date.now() + session.remaining_seconds * 1000)
    const submitted = useRef(false)

    const setAnswer = (qid: string, value: string) => {
        const next = { ...answers, [qid]: value }
        setAnswers(next)
        try {
            localStorage.setItem(storageKey(session.attempt_id), JSON.stringify(next))
        } catch {
            // хадгалах боломжгүй бол санах ойд л үлдэнэ
        }
    }

    const submit = useCallback(async () => {
        if (submitted.current) return
        submitted.current = true
        const res = await submitAction.run(() =>
            api<ExamResult>(`/exam/attempt/${session.attempt_id}/submit`, 'POST', {
                answers: Object.entries(answers).map(([question_id, value]) => ({ question_id, value }))
            })
        )
        if (res) {
            try {
                localStorage.removeItem(storageKey(session.attempt_id))
            } catch {
                /* ignore */
            }
            onFinished(res)
        } else {
            submitted.current = false
        }
    }, [answers, onFinished, session.attempt_id, submitAction])

    useEffect(() => {
        const timer = setInterval(() => {
            const left = Math.max(Math.round((endAt.current - Date.now()) / 1000), 0)
            setRemaining(left)
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (remaining <= 0) submit()
    }, [remaining, submit])

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
    const ss = String(remaining % 60).padStart(2, '0')
    const answered = session.questions.filter((q) => (answers[q._id!] || '').trim()).length

    return (
        <div className="stack" style={{ maxWidth: 760 }}>
            <div className="card row-between" style={{ position: 'sticky', top: 64, zIndex: 5 }}>
                <span>{answered}/{session.questions.length} хариулсан</span>
                <span className={`timer ${remaining < 60 ? 'timer-low' : ''}`}>⏱ {mm}:{ss}</span>
            </div>

            {session.questions.map((q, i) => (
                <div key={q._id} className="question">
                    <div className="row-between">
                        <strong>{i + 1}. {q.text}</strong>
                        <span className="muted small">{q.points} оноо</span>
                    </div>
                    {q.type === 'choice' ? (
                        (q.options || []).map((opt) => (
                            <label key={opt} className="option">
                                <input
                                    type="radio"
                                    name={q._id}
                                    checked={answers[q._id!] === opt}
                                    onChange={() => setAnswer(q._id!, opt)}
                                />
                                {opt}
                            </label>
                        ))
                    ) : (
                        <input
                            className="mt"
                            inputMode={q.type === 'number' ? 'decimal' : 'text'}
                            placeholder={q.type === 'number' ? 'Тоогоор хариулна уу' : 'Хариултаа бичнэ үү'}
                            value={answers[q._id!] || ''}
                            onChange={(e) => setAnswer(q._id!, e.target.value)}
                        />
                    )}
                </div>
            ))}

            <ErrorBox message={submitAction.error} />
            <button className="btn btn-primary btn-lg" disabled={submitAction.busy} onClick={submit}>
                {submitAction.busy ? 'Илгээж байна…' : 'Хариу илгээх'}
            </button>
        </div>
    )
}

function ExamResultView({ result, courseId, onRetry }: { result: ExamResult; courseId: string; onRetry?: () => void }) {
    return (
        <div className="stack" style={{ maxWidth: 760 }}>
            <div className={`alert ${result.passed ? 'alert-success' : 'alert-error'}`}>
                <div>
                    <h2 style={{ margin: 0 }}>{result.passed ? '🎉 Тэнцлээ!' : 'Тэнцсэнгүй'}</h2>
                    <div>
                        {result.score}/{result.max_score} оноо · {result.percent}% (тэнцэх {result.pass_percent}%)
                        {!result.passed && ` · ${result.attempts_left} оролдлого үлдсэн`}
                    </div>
                </div>
            </div>

            {result.details.map((d, i) => (
                <div key={d.question_id} className={`question ${d.is_correct ? 'result-correct' : 'result-wrong'}`}>
                    <strong>{i + 1}. {d.text}</strong>
                    <p className="small mt">Таны хариу: {d.your_answer || <em>хариулаагүй</em>} {d.is_correct ? '✓' : '✗'}</p>
                    {d.correct_answer !== undefined && !d.is_correct && <p className="small">Зөв хариу: <strong>{d.correct_answer}</strong></p>}
                    {d.explanation && <p className="small muted pre">{d.explanation}</p>}
                </div>
            ))}

            <div className="row">
                <Link to={`/courses/${courseId}`} className="btn btn-primary">{result.passed ? 'Сертификат авах' : 'Курс руу буцах'}</Link>
                {onRetry && <button className="btn" onClick={onRetry}>Дахин өгөх</button>}
            </div>
        </div>
    )
}
