const multer = require("multer")


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    },
    fileFilter: (req, file, callback) => {
        if (file.mimetype === "application/pdf") {
            return callback(null, true)
        }

        callback(new Error("Only PDF resumes are supported."))
    }
})


module.exports = upload