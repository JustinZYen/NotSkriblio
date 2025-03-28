import { act, useEffect, useRef } from "react";
import { DrawAction, DrawActionName } from "../../../server/DrawAction";
import { UserData } from "../../../server/User";
import usersTabCSS from "./UsersTab.module.css";

type UsersTabProps = {
    users: Map<string,UserData>,
    activeUserId: string | undefined
}

function UsersTab({ users, activeUserId }: UsersTabProps) {
    const profileCanvasMap = useRef(new Map<string, HTMLCanvasElement>());
    useEffect(() => {
        console.log(users);
        console.log("drawing")
        for (const userData of users.values()) {
            const canvas = profileCanvasMap.current.get(userData.id);
            if (!canvas) {
                console.log("canvas missing");
                continue;
            }
            const ctx = canvas.getContext("2d")!;
            const actions = userData.profilePicture.drawActions;
            ctx.strokeStyle = "black";
            for (const action of actions) {
                if (action.action == DrawActionName.Draw) {
                    ctx.beginPath();
                    ctx.moveTo(action.startX, action.startY);
                    ctx.lineTo(action.endX, action.endY);
                    ctx.stroke();
                }

            }
        }
    }, [users]);
    return (
        <div className={usersTabCSS["users"]}>
            {[...users.values()].map((userData) =>
                <li key={userData.id} className={usersTabCSS["user"]} style={{
                    backgroundColor: userData.id == activeUserId ? "yellow" : "white"
                }}>
                    <p >{userData.username}</p>
                    <p>score: {userData.score}</p>
                    <canvas style={{ border: "1px solid black" }} ref={
                        (node) => {
                            if (node == null) { // Cleanup function was giving me errors
                                profileCanvasMap.current.delete(userData.id);
                                return;
                            }
                            profileCanvasMap.current.set(userData.id, node);
                        }
                    }></canvas>
                </li>
            )}
        </div>
    )
}

export { UsersTab }