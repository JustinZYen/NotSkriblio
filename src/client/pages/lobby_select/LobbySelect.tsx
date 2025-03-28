import { useNavigate } from "react-router-dom";
import { PageRoutes } from "../../organization/routes";
import lobbySelectCSS from "./LobbySelect.module.css";

function LobbySelect() {
    const navigate = useNavigate();
    return (
        <div className={lobbySelectCSS["create-or-join"]}>
            <button className="back-button" onClick={() => { navigate(PageRoutes.Home) }}>Back</button>
            <div className={lobbySelectCSS["center-container"]}>
                <button className="create-lobby" onClick={() => { navigate(PageRoutes.CreateLobby) }}>Create a New Lobby</button>
                <button className="join-lobby" onClick={() => { navigate(PageRoutes.JoinLobby) }}>Join Lobby</button>
            </div>
        </div>
    )
}

export { LobbySelect };