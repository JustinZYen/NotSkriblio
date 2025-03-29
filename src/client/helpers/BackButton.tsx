import { Navigate, useNavigate } from "react-router-dom";

type BackButtonProps = {
    children: React.ReactNode
}

/**
 * Implements functionality equivalent to clicking the back arrow at the top of the browser
 */
function BackButton({children}:BackButtonProps) {
    const navigate = useNavigate();
    return <button onClick={() => { navigate(-1) }}>{children}</button>;
}

export { BackButton }