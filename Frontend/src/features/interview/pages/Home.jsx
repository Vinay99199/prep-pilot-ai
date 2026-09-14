import { useState, useRef } from 'react'
import "../style/home.scss"
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
            <main className='loading-screen'>
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    return (
        <div className='home-page'>

            {/* Page Header */}
            <header className='page-header'>
                <p className='page-header__eyebrow'>Your next interview, better prepared</p>
                <h1>Build a plan for the <span className='highlight'>role you want.</span></h1>
                <p>PrepPilot turns the job description and your experience into focused questions, practical guidance, and a preparation path you can actually follow.</p>
            </header>

            {/* Main Card */}
            <div className='interview-card'>
                <div className='interview-card__body'>

                    {/* Left Panel - Job Description */}
                    <div className='panel panel--left'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target role</h2>
                            <span className='badge badge--required'>Required</span>
                        </div>
                        <textarea
                            onChange={(e) => { setJobDescription(e.target.value) }}
                            className='panel__textarea'
                            placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                            maxLength={5000}
                        />
                        <div className='char-counter'> {jobDescription.length} / 5000 chars</div>
                    </div>

                    {/* Vertical Divider */}
                    <div className='panel-divider' />

                    {/* Right Panel - Profile */}
                    <div className='panel panel--right'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Your experience</h2>
                        </div>

                        {/* Upload Resume */}
                        <div className='upload-section'>
                            <label className='section-label'>
                                Upload Resume
                                <span className='badge badge--best'>Best Results</span>
                            </label>
                            <label className={`dropzone ${resumeName ? 'dropzone--selected' : ''}`} htmlFor='resume'>
                                <span className='dropzone__icon'>
                                    {resumeName ? <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>}
                                </span>
                                <p className='dropzone__title'>{resumeName ? 'Resume ready' : 'Click to upload or drag & drop'}</p>
                                <p className='dropzone__subtitle'>{resumeName || 'PDF only · Max 3MB'}</p>
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
                                                    showToast({ type: "error", message: "Please upload a PDF resume." })
                                                    return
                                                }
                                                if (file.size > 3 * 1024 * 1024) {
                                                    event.target.value = ''
                                                    setResumeName('')
                                                    showToast({ type: "error", message: "Your resume must be smaller than 3MB." })
                                                    return
                                                }
                                                setResumeName(file.name)
                                                showToast({ type: "success", message: "Resume uploaded and ready to use." })
                                            }}
                                        />
                            </label>
                        </div>

                        {/* OR Divider */}
                        <div className='or-divider'><span>OR</span></div>

                        {/* Quick Self-Description */}
                        <div className='self-description'>
                            <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                            <textarea
                                onChange={(e) => { setSelfDescription(e.target.value) }}
                                id='selfDescription'
                                name='selfDescription'
                                className='panel__textarea panel__textarea--short'
                                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                            />
                        </div>

                        {/* Info Box */}
                        <div className='info-box'>
                            <span className='info-box__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className='interview-card__footer'>
                    <span className='footer-info'>AI-Powered Strategy Generation &bull; Approx 30s</span>
                    <button
                        onClick={handleGenerateReport}
                        className='generate-btn'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                            Build my interview plan
                    </button>
                </div>
            </div>

            {/* Recent Reports List */}
            {reports.length > 0 && (
                <section className='recent-reports'>
                    <div>
                        <p className='section-kicker'>Keep going</p>
                        <h2>Recent plans</h2>
                    </div>
                    <ul className='reports-list'>
                        {reports.map(report => (
                            <li key={report._id} className='report-item' onClick={() => navigate(`/interview/${report._id}`)}>
                                <div className='report-item__topline'>
                                    <h3>{report.title || 'Untitled Position'}</h3>
                                    <button
                                        type='button'
                                        className='report-item__delete'
                                        aria-label={`Delete ${report.title || 'interview plan'}`}
                                        onClick={async (event) => {
                                            event.stopPropagation()
                                            const confirmed = await requestConfirmation({
                                                title: 'Delete interview plan?',
                                                message: 'This plan and its preparation report will be permanently removed.',
                                                confirmLabel: 'Delete plan',
                                                onConfirm: () => deleteReport(report._id),
                                                errorMessage: 'We could not delete that interview plan.'
                                            })
                                            if (!confirmed) return
                                        }}
                                    >
                                        <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3' /></svg>
                                    </button>
                                </div>
                                <p className='report-meta'>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                                <p className={`match-score ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>Match Score: {report.matchScore}%</p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

        </div>
    )
}

export default Home