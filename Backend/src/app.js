require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
})

const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()
const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER)
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(process.env.FRONTEND_URL || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
]

app.disable("x-powered-by")
app.use(express.json({ limit: "2mb" }))
app.use(cookieParser())
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
            return
        }

        if (isProduction) {
            console.warn(`Blocked CORS origin: ${origin}`)
        }

        callback(new Error("Not allowed by CORS"))
    },
    credentials: true
}))

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development"
    })
})

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

app.use((error, req, res, next) => {
    console.error("Unhandled app error:", error)

    if (res.headersSent) {
        return next(error)
    }

    res.status(error.status || 500).json({
        message: error.message || "Something went wrong. Please try again later."
    })
})

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error)
})

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason)
})

module.exports = app