import { useState } from "react"
import { useAuth } from "../hooks/useAuth"
import "../style/account.scss"

const Account = () => {
    const { user, loading, handleProfileUpdate } = useAuth()
    const [ username, setUsername ] = useState(user?.username || "")
    const [ email, setEmail ] = useState(user?.email || "")
    const [ currentPassword, setCurrentPassword ] = useState("")
    const [ newPassword, setNewPassword ] = useState("")

    const handleSubmit = async (event) => {
        event.preventDefault()
        const updated = await handleProfileUpdate({
            username,
            email,
            currentPassword,
            newPassword
        })

        if (updated) {
            setCurrentPassword("")
            setNewPassword("")
        }
    }

    const initial = user?.username?.charAt(0).toUpperCase() || "U"

    return (
        <main className="account-page">
            <header className="account-page__header">
                <p className="account-page__eyebrow">Account settings</p>
                <h1>Keep your profile current.</h1>
                <p>Use details that match how you want to present yourself in every interview plan.</p>
            </header>

            <div className="account-layout">
                <aside className="account-summary">
                    <div className="account-summary__avatar">{initial}</div>
                    <p className="account-summary__label">Signed in as</p>
                    <h2>{user?.username || "Candidate"}</h2>
                    <p>{user?.email}</p>
                    <div className="account-summary__status"><span /> Account active</div>
                </aside>

                <form className="account-form" onSubmit={handleSubmit}>
                    <div className="account-form__section">
                        <div>
                            <p className="account-form__kicker">Personal details</p>
                            <h2>Profile information</h2>
                        </div>
                        <p className="account-form__hint">This is used to personalize your experience.</p>
                    </div>

                    <div className="account-form__fields">
                        <label>
                            Username
                            <input value={username} onChange={(event) => setUsername(event.target.value)} minLength={2} required />
                        </label>
                        <label>
                            Email address
                            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                        </label>
                    </div>

                    <div className="account-form__section account-form__section--password">
                        <div>
                            <p className="account-form__kicker">Security</p>
                            <h2>Change password</h2>
                        </div>
                        <p className="account-form__hint">Leave both fields blank to keep your current password.</p>
                    </div>

                    <div className="account-form__fields">
                        <label>
                            Current password
                            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
                        </label>
                        <label>
                            New password
                            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} autoComplete="new-password" />
                        </label>
                    </div>

                    <div className="account-form__footer">
                        <p>Password changes require your current password.</p>
                        <button className="button primary-button" type="submit" disabled={loading}>
                            {loading ? "Saving changes..." : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}

export default Account
