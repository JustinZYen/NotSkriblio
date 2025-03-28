import { DrawAction } from "./DrawAction.js";
import { UserData } from "./User.js";

interface ServerToClientEvents {
    newRoom: (roomName: string) => void;
    timeChange: (newTime: number) => void;
    newUser: (userData: UserData) => void;
    removeUser: (userId: string) => void;
    intialUserList: (users: UserData[]) => void // Necessary to ensure order is preserved
    newActiveUser: (changeData: { prevUserId?: string, newUserId?: string }) => void;
    message: (message: string) => void;
    newWord: (newWordLength: number) => void; // Only sends a user as client should not need to know the real word
    scoreChange: (changeData: { userId: string, score: number }) => void;
    gameEnd: (usersData: UserData[]) => void;
    gameDrawAction: (action: DrawAction) => void;
    displayScores: () => void;
    stopDisplayScores: () =>void;
}

interface ClientToServerEvents {
    /**
     * 
     * @param roomName 
     * @param callback Takes in argument for whether room creation was successful
     * @returns 
     */
    createRoom: (roomName: string, turnLength:number, roundCount:number, callback: (response: RoomCreateResult) => void) => void;

    /**
     * Set the username for the current player
     * @param username 
     * @returns 
     */
    setUsername: (username: string) => void;

    /**
     * Set the profile picture for the current player
     * @param drawActions 
     * @returns 
     */
    setProfilePicture: (profileInfo: {
        width: number,
        height: number,
        drawActions: DrawAction[]
    }) => void;


    /**
     * Try to join a room
     */
    joinRoom: (roomName: string, callback: (response: RoomJoinResult) => void) => void;

    message: (message: string) => void;
    gameDrawAction: (action: DrawAction) => void;
}

enum RoomJoinResult {
    AlreadyJoined = "room already joined",
    DoesNotExist = "room does not exist",
    Success = "success"
}

enum RoomCreateResult {
    DuplicateName = "a room with that name already exists",
    InvalidTurnLength = "invalid turn length",
    InvalidRoundCount = "invalid round count",
    Success = "success"
}

interface InterServerEvents {
}

interface SocketData {
}

export type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData };
export { RoomJoinResult,RoomCreateResult };