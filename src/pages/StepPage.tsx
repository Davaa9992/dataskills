import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { CourseDetail, Step } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import SubmitWork from '../components/SubmitWork'
import VideoEmbed from '../components/VideoEmbed'
import DatasetPreview, { fileNameOf } from '../components/DatasetPreview'
import { useAction, useFetch } from '../components/useFetch'
import { Badge, ErrorBox, ProgressBar, Spinner } from '../components/ui'

interface StepResponse {
    step: Step
    prev_id: string | null
    next_id: string | null
}

export default function StepPage() {
    const { id } = useParams()
    const { user } = useAuth()
    const { data, error, loading, reload } = useFetch<StepResponse>(`/step/${id}`)
    const courseId = data?.step.course_id
    const course = useFetch<CourseDetail>(courseId ? `/course/${courseId}` : null)
    const toggle = useAction()

    if (loading && !data) return <Spinner />
    if (error) return <ErrorBox message={error} onRetry={reload} />
    if (!data) return null

    const { step, prev_id, next_id } = data
    const steps = course.data?.steps || []
    const completed = steps.find((s) => s._id === step._id)?.completed

    const setCompleted = async (done: boolean) => {
        const ok = await toggle.run(() => api(`/step/${step._id}/complete`, done ? 'POST' : 'DELETE'))
        if (ok) course.reload()
    }

    return (
        <div className="two-col">
            <article className="stack">
                <div>
                    {course.data && (
                        <Link to={`/courses/${course.data.course._id}`} className="small">← {course.data.course.title}</Link>
                    )}
                    <div className="row mt">
                        <Badge>Алхам {step.position}</Badge>
                        {step.type === 'practice' && <Badge tone="amber">Дадлага</Badge>}
                        {completed && <Badge tone="green">Дууссан</Badge>}
                    </div>
                    <h1 className="mt">{step.title}</h1>
                </div>

                {step.video_url && <VideoEmbed url={step.video_url} title={step.title} />}
                {step.content && <div className="card pre">{step.content}</div>}

                {step.type === 'practice' && (
                    <div className="task-box stack">
                        <h3>🧪 Даалгавар</h3>
                        {step.task && <p className="pre">{step.task}</p>}
                        {step.dataset_url && (
                            <>
                                <DatasetPreview url={step.dataset_url} />
                                <div>
                                    <a className="btn" href={step.dataset_url} target="_blank" rel="noreferrer" download={fileNameOf(step.dataset_url)}>
                                        ⬇ Жишээ өгөгдөл татах
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {step.type === 'practice' && user && (
                    <div className="card">
                        <h3>Ажлаа илгээх</h3>
                        <SubmitWork courseId={step.course_id} stepId={step._id} />
                    </div>
                )}

                <ErrorBox message={toggle.error} />
                <div className="row-between">
                    {prev_id ? <Link to={`/steps/${prev_id}`} className="btn">← Өмнөх</Link> : <span />}
                    <div className="row">
                        {user ? (
                            completed ? (
                                <button className="btn" disabled={toggle.busy} onClick={() => setCompleted(false)}>Дуусгаагүй болгох</button>
                            ) : (
                                <button className="btn btn-success" disabled={toggle.busy} onClick={() => setCompleted(true)}>✓ Дуусгасан</button>
                            )
                        ) : (
                            <Link to={`/login?next=/steps/${step._id}`} className="btn">Явц хадгалахын тулд нэвтрэх</Link>
                        )}
                        {next_id ? (
                            <Link to={`/steps/${next_id}`} className="btn btn-primary">Дараах →</Link>
                        ) : (
                            course.data && <Link to={`/courses/${course.data.course._id}`} className="btn btn-primary">Курс руу буцах</Link>
                        )}
                    </div>
                </div>
            </article>

            <aside className="card stack">
                {course.data?.progress && (
                    <div>
                        <div className="row-between small">
                            <strong>Явц</strong>
                            <span className="muted">{course.data.progress.percent}%</span>
                        </div>
                        <ProgressBar percent={course.data.progress.percent} />
                    </div>
                )}
                <ol className="step-list">
                    {steps.map((s) => (
                        <li key={s._id}>
                            <Link
                                to={`/steps/${s._id}`}
                                className={`step-item ${s.completed ? 'step-done' : ''}`}
                                style={s._id === step._id ? { borderColor: 'var(--primary)' } : undefined}
                            >
                                <span className="step-num">{s.completed ? '✓' : s.position}</span>
                                <span className="small">{s.title}</span>
                            </Link>
                        </li>
                    ))}
                </ol>
                {course.data?.exam && (
                    <Link to={`/exam/${course.data.course._id}`} className="btn">📝 Шалгалт</Link>
                )}
            </aside>
        </div>
    )
}
