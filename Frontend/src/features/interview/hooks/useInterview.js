import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useCallback, useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)

        try {
            const response = await generateInterviewReport({
                jobDescription,
                selfDescription,
                resumeFile
            })

            setReport(response.interviewReport)

            return response.interviewReport

        } catch (error) {
            console.log("Generate Report Error:", error)

            const message =
                error?.response?.data?.message ||
                "Failed to generate interview report."

            alert(message)

            return null

        } finally {
            setLoading(false)
        }
    }

    const getReportById = useCallback(async (interviewId) => {
    setLoading(true)

    try {
        const response = await getInterviewReportById(interviewId)

        console.log("FULL RESPONSE:", response)
        console.log("INTERVIEW REPORT:", response?.interviewReport)

        setReport(response?.interviewReport || null)

        return response?.interviewReport || null

    } catch (error) {
        console.log("GET REPORT ERROR:", error)
        return null
    } finally {
        setLoading(false)
    }
    }, [ setLoading, setReport ])

    const getReports = useCallback(async () => {
        setLoading(true)
        try {
            const response = await getAllInterviewReports()
            const interviewReports = response?.interviewReports || []
            setReports(interviewReports)
            return interviewReports
        } catch (error) {
            console.log(error)
            setReports([])
            return []
        } finally {
            setLoading(false)
        }
    }, [ setLoading, setReports ])

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
        }
        catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId, getReportById, getReports ])

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf }

}