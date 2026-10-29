import { Link } from 'react-router-dom'
import { Course, TRACKS } from '../api/types'
import CourseCard, { TRACK_ICON } from '../components/CourseCard'
import { useFetch } from '../components/useFetch'
import { ErrorBox, Spinner } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

// Сургалтын онцлогууд (алхам, дадлага, шалгалт) сургалт бүрийн хуудсанд харагдана
const FEATURES = [{ icon: '🏢', title: 'Байгууллагад', text: 'Ажилтнуудаа нэмж, хэн юу сурч байгааг нэг дороос хянана.' }]

export default function Home() {
    const { user } = useAuth()
    const { data: courses, error, loading, reload } = useFetch<Course[]>('/course')

    // Нэвтэрсэн хэрэглэгчид зөвхөн сургалттай холбоотой хэсгүүд харагдана
    return (
        <>
            <section className="hero">
                <h1>Excel, Power BI-г бодит өгөгдөл дээр сур</h1>
                <p>
                    Хувь хүн болон байгууллагад зориулсан дата сургалт.
                    {!user && ' Мөн Excel файлаа оруулаад шууд график гаргах, эсвэл манай дата аналистуудад даалгах боломжтой.'}
                </p>
                <div className="row">
                    <Link to="/courses" className="btn btn-primary btn-lg">Сургалтууд үзэх</Link>
                    {user ? (
                        <Link to="/learning" className="btn btn-lg">Миний сургалт</Link>
                    ) : (
                        <>
                            <Link to="/charts/new" className="btn btn-lg">Excel-ээс chart гаргах</Link>
                            <Link to="/services" className="btn btn-lg">Дата үйлчилгээ</Link>
                        </>
                    )}
                </div>
            </section>

            {!user && (
                <section className="section grid">
                    {FEATURES.map((f) => (
                        <div key={f.title} className="card">
                            <div className="feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p className="muted small">{f.text}</p>
                        </div>
                    ))}
                </section>
            )}

            <section className="section">
                <div className="row-between">
                    <h2>Чиглэлүүд</h2>
                </div>
                <div className="row mt">
                    {TRACKS.map((t) => (
                        <Link key={t} to={`/courses?track=${encodeURIComponent(t)}`} className="btn">
                            {TRACK_ICON[t]} {t}
                        </Link>
                    ))}
                </div>
            </section>

            <section className="section">
                <div className="row-between">
                    <h2>Шинэ сургалтууд</h2>
                    <Link to="/courses">Бүгдийг харах →</Link>
                </div>
                <div className="mt">
                    {loading && <Spinner />}
                    <ErrorBox message={error} onRetry={reload} />
                    {courses && (
                        <div className="grid">
                            {courses.slice(0, 6).map((c) => (
                                <CourseCard key={c._id} course={c} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {!user && (
                <section className="section card">
                    <div className="row-between">
                        <div>
                            <h2>Компанидаа дата аналист хэрэгтэй юу?</h2>
                            <p className="muted">
                                Датагаа илгээгээд бэлэн Power BI dashboard, анализ, дата pipeline захиалаарай.
                            </p>
                        </div>
                        <Link to="/services" className="btn btn-primary">Үйлчилгээ захиалах</Link>
                    </div>
                </section>
            )}
        </>
    )
}
