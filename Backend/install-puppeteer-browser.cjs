const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const cacheDirectory = path.resolve(__dirname, ".puppeteer-cache")
const puppeteerEntryPoint = require.resolve("puppeteer")
const cliPath = path.resolve(path.dirname(puppeteerEntryPoint), "node", "cli.js")
const installEnvironment = {
    ...process.env,
    PUPPETEER_CACHE_DIR: cacheDirectory
}

delete installEnvironment.PUPPETEER_EXECUTABLE_PATH

const installResult = spawnSync(
    process.execPath,
    [ cliPath, "browsers", "install", "chrome" ],
    {
        cwd: __dirname,
        env: installEnvironment,
        stdio: "inherit"
    }
)

if (installResult.error) {
    throw installResult.error
}

if (installResult.status !== 0) {
    process.exit(installResult.status || 1)
}

process.env.PUPPETEER_CACHE_DIR = cacheDirectory
delete process.env.PUPPETEER_EXECUTABLE_PATH

async function verifyInstalledBrowser() {
    const puppeteer = require("puppeteer")
    const executablePath = await puppeteer.executablePath()
    const relativePath = path.relative(cacheDirectory, executablePath)

    if (!fs.existsSync(executablePath) || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error(`Chrome was not installed in the application cache: ${executablePath}`)
    }

    console.log(`Verified Puppeteer Chrome executable: ${executablePath}`)
}

verifyInstalledBrowser().catch(error => {
    console.error("Puppeteer browser installation verification failed:", error)
    process.exitCode = 1
})
