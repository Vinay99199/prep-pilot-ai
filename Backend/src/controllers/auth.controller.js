const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {

    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Please provide username, email and password"
        })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [ { username }, { email } ]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account already exists with this email address or username"
        })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
        username,
        email,
        password: hash
    })

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })


    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}


/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {

    const { email, password } = req.body

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    res.status(200).json({
        message: "User loggedIn successfully.",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}


/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token

    if (token) {
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })

    res.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {

    if (!req.user) {
        return res.status(200).json({
            message: "No authenticated user",
            user: null
        })
    }

    const user = await userModel.findById(req.user.id)



    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}



async function updateProfileController(req, res) {
    const { username, email, currentPassword, newPassword } = req.body
    const user = await userModel.findById(req.user.id)

    if (!user) return res.status(404).json({ message: "User account not found" })

    const nextUsername = username?.trim()
    const nextEmail = email?.trim().toLowerCase()

    if (!nextUsername || !nextEmail) {
        return res.status(400).json({ message: "Username and email are required" })
    }

    if (newPassword && (!currentPassword || newPassword.length < 6)) {
        return res.status(400).json({ message: "Enter your current password and a new password of at least 6 characters" })
    }

    if (newPassword) {
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
        if (!isCurrentPasswordValid) return res.status(400).json({ message: "Your current password is incorrect" })
        user.password = await bcrypt.hash(newPassword, 10)
    }

    const duplicateUser = await userModel.findOne({
        _id: { $ne: user._id },
        $or: [ { username: nextUsername }, { email: nextEmail } ]
    })

    if (duplicateUser) return res.status(400).json({ message: "That username or email is already in use" })

    user.username = nextUsername
    user.email = nextEmail
    await user.save()

    res.status(200).json({
        message: "Profile updated successfully",
        user: { id: user._id, username: user.username, email: user.email }
    })
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController,
    updateProfileController
}