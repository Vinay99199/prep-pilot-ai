import { useState, useRef } from 'react'
import "../style/home-page.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import { useNotifications } from '../../notifications/useNotifications'

const Home = () => {

    const { loading, generateReport, reports, deleteReport } = useInterview()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ resumeName, setResumeName ] = useState("")
    const resumeInputRef = useRef()

    const navigate = useNavigate()
    const { showToast, requestConfirmation } = useNotifications()

    const handleGenerateReport = async () => {

    const resumeFile = resumeInputRef.current.files[0]

    if (!jobDescription.trim()) {
        showToast({ type: "warning", message: "Enter the target job description first." })
        return
    }

    if (!resumeFile && !selfDescription.trim()) {
        showToast({ type: "warning", message: "Upload a resume or add a quick self-description." })
        return
    }

    const data = await generateReport({
        jobDescription,
        selfDescription,
        resumeFile
    })

    if (data?._id) {
        navigate(`/interview/${data._id}`)
    }
}

    if (loading) {
        return (
            <main className='home-loading' role='status' aria-live='polite'>
                <span className='home-loading__spinner' aria-hidden='true' />
                <p>Loading your plans...</p>
            </main>
        )
    }

    return (
        <main className='home-page'>
            <header className='page-header'>
                <div className='page-header__copy'>
                    <p className='page-header__eyebrow'>INTERVIEW PREP</p>
                    <h1>Prepare for <span>the role.</span></h1>
                    <p>Paste the job description and add a resume or a few notes about your experience.</p>
                </div>
                <aside className='plan-outline' aria-label='What your plan includes'>
                    <p className='plan-outline__label'>EACH PLAN INCLUDES</p>
                    <ul>
                        <li><span>01</span> Role-specific questions</li>
                        <li><span>02</span> A focused 7-day schedule</li>
                    </ul>
                </aside>
            </header>

            <section className='interview-card' aria-labelledby='plan-form-title'>
                <div className='workspace-heading'>
                    <div>
                        <p className='section-kicker'>NEW PLAN</p>
                        <h2 id='plan-form-title'>Role details</h2>
                    </div>
                    <p>Start with the role, then add your experience.</p>
                </div>

                <div className='interview-card__body'>
                    <section className='panel panel--left' aria-labelledby='role-heading'>
                        <div className='panel__header'>
                            <span className='panel__step'>01</span>
                            <div>
                                <h3 id='role-heading'>Job description</h3>
                                <p>Use the full posting if you have it.</p>
                            </div>
                            <span className='badge badge--required'>Required</span>
                        </div>
                        <label className='section-label' htmlFor='jobDescription'>Job posting</label>
                        <textarea
                            id='jobDescription'
                            name='jobDescription'
                            onChange={(event) => setJobDescription(event.target.value)}
                            value={jobDescription}
                            className='panel__textarea'
                            placeholder='Paste the job description here...'
                            maxLength={5000}
                            aria-describedby='job-description-meta'
                        />
                        <div className='field-meta' id='job-description-meta'>
                            <span>Include the role and its requirements.</span>
                            <span>{jobDescription.length} / 5000</span>
                        </div>
                    </section>

                    <div className='panel-divider' aria-hidden='true' />

                    <section className='panel panel--right' aria-labelledby='experience-heading'>
                        <div className='panel__header'>
                            <span className='panel__step'>02</span>
                            <div>
                                <h3 id='experience-heading'>Your experience</h3>
                                <p>Add a resume or write a short summary.</p>
                            </div>
                        </div>

                        <div className='upload-section'>
                            <span className='section-label'>Resume <span className='optional-label'>Optional</span></span>
                            <label className={`dropzone ${resumeName ? 'dropzone--selected' : ''}`} htmlFor='resume'>
                                <span className='dropzone__icon' aria-hidden='true'>
                                    {resumeName ? (
                                        <svg viewBox='0 0 24 24'><path d='m5 12 4 4L19 6' /></svg>
                                    ) : (
                                        <svg viewBox='0 0 24 24'><path d='M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5' /></svg>
                                    )}
                                </span>
                                <span className='dropzone__copy'>
                                    <strong>{resumeName || 'Choose a PDF resume'}</strong>
                                    <small>{resumeName ? 'Selected' : 'Up to 3 MB'}</small>
                                </span>
                                <span className='dropzone__action'>Browse</span>
                                <input
                                    ref={resumeInputRef}
                                    hidden
                                    type='file'
                                    id='resume'
                                    name='resume'
                                    accept='.pdf,application/pdf'
                                    onChange={(event) => {
                                        const file = event.target.files?.[0]
                                        if (!file) return
                                        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                            event.target.value = ''
                                            setResumeName('')
                                            showToast({ type: "error", message: "Please choose a PDF file." })
                                            return
                                        }
                                        if (file.size > 3 * 1024 * 1024) {
                                            event.target.value = ''
                                            setResumeName('')
                                            showToast({ type: "error", message: "The PDF must be smaller than 3 MB." })
                                            return
                                        }
                                        setResumeName(file.name)
                                        showToast({ type: "success", message: "Resume added." })
                                    }}
                                />
                            </label>
                            <p className='upload-note'>PDF files only. Choose a file from your device.</p>
                        </div>

                        <div className='or-divider'><span>OR</span></div>

                        <div className='self-description'>
                            <label className='section-label' htmlFor='selfDescription'>A few words about you</label>
                            <textarea
                                onChange={(event) => setSelfDescription(event.target.value)}
                                value={selfDescription}
                                id='selfDescription'
                                name='selfDescription'
                                className='panel__textarea panel__textarea--short'
                                placeholder='Your skills, projects, or relevant experience...'
                            />
                        </div>

                        <p className='form-note'>A job description and one experience option are required.</p>
                    </section>
                </div>

                <div className='interview-card__footer'>
                    <span className='footer-info'>Your plan will include practice questions and a 7-day schedule.</span>
                    <button
                        onClick={handleGenerateReport}
                        className='generate-btn'
                        disabled={loading}
                        aria-busy={loading}>
                        <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3v18M3 12h18' /></svg>
                        Create interview plan
                    </button>
                </div>
            </section>

            {reports.length > 0 && (
                <section className='recent-reports' aria-labelledby='recent-plans-title'>
                    <div className='recent-reports__heading'>
                        <div>
                            <p className='section-kicker'>SAVED PLANS</p>
                            <h2 id='recent-plans-title'>Recent plans</h2>
                        </div>
                        <span>{reports.length} {reports.length === 1 ? 'plan' : 'plans'}</span>
                    </div>
                    <ul className='reports-list'>
                        {reports.map(report => (
                            <li key={report._id} className='report-item' onClick={() => navigate(`/interview/${report._id}`)}>
                                <div className='report-item__main'>
                                    <div>
                                        <h3>{report.title || 'Untitled position'}</h3>
                                        <p className='report-meta'>Created {new Date(report.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <p className={`match-score ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                        <span>Match</span> {report.matchScore}%
                                    </p>
                                </div>
                                <button
                                    type='button'
                                    className='report-item__delete'
                                    aria-label={`Delete ${report.title || 'interview plan'}`}
                                    onClick={async (event) => {
                                        event.stopPropagation()
                                        const confirmed = await requestConfirmation({
                                            title: 'Delete this plan?',
                                            message: 'This plan and its preparation report will be permanently removed.',
                                            confirmLabel: 'Delete plan',
                                            onConfirm: () => deleteReport(report._id),
                                            errorMessage: 'We could not delete that plan.'
                                        })
                                        if (!confirmed) return
                                    }}
                                >
                                    <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3' /></svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </main>
    )
}

export default Home