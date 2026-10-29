import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { CourseDetail as Detail, LEVEL_LABEL, refName } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import SubmitWork from '../components/SubmitWork'
import { useAction, useFetch } from '../components/useFetch'
import { Badge, ErrorBox, ProgressBar, Spinner } from '../components/ui'

export default function CourseDetail() {
    const { id } = useParams()
    const { user } = useAuth()
    const { data, error, loading, reload } = useFetch<Detail>(`/course/${id}`)
    const claim = useAction()

    if (loading && !data) return <Spinner />
    if (error) return <ErrorBox message={error} onRetry={reload} />
    if (!data) return null

    const { course, steps, exam, progress, eligibility, certificate, my_attempts } = data
    const firstOpen = steps.find((s) => !s.completed) || steps[0]
    const passed = my_attempts?.some((a) => a.passed)
    // Картууд нь багшийн "Алхам алхмаар / Бодит жишээ дадлага / Шалгалт ба сертификат" табуудад оруулсан мэдээллээс бүрдэнэ
    const lessons = steps.filter((s) => s.type !== 'practice')
    const practices = steps.filter((s) => s.type === 'practice')
    const examLines = [
        exam ? `${exam.question_count} асуулт · ${exam.duration_minutes} минут · тэнцэх ${exam.pass_percent}%` : 'Шалгалт одоохондоо алга',
        course.project_title ? `Төгсгөлийн төсөл: ${course.project_title}` : null,
        'Тэнцвэл баталгаажуулах кодтой сертификат авна'
    ].filter(Boolean) as string[]
    const howItWorks = [
        { icon: '🪜', title: 'Алхам алхмаар', count: `${lessons.length} хичээл`, steps: lessons, empty: 'Хичээл одоохондоо нэмэгдээгүй' },
        { icon: '🧪', title: 'Бодит жишээн дээр дадлага', count: `${practices.length} дадлага`, steps: practices, empty: 'Дадлага одоохондоо нэмэгдээгүй' }
    ]

    const claimCertificate = async () => {
        const ok = await claim.run(() => api(`/course/${course._id}/certificate`, 'POST'))
        if (ok) reload()
    }

    return (
        <div className="two-col">
            <div className="stack">
                <div>
                    <div className="row">
                        <Badge tone="blue">{course.track}</Badge>
                        <Badge>{LEVEL_LABEL[course.level]}</Badge>
                        {course.published !== 1 && <Badge tone="amber">Нийтлээгүй</Badge>}
                    </div>
                    <h1 className="mt">{course.title}</h1>
                    {refName(course.teacher_id) && <p className="muted">Багш: {refName(course.teacher_id)}</p>}
                    {course.description && <p className="pre">{course.description}</p>}
                </div>

                <div className="how-grid">
                    {howItWorks.map((f) => (
                        <div key={f.title} className="card how-card">
                            <div className="feature-icon">{f.icon}</div>
                            <div className="row-between">
                                <h3>{f.title}</h3>
                                <Badge tone="blue">{f.count}</Badge>
                            </div>
                            {f.steps.length ? (
                                <ul className="how-list small">
                                    {f.steps.map((s) => (
                                        <li key={s._id}>
                                            <Link to={`/steps/${s._id}`}>
                                                {s.completed ? '✓ ' : `${s.position}. `}
                                                {s.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="muted small">{f.empty}</p>
                            )}
                        </div>
                    ))}
                    <div className="card how-card">
                        <div className="feature-icon">📝</div>
                        <div className="row-between">
                            <h3>Шалгалт ба сертификат</h3>
                            <Badge tone={exam ? 'blue' : 'neutral'}>{exam ? `${exam.question_count} асуулт` : 'Шалгалтгүй'}</Badge>
                        </div>
                        <ul className="how-list small muted">
                            {examLines.map((l) => <li key={l}>{l}</li>)}
                        </ul>
                    </div>
                </div>

                <div className="card">
                    <h2>Алхмууд ({steps.length})</h2>
                    <ol className="step-list">
                        {steps.map((s) => (
                            <li key={s._id}>
                                <Link to={`/steps/${s._id}`} className={`step-item ${s.completed ? 'step-done' : ''}`}>
                                    <span className="step-num">{s.completed ? '✓' : s.position}</span>
                                    <span style={{ flex: 1 }}>{s.title}</span>
                                    {s.type === 'practice' && <Badge tone="amber">Дадлага</Badge>}
                                </Link>
                            </li>
                        ))}
                    </ol>
                </div>

                {course.project_title && (
                    <div className="card stack">
                        <div>
                            <Badge tone="amber">Төгсгөлийн төсөл</Badge>
                            <h2 className="mt">{course.project_title}</h2>
                            {course.project_description && <p className="pre">{course.project_description}</p>}
                        </div>
                        {user ? <SubmitWork courseId={course._id} onChange={reload} /> : <p className="muted">Төсөл илгээхийн тулд нэвтэрнэ үү.</p>}
                    </div>
                )}
            </div>

            <aside className="stack">
                <div className="card stack">
                    {user && progress ? (
                        <>
                            <div>
                                <div className="row-between">
                                    <strong>Явц</strong>
                                    <span className="muted small">{progress.done}/{progress.total}</span>
                                </div>
                                <ProgressBar percent={progress.percent} />
                            </div>
                            {firstOpen && (
                                <Link to={`/steps/${firstOpen._id}`} className="btn btn-primary">
                                    {progress.done ? 'Үргэлжлүүлэх' : 'Эхлэх'}
                                </Link>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="muted">Явцаа хадгалж, шалгалт өгөхийн тулд нэвтэрнэ үү.</p>
                            <Link to={`/login?next=/courses/${course._id}`} className="btn btn-primary">Нэвтэрч эхлэх</Link>
                            {steps[0] && <Link to={`/steps/${steps[0]._id}`} className="btn">Эхний алхмыг үзэх</Link>}
                        </>
                    )}
                </div>

                {exam && (
                    <div className="card stack">
                        <h3>📝 {exam.title}</h3>
                        <p className="muted small">
                            {exam.question_count} асуулт · {exam.duration_minutes} минут · тэнцэх {exam.pass_percent}% · {exam.max_attempts} оролдлого
                        </p>
                        {my_attempts && my_attempts.length > 0 && (
                            <ul className="small">
                                {my_attempts.map((a) => (
                                    <li key={a._id}>
                                        {a.status === 'in_progress' ? 'Үргэлжилж байна' : a.status === 'expired' ? 'Хугацаа дууссан' : `${a.percent}%`}{' '}
                                        {a.passed && <Badge tone="green">Тэнцсэн</Badge>}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {user && !passed && (
                            <Link to={`/exam/${course._id}`} className="btn">Шалгалт руу</Link>
                        )}
                    </div>
                )}

                {user && eligibility && (
                    <div className="card stack">
                        <h3>🎓 Сертификат</h3>
                        {certificate ? (
                            <>
                                <div className="alert alert-success">Сертификат авсан</div>
                                <p className="small">Код: <strong>{certificate.code}</strong></p>
                                <Link to={`/verify/${certificate.code}`}>Баталгаажуулах хуудас →</Link>
                            </>
                        ) : eligibility.eligible ? (
                            <>
                                <ErrorBox message={claim.error} />
                                <button className="btn btn-success" disabled={claim.busy} onClick={claimCertificate}>Сертификат авах</button>
                            </>
                        ) : (
                            <ul className="small muted">
                                {eligibility.missing.map((m) => <li key={m}>{m}</li>)}
                            </ul>
                        )}
                    </div>
                )}
            </aside>
        </div>
    )
}
