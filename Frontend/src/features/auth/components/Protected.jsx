import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";

const Protected = ({children}) => {
    const { loading,user } = useAuth()


    if(loading){
        return (
            <main className="app-loading" role="status" aria-live="polite">
                <span className="app-loading__spinner" aria-hidden="true" />
                <p>Checking your account...</p>
            </main>
            )
    }

    if(!user){
        return <Navigate to={'/login'} />
    }
    
    return children
}

export default Protected