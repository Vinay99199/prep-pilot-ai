
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

    let lastError

    for (let attempt = 1; attempt <= 3; attempt++) {

        try {

            console.log(`Gemini request attempt ${attempt}/3`)

            const response = await Promise.race([

                ai.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: interviewReportResponseSchema
                    }
                }),

                new Promise((_, reject) =>
                    setTimeout(() => {
                        const error = new Error("Gemini request timed out")
                        error.status = 504
                        reject(error)
                    }, 30000)
                )

            ])

            console.log("Gemini response received")
            console.log("AI REPORT:", response.text)

            const report = JSON.parse(response.text)

            const validatedReport = interviewReportSchema.parse(report)

            console.log("REPORT FIELDS:", {
                matchScore: validatedReport.matchScore,
                technicalQuestions: validatedReport.technicalQuestions.length,
                behavioralQuestions: validatedReport.behavioralQuestions.length,
                skillGaps: validatedReport.skillGaps.length,
                preparationPlan: validatedReport.preparationPlan.length,
                title: validatedReport.title
            })

            return validatedReport

        } catch (error) {

            lastError = error

            console.log(
                `Gemini error on attempt ${attempt}:`,
                error.status,
                error.message
            )

            if (error.status !== 503) {
                throw error
            }

            if (attempt < 3) {

                console.log("Retrying Gemini request...")

                await new Promise(resolve =>
                    setTimeout(resolve, 2000)
                )

            }

        }

    }

    throw lastError
}

async function generatePdfFromHtml(htmlContent) {

    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    await page.setContent(htmlContent, {
        waitUntil: "networkidle0"
    })

    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
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
`

    const response = await ai.models.generateContent({

        model: "gemini-3-flash-preview",

        contents: prompt,

        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: { html: { type: "string" } },
                required: ["html"]
            }
        }

    })

    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(
        jsonContent.html
    )

    return pdfBuffer
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
}