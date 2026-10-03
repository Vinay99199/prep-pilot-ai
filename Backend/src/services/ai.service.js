
const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { existsSync } = require("node:fs")
const path = require("node:path")
process.env.PUPPETEER_CACHE_DIR = path.resolve(__dirname, "../..", ".puppeteer-cache")
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.warn("Ignoring stale PUPPETEER_EXECUTABLE_PATH; using Puppeteer's installed browser.")
    delete process.env.PUPPETEER_EXECUTABLE_PATH
}
const puppeteer = require("puppeteer")

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
const AI_TIMEOUT_MS = 45000
const PDF_TIMEOUT_MS = 60000
const MAX_AI_ATTEMPTS = 2
const RETRY_DELAY_MS = 1000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let gemini

const withTimeout = async (operation, timeoutMs, label) => {
    let timeoutId

    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), {
                status: 504
            }))
        }, timeoutMs)
    })

    try {
        return await Promise.race([operation(), timeoutPromise])
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
    }
}

function getGeminiClient() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY?.trim()

    if (!apiKey) {
        throw createAiError("GOOGLE_GENAI_API_KEY is not configured.", 503, null, "GEMINI_CONFIG")
    }

    if (!gemini) {
        gemini = new GoogleGenAI({ apiKey })
    }

    return gemini
}

function createAiError(message, status, cause, code) {
    const error = new Error(message)
    error.status = status
    error.cause = cause
    error.code = code
    error.isAiServiceError = true
    return error
}

function isTimeoutError(error) {
    return error?.status === 408 ||
        /timeout|timed out/i.test(error?.name || "") ||
        [ "ETIMEDOUT", "ECONNABORTED" ].includes(error?.code)
}

function normalizeGeminiError(error) {
    if (error?.isAiServiceError) {
        return error
    }

    const status = Number(error?.status || error?.statusCode)

    if (status === 401 || status === 403) {
        return createAiError("Gemini authentication failed. Check GOOGLE_GENAI_API_KEY.", 503, error, "GEMINI_AUTH")
    }

    if (status === 429) {
        return createAiError("Gemini rate limit reached. Please try again shortly.", 429, error, "GEMINI_RATE_LIMIT")
    }

    if (isTimeoutError(error)) {
        return createAiError("Gemini request timed out.", 504, error, "GEMINI_TIMEOUT")
    }

    if (status === 504) {
        return createAiError("Gemini request timed out.", 504, error, "GEMINI_TIMEOUT")
    }

    if (status === 503 || !status || status >= 500) {
        return createAiError("Gemini service is temporarily unavailable.", 503, error, "GEMINI_UNAVAILABLE")
    }

    return createAiError("Gemini returned an unexpected response.", 502, error, "GEMINI_RESPONSE_ERROR")
}

async function createGeminiStructuredResponse({ name, schema, prompt }) {
    let lastError

    for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
        try {
            const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
            console.log(`Gemini ${name} request: ${model} - attempt ${attempt}/${MAX_AI_ATTEMPTS}`)

            const response = await withTimeout(
                () => getGeminiClient().models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema
                    }
                }),
                AI_TIMEOUT_MS,
                `Gemini ${name} request (${model})`
            )

            if (!response.text) {
                throw createAiError("Gemini returned empty structured output.", 502, null, "GEMINI_INVALID_OUTPUT")
            }

            return response.text

        } catch (error) {
            lastError = normalizeGeminiError(error)
            const retryable = !error?.isAiServiceError &&
                [429, 503, 504].includes(lastError.status)

            console.error(`Gemini ${name} error on attempt ${attempt}/${MAX_AI_ATTEMPTS}:`, lastError.status, error?.message)

            if (!retryable || attempt === MAX_AI_ATTEMPTS) {
                throw lastError
            }

            console.log(`Retrying Gemini ${name} in ${RETRY_DELAY_MS}ms...`)
            await sleep(RETRY_DELAY_MS)
        }
    }

    throw lastError
}

