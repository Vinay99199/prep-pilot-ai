import { useEffect, useState } from "react"

const loaderContent = {
    initial: {
        messages: [ "☁️ Waking up the server..." ],
        detail: "Getting everything ready for you..."
    },
    generation: {
        messages: [
            "✨ Analyzing your profile...",
            "🔍 Finding your skill gaps...",
            "🧠 Building your interview questions...",
            "📚 Creating your personalized preparation plan...",
            "🚀 Almost ready..."
        ],
        detail: "Putting together preparation tailored to your goals.",
        stages: [ "Profile", "Skills", "Questions", "Plan", "Ready" ]
    },
    pdf: {
        messages: [
            "📄 Preparing your PDF...",
            "✨ Formatting your interview plan...",
            "📝 Polishing the final document...",
            "✅ Almost ready..."
        ],
        detail: "Your document is being prepared for download.",
        stages: [ "Prepare", "Format", "Polish", "Ready" ]
    }
}

const ProcessingLoader = ({ variant = "initial", overlay = false }) => {
    const [ activeMessage, setActiveMessage ] = useState(0)
    const content = loaderContent[variant] || loaderContent.initial

    useEffect(() => {
        if (content.messages.length < 2) return undefined

        const intervalId = window.setInterval(() => {
            setActiveMessage(index => (index + 1) % content.messages.length)
        }, 2600)

        return () => window.clearInterval(intervalId)
    }, [ content.messages.length ])

    return (
        <div
            className={`processing-loader${overlay ? " processing-loader--overlay" : ""}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <section className="processing-loader__card">
                <div className="processing-loader__mark" aria-hidden="true">
                    <span />
                </div>
                <p className="processing-loader__eyebrow">PREP PILOT</p>
                <h1 key={`${variant}-${activeMessage}`} className="processing-loader__message">
                    {content.messages[activeMessage]}
                </h1>
                <p className="processing-loader__detail">{content.detail}</p>
                {content.stages && (
                    <ol className="processing-loader__stages" aria-hidden="true">
                        {content.stages.map((stage, index) => (
                            <li
                                key={stage}
                                className={[
                                    index < activeMessage ? "processing-loader__stage--complete" : "",
                                    index === activeMessage ? "processing-loader__stage--active" : ""
                                ].filter(Boolean).join(" ")}
                            >
                                <span />
                                {stage}
                            </li>
                        ))}
                    </ol>
                )}
                <div className="processing-loader__dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </div>
            </section>
        </div>
    )
}

export default ProcessingLoader
