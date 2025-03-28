import fs from 'fs';
import path from "path";
import { Server } from 'socket.io';
import { UserData } from './User.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './socket_types.js';
import { DrawAction, DrawActionName } from './DrawAction.js';

let wordArr: string[] = [];
const __dirname = import.meta.dirname;
fs.readFile(path.join(__dirname,"words.txt"), (err, data) => {
    if (err) throw err;
    wordArr = data.toString().split(/[\r\n]+/);
    //console.log(data.toString().split(/[\r\n]+/));
});


enum GameState {
    GAME_NOT_STARTED = "Game not started",
    TURN_IN_PROGRESS = "Turn in progress",
    TURN_TRANSITION = "Transitioning between turns",
    INTERRUPTED_TURN = "Player's turn was interrupted", //Likely due to them leaving the game
    ROUND_TRANSITION = "Transitioning between rounds",
    WAITING_NEXT_GAME = "Waiting for next game"
}
class Room {
    static readonly MAX_TIME_S = 20;
    static readonly MAX_ROUNDS = 3;
    static readonly MIN_PLAYERS = 2; // Need 2 players to start the game
    static readonly BETWEEN_ROUNDS_MS = 5000;
    static readonly BETWEEN_GAMES_MS = 5000;
    private currentRound = 0;
    private activeUser: string | undefined = undefined;
    private nextActiveUser: string | undefined = undefined;
    activeWord = "";
    // users = new Map<string,UserData>(); // Maps user ids to {"id":user id, "username":username, "profilePicture":{}, "score":score}
    users = new ComboMapList();
    canvasActions:DrawAction[] = [];
    time = Room.MAX_TIME_S;
    roomName;
    private roundTimer: NodeJS.Timeout|undefined;
    gameStatus = GameState.GAME_NOT_STARTED;
    io; // socketio Server object
    constructor(roomName: string, io: Server<ClientToServerEvents,ServerToClientEvents,InterServerEvents,SocketData>) {
        this.roomName = roomName;
        this.io = io;
    }

    /**
     * Adds the specified user to the users list, attempting to start the game
     * @param userData 
     */
    addUser(userData: UserData) {
        userData.score = 0; // Add score field once user has joined a game
        const userArray:UserData[] = [];
        for (const userNode of this.users.users.values()) {
            userArray.push(userNode.userData);
        }
        this.io.to(userData.id).emit("intialUserList",userArray);
        this.io.to(userData.id).emit("newActiveUser",{newUserId:this.activeUser});
        for (const drawAction of this.canvasActions) {
            this.io.to(userData.id).emit("gameDrawAction",drawAction);
        }
        this.io.to(this.roomName).emit("newUser", userData);
        //console.log(username);
        this.users.addUser(userData);
        if (this.gameStatus == GameState.GAME_NOT_STARTED) {
            this.nextState(); // Attempts to start the game
        }
    }

    /**
     * Removes the specified user from the users list, force ending the current round if the active player was the removed user
     * @param userId 
     */
    removeUser(userId: string) {
        if (userId == this.activeUser) {
            clearInterval(this.roundTimer); // Clear the timer that would normally end the turn
            if (this.users.size() == 0) {
                this.nextActiveUser = undefined;
            } else {
                this.nextActiveUser = this.getNextUser();
            }
        }
        this.users.removeUser(userId);
        this.io.to(this.roomName).emit("removeUser", userId);
        if (userId == this.activeUser) {
            this.setActiveUser(undefined);
            this.gameStatus = GameState.INTERRUPTED_TURN;
            this.nextState();
        }
    }

    getActiveUser() {
        return this.activeUser;
    }

    private setActiveUser(userId: string | undefined) {
        console.log("setting active user to " + userId);
        if (userId == undefined) {
            this.io.to(this.roomName).emit("newActiveUser", { prevUserId: this.activeUser});
        } else {
            // this.activeUser should be undefined here
            this.io.to(this.roomName).emit("newActiveUser", { prevUserId: this.activeUser, newUserId: userId });
        }
        this.activeUser = userId;
    }

    clearCanvas() {
        this.io.to(this.roomName).emit("gameDrawAction",{
            action: DrawActionName.Clear
        });
        this.canvasActions = [];
    }

