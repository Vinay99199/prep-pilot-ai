import { useState } from "react"
import { Link, NavLink } from "react-router"
import { useAuth } from "../features/auth/hooks/useAuth"

const Navbar = () => {
    const { user, handleLogout } = useAuth()
    const [ menuOpen, setMenuOpen ] = useState(false)

    const closeMenu = () => setMenuOpen(false)

    const logout = async () => {
        await handleLogout()
        closeMenu()
    }

    return (
        <header className="site-header">
            <div className="site-header__inner">
                <Link className="brand" to={user ? "/" : "/login"} onClick={closeMenu}>
                    <span className="brand__mark">IA</span>
                    <span className="brand__copy">
                        <strong>InterviewAI</strong>
                        <small>Interview preparation, focused</small>
                    </span>
                </Link>

                <button
                    className="menu-toggle"
                    type="button"
                    aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(open => !open)}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <nav className={`site-nav ${menuOpen ? "site-nav--open" : ""}`}>
                    {user ? (
                        <>
                            <NavLink className="site-nav__link" to="/" onClick={closeMenu}>
                                My preparation
                            </NavLink>
                            <NavLink className="site-nav__user" to="/account" onClick={closeMenu}>
                                <span className="site-nav__avatar">{user.username?.charAt(0).toUpperCase() || "U"}</span>
                                <span>{user.username || "Candidate"}</span>
                            </NavLink>
                            <button className="site-nav__logout" type="button" onClick={logout}>
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink className="site-nav__link" to="/login" onClick={closeMenu}>Log in</NavLink>
                            <NavLink className="site-nav__action" to="/register" onClick={closeMenu}>Create account</NavLink>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}

export default Navbar