function parseGeminiOutput(text, schema, outputName) {
    try {
        return schema.parse(JSON.parse(text))
    } catch (error) {
        throw createAiError(`Gemini returned invalid ${outputName} data.`, 502, error, "GEMINI_INVALID_OUTPUT")
    }
}

const interviewReportSchema = z.object({

    matchScore: z.number().min(0).max(100),

    technicalQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),

    behavioralQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),

    skillGaps: z.array(
        z.object({
            skill: z.string(),
            severity: z.enum(["low", "medium", "high"])
        })
    ),

    preparationPlan: z.array(
        z.object({
            day: z.number(),
            focus: z.string(),
            tasks: z.array(z.string())
        })
    ),

    title: z.string()

})

const interviewReportResponseSchema = {
    type: "object",
    properties: {
        matchScore: { type: "number", minimum: 0, maximum: 100 },
        technicalQuestions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    intention: { type: "string" },
                    answer: { type: "string" }
                },
                required: ["question", "intention", "answer"],
                additionalProperties: false
            }
        },
        behavioralQuestions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    intention: { type: "string" },
                    answer: { type: "string" }
                },
                required: ["question", "intention", "answer"],
                additionalProperties: false
            }
        },
        skillGaps: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    skill: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high"] }
                },
                required: ["skill", "severity"],
                additionalProperties: false
            }
        },
        preparationPlan: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    day: { type: "number" },
                    focus: { type: "string" },
                    tasks: { type: "array", items: { type: "string" } }
                },
                required: ["day", "focus", "tasks"],
                additionalProperties: false
            }
        },
        title: { type: "string" }
    },
    required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan", "title"],
    additionalProperties: false
}

const customizedResumeSchema = z.object({
    name: z.string(),
    professionalTitle: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string(),
    github: z.string(),
    portfolio: z.string(),
    summary: z.string(),
    skills: z.array(z.string()),
    skillGroups: z.array(z.object({
        category: z.string(),
        skills: z.array(z.string())
    })),
    experience: z.array(z.object({
        title: z.string(),
        company: z.string(),
        location: z.string(),
        dates: z.string(),
        bullets: z.array(z.string())
    })),
    projects: z.array(z.object({
        name: z.string(),
        technologies: z.string(),
        dates: z.string(),
        bullets: z.array(z.string())
    })),
    education: z.array(z.object({
        degree: z.string(),
        institution: z.string(),
        location: z.string(),
        dates: z.string(),
        details: z.string()
    })),
    certifications: z.array(z.string()),
    achievements: z.array(z.string())
})

const customizedResumeResponseSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        professionalTitle: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedin: { type: "string" },
        github: { type: "string" },
        portfolio: { type: "string" },
        summary: { type: "string" },
        skills: { type: "array", items: { type: "string" } },
        skillGroups: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    category: { type: "string" },
                    skills: { type: "array", items: { type: "string" } }
                },
                required: [ "category", "skills" ],
                additionalProperties: false
            }
        },
        experience: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    company: { type: "string" },
                    location: { type: "string" },
                    dates: { type: "string" },
                    bullets: { type: "array", items: { type: "string" } }
                },
                required: [ "title", "company", "location", "dates", "bullets" ],
                additionalProperties: false
            }
        },
        projects: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    technologies: { type: "string" },
                    dates: { type: "string" },
                    bullets: { type: "array", items: { type: "string" } }
                },
                required: [ "name", "technologies", "dates", "bullets" ],
                additionalProperties: false
            }
        },
        education: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    degree: { type: "string" },
                    institution: { type: "string" },
                    location: { type: "string" },
                    dates: { type: "string" },
                    details: { type: "string" }
                },
                required: [ "degree", "institution", "location", "dates", "details" ],
                additionalProperties: false
            }
        },
        certifications: { type: "array", items: { type: "string" } },
        achievements: { type: "array", items: { type: "string" } }
    },
    required: [
        "name", "professionalTitle", "email", "phone", "location", "linkedin", "github",
        "portfolio", "summary", "skills", "skillGroups", "experience", "projects",
        "education", "certifications", "achievements"
    ],
    additionalProperties: false
}

