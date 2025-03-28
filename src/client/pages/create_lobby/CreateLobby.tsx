import { useNavigate } from "react-router-dom"
import { PageRoutes } from "../../organization/routes";
import { socket } from "../../socket";
import { useRef, useState } from "react";
import createLobbyCSS from "./CreateLobby.module.css";

function CreateLobby() {
    const navigate = useNavigate();

    const inputLobbyName = useRef<HTMLInputElement|null>(null);
    const [error,setError] = useState(false);

    function createLobby() {
        socket.emit("createRoom",inputLobbyName.current!.value,(response)=>{
            if (response) {
                navigate(PageRoutes.LobbySelect);
            } else {
                setError(true);
            }
        })
    }

    return (
        <div className={createLobbyCSS["lobby-creator"]}>
            <button className="back-button" onClick={()=>{navigate(PageRoutes.LobbySelect)}}>Back</button>
            {error && <p>Error - duplicate lobby name!</p>}
            <div className="center-container">
                <input type="text" className={createLobbyCSS["lobby-name"]} autoComplete="off" placeholder="lobby name" ref={inputLobbyName}/>
                <button id="lobby-create" onClick={createLobby}>Create Lobby!</button>
            </div>
        </div>
    )
}

export {CreateLobby}