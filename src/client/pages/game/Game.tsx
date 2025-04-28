import { act } from "react";
import { UserData } from "../../../server/User";
import { Chat } from "./Chat";
import { GameCanvas } from "./GameCanvas";
import { HeaderBar } from "./HeaderBar";
import { UsersTab } from "./UsersTab";
import { ScoreDisplay } from "./ScoreDisplay";
import gameCSS from "./Game.module.css";
type GameProps = {
    users: Map<string, UserData>,
    activeUserId: string | undefined,
    messages: string[],
    canvasRef: React.RefObject<HTMLCanvasElement|null>,
    displayScores: boolean,
    time: number | undefined,
    wordLength: number | undefined
}

function Game({ users, messages, activeUserId, canvasRef, displayScores, time, wordLength }: GameProps) {
    return (
        <div className={gameCSS["body"]}>
            {displayScores && <ScoreDisplay users={users} />}
            <HeaderBar time={time} wordLength={wordLength}/>
            <div className={gameCSS["body-content"]}>
                <UsersTab users={users} activeUserId={activeUserId} />
                <GameCanvas canvasRef={canvasRef} />
                <Chat messages={messages} />
            </div>
        </div>
    )

}

export { Game };