async function generateCustomizedResume({ resume, selfDescription, jobDescription }) {
    if (!jobDescription?.trim()) {
        throw Object.assign(new Error("Job description is required."), { status: 400 })
    }

    if (!resume?.trim() && !selfDescription?.trim()) {
        throw Object.assign(new Error("Resume or self-description is required."), { status: 400 })
    }

    const prompt = `
You are an expert software engineering resume editor. Create a concise, professional, ATS-friendly resume tailored to the supplied job description using only evidence in the source resume and self-description.

SOURCE RESUME:
${resume || ""}

CANDIDATE SELF DESCRIPTION:
${selfDescription || ""}

JOB DESCRIPTION:
${jobDescription}

FACTUALITY IS MANDATORY:
- Treat the source resume and self-description as the only sources of candidate facts. The job description is not evidence that the candidate has a requested skill or experience.
- Never invent or infer companies, job titles, internships, projects, degrees, dates, achievements, certifications, technologies, responsibilities, metrics, contact information, links, or locations.
- Only include a skill when it is explicitly supported by the source. Never add a JD skill just to improve matching.
- You may improve grammar, shorten, combine, and reorder facts while preserving their original meaning. Never turn an aspiration or JD requirement into a past accomplishment.
- Preserve the candidate's actual name and available contact details. Copy available email, phone, location, LinkedIn, GitHub, and portfolio URLs faithfully. Return an empty string for every unavailable field.
- Do not add a project, experience entry, certification, achievement, or education record that is absent from the source.

CONTENT AND ORDER:
- Return a concise professional summary of about 2–4 short lines. Use third person or resume-style fragments, never first person. Avoid generic claims and include JD keywords only when supported by the source.
- Choose professionalTitle from the candidate's demonstrated background and the target role. Use a specific title only when the source supports it; otherwise return an empty string. Never present the target role as prior employment.
- Group only supported skills into useful categories such as Languages, Frontend, Backend, Databases, and Tools. Put relevant supported skills first. The flat skills field must contain the same supported skills, without additions.
- Select and order the most JD-relevant existing projects. For each, use 2–4 concise bullets only when the source has enough distinct facts; do not pad sparse source material. Preserve real metrics exactly; do not create new metrics.
- Include experience/internships only if documented in the source. For a fresher without documented employment, leave experience empty and prioritize projects before education.
- Keep education compact; include academic scores only when provided.
- Include certifications and achievements only when present in the source.
- Omit unavailable details with empty strings or empty arrays. Do not emit nulls, placeholders, markdown, commentary, or empty section entries.

Return the complete resume using exactly the fields in the response schema. Keep descriptions concise and factual; do not include markdown or explanatory text.
`

    const responseText = await createGeminiStructuredResponse({
        name: "customized_resume",
        schema: customizedResumeResponseSchema,
        prompt
    })

    const customizedResume = parseGeminiOutput(responseText, customizedResumeSchema, "customized resume")
    const hasTopLevelContent = [
        customizedResume.name,
        customizedResume.professionalTitle,
        customizedResume.email,
        customizedResume.phone,
        customizedResume.location,
        customizedResume.linkedin,
        customizedResume.github,
        customizedResume.portfolio,
        customizedResume.summary,
        ...customizedResume.skills,
        ...customizedResume.certifications,
        ...customizedResume.achievements
    ].some(value => value.trim())
    const hasSectionContent = [
        ...customizedResume.experience,
        ...customizedResume.projects,
        ...customizedResume.education
    ].some(entry => Object.values(entry).some(value =>
        typeof value === "string"
            ? value.trim()
            : value.some(item => item.trim())
    ))

    if (!hasTopLevelContent && !hasSectionContent) {
        throw createAiError("Gemini returned a customized resume with no usable content.", 502, null, "GEMINI_INVALID_RESUME")
    }

    return customizedResume
}

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `
You are an expert technical interviewer and career coach.

Generate a detailed interview preparation report for the candidate.

CANDIDATE RESUME:
${resume}

CANDIDATE SELF DESCRIPTION:
${selfDescription}

JOB DESCRIPTION:
${jobDescription}

IMPORTANT INSTRUCTIONS:

You MUST generate the response using EXACTLY the fields defined in the response schema.

The response must contain:

1. matchScore
- A number between 0 and 100.
- Represents how well the candidate matches the job description.

2. technicalQuestions
- Generate 5 important technical interview questions.
- Questions must be relevant to the candidate's skills and the job description.
- Each object MUST contain:
  - question
  - intention
  - answer

3. behavioralQuestions
- Generate 5 important behavioral interview questions.
- Questions should be relevant to a fresher / entry-level developer.
- Each object MUST contain:
  - question
  - intention
  - answer

4. skillGaps
- Identify skills that the candidate should improve for this particular job.
- Generate useful skill gaps rather than leaving the array empty.
- Each object MUST contain:
  - skill
  - severity
- severity MUST be one of:
  - low
  - medium
  - high

5. preparationPlan
- Create a 7-day interview preparation plan.
- Each day MUST contain:
  - day
  - focus
  - tasks
- Each day should have multiple practical tasks.

6. title
- Use the actual job position from the job description.
- Example: "Full Stack Developer – MERN Stack"

VERY IMPORTANT:

Do NOT create or use these fields:

candidate_name
applied_position
experience_level
match_score_percentage
profile_summary
strengths
areas_for_evaluation
technical_alignment
recommended_interview_questions
hiring_recommendation
conclusion

Use ONLY:

matchScore
technicalQuestions
behavioralQuestions
skillGaps
preparationPlan
title

Do not return empty arrays unless absolutely necessary.

CRITICAL:
Every array element MUST be a complete object.
NEVER return null as an array element.
NEVER return [null].
Every technicalQuestions element must contain question, intention, and answer.
Every behavioralQuestions element must contain question, intention, and answer.
Every skillGaps element must contain skill and severity.
Every preparationPlan element must contain day, focus, and tasks.

Return only the JSON object matching the provided response schema.
`

    const responseText = await createGeminiStructuredResponse({
        name: "interview_report",
        schema: interviewReportResponseSchema,
        prompt,
    })
    const validatedReport = parseGeminiOutput(responseText, interviewReportSchema, "interview report")

    console.log("REPORT FIELDS:", {
        matchScore: validatedReport.matchScore,
        technicalQuestions: validatedReport.technicalQuestions.length,
        behavioralQuestions: validatedReport.behavioralQuestions.length,
        skillGaps: validatedReport.skillGaps.length,
        preparationPlan: validatedReport.preparationPlan.length,
        title: validatedReport.title
    })

    return validatedReport
}

