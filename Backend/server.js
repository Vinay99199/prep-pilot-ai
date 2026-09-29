require("dotenv").config()
const app = require("./src/app")
const connectToDB = require("./src/config/database")

connectToDB()

const PORT = Number(process.env.PORT) || 3000
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

server.on("error", (error) => {
    console.error("Server startup error:", error)
    process.exit(1)
})

process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down gracefully")
    server.close(() => process.exit(0))
})

process.on("SIGINT", () => {
    console.log("Received SIGINT, shutting down gracefully")
    server.close(() => process.exit(0))
})