    /**
     * Returns the next user in line
     * 
     * Returns undefined if the  current user is last in line
     */
    getNextUser() {
        if (this.activeUser == undefined) {
            throw "Trying to get next user but active user is undefined";
        } else {
            const nextUser = this.users.nextUser(this.activeUser);
            if (nextUser == undefined) {
                return undefined;
            } else {
                return nextUser.id;
            }
        }
    }
    /**
     * Attempts to go to the next state in the game if requirements are met
     */
    nextState() {
        console.log("Game state: " + this.gameStatus)
        switch (this.gameStatus) {
            case GameState.GAME_NOT_STARTED:
                if (this.users.size() >= Room.MIN_PLAYERS) { // Check if player requirement is met
                    this.gameStatus = GameState.TURN_IN_PROGRESS;
                    this.startGame();
                    this.nextState();
                }
                break;
            case GameState.TURN_IN_PROGRESS:
                this.initializeTurn();
                this.roundTimer = setInterval(() => {
                    this.io.to(this.roomName).emit("timeChange", this.time);
                    if (this.time <= 0) {
                        this.gameStatus = GameState.TURN_TRANSITION;
                        clearInterval(this.roundTimer);
                        this.nextState();
                    }
                    this.time--;
                }, 1000);
                break;
            case GameState.TURN_TRANSITION:
                this.clearCanvas();
                if (!this.isLastUser()) {
                    this.nextActiveUser = this.getNextUser()!;
                    this.setActiveUser(undefined);
                    this.gameStatus = GameState.TURN_IN_PROGRESS;
                    this.nextState();
                } else {
                    this.gameStatus = GameState.ROUND_TRANSITION;
                    this.nextState();
                }
                break;
            case GameState.INTERRUPTED_TURN: // removeUser automatically sets up next active user and clears current active user
                this.clearCanvas();
                if (this.nextActiveUser == undefined) {
                    this.gameStatus = GameState.ROUND_TRANSITION;
                } else {
                    this.gameStatus = GameState.TURN_IN_PROGRESS;
                }
                this.nextState();
                break;
            case GameState.ROUND_TRANSITION:
                if (this.currentRound < Room.MAX_ROUNDS) {
                    this.nextRound();
                    setTimeout(() => {
                        this.gameStatus = GameState.TURN_IN_PROGRESS;
                        this.io.to(this.roomName).emit("stopDisplayScores");
                        this.nextState();
                    }, Room.BETWEEN_ROUNDS_MS);
                } else {
                    this.endGame();
                    this.gameStatus = GameState.WAITING_NEXT_GAME;
                    setTimeout(() => {
                        this.gameStatus = GameState.GAME_NOT_STARTED;
                        this.nextState();
                    }, Room.BETWEEN_GAMES_MS);
                }
                break;
            case GameState.WAITING_NEXT_GAME:
                // Nothing happens here; it is just waiting until the timeout finishes and moves back to the GAME_NOT_STARTED state
                break;
            default:
                throw new Error("Game status " + this.gameStatus + " is not defined");
        }
    }

    /**
     * Starts the game, initializing appropriate values
     */
    private startGame() {
        this.currentRound = 1;
        this.setActiveUser(undefined);
        this.nextActiveUser = this.users.getFirstUser()!.id;
    }

    /**
     * Sets new user, resets timer, etc
     */
    private initializeTurn() {
        const getWord = (): string => {
            let val = Math.floor(Math.random() * wordArr.length);
            return wordArr[val]!; // Exclamation mark tells typescript that there is definitely a value
        }
        if (this.nextActiveUser == undefined) {
            console.log("No more users in game, ending game");
            this.gameStatus = GameState.GAME_NOT_STARTED;
        } else {
            this.setActiveUser(this.nextActiveUser);
            this.nextActiveUser = undefined;
            this.time = Room.MAX_TIME_S;
            const activeUser = this.activeUser!;
            console.log("user id " + activeUser + " is the active user");
            this.io.to(activeUser).emit("message", "You are the active user!");
            this.activeWord = getWord(); // Choose a new word for the active user
            this.io.to(activeUser).emit("message", "Your word is: " + this.activeWord);
            this.io.to(this.roomName).emit("newWord", this.activeWord.length);
        }
    }

    /**
     * Check if the current user is the last one
     */
    private isLastUser() {
        return this.users.nextUser(this.activeUser!) == undefined;
    }

