import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import ProcessingLoader from "../../../components/ProcessingLoader"

const Protected = ({children}) => {
    const { loading,user } = useAuth()


    if(loading){
        return <ProcessingLoader variant="initial" />
    }

    if(!user){
        return <Navigate to={'/login'} />
    }
    
    return children
}

export default Protected