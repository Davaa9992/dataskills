import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, uploadFile } from '../../api/client'
import { Course, Exam, LEVEL_LABEL, LEVELS, Question, QuestionType, Step, StepType, TRACKS } from '../../api/types'
import { useAction, useFetch } from '../../components/useFetch'
import { Badge, ErrorBox, Field, PageHeader, Spinner } from '../../components/ui'

interface ManagedCourse {
    course: Course
    steps: Step[]
    exam: Exam | null
}

type CourseForm = Pick<Course, 'title' | 'description' | 'track' | 'level' | 'thumbnail' | 'project_title' | 'project_description'>

const EMPTY_COURSE: CourseForm = { title: '', description: '', track: 'Excel', level: 'Beginner', thumbnail: '', project_title: '', project_description: '' }

export default function TeacherCourseEdit() {
    const { id } = useParams()
    const isNew = id === 'new'
    const { data, error, loading, reload } = useFetch<ManagedCourse>(isNew ? null : `/teacher/course/${id}`)
    // Табууд нь сургалтын хуудасны "Алхам алхмаар / Бодит жишээ / Шалгалт ба сертификат" хэсгүүдтэй ижил
    const [tab, setTab] = useState<'info' | StepType | 'exam'>('info')

    if (isNew) {
        return (
            <div className="stack" style={{ maxWidth: 820 }}>
                <Link to="/teacher" className="small">← Багшийн самбар</Link>
                <PageHeader title="Шинэ курс" subtitle="Хадгалсны дараа алхам, шалгалтаа нэмнэ" />
                <CourseInfoForm />
            </div>
        )
    }

    if (loading && !data) return <Spinner />
    if (error) return <ErrorBox message={error} onRetry={reload} />
    if (!data) return null

    const lessonCount = data.steps.filter((s) => s.type !== 'practice').length
    const practiceCount = data.steps.length - lessonCount

    return (
        <div className="stack">
            <Link to="/teacher" className="small">← Багшийн самбар</Link>
            <PageHeader
                title={data.course.title}
                subtitle={<>{data.steps.length} алхам · {data.course.published ? <Badge tone="green">Нийтэлсэн</Badge> : <Badge tone="amber">Ноорог</Badge>}</>}
                actions={<PublishToggle course={data.course} stepCount={data.steps.length} onChange={reload} />}
            />
            <div className="tabs">
                <button className={`tab ${tab === 'info' ? 'tab-active' : ''}`} onClick={() => setTab('info')}>Мэдээлэл</button>
                <button className={`tab ${tab === 'lesson' ? 'tab-active' : ''}`} onClick={() => setTab('lesson')}>🪜 Алхам алхмаар ({lessonCount})</button>
                <button className={`tab ${tab === 'practice' ? 'tab-active' : ''}`} onClick={() => setTab('practice')}>🧪 Бодит жишээ дадлага ({practiceCount})</button>
                <button className={`tab ${tab === 'exam' ? 'tab-active' : ''}`} onClick={() => setTab('exam')}>📝 Шалгалт ба сертификат</button>
            </div>
            {tab === 'info' && <CourseInfoForm course={data.course} onSaved={reload} />}
            {(tab === 'lesson' || tab === 'practice') && (
                <StepsEditor key={tab} type={tab} courseId={data.course._id} steps={data.steps} onChange={reload} />
            )}
            {tab === 'exam' && (
                <div className="stack">
                    <p className="muted">
                        Сурагч бүх алхмаа дуусгаад шалгалт өгнө. Тэнцвэл сертификат авна.
                        {data.course.project_title
                            ? ` Төгсгөлийн төсөл ("${data.course.project_title}") нь таны зөвшөөрөлтэй байх ёстой.`
                            : ' Төгсгөлийн төсөл нэмбэл ("Мэдээлэл" таб) сертификатад төсөл нь зөвшөөрөгдсөн байх шаардлага нэмэгдэнэ.'}
                    </p>
                    <ExamEditor courseId={data.course._id} exam={data.exam} onChange={reload} />
                </div>
            )}
        </div>
    )
}

