import { useEffect, useState } from "react"
import { Link, NavLink } from "react-router"
import { useAuth } from "../features/auth/hooks/useAuth"

const Navbar = () => {
    const { user, loading, handleLogout } = useAuth()
    const [ menuOpen, setMenuOpen ] = useState(false)
    const [ scrolled, setScrolled ] = useState(false)

    useEffect(() => {
        const updateScrollState = () => setScrolled(window.scrollY > 8)
        updateScrollState()
        window.addEventListener("scroll", updateScrollState, { passive: true })
        return () => window.removeEventListener("scroll", updateScrollState)
    }, [])

    const closeMenu = () => setMenuOpen(false)

    const logout = async () => {
        await handleLogout()
        closeMenu()
    }

    return (
        <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
            <div className="site-header__inner">
                <Link className="brand" to={user ? "/" : "/login"} onClick={closeMenu}>
                    <span className="brand__mark">IA</span>
                    <span className="brand__copy">
                        <strong>PrepPilot</strong>
                        <small>Interview prep, made practical</small>
                    </span>
                </Link>

                <button
                    className={`menu-toggle ${menuOpen ? "menu-toggle--open" : ""}`}
                    type="button"
                    aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                    aria-expanded={menuOpen}
                    aria-controls="site-navigation"
                    onClick={() => setMenuOpen(open => !open)}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <nav id="site-navigation" className={`site-nav ${menuOpen ? "site-nav--open" : ""}`} aria-label="Main navigation">
                    {user ? (
                        <>
                            <NavLink className="site-nav__link" to="/" onClick={closeMenu}>
                                My preparation
                            </NavLink>
                            <NavLink className="site-nav__user" to="/account" onClick={closeMenu}>
                                <span className="site-nav__avatar">{user.username?.charAt(0).toUpperCase() || "U"}</span>
                                <span>{user.username || "Candidate"}</span>
                            </NavLink>
                            <button className="site-nav__logout" type="button" onClick={logout} disabled={loading} aria-busy={loading}>
                                {loading ? "Signing out..." : "Log out"}
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
