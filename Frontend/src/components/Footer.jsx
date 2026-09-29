import { Link } from "react-router"
import { useAuth } from "../features/auth/hooks/useAuth"

const Footer = () => {
    const { user } = useAuth()

    return (
        <footer className="site-footer">
            <div className="site-footer__inner">
                <div>
                    <Link className="site-footer__brand" to={user ? "/" : "/login"}>InterviewAI</Link>
                    <p>Questions, practice, and a plan for the week.</p>
                </div>
                <nav className="site-footer__links" aria-label="Footer navigation">
                    <Link to="/">My plans</Link>
                    {user ? (
                        <Link to="/account">Account</Link>
                    ) : (
                        <>
                            <Link to="/login">Log in</Link>
                            <Link to="/register">Create account</Link>
                        </>
                    )}
                </nav>
            </div>
            <div className="site-footer__bottom">
                <span>Interview prep, in one place.</span>
                <span>© {new Date().getFullYear()} InterviewAI</span>
            </div>
        </footer>
    )
}

export default Footer