async function generatePdfFromHtml(html) {
    let browser
    let page

    try {
        const executablePath = await puppeteer.executablePath()

        if (!existsSync(executablePath)) {
            throw new Error(`Puppeteer Chrome executable was not found at ${executablePath}.`)
        }

        console.log("Chrome executable:", executablePath)

        browser = await puppeteer.launch({
            headless: true,
            executablePath,
            timeout: 60000,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote"
            ]
        })

        page = await browser.newPage()

        await page.setContent(html, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        })

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "12mm",
                right: "12mm",
                bottom: "12mm",
                left: "12mm"
            }
        })

        return Buffer.from(pdf)

    } finally {
        if (page) {
            try {
                await page.close()
            } catch (error) {
                console.warn("Page close failed during PDF generation:", error.message)
            }
        }

        if (browser) {
            try {
                await browser.close()
            } catch (error) {
                console.warn("Browser close failed during PDF generation:", error.message)
            }
        }
    }
}


async function generateResumePdf({
    customizedResume
}) {
    if (!customizedResume || typeof customizedResume !== "object") {
        throw Object.assign(new Error("Customized resume data is required."), { status: 400 })
    }

    const html = validateResumeHtml(buildResumeHtml(customizedResume))

    try {
        const pdfBuffer = await withTimeout(
            () => generatePdfFromHtml(html),
            PDF_TIMEOUT_MS,
            "Resume PDF generation"
        )

        console.log("Resume PDF generated from local HTML using Puppeteer")
        return pdfBuffer

    } catch (pdfError) {
        console.error("Resume PDF generation error:", pdfError)
        throw pdfError
    }
}

