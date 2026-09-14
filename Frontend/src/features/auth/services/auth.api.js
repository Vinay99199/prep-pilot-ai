import axios from "axios"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
})

export async function register({ username, email, password }) {
    const response = await api.post('/api/auth/register', {
        username, email, password
    })

    return response.data

}

export async function login({ email, password }) {
    const response = await api.post("/api/auth/login", {
        email, password
    })

    return response.data

}

export async function logout() {
    try {

        const response = await api.get("/api/auth/logout")

        return response.data

    } catch (err) {
        if (err.response?.status !== 401) {
            console.error(err)
        }
        throw err
    }
}

export async function getMe() {
    try {

        const response = await api.get("/api/auth/get-me")

        return response.data

    } catch (err) {
        console.error(err)
        throw err
    }
}

export async function updateProfile({ username, email, currentPassword, newPassword }) {
    const response = await api.patch("/api/auth/profile", {
        username,
        email,
        currentPassword,
        newPassword
    })

    return response.data
}