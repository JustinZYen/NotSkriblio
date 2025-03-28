import { UserData } from "../../../server/User"
import scoreDisplayCSS from "./ScoreDisplay.module.css";
type ScoreDisplayProps = {
    users: Map<string, UserData>,
}

function ScoreDisplay({ users }: ScoreDisplayProps) {
    const usersArr = [...users.values()];
    usersArr.sort((a,b)=>a.score-b.score);

    return (
        < div className={scoreDisplayCSS["round-placeholder"]} style={{
            position: "absolute",
            backgroundColor:"blue",
            zIndex: 1,
            width:"100%",
            height:"100%"
        }}>
            {usersArr.map((userData)=>
                <div key={userData.id}>
                    <p>User: {userData.username}</p>
                    <p>Score: {userData.score}</p>
                </div>
            )}
        </div>
    );
}

export { ScoreDisplay }