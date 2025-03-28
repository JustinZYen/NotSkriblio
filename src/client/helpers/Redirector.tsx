import { Navigate } from "react-router-dom";
import { PageRoutes } from "../organization/routes";

type RedirectorProps = {
    valid: boolean,
    children: React.ReactNode
}

/**
 * A component to help out with preventing users from accidentally viewing pages before they have gone through the proper procedures
 * @param param0 
 * @returns 
 */
function Redirector({ valid, children }:RedirectorProps) {
    if (valid) {
        return children;
    } else {
        return <Navigate to={PageRoutes.Home} />
    }
}

export { Redirector }