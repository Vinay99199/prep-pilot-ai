import { useCallback, useEffect, useRef, useState } from "react"
import { NotificationContext } from "./notification.context"
import "./notification.scss"

const TOAST_DURATION = 4200

const TOAST_ICONS = {
    success: <path d="m5 12 4 4L19 6" />,
    error: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
    warning: <><path d="M10.3 4.2 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>
}

const ToastIcon = ({ type }) => (
    <svg className="toast__icon" viewBox="0 0 24 24" aria-hidden="true">
        {TOAST_ICONS[type] || TOAST_ICONS.info}
    </svg>
)

const Toast = ({ toast, onDismiss }) => {
    const [ closing, setClosing ] = useState(false)
    const closingRef = useRef(false)
    const dismissTimeoutRef = useRef()

    const close = useCallback(() => {
        if (closingRef.current) return
        closingRef.current = true
        setClosing(true)
        dismissTimeoutRef.current = window.setTimeout(() => onDismiss(toast.id), 220)
    }, [ onDismiss, toast.id ])

    useEffect(() => {
        const timeout = window.setTimeout(close, toast.duration || TOAST_DURATION)
        return () => {
            window.clearTimeout(timeout)
            window.clearTimeout(dismissTimeoutRef.current)
        }
    }, [ close, toast.duration ])

    return (
        <div className={`toast toast--${toast.type} ${closing ? "toast--closing" : ""}`} role={toast.type === "error" ? "alert" : "status"}>
            <ToastIcon type={toast.type} />
            <p className="toast__message">{toast.message}</p>
            <button className="toast__close" type="button" onClick={close} aria-label="Dismiss notification">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
        </div>
    )
}

const ConfirmationDialog = ({ confirmation, onCancel, onConfirm }) => {
    const cancelRef = useRef(null)
    const confirmRef = useRef(null)

    useEffect(() => {
        cancelRef.current?.focus()
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !confirmation.loading) {
                onCancel()
            }
            if (event.key === "Tab") {
                const focusable = [ cancelRef.current, confirmRef.current ].filter(Boolean)
                const currentIndex = focusable.indexOf(document.activeElement)
                const nextIndex = event.shiftKey
                    ? (currentIndex - 1 + focusable.length) % focusable.length
                    : (currentIndex + 1) % focusable.length
                event.preventDefault()
                focusable[nextIndex]?.focus()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [ confirmation.loading, onCancel ])

    return (
        <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !confirmation.loading && onCancel()}>
            <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message">
                <div className="confirmation-dialog__icon" aria-hidden="true">!</div>
                <h2 id="confirmation-title">{confirmation.title}</h2>
                <p id="confirmation-message">{confirmation.message}</p>
                <div className="confirmation-dialog__actions">
                    <button ref={cancelRef} className="button secondary-button" type="button" onClick={onCancel} disabled={confirmation.loading}>
                        {confirmation.cancelLabel || "Cancel"}
                    </button>
                    <button ref={confirmRef} className="button danger-button" type="button" onClick={onConfirm} disabled={confirmation.loading}>
                        {confirmation.loading ? "Working..." : (confirmation.confirmLabel || "Confirm")}
                    </button>
                </div>
            </section>
        </div>
    )
}

export const NotificationProvider = ({ children }) => {
    const [ toasts, setToasts ] = useState([])
    const [ confirmation, setConfirmation ] = useState(null)
    const confirmationResolver = useRef(null)

    const showToast = useCallback(({ type = "info", message, duration = TOAST_DURATION }) => {
        if (!message) return
        const id = `${Date.now()}-${Math.random()}`
        setToasts(current => [ ...current, { id, type, message, duration } ].slice(-4))
    }, [])

    const dismissToast = useCallback((id) => {
        setToasts(current => current.filter(toast => toast.id !== id))
    }, [])

    const requestConfirmation = useCallback((options) => new Promise(resolve => {
        confirmationResolver.current = resolve
        setConfirmation({
            title: options.title || "Are you sure?",
            message: options.message || "This action cannot be undone.",
            confirmLabel: options.confirmLabel || "Confirm",
            cancelLabel: options.cancelLabel || "Cancel",
            onConfirm: options.onConfirm,
            errorMessage: options.errorMessage || "The action could not be completed.",
            loading: false
        })
    }), [])

    const cancelConfirmation = useCallback(() => {
        confirmationResolver.current?.(false)
        confirmationResolver.current = null
        setConfirmation(null)
    }, [])

    const confirmConfirmation = useCallback(async () => {
        if (!confirmationResolver.current || confirmation?.loading) return
        setConfirmation(current => ({ ...current, loading: true }))
        try {
            await confirmation?.onConfirm?.()
            confirmationResolver.current(true)
            confirmationResolver.current = null
            setConfirmation(null)
        } catch (error) {
            console.error("Confirmation action failed:", error)
            showToast({ type: "error", message: confirmation?.errorMessage })
            confirmationResolver.current(false)
            confirmationResolver.current = null
            setConfirmation(null)
        }
    }, [ confirmation, showToast ])

    return (
        <NotificationContext.Provider value={{ showToast, requestConfirmation }}>
            {children}
            <div className="toast-viewport" aria-live="polite" aria-atomic="false">
                {toasts.map(toast => <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />)}
            </div>
            {confirmation && <ConfirmationDialog confirmation={confirmation} onCancel={cancelConfirmation} onConfirm={confirmConfirmation} />}
        </NotificationContext.Provider>
    )
}