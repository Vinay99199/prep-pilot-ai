
const OpenAI = require("openai")
const { z } = require("zod")
const puppeteer = require("puppeteer")

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"
const AI_TIMEOUT_MS = 40000
const PDF_TIMEOUT_MS = 60000
const MAX_AI_ATTEMPTS = 2
const RETRY_DELAY_MS = 1000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let openai

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

function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY?.trim()

    if (!apiKey) {
        throw createAiError("OPENAI_API_KEY is not configured.", 503, null, "OPENAI_CONFIG")
    }

    if (!openai) {
        openai = new OpenAI({
            apiKey,
            timeout: AI_TIMEOUT_MS,
            maxRetries: 0
        })
    }

    return openai
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

function normalizeOpenAIError(error) {
    if (error?.isAiServiceError) {
        return error
    }

    const status = Number(error?.status || error?.statusCode)

    if (status === 401 || status === 403) {
        return createAiError("OpenAI authentication failed. Check OPENAI_API_KEY.", 503, error, "OPENAI_AUTH")
    }

    if (status === 429) {
        return createAiError("OpenAI rate limit reached. Please try again shortly.", 429, error, "OPENAI_RATE_LIMIT")
    }

    if (isTimeoutError(error)) {
        return createAiError("OpenAI request timed out.", 504, error, "OPENAI_TIMEOUT")
    }

    if (!status || status >= 500) {
        return createAiError("OpenAI service is temporarily unavailable.", 503, error, "OPENAI_UNAVAILABLE")
    }

    return createAiError("OpenAI returned an unexpected response.", 502, error, "OPENAI_RESPONSE_ERROR")
}

async function createStructuredResponse({ name, schema, instructions, prompt, maxOutputTokens }) {
    const client = getOpenAIClient()
    let lastError

    for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
        try {
            console.log(`OpenAI ${name} request: ${process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL} - attempt ${attempt}/${MAX_AI_ATTEMPTS}`)

            const response = await client.responses.create({
                model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
                input: [
                    { role: "system", content: instructions },
                    { role: "user", content: prompt }
                ],
                text: {
                    format: {
                        type: "json_schema",
                        name,
                        schema,
                        strict: true
                    }
                },
                max_output_tokens: maxOutputTokens
            })

            if (response.status !== "completed" || !response.output_text) {
                throw createAiError("OpenAI returned incomplete or empty structured output.", 502, null, "OPENAI_INVALID_OUTPUT")
            }

            return response.output_text

        } catch (error) {
            lastError = normalizeOpenAIError(error)
            const apiStatus = Number(error?.status || error?.statusCode)
            const retryable = !error?.isAiServiceError &&
                apiStatus !== 401 &&
                apiStatus !== 403 &&
                (apiStatus === 429 || isTimeoutError(error) || apiStatus >= 500 || !apiStatus)

            console.error(`OpenAI ${name} error on attempt ${attempt}/${MAX_AI_ATTEMPTS}:`, lastError.status, lastError.message)

            if (!retryable || attempt === MAX_AI_ATTEMPTS) {
                throw lastError
            }

            console.log(`Retrying OpenAI ${name} in ${RETRY_DELAY_MS}ms...`)
            await sleep(RETRY_DELAY_MS)
        }
    }

    throw lastError
}

function parseStructuredOutput(text, schema, outputName) {
    try {
        return schema.parse(JSON.parse(text))
    } catch (error) {
        throw createAiError(`OpenAI returned invalid ${outputName} data.`, 502, error, "OPENAI_INVALID_OUTPUT")
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

    const responseText = await createStructuredResponse({
        name: "interview_report",
        schema: interviewReportResponseSchema,
        instructions: "You are an expert technical interviewer and career coach. Return a complete interview preparation report that follows the supplied JSON schema exactly.",
        prompt,
        maxOutputTokens: 7000
    })
    const validatedReport = parseStructuredOutput(responseText, interviewReportSchema, "interview report")

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
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined

        console.log("Chrome executable:", executablePath || "default Puppeteer browser")

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

        const pdfBuffer = await page.pdf({
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

        return pdfBuffer

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

    const resumePdfSchema = z.object({
        html: z.string().min(1)
    })

    const resumePdfResponseSchema = {
        type: "object",
        properties: {
            html: { type: "string" }
        },
        required: ["html"],
        additionalProperties: false
    }

    const prompt = `
Generate a professional ATS-friendly resume for the candidate.

RESUME:
${resume}

SELF DESCRIPTION:
${selfDescription}

JOB DESCRIPTION:
${jobDescription}

Requirements:

- Tailor the resume specifically to the job description.
- Highlight relevant technical skills and projects.
- Keep the resume professional and human-written.
- Keep it approximately 1-2 pages.
- Make it ATS friendly.
- Use clean HTML.
- Do not include unnecessary content.
- The response must contain ONLY one field named "html".
- The value of "html" must contain the complete HTML resume.

Return only valid JSON matching the provided schema.
`

    const responseText = await createStructuredResponse({
        name: "resume_html",
        schema: resumePdfResponseSchema,
        instructions: "You are an expert resume writer. Generate a complete, professional ATS-friendly HTML resume, and return it in the supplied JSON schema.",
        prompt,
        maxOutputTokens: 7000
    })
    const validatedResume = parseStructuredOutput(responseText, resumePdfSchema, "resume HTML")
    const html = validateResumeHtml(validatedResume.html)

    try {
        const pdfBuffer = await withTimeout(
            () => generatePdfFromHtml(html),
            PDF_TIMEOUT_MS,
            "Resume PDF generation"
        )

        console.log("Resume PDF generated successfully using OpenAI and Puppeteer")
        return pdfBuffer

    } catch (pdfError) {
        console.error("Resume PDF generation error:", pdfError)
        throw pdfError
    }
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
        throw createAiError("OpenAI returned invalid or unsafe resume HTML.", 502, null, "OPENAI_INVALID_HTML")
    }

    return document
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
}