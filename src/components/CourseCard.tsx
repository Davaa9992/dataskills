import { Link } from 'react-router-dom'
import { Course, LEVEL_LABEL, Progress, refName } from '../api/types'
import { Badge, ProgressBar } from './ui'

export const TRACK_ICON: Record<string, string> = {
    Excel: '📗',
    Spreadsheet: '📄',
    'Power BI': '📊',
    Tableau: '📈',
    'Data Analyst': '🔎'
}

export default function CourseCard({ course, progress }: { course: Pick<Course, '_id' | 'title' | 'track' | 'level' | 'thumbnail'> & Partial<Course>; progress?: Progress }) {
    return (
        <Link to={`/courses/${course._id}`} className="card card-link">
            <div
                className="course-thumb"
                style={course.thumbnail ? { backgroundImage: `url(${course.thumbnail})` } : undefined}
            >
                {!course.thumbnail && `${TRACK_ICON[course.track] || '📘'} ${course.track}`}
            </div>
            <div className="row">
                <Badge tone="blue">{course.track}</Badge>
                <Badge>{LEVEL_LABEL[course.level]}</Badge>
            </div>
            <h3>{course.title}</h3>
            {course.description && <p className="muted small">{course.description}</p>}
            {course.teacher_id && refName(course.teacher_id) && (
                <span className="muted small">Багш: {refName(course.teacher_id)}</span>
            )}
            {progress && (
                <div>
                    <ProgressBar percent={progress.percent} />
                    <span className="muted small">
                        {progress.done}/{progress.total} алхам · {progress.percent}%
                    </span>
                </div>
            )}
        </Link>
    )
}