function PublishToggle({ course, stepCount, onChange }: { course: Course; stepCount: number; onChange: () => void }) {
    const { busy, error, run } = useAction()
    const toggle = async () => {
        const ok = await run(() => api(`/teacher/course/${course._id}`, 'PATCH', { published: course.published ? 0 : 1 }))
        if (ok) onChange()
    }
    return (
        <>
            {error && <span className="small" style={{ color: 'var(--red)' }}>{error}</span>}
            {course.published === 1 && <Link to={`/courses/${course._id}`} className="btn">Харах</Link>}
            <button
                className={`btn ${course.published ? '' : 'btn-success'}`}
                disabled={busy || (!course.published && !stepCount)}
                title={!stepCount ? 'Эхлээд алхам нэмнэ үү' : undefined}
                onClick={toggle}
            >
                {course.published ? 'Нийтлэлээс авах' : 'Нийтлэх'}
            </button>
        </>
    )
}

function CourseInfoForm({ course, onSaved }: { course?: Course; onSaved?: () => void }) {
    const navigate = useNavigate()
    const [form, setForm] = useState<CourseForm>(course ? { ...EMPTY_COURSE, ...course } : EMPTY_COURSE)
    const [saved, setSaved] = useState(false)
    const { busy, error, run } = useAction()
    const set = (key: keyof CourseForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        setSaved(false)
        const body = {
            title: form.title,
            description: form.description || '',
            track: form.track,
            level: form.level,
            thumbnail: form.thumbnail || '',
            project_title: form.project_title || '',
            project_description: form.project_description || ''
        }
        if (course) {
            const ok = await run(() => api(`/teacher/course/${course._id}`, 'PATCH', body))
            if (ok) {
                setSaved(true)
                onSaved?.()
            }
        } else {
            const created = await run(() => api<Course>('/teacher/course', 'POST', body))
            if (created) navigate(`/teacher/courses/${created._id}`, { replace: true })
        }
    }

    return (
        <form className="card form" onSubmit={submit}>
            {saved && <div className="alert alert-success">Хадгаллаа</div>}
            <Field label="Курсын нэр"><input required value={form.title} onChange={set('title')} /></Field>
            <div className="grid-2">
                <Field label="Чиглэл">
                    <select value={form.track} onChange={set('track')}>{TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                </Field>
                <Field label="Түвшин">
                    <select value={form.level} onChange={set('level')}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}</select>
                </Field>
            </div>
            <Field label="Тайлбар"><textarea value={form.description || ''} onChange={set('description')} /></Field>
            <Field label="Зургийн линк (заавал биш)"><input type="url" value={form.thumbnail || ''} onChange={set('thumbnail')} /></Field>
            <h3 className="mt">Төгсгөлийн төсөл (заавал биш)</h3>
            <p className="muted small">Төсөлтэй бол сурагч сертификат авахын тулд төсөл нь зөвшөөрөгдсөн байх ёстой.</p>
            <Field label="Төслийн нэр"><input value={form.project_title || ''} onChange={set('project_title')} /></Field>
            <Field label="Төслийн даалгавар"><textarea value={form.project_description || ''} onChange={set('project_description')} /></Field>
            <ErrorBox message={error} />
            <div><button className="btn btn-primary" disabled={busy}>{course ? 'Хадгалах' : 'Курс үүсгэх'}</button></div>
        </form>
    )
}

type StepForm = Pick<Step, 'type' | 'title' | 'content' | 'video_url' | 'dataset_url' | 'task'> & { position?: number }

const EMPTY_STEP: StepForm = { type: 'lesson', title: '', content: '', video_url: '', dataset_url: '', task: '' }

const SECTION: Record<StepType, { hint: string; add: string; empty: string }> = {
    lesson: {
        hint: 'Онол, видео, тайлбартай богино хичээлүүд. Сургалтын хуудсанд "Алхам алхмаар" хэсэгт харагдана.',
        add: '+ Хичээл нэмэх',
        empty: 'Хичээл алга. Эхний хичээлээ нэмээрэй.'
    },
    practice: {
        hint: 'Жишээ өгөгдөл дээр гүйцэтгэх даалгаварууд. Сургалтын хуудсанд "Бодит жишээн дээр дадлага" хэсэгт харагдана.',
        add: '+ Дадлага нэмэх',
        empty: 'Дадлага алга. Жишээ өгөгдөлтэй даалгавар нэмээрэй.'
    }
}

