import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth-pages.scss"
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../../notifications/useNotifications'

const Register = () => {

    const navigate = useNavigate()
    const [ username, setUsername ] = useState("")
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")

    const {loading,handleRegister} = useAuth()
    const { showToast } = useNotifications()
    
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!username.trim() || !email.trim() || !password) {
            showToast({ type: "warning", message: "Complete all fields to create your account." })
            return
        }
        if (password.length < 6) {
            showToast({ type: "warning", message: "Your password must be at least 6 characters." })
            return
        }
        const success = await handleRegister({username,email,password})
        if (success) {
            showToast({ type: "success", message: "Your InterviewAI account is ready." })
            navigate("/")
        }
    }

    return (
        <main className='auth-page'>
            <section className='auth-card' aria-labelledby='auth-title'>
                <p className='auth-card__eyebrow'>ACCOUNT ACCESS</p>
                <h1 id='auth-title'>Create your account</h1>
                <p className='auth-card__intro'>Save your interview plans and come back to them anytime.</p>
                <form onSubmit={handleSubmit}>
                    <div className='auth-fields'>
                        <label className='auth-field' htmlFor='username'>
                            <span>Name</span>
                            <input
                                onChange={(event) => setUsername(event.target.value)}
                                value={username}
                                type='text'
                                id='username'
                                name='username'
                                placeholder='Your name'
                                autoComplete='username'
                                disabled={loading}
                            />
                        </label>
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
                                placeholder='At least 6 characters'
                                autoComplete='new-password'
                                disabled={loading}
                            />
                        </label>
                    </div>
                    <button className='auth-submit' type='submit' disabled={loading} aria-busy={loading}>
                        {loading && <span className='auth-submit__spinner' aria-hidden='true' />}
                        {loading ? 'Please wait...' : 'Create account'}
                    </button>
                </form>
                <p className='auth-card__switch'>Already have an account? <Link to='/login'>Log in</Link></p>
            </section>
        </main>
    )
}

export default Register