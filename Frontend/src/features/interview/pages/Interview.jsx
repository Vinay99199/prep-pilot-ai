import { useState } from 'react'
import '../style/interview-page.scss'
import { useInterview } from '../hooks/useInterview.js'
import { Link, useParams } from 'react-router'



const NAV_ITEMS = [
    { id: 'technical', label: 'Technical', icon: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 5l-4 14" /></svg>) },
    { id: 'behavioral', label: 'Behavioral', icon: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4H13a7 7 0 0 1 7 7.5Z" /></svg>) },
    { id: 'roadmap', label: '7-day plan', icon: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h16M8 15l4-4 3 2 5-7" /></svg>) },
]

// ── Sub-components ────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index }) => {
    const [ open, setOpen ] = useState(false)

    if (!item) {
        return null
    }

    return (
        <article className='q-card'>
            <button
                className='q-card__trigger'
                type='button'
                aria-expanded={open}
                aria-controls={`question-${index + 1}-details`}
                onClick={() => setOpen(value => !value)}
            >
                <span className='q-card__index'>{String(index + 1).padStart(2, '0')}</span>
                <span className='q-card__question'>{item.question}</span>
                <svg className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`} viewBox='0 0 24 24' aria-hidden='true'><path d='m6 9 6 6 6-6' /></svg>
            </button>
            <div className='q-card__body' id={`question-${index + 1}-details`} hidden={!open}>
                <div className='q-card__section'>
                    <p className='q-card__label'>Why this question</p>
                    <p>{item.intention}</p>
                </div>
                <div className='q-card__section'>
                    <p className='q-card__label'>Example answer</p>
                    <p>{item.answer}</p>
                </div>
            </div>
        </article>
    )
}

const RoadMapDay = ({ day }) => (
    day &&
    <article className='roadmap-day'>
        <div className='roadmap-day__header'>
                <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {(Array.isArray(day.tasks) ? day.tasks : []).filter(Boolean).map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </article>
)

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [ activeNav, setActiveNav ] = useState('technical')
    const [ downloading, setDownloading ] = useState(false)
    const { report, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()

    const handleResumeDownload = async () => {
        if (downloading) return
        setDownloading(true)
        try {
            await getResumePdf(interviewId)
        } finally {
            setDownloading(false)
        }
    }

    if (!report || (loading && !downloading)) {
        return (
            <main className='report-state' role={loading ? 'status' : undefined} aria-live={loading ? 'polite' : undefined}>
                {loading && <span className='report-state__spinner' aria-hidden='true' />}
                <p>{loading ? 'Loading your plan...' : 'This plan is not available.'}</p>
                {!loading && <Link to='/'>Back to your plans</Link>}
            </main>
        )
    }
    const technicalQuestions = Array.isArray(report.technicalQuestions)
        ? report.technicalQuestions.filter(Boolean)
        : []
    const behavioralQuestions = Array.isArray(report.behavioralQuestions)
        ? report.behavioralQuestions.filter(Boolean)
        : []
    const preparationPlan = Array.isArray(report.preparationPlan)
        ? report.preparationPlan.filter(Boolean)
        : []
    const skillGaps = Array.isArray(report.skillGaps)
        ? report.skillGaps.filter(Boolean)
        : []
    const scoreColor = report.matchScore >= 80
        ? 'score--high'
        : report.matchScore >= 60
            ? 'score--mid'
            : 'score--low'

    const questionList = activeNav === 'technical' ? technicalQuestions : behavioralQuestions
    const sectionTitle = activeNav === 'technical' ? 'Technical questions' : 'Behavioral questions'
    const sectionCount = activeNav === 'roadmap'
        ? `${preparationPlan.length} days`
        : `${questionList.length} ${questionList.length === 1 ? 'question' : 'questions'}`
    const matchDescription = report.matchScore >= 80
        ? 'Strong overlap with this role'
        : report.matchScore >= 60
            ? 'Some useful experience matches'
            : 'A few areas to build on'

    return (
        <main className='interview-page'>
            <header className='report-header'>
                <div className='report-header__copy'>
                    <Link className='report-back' to='/'>
                        <svg viewBox='0 0 24 24' aria-hidden='true'><path d='m15 18-6-6 6-6M9 12h12' /></svg>
                        All plans
                    </Link>
                    <p className='report-eyebrow'>INTERVIEW PLAN</p>
                    <h1>{report.title || 'Interview plan'}</h1>
                    <p className='report-description'>{report.jobDescription}</p>
                </div>
                <button className='report-download' type='button' onClick={handleResumeDownload} disabled={downloading} aria-busy={downloading}>
                    {downloading ? (
                        <span className='report-download__spinner' aria-hidden='true' />
                    ) : (
                        <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3' /></svg>
                    )}
                    {downloading ? 'Preparing PDF...' : 'Download resume'}
                </button>
            </header>

            <div className='report-layout'>
                <section className='report-main' aria-label='Preparation materials'>
                    <nav className='report-tabs' aria-label='Plan sections'>
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                className={`report-tabs__item ${activeNav === item.id ? 'report-tabs__item--active' : ''}`}
                                type='button'
                                aria-pressed={activeNav === item.id}
                                onClick={() => setActiveNav(item.id)}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <section className='report-section'>
                        <div className='content-header'>
                            <div>
                                <p className='report-section__eyebrow'>YOUR PREP</p>
                                <h2>{activeNav === 'roadmap' ? 'A week of focused practice' : sectionTitle}</h2>
                            </div>
                            <span className='content-header__count'>{sectionCount}</span>
                        </div>

                        {activeNav === 'roadmap' ? (
                            preparationPlan.length > 0 ? (
                                <div className='roadmap-list'>
                                    {preparationPlan.map(day => <RoadMapDay key={day.day} day={day} />)}
                                </div>
                            ) : (
                                <div className='report-empty'>No preparation days were included in this plan.</div>
                            )
                        ) : questionList.length > 0 ? (
                            <div className='q-list'>
                                {questionList.map((question, index) => (
                                    <QuestionCard key={`${activeNav}-${index}`} item={question} index={index} />
                                ))}
                            </div>
                        ) : (
                            <div className='report-empty'>No {activeNav} questions were included in this plan.</div>
                        )}
                    </section>
                </section>

                <aside className='report-sidebar' aria-label='Plan overview'>
                    <section className='report-score'>
                        <p className='report-sidebar__eyebrow'>ROLE MATCH</p>
                        <div className={`report-score__ring ${scoreColor}`}>
                            <span>{report.matchScore}</span>
                            <small>%</small>
                        </div>
                        <p className='report-score__description'>{matchDescription}</p>
                    </section>

                    <section className='report-skills'>
                        <div className='report-skills__heading'>
                            <h2>Skills to review</h2>
                            <span>{skillGaps.length}</span>
                        </div>
                        {skillGaps.length > 0 ? (
                            <ul className='report-skills__list'>
                                {skillGaps.map((gap, index) => (
                                    <li key={`${gap.skill}-${index}`}>
                                        <span>{gap.skill}</span>
                                        <small className={`skill-tag skill-tag--${gap.severity}`}>{gap.severity}</small>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className='report-empty report-empty--small'>No priority gaps were flagged.</p>
                        )}
                    </section>
                </aside>
            </div>
        </main>
    )
}

export default Interview