/** Нэг төрлийн (хичээл эсвэл дадлага) алхмууд. Дугаар нь бүх алхмын дундах дараалал */
function StepsEditor({ type, courseId, steps, onChange }: { type: StepType; courseId: string; steps: Step[]; onChange: () => void }) {
    const [editing, setEditing] = useState<string | 'new' | null>(null)
    const del = useAction()
    const section = SECTION[type]
    const shown = steps.filter((s) => (type === 'practice' ? s.type === 'practice' : s.type !== 'practice'))

    const remove = async (s: Step) => {
        if (!window.confirm(`"${s.title}" алхмыг устгах уу?`)) return
        const ok = await del.run(() => api(`/teacher/course/${courseId}/step/${s._id}`, 'DELETE'))
        if (ok) onChange()
    }

    return (
        <div className="stack">
            <p className="muted">{section.hint}</p>
            <ErrorBox message={del.error} />
            {!shown.length && editing !== 'new' && <div className="empty">{section.empty}</div>}
            {shown.map((s) =>
                editing === s._id ? (
                    <StepFormCard key={s._id} courseId={courseId} step={s} onDone={() => { setEditing(null); onChange() }} onCancel={() => setEditing(null)} />
                ) : (
                    <div key={s._id} className="step-item">
                        <span className="step-num">{s.position}</span>
                        <span style={{ flex: 1 }}>
                            {s.title} {s.type === 'practice' && <Badge tone="amber">Дадлага</Badge>} {s.video_url && <Badge>Видео</Badge>}
                        </span>
                        <button className="btn btn-sm" onClick={() => setEditing(s._id)}>Засах</button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(s)}>Устгах</button>
                    </div>
                )
            )}
            {editing === 'new' ? (
                <StepFormCard courseId={courseId} defaultType={type} onDone={() => { setEditing(null); onChange() }} onCancel={() => setEditing(null)} />
            ) : (
                <div><button className="btn btn-primary" onClick={() => setEditing('new')}>{section.add}</button></div>
            )}
        </div>
    )
}

