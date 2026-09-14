import { useEffect, useState } from "react"
import { useAuth } from "../hooks/useAuth"
import "../style/account.scss"

const Account = () => {
    const { user, loading, handleProfileUpdate } = useAuth()

    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)

    useEffect(() => {
        if (user) {
            setUsername(user.username || "")
            setEmail(user.email || "")
        }
    }, [user])

    const handleSubmit = async (event) => {
        event.preventDefault()

        const updated = await handleProfileUpdate({
            username: username.trim(),
            email: email.trim(),
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
            <div className="account-layout">
                <aside className="account-summary">
                    <div className="account-summary__top">
                        <div className="account-summary__avatar">
                            {initial}
                        </div>

                        <div className="account-summary__badge">
                            <span />
                            Active
                        </div>
                    </div>

                    <div className="account-summary__identity">
                        <p className="account-summary__label">
                            Signed in as
                        </p>

                        <h2>
                            {user?.username || "Candidate"}
                        </h2>

                        <p className="account-summary__email">
                            {user?.email || "No email available"}
                        </p>
                    </div>

                    <div className="account-summary__divider" />

                    <div className="account-summary__info">
                        <div>
                            <span className="account-summary__info-label">
                                Account
                            </span>

                            <strong>Personal</strong>
                        </div>

                        <div>
                            <span className="account-summary__info-label">
                                Status
                            </span>

                            <strong className="account-summary__active">
                                Active
                            </strong>
                        </div>
                    </div>

                    <div className="account-summary__status">
                        <span />
                        Your account is secure and active
                    </div>
                </aside>

                <form
                    className="account-form"
                    onSubmit={handleSubmit}
                >
                    <section className="account-form__section">
                        <div className="account-form__title">
                            <div className="account-form__icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                                    />
                                </svg>
                            </div>

                            <div>
                                <p className="account-form__kicker">
                                    Personal details
                                </p>

                                <h2>Profile information</h2>
                            </div>
                        </div>

                        <p className="account-form__hint">
                            Update the details used to personalize your
                            interview experience.
                        </p>
                    </section>

                    <div className="account-form__fields">
                        <label>
                            <span>Username</span>

                            <div className="account-form__input">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(event) =>
                                        setUsername(event.target.value)
                                    }
                                    placeholder="Enter your username"
                                    minLength={2}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </label>

                        <label>
                            <span>Email address</span>

                            <div className="account-form__input">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    placeholder="Enter your email"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </label>
                    </div>

                    <section className="account-form__section account-form__section--password">
                        <div className="account-form__title">
                            <div className="account-form__icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <rect
                                        x="4"
                                        y="10"
                                        width="16"
                                        height="11"
                                        rx="2"
                                    />

                                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                </svg>
                            </div>

                            <div>
                                <p className="account-form__kicker">
                                    Security
                                </p>

                                <h2>Change password</h2>
                            </div>
                        </div>

                        <p className="account-form__hint">
                            Leave both fields empty if you don't want to
                            change your password.
                        </p>
                    </section>

                    <div className="account-form__fields">
                        <label>
                            <span>Current password</span>

                            <div className="account-form__input account-form__input--password">
                                <input
                                    type={
                                        showCurrentPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={currentPassword}
                                    onChange={(event) =>
                                        setCurrentPassword(event.target.value)
                                    }
                                    placeholder="Enter current password"
                                    autoComplete="current-password"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCurrentPassword(
                                            !showCurrentPassword
                                        )
                                    }
                                    aria-label={
                                        showCurrentPassword
                                            ? "Hide current password"
                                            : "Show current password"
                                    }
                                >
                                    {showCurrentPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </label>

                        <label>
                            <span>New password</span>

                            <div className="account-form__input account-form__input--password">
                                <input
                                    type={
                                        showNewPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={newPassword}
                                    onChange={(event) =>
                                        setNewPassword(event.target.value)
                                    }
                                    placeholder="Create a new password"
                                    minLength={6}
                                    autoComplete="new-password"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNewPassword(
                                            !showNewPassword
                                        )
                                    }
                                    aria-label={
                                        showNewPassword
                                            ? "Hide new password"
                                            : "Show new password"
                                    }
                                >
                                    {showNewPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </label>
                    </div>

                    <div className="account-form__footer">
                        <div className="account-form__footer-note">
                            <div className="account-form__secure-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M12 3 5 6v5c0 4.5 2.9 8.4 7 10 4.1-1.6 7-5.5 7-10V6l-7-3Z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            </div>

                            <p>
                                Your information is kept private and secure.
                            </p>
                        </div>

                        <button
                            className="button primary-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="account-button__loader" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    Save changes
                                    <span aria-hidden="true">→</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}

export default Account