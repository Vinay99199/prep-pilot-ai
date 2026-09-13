const pdfParse = require("pdf-parse")
const mongoose = require("mongoose")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

const userModel = require("../models/user.model")


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

       

        let resumeText = ""

        if (req.file) {
            const resumeContent = await (
                new pdfParse.PDFParse(
                    Uint8Array.from(req.file.buffer)
                )
            ).getText()

            resumeText = resumeContent.text
        }

        const { selfDescription, jobDescription } = req.body

        const interViewReportByAi = await generateInterviewReport({
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
            title: interViewReportByAi.title || "Interview Report"
        })

        user.reportCount += 1
        await user.save()

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })

    } catch (error) {

        console.error("Generate Interview Report Error:", error)

        if (error.status === 429) {
            return res.status(429).json({
                message: "Gemini API quota exceeded. Please try again later."
            })
        }

        if (error.status === 503) {
            return res.status(503).json({
                message: "Gemini AI service is temporarily unavailable. Please try again."
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
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    if (!mongoose.isValidObjectId(interviewReportId)) {
        return res.status(400).json({
            message: "Invalid interview report ID."
        })
    }

    const interviewReport = await interviewReportModel.findOne({
        _id: interviewReportId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }