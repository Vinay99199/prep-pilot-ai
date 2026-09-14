import Navbar from "./Navbar"
import Footer from "./Footer"
import { Outlet } from "react-router"

const AppShell = () => (
    <div className="app-shell">
        <Navbar />
        <div className="app-shell__content"><Outlet /></div>
        <Footer />
    </div>
)

export default AppShell
