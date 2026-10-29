import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)

    const close = () => setOpen(false)
    const onLogout = async () => {
        await logout()
        close()
        navigate('/')
    }

    return (
        <div className="app">
            <header className="topbar">
                <div className="topbar-inner">
                    <Link to="/" className="brand" onClick={close}>
                        <img src="/favicon.svg" alt="" width={28} height={28} />
                        DataSkills
                    </Link>
                    <button className="menu-toggle" aria-label="Цэс" onClick={() => setOpen(!open)}>
                        ☰
                    </button>
                    <nav className={`nav ${open ? 'nav-open' : ''}`} onClick={close}>
                        <NavLink to="/courses">Сургалтууд</NavLink>
                        {/* Нэвтэрсэн хэрэглэгчид зөвхөн сургалттай холбоотой цэс харагдана */}
                        {user ? (
                            <NavLink to="/learning">Миний сургалт</NavLink>
                        ) : (
                            <>
                                <NavLink to="/services">Дата үйлчилгээ</NavLink>
                                <NavLink to="/charts/new">Chart гаргах</NavLink>
                            </>
                        )}
                        {(user?.role === 'teacher' || user?.role === 'admin') && <NavLink to="/teacher">Багш</NavLink>}
                        {user?.role === 'admin' && <NavLink to="/admin">Админ</NavLink>}
                        <span className="nav-spacer" />
                        {user ? (
                            <>
                                <NavLink to="/profile" className="nav-user">
                                    {user.full_name}
                                </NavLink>
                                <button className="btn btn-sm btn-ghost" onClick={onLogout}>
                                    Гарах
                                </button>
                            </>
                        ) : (
                            <>
                                <NavLink to="/login">Нэвтрэх</NavLink>
                                <Link to="/signup" className="btn btn-sm btn-primary">
                                    Бүртгүүлэх
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className="container">
                <Outlet />
            </main>
            <footer className="footer">
                <div className="container footer-inner">
                    <span>© {new Date().getFullYear()} DataSkills Academy</span>
                    <Link to="/verify">Сертификат шалгах</Link>
                </div>
            </footer>
        </div>
    )
}
