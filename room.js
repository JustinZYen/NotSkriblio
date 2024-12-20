import fs from 'fs';
let wordArr = [];
fs.readFile('static/words.txt', (err, data) => {
    if (err)
        throw err;
    wordArr = data.toString().split(/[\r\n]+/);
    //console.log(data.toString().split(/[\r\n]+/));
});
var GameState;
(function (GameState) {
    GameState["GAME_NOT_STARTED"] = "Game not started";
    GameState["TURN_IN_PROGRESS"] = "Turn in progress";
    GameState["TURN_TRANSITION"] = "Transitioning between turns";
    GameState["INTERRUPTED_TURN"] = "Player's turn was interrupted";
    GameState["ROUND_TRANSITION"] = "Transitioning between rounds";
    GameState["WAITING_NEXT_GAME"] = "Waiting for next game";
})(GameState || (GameState = {}));
class Room {
    static MAX_TIME_S = 10;
    static MAX_ROUNDS = 3;
    static MIN_PLAYERS = 2; // Need 2 players to start the game
    static BETWEEN_ROUNDS_MS = 5000;
    static BETWEEN_GAMES_MS = 5000;
    currentRound = 0;
    activeUser = undefined;
    nextActiveUser = undefined;
    activeWord = "";
    // users = new Map<string,UserData>(); // Maps user ids to {"id":user id, "username":username, "profilePicture":{}, "score":score}
    users = new ComboMapList();
    canvasEvents = [];
    time = Room.MAX_TIME_S;
    roomName;
    roundTimer;
    gameStatus = GameState.GAME_NOT_STARTED;
    io; // socketio Server object
    constructor(roomName, io) {
        this.roomName = roomName;
        this.io = io;
    }
    /**
     * Adds the specified user to the users list, attempting to start the game
     * @param userData
     */
    addUser(userData) {
        userData.score = 0; // Add score field once user has joined a game
        console.log("user data being emitted is: " + Object.keys(userData.profilePicture));
        this.io.to(this.roomName).emit("new user", userData);
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
    removeUser(userId) {
        if (userId == this.activeUser) {
            clearInterval(this.roundTimer); // Clear the timer that would normally end the turn
            if (this.users.size() == 0) {
                this.nextActiveUser = undefined;
            }
            else {
                this.nextActiveUser = this.getNextUser();
            }
        }
        this.users.removeUser(userId);
        this.io.to(this.roomName).emit("remove user", userId);
        if (userId == this.activeUser) {
            this.setActiveUser(undefined);
            this.gameStatus = GameState.INTERRUPTED_TURN;
            this.nextState();
        }
    }
    getActiveUser() {
        return this.activeUser;
    }
    setActiveUser(userId) {
        console.log("setting active user to " + userId);
        if (userId == undefined) {
            this.io.to(this.roomName).emit("new active user", { prevUserId: this.activeUser, newUserId: undefined });
        }
        else {
            // this.activeUser should be undefined here
            this.io.to(this.roomName).emit("new active user", { prevUserId: this.activeUser, newUserId: userId });
        }
        this.activeUser = userId;
    }
    clearCanvas() {
        this.io.to(this.roomName).emit("clear canvas");
        this.canvasEvents = [{ "action": "clear canvas" }];
    }
    /**
     * Returns the next user in line
     *
     * Returns undefined if the  current user is last in line
     */
    getNextUser() {
        if (this.activeUser == undefined) {
            throw "Trying to get next user but active user is undefined";
        }
        else {
            const nextUser = this.users.nextUser(this.activeUser);
            if (nextUser == undefined) {
                return undefined;
            }
            else {
                return nextUser.id;
            }
        }
    }
    /**
     * Attempts to go to the next state in the game if requirements are met
     */
    nextState() {
        console.log("Game state: " + this.gameStatus);
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
                    this.io.to(this.roomName).emit("timer change", this.time);
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
                    this.nextActiveUser = this.getNextUser();
                    this.setActiveUser(undefined);
                    this.gameStatus = GameState.TURN_IN_PROGRESS;
                    this.nextState();
                }
                else {
                    this.gameStatus = GameState.ROUND_TRANSITION;
                    this.nextState();
                }
                break;
            case GameState.INTERRUPTED_TURN: // removeUser automatically sets up next active user and clears current active user
                this.clearCanvas();
                if (this.nextActiveUser == undefined) {
                    this.gameStatus = GameState.ROUND_TRANSITION;
                }
                else {
                    this.gameStatus = GameState.TURN_IN_PROGRESS;
                }
                this.nextState();
                break;
            case GameState.ROUND_TRANSITION:
                if (this.currentRound < Room.MAX_ROUNDS) {
                    this.nextRound();
                    setTimeout(() => {
                        this.gameStatus = GameState.TURN_IN_PROGRESS;
                        this.nextState();
                    }, Room.BETWEEN_ROUNDS_MS);
                }
                else {
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
    startGame() {
        this.currentRound = 1;
        this.setActiveUser(undefined);
        this.nextActiveUser = this.users.getFirstUser().id;
    }
    /**
     * Sets new user, resets timer, etc
     */
    initializeTurn() {
        const getWord = () => {
            let val = Math.floor(Math.random() * wordArr.length);
            return wordArr[val]; // Exclamation mark tells typescript that there is definitely a value
        };
        if (this.nextActiveUser == undefined) {
            console.log("No more users in game, ending game");
            this.gameStatus = GameState.GAME_NOT_STARTED;
        }
        else {
            this.setActiveUser(this.nextActiveUser);
            this.nextActiveUser = undefined;
            this.time = Room.MAX_TIME_S;
            const activeUser = this.activeUser;
            console.log("user id " + activeUser + " is the active user");
            this.io.to(activeUser).emit("chat message", "You are the active user!");
            this.io.to(activeUser).emit("drawing information request"); // Get line width and line color
            this.activeWord = getWord(); // Choose a new word for the active user
            this.io.to(activeUser).emit("chat message", "Your word is: " + this.activeWord);
            this.io.to(this.roomName).emit("new word", this.activeWord.length);
        }
    }
    /**
     * Check if the current user is the last one
     */
    isLastUser() {
        return this.users.nextUser(this.activeUser) == undefined;
    }
    /**
     * Advances the game to the next round, changing active user back to the first user
     */
    nextRound() {
        this.setActiveUser(undefined);
        this.nextActiveUser = this.users.getFirstUser().id;
        this.currentRound++;
        const sortedUsers = this.sortScores();
        for (const user of sortedUsers) {
            this.io.to(this.roomName).emit("display scores", { userData: user, BETWEEN_ROUNDS_MS: Room.BETWEEN_ROUNDS_MS });
        }
        ;
    }
    /**
     * Performs game-end procedures
     */
    endGame() {
        console.log("Game over!");
        // Emit message to all users containing game-end data
        // Reset round
        this.currentRound = 0;
        // Ensure that the next player to become active user is the first user
        // Reset scores
        for (const [_, currentUser] of this.users.users) {
            const userData = currentUser.userData;
            userData.score = 0;
            this.io.to(this.roomName).emit("score change", { "userId": userData.id, "score": userData.score });
        }
    }
    wordGuessed(userId) {
        if (this.gameStatus = GameState.TURN_IN_PROGRESS) {
            // Player who guessed the word gets points
            // Pass active player to the next person
            console.log('time guessed: ' + this.time);
            this.addScore(userId);
            // this.nextUser();
            // this.time = Room.MAX_TIME_S
            ;
        }
    }
    /*
    Gain 500 points for guessing instantly and -5 points for every extra second it takes to guess
    Drawer gains a quarter of the number of points the guesser gained
    */
    addScore(userId) {
        let points = 500 - (Room.MAX_TIME_S - this.time) * 5;
        this.users.getUser(userId).score += points;
        this.users.getUser(this.activeUser).score += Math.floor(points / 4);
        this.io.to(this.roomName).emit("score change", { "userId": userId, "score": this.users.getUser(userId).score });
        this.io.to(this.roomName).emit("score change", { "userId": this.activeUser, "score": this.users.getUser(this.activeUser).score });
    }
    sortScores() {
        // store the list of users as an array instead of a map
        const userList = [];
        for (const [_, currentUser] of this.users.users) {
            userList.push(currentUser.userData);
        }
        //console.log(userList);
        for (let i = 0; i < userList.length; i++) {
            let indexOfMax = i;
            for (let j = i + 1; j < userList.length; j++) {
                if (userList[j].score > userList[indexOfMax].score) {
                    indexOfMax = j;
                }
            }
            [userList[i], userList[indexOfMax]] = [userList[indexOfMax], userList[i]];
        }
        return userList;
    }
}
/**
 * Stores all the users in a data structure to enable quick lookups while also being able to advance to next user quickly
 */
class ComboMapList {
    users = new Map();
    #head = null;
    #tail = null;
    addUser(userData) {
        const newUser = new UserNode(userData);
        if (this.#tail == null) {
            this.#head = newUser;
        }
        else {
            this.#tail.next = newUser;
            newUser.previous = this.#tail;
        }
        this.users.set(userData.id, newUser);
        this.#tail = newUser;
    }
    removeUser(userId) {
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
    getUser(userId) {
        return this.users.get(userId)?.userData;
    }
    /**
     * Returns the next user in line if the specified user is not last
     * @param userId
     * @returns
     */
    nextUser(userId) {
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
    previous = null;
    next = null;
    userData;
    constructor(userData) {
        this.userData = userData;
    }
}
export { Room };
