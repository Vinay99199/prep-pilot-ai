import { Link } from "react-router"

const Footer = () => (
    <footer className="site-footer">
        <div className="site-footer__inner">
            <div>
                <Link className="site-footer__brand" to="/">InterviewAI</Link>
                <p>Turn a job description into a focused interview strategy.</p>
            </div>
            <div className="site-footer__links">
                <Link to="/">My preparation</Link>
                <Link to="/login">Log in</Link>
                <Link to="/register">Create account</Link>
            </div>
        </div>
        <div className="site-footer__bottom">
            <span>Built for better interview preparation.</span>
            <span>© {new Date().getFullYear()} InterviewAI</span>
        </div>
    </footer>
)

export default Footer