    /**
     * Advances the game to the next round, changing active user back to the first user
     */
    private nextRound() {
        this.setActiveUser(undefined);
        const firstUser = this.users.getFirstUser();
        if (!firstUser) {
            this.gameStatus = GameState.INTERRUPTED_TURN;
        } else {
            this.nextActiveUser = firstUser.id;
            this.currentRound++;
            const sortedUsers = this.sortScores();
            this.io.to(this.roomName).emit("displayScores");
        }
    }

    /**
     * Performs game-end procedures
     */
    endGame() {
        console.log("Game over!");
        // Emit message to all users containing game-end data
        const userScores = this.sortScores();
        this.io.to(this.roomName).emit("gameEnd",userScores);
        // Reset round
        this.currentRound = 0;        

        // Reset scores
        for (const [_, currentUser] of this.users.users) {
            const userData = currentUser.userData;
            userData.score = 0;
            this.io.to(this.roomName).emit("scoreChange", { "userId": userData.id, "score": userData.score });
        }
    }

    wordGuessed(userId: string) {
        if (this.gameStatus = GameState.TURN_IN_PROGRESS) {
            // Player who guessed the word gets points
            // Pass active player to the next person
            console.log('time guessed: ' + this.time);
            this.addScore(userId);
            // this.nextUser();
            // this.time = Room.MAX_TIME_S
        }
    }

    /*
    Gain 500 points for guessing instantly and -5 points for every extra second it takes to guess
    Drawer gains a quarter of the number of points the guesser gained
    */
    addScore(userId: string) {
        let points = 500 - (Room.MAX_TIME_S - this.time) * 5;

        this.users.getUser(userId)!.score += points;
        this.users.getUser(this.activeUser!)!.score += Math.floor(points / 4);

        this.io.to(this.roomName).emit("scoreChange", { "userId": userId, "score": this.users.getUser(userId)!.score });
        this.io.to(this.roomName).emit("scoreChange", { "userId": this.activeUser!, "score": this.users.getUser(this.activeUser!)!.score });
    }

    sortScores() {
        // store the list of users as an array instead of a map
        const userList: UserData[] = [];
        for (const [_, currentUser] of this.users.users) {
            userList.push(currentUser.userData);
        }
        //console.log(userList);
        for (let i = 0; i < userList.length; i++) {
            let indexOfMax = i;
            for (let j = i + 1; j < userList.length; j++) {
                if (userList[j]!.score > userList[indexOfMax]!.score) {
                    indexOfMax = j;
                }
            }

            [userList[i], userList[indexOfMax]!] = [userList[indexOfMax]!, userList[i]!];
        }

        return userList;
    }
}

/**
 * Stores all the users in a data structure to enable quick lookups while also being able to advance to next user quickly
 */
class ComboMapList {
    users = new Map<string, UserNode>();
    #head: UserNode | null = null;
    #tail: UserNode | null = null;
    addUser(userData: UserData) {
        const newUser = new UserNode(userData);
        if (this.#tail == null) {
            this.#head = newUser;
        } else {
            this.#tail.next = newUser;
            newUser.previous = this.#tail;
        }
        this.users.set(userData.id, newUser);
        this.#tail = newUser;
    }

    removeUser(userId: string) {
        const userToRemove = this.users.get(userId);
        if (userToRemove == undefined) {
            console.log(`user id ${userId} does not exist in the users list`);
            return;
        }
        if (userToRemove.previous != null) {
            userToRemove.previous.next = userToRemove.next;
        }
        if (userToRemove.next != null) {
            userToRemove.next.previous = userToRemove.previous;
        }
        if (this.#head == userToRemove) {
            this.#head = userToRemove.next;
        }
        if (this.#tail == userToRemove) {
            this.#tail = userToRemove.previous;
        }
        this.users.delete(userId);
    }

    getUser(userId: string) {
        return this.users.get(userId)?.userData;
    }

    /**
     * Returns the next user in line if the specified user is not last
     * @param userId 
     * @returns 
     */
    nextUser(userId: string) {
        return this.users.get(userId)?.next?.userData;
    }

    getFirstUser() {
        return this.#head?.userData;
    }

    size() {
        return this.users.size;
    }
}

class UserNode {
    previous: UserNode | null = null;
    next: UserNode | null = null;
    userData: UserData;
    constructor(userData: UserData) {
        this.userData = userData
    }
}

export { Room };