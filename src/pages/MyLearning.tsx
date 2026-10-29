import { Link } from 'react-router-dom'
import { Certificate, Course, Progress, refId, refName, Submission, SUBMISSION_LABEL } from '../api/types'
import CourseCard from '../components/CourseCard'
import { useFetch } from '../components/useFetch'
import { Badge, Empty, ErrorBox, formatDate, PageHeader, Spinner } from '../components/ui'

type MyCourse = Pick<Course, '_id' | 'title' | 'track' | 'level' | 'thumbnail'> & { progress: Progress }

export default function MyLearning() {
    const courses = useFetch<MyCourse[]>('/course/my')
    const certs = useFetch<Certificate[]>('/certificate/my')
    const subs = useFetch<Submission[]>('/submission/my')

    return (
        <div className="stack">
            <PageHeader title="Миний сургалт" actions={<Link to="/courses" className="btn">Шинэ сургалт олох</Link>} />

            <section>
                <h2>Үргэлжилж буй</h2>
                {courses.loading && <Spinner />}
                <ErrorBox message={courses.error} onRetry={courses.reload} />
                {courses.data && !courses.data.length && (
                    <Empty>
                        Та одоогоор сургалт эхлээгүй байна. <Link to="/courses">Сургалтууд үзэх</Link>
                    </Empty>
                )}
                {courses.data && (
                    <div className="grid">
                        {courses.data.map((c) => <CourseCard key={c._id} course={c} progress={c.progress} />)}
                    </div>
                )}
            </section>

            <section>
                <h2>Сертификатууд</h2>
                <ErrorBox message={certs.error} />
                {certs.data && !certs.data.length && <Empty>Сургалтаа дуусгаж шалгалтад тэнцвэл сертификат энд гарна.</Empty>}
                {certs.data && certs.data.length > 0 && (
                    <div className="grid">
                        {certs.data.map((c) => (
                            <div key={c._id} className="card stack">
                                <span style={{ fontSize: '1.8rem' }}>🎓</span>
                                <h3>{refName(c.course_id, 'title')}</h3>
                                <p className="muted small">Олгосон: {formatDate(c.issued_at)}</p>
                                <p className="small">Код: <strong>{c.code}</strong></p>
                                <Link to={`/verify/${c.code}`} className="small">Баталгаажуулах линк →</Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h2>Илгээсэн ажлууд</h2>
                <ErrorBox message={subs.error} />
                {subs.data && !subs.data.length && <Empty>Илгээсэн ажил алга</Empty>}
                {subs.data && subs.data.length > 0 && (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Курс</th><th>Алхам</th><th>Огноо</th><th>Төлөв</th><th>Санал</th></tr></thead>
                            <tbody>
                                {subs.data.map((s) => (
                                    <tr key={s._id}>
                                        <td><Link to={`/courses/${refId(s.course_id)}`}>{refName(s.course_id, 'title')}</Link></td>
                                        <td>{s.step_id ? refName(s.step_id, 'title') : 'Төгсгөлийн төсөл'}</td>
                                        <td>{formatDate(s.createdAt)}</td>
                                        <td><Badge tone={s.status === 'approved' ? 'green' : s.status === 'needs_changes' ? 'red' : 'amber'}>{SUBMISSION_LABEL[s.status]}</Badge></td>
                                        <td className="pre small">{s.feedback || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}