function StepFormCard({
    courseId,
    step,
    defaultType = 'lesson',
    onDone,
    onCancel
}: {
    courseId: string
    step?: Step
    defaultType?: StepType
    onDone: () => void
    onCancel: () => void
}) {
    const [form, setForm] = useState<StepForm>(step ? { ...EMPTY_STEP, ...step } : { ...EMPTY_STEP, type: defaultType })
    const { busy, error, run } = useAction()
    const set = (key: keyof StepForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const body: Record<string, unknown> = {
            type: form.type,
            title: form.title,
            content: form.content || '',
            video_url: form.video_url || '',
            dataset_url: form.type === 'practice' ? form.dataset_url || '' : '',
            task: form.type === 'practice' ? form.task || '' : ''
        }
        if (form.position && form.position !== step?.position) body.position = Number(form.position)
        const path = step ? `/teacher/course/${courseId}/step/${step._id}` : `/teacher/course/${courseId}/step`
        const ok = await run(() => api(path, step ? 'PATCH' : 'POST', body))
        if (ok) onDone()
    }

    return (
        <form className="card form" onSubmit={submit}>
            <h3>{step ? 'Алхам засах' : form.type === 'practice' ? 'Шинэ дадлага' : 'Шинэ хичээл'}</h3>
            <div className="grid-2">
                <Field label="Төрөл">
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as StepType })}>
                        <option value="lesson">Хичээл (онол, видео)</option>
                        <option value="practice">Дадлага (бодит жишээ)</option>
                    </select>
                </Field>
                <Field label="Дугаар" hint="Хоосон бол хамгийн сүүлд нэмнэ">
                    <input type="number" min={1} value={form.position ?? ''} onChange={(e) => setForm({ ...form, position: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
            </div>
            <Field label="Гарчиг"><input required value={form.title} onChange={set('title')} /></Field>
            <Field label="Видео линк" hint="YouTube, Vimeo"><input type="url" value={form.video_url || ''} onChange={set('video_url')} /></Field>
            <Field label="Агуулга"><textarea rows={6} value={form.content || ''} onChange={set('content')} /></Field>
            {form.type === 'practice' && (
                <>
                    <Field label="Даалгавар"><textarea required value={form.task || ''} onChange={set('task')} /></Field>
                    <Field label="Жишээ өгөгдлийн линк" hint="Excel/CSV/.pbix файлын татах линк, эсвэл доороос файлаа upload хийнэ үү">
                        <input type="url" value={form.dataset_url || ''} onChange={set('dataset_url')} />
                    </Field>
                    <DatasetUpload onUploaded={(url) => setForm((f) => ({ ...f, dataset_url: url }))} />
                </>
            )}
            <ErrorBox message={error} />
            <div className="row">
                <button className="btn btn-primary" disabled={busy}>Хадгалах</button>
                <button type="button" className="btn" onClick={onCancel}>Болих</button>
            </div>
        </form>
    )
}

/** Компьютерээс жишээ өгөгдлийн файл upload хийгээд линкийг нь буцаана */
function DatasetUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
    const [uploaded, setUploaded] = useState<{ name: string; size: number } | null>(null)
    const { busy, error, run } = useAction()

    const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setUploaded(null)
        const res = await run(() => uploadFile<{ url: string; name: string; size: number }>('/teacher/upload', file))
        if (res) {
            setUploaded(res)
            onUploaded(res.url)
        }
    }

    return (
        <div className="stack" style={{ gap: '0.4rem' }}>
            <label className="btn upload-btn">
                <input type="file" accept=".xlsx,.xls,.xlsm,.csv,.pbix,.twbx,.zip" onChange={onFile} disabled={busy} />
                {busy ? 'Upload хийж байна…' : '⬆ Компьютерээс файл оруулах'}
            </label>
            <span className="field-hint">Excel, CSV, .pbix, .twbx, .zip · 20MB хүртэл</span>
            {uploaded && (
                <div className="alert alert-success small">
                    ✓ {uploaded.name} ({(uploaded.size / 1024).toFixed(0)} KB) upload хийгдлээ. «Хадгалах» дарж дадлагад хавсаргана уу.
                </div>
            )}
            <ErrorBox message={error} />
        </div>
    )
}

const EMPTY_QUESTION: Question ={ text: '', type: 'choice', options: ['', ''], answer: '', points: 1 }

