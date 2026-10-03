const { PDFParse } = require("pdf-parse")
const mongoose = require("mongoose")
const { generateInterviewReport, generateCustomizedResume, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

const userModel = require("../models/user.model")

const resumePdfLocks = new Map()

async function withResumePdfLock(interviewReportId, operation) {
    const previousRequest = resumePdfLocks.get(interviewReportId)
    let release
    const currentRequest = new Promise(resolve => {
        release = resolve
    })

    resumePdfLocks.set(interviewReportId, currentRequest)
    await previousRequest

    try {
        return await operation()
    } finally {
        if (resumePdfLocks.get(interviewReportId) === currentRequest) {
            resumePdfLocks.delete(interviewReportId)
        }
        release()
    }
}


/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    try {

        const user = await userModel.findById(req.user.id)

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            })
        }

        const today = new Date()

        if (
            !user.reportCountDate ||
            user.reportCountDate.toDateString() !== today.toDateString()
        ) {
            user.reportCount = 0
            user.reportCountDate = today

            await user.save()
        }

        if (user.reportCount >= 5) {
            return res.status(429).json({
                message: "Daily report limit reached. You can generate only 5 interview reports per day."
            })
        }

        const { selfDescription, jobDescription } = req.body

        if (!jobDescription?.trim() || (!req.file && !selfDescription?.trim())) {
            return res.status(400).json({
                message: "A job description and either a resume or self-description are required."
            })
        }

        let resumeText = ""

        if (req.file && req.file.buffer?.length) {
            const parser = new PDFParse({ data: req.file.buffer })
            try {
                const resumeContent = await parser.getText()
                resumeText = resumeContent?.text || ""
            } finally {
                await parser.destroy()
            }
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const customizedResume = await generateCustomizedResume({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...interViewReportByAi,
            customizedResume,
            title: interViewReportByAi.title || "Interview Report"
        })

        user.reportCount = (user.reportCount || 0) + 1
        await user.save()

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })

    } catch (error) {

        console.error("Generate Interview Report Error:", error)

        if (error.status === 429) {
            return res.status(429).json({
                message: "Gemini API rate limit reached. Please try again shortly."
            })
        }

        if (error.status === 503) {
            return res.status(503).json({
                message: "AI service is temporarily unavailable. Please try again."
            })
        }

        if (error.status === 504) {
            return res.status(504).json({
                message: "The interview report took too long to generate. Please try again."
            })
        }

        if (error.status === 502) {
            return res.status(502).json({
                message: "Gemini returned an invalid response. Please try again."
            })
        }

        return res.status(500).json({
            message: "Failed to generate interview report.",
            error: error.message
        })
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    if (!mongoose.isValidObjectId(interviewId)) {
        return res.status(400).json({
            message: "Invalid interview report ID."
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}

/**
 * @description Delete an interview report owned by the logged in user.
 */
async function deleteInterviewReportController(req, res) {
    const { interviewReportId } = req.params

    if (!mongoose.isValidObjectId(interviewReportId)) {
        return res.status(400).json({
            message: "Invalid interview report ID."
        })
    }

    const interviewReport = await interviewReportModel.findOneAndDelete({
        _id: interviewReportId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report deleted successfully."
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {

    try {

        const { interviewReportId } = req.params

        if (!mongoose.isValidObjectId(interviewReportId)) {
            return res.status(400).json({
                message: "Invalid interview report ID."
            })
        }

        return await withResumePdfLock(interviewReportId, async () => {
            const interviewReport = await interviewReportModel.findOne({
                _id: interviewReportId,
                user: req.user.id
            })

            if (!interviewReport) {
                return res.status(404).json({
                    message: "Interview report not found."
                })
            }

            // Only use a cached PDF when it belongs to the saved customized resume.
            if (interviewReport.customizedResume && interviewReport.resumePdf?.length) {

                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
                })

                return res.send(interviewReport.resumePdf)
            }

            if (!interviewReport.customizedResume) {
                interviewReport.customizedResume = await generateCustomizedResume({
                    resume: interviewReport.resume,
                    jobDescription: interviewReport.jobDescription,
                    selfDescription: interviewReport.selfDescription
                })
                interviewReport.resumePdf = undefined
                interviewReport.markModified("customizedResume")
                await interviewReport.save()
            }

            const pdfBuffer = await generateResumePdf({
                customizedResume: interviewReport.customizedResume
            })

            interviewReport.resumePdf = pdfBuffer
            await interviewReport.save()

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
            })

            return res.send(pdfBuffer)
        })

    } catch (error) {

        console.error("Generate Resume PDF Error:", error)

        if (error.status === 429) {
            return res.status(429).json({
                message: "Gemini API rate limit reached. Please try again shortly."
            })
        }

        if (error.status === 503) {
            return res.status(503).json({
                message: "AI service is temporarily unavailable. Please try again."
            })
        }

        if (error.status === 504) {
            return res.status(504).json({
                message: "Resume PDF generation took too long. Please try again."
            })
        }

        if (error.status === 502) {
            return res.status(502).json({
                message: "Gemini returned an invalid response. Please try again."
            })
        }

        return res.status(500).json({
            message: "Failed to generate resume PDF.",
            error: error.message
        })
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, deleteInterviewReportController, generateResumePdfController }