import { useNavigate } from "react-router-dom";
import { PageRoutes } from "../../organization/routes";
import lobbySelectCSS from "./LobbySelect.module.css";
import { BackButton } from "../../helpers/BackButton";

function LobbySelect() {
    const navigate = useNavigate();
    return (
        <div className={lobbySelectCSS["create-or-join"]}>
            <BackButton>Back</BackButton>
            <div className={lobbySelectCSS["center-container"]}>
                <button className="create-lobby" onClick={() => { navigate(PageRoutes.CreateLobby) }}>Create a New Lobby</button>
                <button className="join-lobby" onClick={() => { navigate(PageRoutes.JoinLobby) }}>Join Lobby</button>
            </div>
        </div>
    )
}

export { LobbySelect };