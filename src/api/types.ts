export type Role = 'student' | 'teacher' | 'admin'

export const TRACKS = ['Excel', 'Spreadsheet', 'Power BI', 'Tableau', 'Data Analyst'] as const
export type Track = (typeof TRACKS)[number]
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_LABEL: Record<Level, string> = {
    Beginner: 'Анхан',
    Intermediate: 'Дунд',
    Advanced: 'Ахисан'
}

export interface Me {
    _id: string
    email: string
    full_name: string
    role: Role
    organization: { _id: string; name: string; my_role: 'owner' | 'member' } | null
}

export interface UserRef {
    _id: string
    full_name: string
    email?: string
    role?: Role
}

export interface Course {
    _id: string
    title: string
    description?: string
    track: Track
    level: Level
    teacher_id: UserRef | string
    thumbnail?: string
    project_title?: string
    project_description?: string
    published: number
    createdAt?: string
}

export type StepType = 'lesson' | 'practice'

export interface Step {
    _id: string
    course_id: string
    position: number
    type: StepType
    title: string
    content?: string
    video_url?: string
    dataset_url?: string
    task?: string
    completed?: boolean
}

export interface Progress {
    total: number
    done: number
    percent: number
}

export interface ExamInfo {
    _id: string
    title: string
    pass_percent: number
    duration_minutes: number
    max_attempts: number
    question_count: number
    max_score: number
}

export interface Attempt {
    _id: string
    status: 'in_progress' | 'submitted' | 'expired'
    score: number
    max_score: number
    percent: number
    passed: boolean
    started_at: string
    deadline: string
    submitted_at?: string
}

export interface Eligibility {
    eligible: boolean
    missing: string[]
    has_exam: boolean
    exam_passed: boolean
    has_project: boolean
    project_approved: boolean
}

export interface Certificate {
    _id: string
    code: string
    issued_at: string
    course_id: { _id: string; title: string; track: Track; level: Level } | string
}

export interface CourseDetail {
    course: Course
    steps: Step[]
    exam: ExamInfo | null
    my_attempts?: Attempt[]
    progress?: Progress
    certificate?: Certificate | null
    eligibility?: Eligibility
}

export type SubmissionStatus = 'submitted' | 'approved' | 'needs_changes'

export const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
    submitted: 'Шалгагдаж байна',
    approved: 'Зөвшөөрсөн',
    needs_changes: 'Засвар хэрэгтэй'
}

export interface Submission {
    _id: string
    user_id: UserRef | string
    course_id: { _id: string; title: string } | string
    step_id?: { _id: string; title: string; position: number } | string
    file_url: string
    note?: string
    status: SubmissionStatus
    feedback?: string
    createdAt: string
}

export type QuestionType = 'choice' | 'number' | 'text'

export interface Question {
    _id?: string
    text: string
    type: QuestionType
    options?: string[]
    answer?: string
    tolerance?: number
    points: number
    explanation?: string
}

export interface Exam {
    _id: string
    title: string
    questions: Question[]
    pass_percent: number
    duration_minutes: number
    max_attempts: number
    published: number
}

export interface ExamResult {
    attempt_id: string
    score: number
    max_score: number
    percent: number
    pass_percent: number
    passed: boolean
    attempts_left: number
    details: {
        question_id: string
        text: string
        your_answer: string
        is_correct: boolean
        correct_answer?: string
        explanation?: string
    }[]
}

export type ColumnType = 'number' | 'string' | 'date'
export type DataRow = Record<string, unknown>

export interface Dataset {
    _id: string
    owner_id: string
    organization_id?: string
    name: string
    description?: string
    columns: { name: string; type: ColumnType }[]
    row_count: number
    rows?: DataRow[]
    createdAt: string
}

export const CHART_TYPES = ['bar', 'hbar', 'stacked', 'line', 'area', 'pie', 'doughnut', 'scatter'] as const
export type ChartType = (typeof CHART_TYPES)[number]
export const CHART_AGGS = ['sum', 'avg', 'count', 'min', 'max', 'median'] as const
export type ChartAgg = (typeof CHART_AGGS)[number]
export type ChartSort = 'value_desc' | 'value_asc' | 'label'
export const CHART_PALETTES = ['blue', 'warm', 'green', 'mono', 'rainbow'] as const
export type ChartPalette = (typeof CHART_PALETTES)[number]

export const CHART_TYPE_LABEL: Record<ChartType, string> = {
    bar: 'Багана',
    hbar: 'Хэвтээ багана',
    stacked: 'Давхар багана',
    line: 'Шугам',
    area: 'Талбай',
    pie: 'Дугуй',
    doughnut: 'Цагираг',
    scatter: 'Цэгэн'
}

export const CHART_AGG_LABEL: Record<ChartAgg, string> = {
    sum: 'Нийлбэр',
    avg: 'Дундаж',
    count: 'Мөрийн тоо',
    min: 'Хамгийн бага',
    max: 'Хамгийн их',
    median: 'Медиан'
}

export interface ChartConfig {
    type: ChartType
    x: string
    y?: string
    series?: string
    agg: ChartAgg
    sort: ChartSort
    limit: number
    palette: ChartPalette
    show_values: boolean
}

export interface SavedChart {
    _id: string
    title: string
    subtitle?: string
    config: ChartConfig
    dataset_id: string | { _id: string; name: string; row_count: number }
    dataset?: { _id: string; name: string; columns: Dataset['columns']; row_count: number } | null
    rows?: DataRow[]
    updatedAt: string
}

export const SERVICE_TYPES = ['dashboard', 'data_analysis', 'data_engineering', 'corporate_training'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
    dashboard: 'Dashboard бүтээх',
    data_analysis: 'Дата анализ',
    data_engineering: 'Дата инженерчлэл',
    corporate_training: 'Байгууллагын сургалт'
}

export const SERVICE_STATUSES = ['new', 'in_progress', 'delivered', 'closed', 'cancelled'] as const
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
    new: 'Шинэ',
    in_progress: 'Хийгдэж байна',
    delivered: 'Хүлээлгэн өгсөн',
    closed: 'Хаагдсан',
    cancelled: 'Цуцалсан'
}

export interface ServiceRequest {
    _id: string
    user_id: UserRef | string
    organization_id?: { _id: string; name: string } | string
    service_type: ServiceType
    title: string
    description: string
    data_files: string[]
    dataset_id?: string
    deadline?: string
    status: ServiceStatus
    assigned_to?: UserRef
    result_url?: string
    result_note?: string
    delivered_at?: string
    createdAt: string
}

export interface Organization {
    _id: string
    name: string
    register_no?: string
    email?: string
    phone?: string
    owner_id: string | UserRef
    createdAt?: string
}

export interface OrgMember {
    _id: string
    user_id: UserRef
    role: 'owner' | 'member'
    joined_at: string
}

export interface MemberProgress {
    user: UserRef
    role: 'owner' | 'member'
    courses: { _id: string; title: string; track: Track; level: Level; progress: Progress }[]
    certificates: number
}

export interface TeacherApplication {
    _id: string
    user_id: UserRef | string
    name: string
    email: string
    specialty: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
}

export interface AdminUser {
    _id: string
    email: string
    full_name: string
    role: Role
    blocked: number
    createdAt: string
    last_login_at?: string
}

/** populate хийсэн эсвэл id мөр */
export const refName = (ref: unknown, field = 'full_name'): string =>
    ref && typeof ref === 'object' ? String((ref as Record<string, unknown>)[field] ?? '') : ''

export const refId = (ref: unknown): string =>
    ref && typeof ref === 'object' ? String((ref as { _id: string })._id) : String(ref ?? '')
