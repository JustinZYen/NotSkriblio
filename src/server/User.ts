import { DrawAction } from "./DrawAction.js";

type UserData = {
    id: string,
    username: string,
    profilePicture: {
        width: number,
        height: number,
        drawActions: DrawAction[]
    }
    score: number
};



export type { UserData};
