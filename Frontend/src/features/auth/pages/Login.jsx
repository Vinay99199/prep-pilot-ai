import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth-pages.scss"
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../../notifications/useNotifications'

const Login = () => {

    const { loading, handleLogin } = useAuth()
    const { showToast } = useNotifications()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email.trim() || !password) {
            showToast({ type: "warning", message: "Enter your email and password to continue." })
            return
        }
        const success = await handleLogin({email,password})
        if (success) {
            showToast({ type: "success", message: "Welcome back to PrepPilot." })
            navigate('/')
        }
    }

    return (
        <main className='auth-page'>
            <section className='auth-card' aria-labelledby='auth-title'>
                <p className='auth-card__eyebrow'>ACCOUNT ACCESS</p>
                <h1 id='auth-title'>Sign in</h1>
                <p className='auth-card__intro'>Use the email and password for your account.</p>
                <form onSubmit={handleSubmit}>
                    <div className='auth-fields'>
                        <label className='auth-field' htmlFor='email'>
                            <span>Email address</span>
                            <input
                                onChange={(event) => setEmail(event.target.value)}
                                value={email}
                                type='email'
                                id='email'
                                name='email'
                                placeholder='name@example.com'
                                autoComplete='email'
                                disabled={loading}
                            />
                        </label>
                        <label className='auth-field' htmlFor='password'>
                            <span>Password</span>
                            <input
                                onChange={(event) => setPassword(event.target.value)}
                                value={password}
                                type='password'
                                id='password'
                                name='password'
                                placeholder='Your password'
                                autoComplete='current-password'
                                disabled={loading}
                            />
                        </label>
                    </div>
                    <button className='auth-submit' type='submit' disabled={loading} aria-busy={loading}>
                        {loading && <span className='auth-submit__spinner' aria-hidden='true' />}
                        {loading ? 'Please wait...' : 'Log in'}
                    </button>
                </form>
                <p className='auth-card__switch'>New to PrepPilot? <Link to='/register'>Create an account</Link></p>
            </section>
        </main>
    )
}

export default Login