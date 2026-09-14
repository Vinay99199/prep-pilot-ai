export const getUserFacingError = (error, fallback = "Something went wrong. Please try again.") => {
    if (!error?.response) {
        return "We could not reach the server. Check your connection and try again."
    }

    switch (error.response.status) {
        case 400:
            return "Please check the information you entered and try again."
        case 401:
            return "Your email or password is incorrect."
        case 403:
            return "You do not have permission to complete this action."
        case 404:
            return "The requested item could not be found."
        case 413:
            return "That file is too large. Please choose a smaller file."
        case 429:
            return "You have reached today's limit. Please try again tomorrow."
        case 500:
        case 502:
        case 503:
            return "The service is temporarily unavailable. Please try again shortly."
        default:
            return fallback
    }
}