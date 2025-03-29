import { useNavigate } from "react-router-dom"
import { PageRoutes } from "../../organization/routes";
import { socket } from "../../socket";
import { useRef, useState } from "react";
import createLobbyCSS from "./CreateLobby.module.css";
import { RoomCreateResult } from "../../../server/socket_types";
import { BackButton } from "../../helpers/BackButton";

function CreateLobby() {
    const navigate = useNavigate();

    const inputLobbyName = useRef<HTMLInputElement|null>(null);
    const inputTurnLength = useRef<HTMLInputElement|null>(null);
    const inputRoundNumber = useRef<HTMLInputElement|null>(null);
    const [error,setError] = useState<string|null>(null);

    function createLobby() {
        socket.emit(
            "createRoom",
            inputLobbyName.current!.value,
            inputTurnLength.current!.valueAsNumber,
            inputRoundNumber.current!.valueAsNumber
            ,(response)=>{
            if (response == RoomCreateResult.Success) {
                navigate(PageRoutes.LobbySelect);
            } else {
                setError(response);
            }
        })
    }

    return (
        <div className={createLobbyCSS["lobby-creator"]}>
            <BackButton>Back</BackButton>
            <div className={createLobbyCSS["center-container"]}>
                {error && <p>{error}</p>}
                <input type="text" className={createLobbyCSS["lobby-name"]} autoComplete="off" placeholder="lobby name" ref={inputLobbyName}/>
                <input type="number" placeholder="turn length" ref={inputTurnLength}/>
                <input type="number" placeholder="Number of rounds" ref={inputRoundNumber}/>
                <button id="lobby-create" onClick={createLobby}>Create Lobby!</button>
            </div>
        </div>
    )
}

export {CreateLobby}