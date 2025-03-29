import { useNavigate } from "react-router-dom"
import { PageRoutes } from "../../organization/routes";
import { socket } from "../../socket";
import { RoomJoinResult } from "../../../server/socket_types";
import joinLobbyCSS from "./JoinLobby.module.css";
import { BackButton } from "../../helpers/BackButton";

type LobbyProps = {
    rooms: string[]
}
function JoinLobby({ rooms }: LobbyProps) {
    const navigate = useNavigate();

    function tryJoinRoom(roomName: string) {
        socket.emit("joinRoom", roomName, (response) => {
            if (response == RoomJoinResult.Success) {
                navigate(PageRoutes.Game);
            } else {
                console.log(response);
            }
        })
    }

    return (
        <div className={joinLobbyCSS["lobby"]}>
            <BackButton>Back</BackButton>
            <h1 className={joinLobbyCSS["lobby-header"]}>Current Lobbies</h1>
            <div className={joinLobbyCSS["bottom"]}>
                <div className={joinLobbyCSS["lobby-container"]}>
                    <ul id="lobby-list">
                        {rooms.map((roomName) => {
                            return <li key={roomName} onClick={() => { tryJoinRoom(roomName) }}>{roomName}</li>
                        })}
                    </ul>
                </div>
            </div>
        </ div>
    )
}

export { JoinLobby }