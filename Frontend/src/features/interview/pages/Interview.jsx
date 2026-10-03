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

const resumeText = value => typeof value === 'string' ? value.trim() : ''
const resumeList = values => Array.isArray(values) ? values.filter(value => resumeText(value)) : []

const ResumeSection = ({ title, children }) => {
    const content = Array.isArray(children) ? children.filter(Boolean) : children
    const hasContent = Array.isArray(content) ? content.length > 0 : Boolean(content)

    return hasContent ? (
        <section className='customized-resume__section'>
            <h3>{title}</h3>
            {content}
        </section>
    ) : null
}

const hasResumeEntryContent = (entry, fields) => entry && typeof entry === 'object' &&
    fields.some(field => Array.isArray(entry[field]) ? resumeList(entry[field]).length > 0 : resumeText(entry[field]))

const ResumeEntry = ({ title, subtitle, dates, details, bullets }) => {
    const cleanTitle = resumeText(title)
    const cleanSubtitle = resumeText(subtitle)
    const cleanDates = resumeText(dates)
    const cleanDetails = resumeText(details)
    const cleanBullets = resumeList(bullets)

    if (!cleanTitle && !cleanSubtitle && !cleanDates && !cleanDetails && !cleanBullets.length) {
        return null
    }

    return (
        <article className='customized-resume__entry'>
            {(cleanTitle || cleanDates) && (
                <div className='customized-resume__entry-heading'>
                    {cleanTitle && <h4>{cleanTitle}</h4>}
                    {cleanDates && <span>{cleanDates}</span>}
                </div>
            )}
            {cleanSubtitle && <p className='customized-resume__meta'>{cleanSubtitle}</p>}
            {cleanDetails && <p>{cleanDetails}</p>}
            {cleanBullets.length > 0 && (
                <ul>
                    {cleanBullets.map((bullet, index) => <li key={index}>{resumeText(bullet)}</li>)}
                </ul>
            )}
        </article>
    )
}

const CustomizedResume = ({ resume }) => {
    const skills = resumeList(resume?.skills)
    const skillGroups = Array.isArray(resume?.skillGroups)
        ? resume.skillGroups.filter(group => resumeText(group?.category) && resumeList(group?.skills).length > 0)
        : []
    const experience = Array.isArray(resume?.experience)
        ? resume.experience.filter(item => hasResumeEntryContent(item, ['title', 'company', 'location', 'dates', 'bullets']))
        : []
    const projects = Array.isArray(resume?.projects)
        ? resume.projects.filter(item => hasResumeEntryContent(item, ['name', 'technologies', 'dates', 'bullets']))
        : []
    const education = Array.isArray(resume?.education)
        ? resume.education.filter(item => hasResumeEntryContent(item, ['degree', 'institution', 'location', 'dates', 'details']))
        : []
    const certifications = resumeList(resume?.certifications)
    const achievements = resumeList(resume?.achievements)
    const summary = resumeText(resume?.summary)
    const name = resumeText(resume?.name)
    const contacts = [resume?.email, resume?.phone, resume?.location, resume?.linkedin, resume?.portfolio]
        .map(resumeText)
        .filter(Boolean)
    const hasContent = Boolean(
        name || resumeText(resume?.professionalTitle) || contacts.length || summary || skills.length ||
        skillGroups.length || certifications.length || achievements.length ||
        experience.length || projects.length || education.length
    )

    return (
        <section className='customized-resume' aria-labelledby='customized-resume-title'>
            <div className='customized-resume__header'>
                <div>
                    <p className='report-section__eyebrow'>YOUR RESUME</p>
                    <h2 id='customized-resume-title'>Customized resume</h2>
                </div>
            </div>
            {hasContent ? (
                <div className='customized-resume__content'>
                    {(name || contacts.length > 0) && (
                        <header className='customized-resume__identity'>
                            {name && <h3>{name}</h3>}
                            {resumeText(resume?.professionalTitle) && <p className='customized-resume__title'>{resumeText(resume.professionalTitle)}</p>}
                            {contacts.length > 0 && <p>{contacts.join(' · ')}</p>}
                        </header>
                    )}
                    <ResumeSection title='Summary'>
                        {summary && <p>{summary}</p>}
                    </ResumeSection>
                    <ResumeSection title='Skills'>
                        {skillGroups.length > 0 ? (
                            <div className='customized-resume__skill-groups'>
                                {skillGroups.map((group, index) => (
                                    <p key={`${group.category}-${index}`}>
                                        <strong>{resumeText(group.category)}:</strong> {resumeList(group.skills).map(resumeText).join(', ')}
                                    </p>
                                ))}
                            </div>
                        ) : skills.length > 0 ? (
                            <ul className='customized-resume__skills'>
                                {skills.map((skill, index) => <li key={`${skill}-${index}`}>{resumeText(skill)}</li>)}
                            </ul>
                        ) : null}
                    </ResumeSection>
                    <ResumeSection title='Experience'>
                        {experience.map((item, index) => (
                            <ResumeEntry
                                key={`experience-${index}`}
                                title={item.title}
                                subtitle={[item.company, item.location].map(resumeText).filter(Boolean).join(' · ')}
                                dates={item.dates}
                                bullets={item.bullets}
                            />
                        ))}
                    </ResumeSection>
                    <ResumeSection title='Projects'>
                        {projects.map((item, index) => (
                            <ResumeEntry
                                key={`project-${index}`}
                                title={item.name}
                                subtitle={item.technologies}
                                dates={item.dates}
                                bullets={item.bullets}
                            />
                        ))}
                    </ResumeSection>
                    <ResumeSection title='Education'>
                        {education.map((item, index) => (
                            <ResumeEntry
                                key={`education-${index}`}
                                title={item.degree}
                                subtitle={[item.institution, item.location].map(resumeText).filter(Boolean).join(' · ')}
                                dates={item.dates}
                                details={item.details}
                            />
                        ))}
                    </ResumeSection>
                    <ResumeSection title='Certifications'>
                        {certifications.length > 0 && <ul>{certifications.map((item, index) => <li key={index}>{resumeText(item)}</li>)}</ul>}
                    </ResumeSection>
                    <ResumeSection title='Achievements'>
                        {achievements.length > 0 && <ul>{achievements.map((item, index) => <li key={index}>{resumeText(item)}</li>)}</ul>}
                    </ResumeSection>
                </div>
            ) : (
                <p className='customized-resume__empty'>
                    {resume ? 'No resume details were generated for this report.' : 'This older report does not have a customized resume yet. Download the PDF to generate and save one.'}
                </p>
            )}
        </section>
    )
}

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

            <CustomizedResume resume={report.customizedResume} />

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
                            <h2>Skill gaps to work on</h2>
                            <span>{skillGaps.length}</span>
                        </div>
                        <p className='report-skills__description'>Areas to practice for this role.</p>
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
                            <p className='report-empty report-empty--small'>No extra practice areas identified.</p>
                        )}
                    </section>
                </aside>
            </div>
        </main>
    )
}

export default Interview