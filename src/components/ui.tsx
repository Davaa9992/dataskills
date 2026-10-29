import { ReactNode } from 'react'
import { Pagination } from '../api/client'

export function Spinner({ label = 'Ачаалж байна…' }: { label?: string }) {
    return (
        <div className="spinner" role="status">
            <span className="spinner-dot" />
            {label}
        </div>
    )
}

export function ErrorBox({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
    if (!message) return null
    return (
        <div className="alert alert-error" role="alert">
            <span>{message}</span>
            {onRetry && (
                <button className="btn btn-sm" onClick={onRetry}>
                    Дахин оролдох
                </button>
            )}
        </div>
    )
}

export function Empty({ children }: { children: ReactNode }) {
    return <div className="empty">{children}</div>
}

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
    return <span className={`badge badge-${tone}`}>{children}</span>
}

export function ProgressBar({ percent }: { percent: number }) {
    return (
        <div className="progress" aria-label={`${percent}%`}>
            <div className="progress-fill" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
        </div>
    )
}

export function Pager({ pagination, onPage }: { pagination?: Pagination; onPage: (page: number) => void }) {
    if (!pagination || !pagination.total_page || pagination.total_page <= 1) return null
    const { page, total_page } = pagination
    return (
        <div className="pager">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                ← Өмнөх
            </button>
            <span>
                {page} / {total_page}
            </span>
            <button className="btn btn-sm" disabled={page >= total_page} onClick={() => onPage(page + 1)}>
                Дараах →
            </button>
        </div>
    )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="page-header">
            <div>
                <h1>{title}</h1>
                {subtitle && <p className="muted">{subtitle}</p>}
            </div>
            {actions && <div className="row">{actions}</div>}
        </div>
    )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            {children}
            {hint && <span className="field-hint">{hint}</span>}
        </label>
    )
}

export const formatDate = (value?: string): string =>
    value ? new Date(value).toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''

export const formatDateTime = (value?: string): string =>
    value
        ? new Date(value).toLocaleString('mn-MN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
          })
        : ''

export const formatNumber = (n: number): string => new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 2 }).format(n)