function buildResumeHtml(resume) {
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character])

    const text = (value) => typeof value === "string" ? value.trim() : ""
    const line = (value, className = "") => {
        const content = text(value)
        return content ? `<p${className ? ` class="${className}"` : ""}>${escapeHtml(content)}</p>` : ""
    }
    const list = (values, className = "") => {
        const items = Array.isArray(values) ? values.filter(value => text(value)) : []
        return items.length
            ? `<ul${className ? ` class="${className}"` : ""}>${items.map(value => `<li>${escapeHtml(text(value))}</li>`).join("")}</ul>`
            : ""
    }
    const section = (title, contents) => contents
        ? `<section><h2>${escapeHtml(title)}</h2>${contents}</section>`
        : ""
    const entries = (values, title, renderEntry) => {
        const content = (Array.isArray(values) ? values : [])
            .filter(value => value && typeof value === "object")
            .map(renderEntry)
            .filter(Boolean)
            .join("")
        return section(title, content)
    }
    const renderEntry = ({ heading, subheading, dates, detail, bullets }) => {
        const headingText = text(heading)
        const subheadingText = text(subheading)
        const datesText = text(dates)
        const detailText = text(detail)
        const bulletsHtml = list(bullets)
        if (!headingText && !subheadingText && !datesText && !detailText && !bulletsHtml) {
            return ""
        }

        return `<article class="entry">
            ${headingText || datesText ? `<div class="entry-heading">${headingText ? `<h3>${escapeHtml(headingText)}</h3>` : ""}${datesText ? `<span>${escapeHtml(datesText)}</span>` : ""}</div>` : ""}
            ${line(subheadingText, "meta")}
            ${line(detailText)}
            ${bulletsHtml}
        </article>`
    }

    const completeContacts = [ resume.phone, resume.email, resume.linkedin, resume.github, resume.portfolio, resume.location ]
        .map(text)
        .filter(Boolean)
        .map(escapeHtml)
        .join(" <span aria-hidden=\"true\">|</span> ")
    const heading = text(resume.name)
        ? `<h1>${escapeHtml(text(resume.name))}</h1>`
        : ""
    const title = text(resume.professionalTitle)
        ? `<p class="professional-title">${escapeHtml(text(resume.professionalTitle))}</p>`
        : ""
    const skillGroups = (Array.isArray(resume.skillGroups) ? resume.skillGroups : [])
        .map(group => ({
            category: text(group?.category),
            skills: Array.isArray(group?.skills) ? group.skills.filter(value => text(value)) : []
        }))
        .filter(group => group.category && group.skills.length)
    const skillItems = skillGroups.length
        ? skillGroups.map(group => `<p class="skill-group"><strong>${escapeHtml(group.category)}:</strong> ${group.skills.map(value => escapeHtml(text(value))).join(", ")}</p>`).join("")
        : list(resume.skills, "skills")
    const hasExperience = Array.isArray(resume.experience) && resume.experience.some(item =>
        item && (text(item.title) || text(item.company) || (Array.isArray(item.bullets) && item.bullets.some(value => text(value))))
    )
    const certifications = list(resume.certifications)
    const achievements = list(resume.achievements)
    const experienceSection = entries(resume.experience, "Experience", item => renderEntry({
        heading: item.title,
        subheading: [ item.company, item.location ].map(text).filter(Boolean).join(" | "),
        dates: item.dates,
        bullets: item.bullets
    }))
    const projectSection = entries(resume.projects, "Projects", item => renderEntry({
        heading: item.name,
        subheading: item.technologies,
        dates: item.dates,
        bullets: item.bullets
    }))
    const educationSection = entries(resume.education, "Education", item => renderEntry({
        heading: item.degree,
        subheading: [ item.institution, item.location ].map(text).filter(Boolean).join(" | "),
        dates: item.dates,
        detail: item.details
    }))

    return `<!doctype html>
<html lang="en">
<head>
<title>Customized Resume</title>
<style>
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
html { color: #000; background: #fff; }
body { color: #000; font: 9.5pt/1.32 Arial, Helvetica, sans-serif; margin: 0; }
main { max-width: 780px; margin: 0 auto; }
header { border-bottom: 1px solid #000; margin-bottom: 9px; padding-bottom: 7px; text-align: center; }
h1 { color: #000; font-size: 20pt; line-height: 1.08; margin: 0 0 2px; }
.professional-title { font-size: 10pt; font-weight: 700; margin: 0 0 3px; }
.contact { color: #222; font-size: 8.5pt; overflow-wrap: anywhere; }
section { margin: 0 0 9px; }
h2 { border-bottom: 1px solid #777; color: #000; font-size: 10pt; letter-spacing: .04em; margin: 0 0 4px; padding-bottom: 2px; text-transform: uppercase; break-after: avoid; }
p { margin: 0 0 3px; overflow-wrap: anywhere; white-space: pre-wrap; }
.skill-group { margin: 0 0 2px; }
.skills { display: flex; flex-wrap: wrap; gap: 2px 12px; list-style: none; margin: 0; padding: 0; }
.entry { margin: 0 0 6px; break-inside: avoid; }
.entry-heading { align-items: baseline; display: flex; gap: 10px; justify-content: space-between; break-after: avoid; }
h3 { color: #000; font-size: 9.5pt; margin: 0; }
.entry-heading span, .meta { color: #222; font-size: 8.8pt; }
ul:not(.skills) { margin: 2px 0 0; padding-left: 16px; }
li { margin: 0 0 1px; overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
<header>${heading}${title}${completeContacts ? `<p class="contact">${completeContacts}</p>` : ""}</header>
${section("Professional Summary", line(resume.summary))}
${hasExperience ? experienceSection : ""}
${section("Technical Skills", skillItems)}
${hasExperience ? projectSection : `${projectSection}${experienceSection}`}
${educationSection}
${section("Certifications", certifications)}
${section("Achievements", achievements)}
</main>
</body>
</html>`
}

function validateResumeHtml(html) {
    const document = html.trim()

    const hasDocumentStructure = /<html\b/i.test(document) &&
        /<body\b[\s\S]*<\/body\s*>/i.test(document)
    const containsUnsafeMarkup = /<\s*(script|iframe|frame|object|embed|form|input|button|link|meta|base)\b/i.test(document) ||
        /\son[a-z]+\s*=/i.test(document) ||
        /javascript\s*:/i.test(document) ||
        /\bsrc\s*=\s*["']?\s*(?!data:image\/)[^"'\s>]+/i.test(document) ||
        /@import\b|url\(\s*["']?\s*(?:https?:|\/\/|file:)/i.test(document)

    if (!hasDocumentStructure || containsUnsafeMarkup || document.length > 500000) {
        throw createAiError("Locally generated resume HTML is invalid.", 500, null, "INVALID_RESUME_HTML")
    }

    return document
}

module.exports = {
    generateInterviewReport,
    generateCustomizedResume,
    generateResumePdf,
    buildResumeHtml
}