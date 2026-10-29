import { Link } from 'react-router-dom'

export default function NotFound() {
    return (
        <div className="empty">
            <h1>404</h1>
            <p>Хуудас олдсонгүй.</p>
            <Link to="/" className="btn btn-primary">Нүүр хуудас</Link>
        </div>
    )
}