function ExamEditor({ courseId, exam, onChange }: { courseId: string; exam: Exam | null; onChange: () => void }) {
    const [form, setForm] = useState({
        title: exam?.title || 'Төгсгөлийн шалгалт',
        pass_percent: exam?.pass_percent ?? 70,
        duration_minutes: exam?.duration_minutes ?? 30,
        max_attempts: exam?.max_attempts ?? 3,
        published: exam?.published ?? 0
    })
    const [questions, setQuestions] = useState<Question[]>(exam?.questions?.length ? exam.questions : [{ ...EMPTY_QUESTION }])
    const [saved, setSaved] = useState(false)
    const save = useAction()
    const del = useAction()

    useEffect(() => setSaved(false), [form, questions])

    const updateQ = (i: number, patch: Partial<Question>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)))

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const body = {
            ...form,
            questions: questions.map((q) => ({
                ...(q._id ? { _id: q._id } : {}),
                text: q.text,
                type: q.type,
                options: q.type === 'choice' ? (q.options || []).filter((o) => o.trim()) : undefined,
                answer: q.answer,
                tolerance: q.type === 'number' && q.tolerance !== undefined ? q.tolerance : undefined,
                points: q.points,
                explanation: q.explanation || undefined
            }))
        }
        const ok = await save.run(() => api(`/teacher/course/${courseId}/exam`, 'PUT', body))
        if (ok) {
            setSaved(true)
            onChange()
        }
    }

    const remove = async () => {
        if (!window.confirm('Шалгалтыг устгах уу?')) return
        const ok = await del.run(() => api(`/teacher/course/${courseId}/exam`, 'DELETE'))
        if (ok) onChange()
    }

    return (
        <form className="stack" onSubmit={submit}>
            <div className="card form">
                <Field label="Шалгалтын нэр"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
                <div className="grid">
                    <Field label="Тэнцэх хувь"><input type="number" min={0} max={100} value={form.pass_percent} onChange={(e) => setForm({ ...form, pass_percent: Number(e.target.value) })} /></Field>
                    <Field label="Хугацаа (минут)"><input type="number" min={1} max={300} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></Field>
                    <Field label="Оролдлогын тоо"><input type="number" min={1} value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: Number(e.target.value) })} /></Field>
                </div>
                <label className="row">
                    <input type="checkbox" checked={form.published === 1} onChange={(e) => setForm({ ...form, published: e.target.checked ? 1 : 0 })} />
                    Нийтлэх (сурагчдад харагдана)
                </label>
            </div>

            {questions.map((q, i) => (
                <div key={i} className="card form">
                    <div className="row-between">
                        <strong>Асуулт {i + 1}</strong>
                        <button type="button" className="btn btn-sm btn-danger" disabled={questions.length === 1} onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>Хасах</button>
                    </div>
                    <Field label="Асуулт"><textarea required rows={2} value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} /></Field>
                    <div className="grid">
                        <Field label="Төрөл">
                            <select value={q.type} onChange={(e) => updateQ(i, { type: e.target.value as QuestionType, options: e.target.value === 'choice' ? q.options || ['', ''] : undefined })}>
                                <option value="choice">Сонголттой</option>
                                <option value="number">Тоон хариу</option>
                                <option value="text">Богино текст</option>
                            </select>
                        </Field>
                        <Field label="Оноо"><input type="number" min={0} value={q.points} onChange={(e) => updateQ(i, { points: Number(e.target.value) })} /></Field>
                        {q.type === 'number' && (
                            <Field label="Зөрүү (±)"><input type="number" min={0} step="any" value={q.tolerance ?? ''} onChange={(e) => updateQ(i, { tolerance: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                        )}
                    </div>
                    {q.type === 'choice' ? (
                        <div className="stack">
                            <span className="field-label">Сонголтууд (зөвийг нь тэмдэглэнэ)</span>
                            {(q.options || []).map((opt, k) => (
                                <div key={k} className="row">
                                    <input type="radio" name={`answer-${i}`} checked={!!opt && q.answer === opt} onChange={() => updateQ(i, { answer: opt })} />
                                    <input
                                        style={{ flex: 1 }}
                                        value={opt}
                                        placeholder={`Сонголт ${k + 1}`}
                                        onChange={(e) => {
                                            const options = [...(q.options || [])]
                                            const wasAnswer = q.answer === options[k]
                                            options[k] = e.target.value
                                            updateQ(i, { options, ...(wasAnswer ? { answer: e.target.value } : {}) })
                                        }}
                                    />
                                    <button type="button" className="btn btn-sm" disabled={(q.options || []).length <= 2} onClick={() => updateQ(i, { options: (q.options || []).filter((_, m) => m !== k) })}>✕</button>
                                </div>
                            ))}
                            <div><button type="button" className="btn btn-sm" onClick={() => updateQ(i, { options: [...(q.options || []), ''] })}>+ Сонголт</button></div>
                        </div>
                    ) : (
                        <Field label="Зөв хариу"><input required value={q.answer || ''} onChange={(e) => updateQ(i, { answer: e.target.value })} /></Field>
                    )}
                    <Field label="Тайлбар (дүн гарсны дараа харагдана)"><input value={q.explanation || ''} onChange={(e) => updateQ(i, { explanation: e.target.value })} /></Field>
                </div>
            ))}

            <div><button type="button" className="btn" onClick={() => setQuestions([...questions, { ...EMPTY_QUESTION, options: ['', ''] }])}>+ Асуулт нэмэх</button></div>
            {saved && <div className="alert alert-success">Шалгалт хадгалагдлаа</div>}
            <ErrorBox message={save.error || del.error} />
            <div className="row">
                <button className="btn btn-primary" disabled={save.busy}>Шалгалт хадгалах</button>
                {exam && <button type="button" className="btn btn-danger" disabled={del.busy} onClick={remove}>Устгах</button>}
            </div>
        </form>
    )
}
