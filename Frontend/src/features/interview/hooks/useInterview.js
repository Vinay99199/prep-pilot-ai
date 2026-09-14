import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf, deleteInterviewReport } from "../services/interview.api"
import { useCallback, useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"
import { useNotifications } from "../../notifications/useNotifications"
import { getUserFacingError } from "../../notifications/notification.utils"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context
    const { showToast } = useNotifications()

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)

        try {
            const response = await generateInterviewReport({
                jobDescription,
                selfDescription,
                resumeFile
            })

            setReport(response.interviewReport)
            showToast({ type: "success", message: "Your interview plan is ready." })

            return response.interviewReport

        } catch (error) {
            console.error("Generate report failed:", error)

            showToast({ type: "error", message: getUserFacingError(error, "We could not generate your interview plan.") })

            return null

        } finally {
            setLoading(false)
        }
    }

    const getReportById = useCallback(async (interviewId) => {
    setLoading(true)

    try {
        const response = await getInterviewReportById(interviewId)

        setReport(response?.interviewReport || null)

        return response?.interviewReport || null

    } catch (error) {
        console.error("Get report failed:", error)
        showToast({ type: "error", message: getUserFacingError(error, "We could not load that interview plan.") })
        return null
    } finally {
        setLoading(false)
    }
    }, [ setLoading, setReport, showToast ])

    const getReports = useCallback(async () => {
        setLoading(true)
        try {
            const response = await getAllInterviewReports()
            const interviewReports = response?.interviewReports || []
            setReports(interviewReports)
            return interviewReports
        } catch (error) {
            console.error("Get interview reports failed:", error)
            showToast({ type: "error", message: getUserFacingError(error, "We could not load your recent plans.") })
            setReports([])
            return []
        } finally {
            setLoading(false)
        }
    }, [ setLoading, setReports, showToast ])

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            showToast({ type: "success", message: "Your resume PDF has been downloaded." })
        }
        catch (error) {
            console.error("Resume PDF generation failed:", error)
            showToast({ type: "error", message: getUserFacingError(error, "We could not generate the resume PDF.") })
        } finally {
            setLoading(false)
        }
    }

    const deleteReport = async (interviewReportId) => {
        try {
            await deleteInterviewReport(interviewReportId)
            setReports(currentReports => currentReports.filter(item => item._id !== interviewReportId))
            showToast({ type: "success", message: "Interview plan deleted." })
            return true
        } catch (error) {
            console.error("Delete interview report failed:", error)
            showToast({ type: "error", message: getUserFacingError(error, "We could not delete that interview plan.") })
            throw error
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId, getReportById, getReports ])

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf, deleteReport }

}