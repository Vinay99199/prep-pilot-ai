import { useContext } from "react";
import { AuthContext } from "../auth.context.js";
import { login, register, logout, updateProfile } from "../services/auth.api";
import { useNotifications } from "../../notifications/useNotifications"
import { getUserFacingError } from "../../notifications/notification.utils"



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context
    const { showToast } = useNotifications()


    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const data = await login({ email, password })
            setUser(data.user)
            return true
        } catch (error) {
            setUser(null)
            console.error("Login failed:", error)
            showToast({ type: "error", message: getUserFacingError(error, "Login failed. Please try again.") })
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
            return true
        } catch (error) {
            setUser(null)
            console.error("Registration failed:", error)
            showToast({ type: "error", message: getUserFacingError(error, "Registration failed. Please try again.") })
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try {
            await logout()
            setUser(null)
            showToast({ type: "success", message: "You have been logged out." })
            return true
        } catch (error) {
            console.error("Logout failed:", error)
            showToast({ type: "error", message: getUserFacingError(error, "Logout failed. Please try again.") })
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleProfileUpdate = async (profile) => {
        setLoading(true)
        try {
            const data = await updateProfile(profile)
            setUser(data.user)
            showToast({ type: "success", message: "Your account details are updated." })
            return true
        } catch (error) {
            showToast({ type: "error", message: getUserFacingError(error, "Profile update failed. Please try again.") })
            return false
        } finally {
            setLoading(false)
        }
    }

    return { user, loading, handleRegister, handleLogin, handleLogout, handleProfileUpdate }
}