
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
    resume,
    selfDescription,
    jobDescription
}) {
    if (!jobDescription?.trim()) {
        throw Object.assign(new Error("Job description is required."), { status: 400 })
    }

    if (!resume?.trim() && !selfDescription?.trim()) {
        throw Object.assign(new Error("Resume or self-description is required."), { status: 400 })
    }

    const html = validateResumeHtml(buildResumeHtml({ resume, selfDescription, jobDescription }))

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

function buildResumeHtml({ resume, selfDescription, jobDescription }) {
    const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character])

    const formatText = (value) => String(value || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => `<p>${escapeHtml(line)}</p>`)
        .join("\n")

    const candidateText = `${resume || ""}\n${selfDescription || ""}`
    const stopWords = new Set([
        "about", "across", "after", "also", "and", "are", "based", "been", "both", "can", "candidate",
        "company", "experience", "from", "good", "have", "into", "into", "looking", "must", "our", "role",
        "should", "skills", "such", "team", "that", "their", "this", "through", "using", "very", "will", "with", "work", "your"
    ])
    const relevantSkills = [...new Set((jobDescription.match(/[A-Za-z][A-Za-z0-9+#.-]{1,}/g) || [])
        .filter(skill => !stopWords.has(skill.toLowerCase()) && candidateText.toLowerCase().includes(skill.toLowerCase())))]
        .slice(0, 12)
    const skillsSection = relevantSkills.length
        ? `<section><h2>Role-relevant skills</h2><ul class="skills">${relevantSkills.map(skill => `<li>${escapeHtml(skill)}</li>`).join("")}</ul></section>`
        : ""

    return `<!doctype html>
<html lang="en">
<head>
<title>Professional Resume</title>
<style>
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { color: #17212b; font: 10.5pt/1.55 Arial, sans-serif; margin: 0; }
main { max-width: 780px; margin: 0 auto; }
header { border-bottom: 2px solid #247c78; margin-bottom: 24px; padding-bottom: 15px; }
h1 { color: #173c45; font-size: 25pt; line-height: 1.15; margin: 0 0 6px; }
.eyebrow { color: #247c78; font-size: 9pt; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; }
.target { color: #51616c; margin: 0; }
section { margin: 0 0 22px; page-break-inside: avoid; }
h2 { border-bottom: 1px solid #c8d4d5; color: #247c78; font-size: 12pt; margin: 0 0 9px; padding-bottom: 4px; }
p { margin: 0 0 7px; overflow-wrap: anywhere; white-space: pre-wrap; }
.skills { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0; padding: 0; }
.skills li { border: 1px solid #b9cecb; border-radius: 3px; padding: 3px 8px; }
</style>
</head>
<body>
<main>
<header><p class="eyebrow">Professional Resume</p><h1>Candidate Profile</h1><p class="target">Prepared for the supplied job description</p></header>
${selfDescription?.trim() ? `<section><h2>Professional Profile</h2>${formatText(selfDescription)}</section>` : ""}
${skillsSection}
${resume?.trim() ? `<section><h2>Resume Details</h2>${formatText(resume)}</section>` : ""}
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
    generateResumePdf
}