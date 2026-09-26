
const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const puppeteer = require("puppeteer")

console.log("AI SERVICE LOADED - MODEL: gemini-3.6-flash")
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

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
        matchScore: { type: "number" },
        technicalQuestions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    intention: { type: "string" },
                    answer: { type: "string" }
                },
                required: ["question", "intention", "answer"]
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
                required: ["question", "intention", "answer"]
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
                required: ["skill", "severity"]
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
                required: ["day", "focus", "tasks"]
            }
        },
        title: { type: "string" }
    },
    required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan", "title"]
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

    const models = [
        "gemini-3.5-flash",
        "gemini-3.6-flash"
    ]

    let lastError

    for (const model of models) {

        try {

            console.log(
                `Gemini interview request: ${model}`
            )

            const response = await ai.models.generateContent({
                model,

                contents: prompt,

                config: {
                    responseMimeType: "application/json",

                    responseSchema:
                        interviewReportResponseSchema
                }
            })

            console.log(
                `Gemini interview response received using ${model}`
            )

            const report = JSON.parse(response.text)

            const validatedReport =
                interviewReportSchema.parse(report)

            console.log("REPORT FIELDS:", {
                matchScore: validatedReport.matchScore,
                technicalQuestions:
                    validatedReport.technicalQuestions.length,
                behavioralQuestions:
                    validatedReport.behavioralQuestions.length,
                skillGaps:
                    validatedReport.skillGaps.length,
                preparationPlan:
                    validatedReport.preparationPlan.length,
                title: validatedReport.title
            })

            return validatedReport

        } catch (error) {

            lastError = error

            const status =
                error?.status || error?.code

            console.error(
                `Gemini interview error using ${model}:`,
                status,
                error?.message
            )

            const retryable =
                status === 503 ||
                status === 504 ||
                status === 429 ||
                error?.message?.includes("UNAVAILABLE") ||
                error?.message?.includes("timed out")

            if (!retryable) {
                throw error
            }

            console.log(
                `Model ${model} unavailable. Trying fallback model...`
            )
        }
    }

    const finalError = new Error(
        "AI service is temporarily unavailable. Please try again later."
    )

    finalError.status = 503
    finalError.cause = lastError

    throw finalError
}

async function generatePdfFromHtml(html) {
    let browser

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        })

        const page = await browser.newPage()

        await page.setContent(html, {
            waitUntil: "networkidle0"
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
        if (browser) {
            await browser.close()
        }
    }
} 

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfSchema = z.object({
        html: z.string()
    })

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

    const models = [
        "gemini-3.5-flash",
        "gemini-3.6-flash"
    ]

    let lastError

    for (const model of models) {

        for (let attempt = 1; attempt <= 2; attempt++) {

            try {

                console.log(
                    `Resume Gemini request: ${model} - attempt ${attempt}/2`
                )

                const response = await ai.models.generateContent({
                    model,

                    contents: prompt,

                    config: {
                        responseMimeType: "application/json",

                        responseSchema: {
                            type: "object",
                            properties: {
                                html: {
                                    type: "string"
                                }
                            },
                            required: ["html"]
                        }
                    }
                })

                console.log(
                    `Resume Gemini response received using ${model}`
                )

                const jsonContent =
                    JSON.parse(response.text)

                const validatedResume =
                    resumePdfSchema.parse(jsonContent)

                const pdfBuffer =
                    await generatePdfFromHtml(
                        validatedResume.html
                    )

                console.log(
                    `Resume PDF generated successfully using ${model}`
                )

                return pdfBuffer

            } catch (error) {

                lastError = error

                const status =
                    error?.status || error?.code

                console.error(
                    `Resume Gemini error: model=${model}, attempt=${attempt}/2:`,
                    status,
                    error?.message
                )

                const retryable =
                    status === 503 ||
                    status === 504 ||
                    status === 429 ||
                    error?.message?.includes("UNAVAILABLE") ||
                    error?.message?.includes("timed out")

                if (!retryable) {
                    throw error
                }

                if (attempt < 2) {

                    const delay = 1000

                    console.log(
                        `Retrying ${model} in ${delay}ms...`
                    )

                    await new Promise(resolve =>
                        setTimeout(resolve, delay)
                    )
                }
            }
        }

        console.log(
            `Model ${model} unavailable. Trying fallback model...`
        )
    }

    const finalError = new Error(
        "AI service is temporarily unavailable. Please try again later."
    )

    finalError.status = 503
    finalError.cause = lastError

    throw finalError
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
}