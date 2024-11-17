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
    GameState[GameState["GAME_NOT_STARTED"] = 0] = "GAME_NOT_STARTED";
    GameState[GameState["GAME_IN_PROGRESS"] = 1] = "GAME_IN_PROGRESS";
    GameState[GameState["WAITING_NEXT_GAME"] = 2] = "WAITING_NEXT_GAME";
})(GameState || (GameState = {}));
class Room {
    static MAX_TIME_S = 10;
    static MAX_ROUNDS = 3;
    static MIN_PLAYERS = 1; // Need 3 players to start the game
    static BETWEEN_ROUNDS_MS = 5000;
    #currentRound = 0;
    #activeUser = null;
    activeWord = "";
    // users = new Map<string,UserData>(); // Maps user ids to {"id":user id, "username":username, "profilePicture":{}, "score":score}
    users = new ComboMapList();
    canvasEvents = [];
    timer;
    time = Room.MAX_TIME_S;
    roomName;
    gameStatus = GameState.GAME_NOT_STARTED;
    io; // socketio Server object
    constructor(roomName, io) {
        this.roomName = roomName;
        this.io = io;
        /*
        setInterval(()=>{
          if (this.time == 0) {
            this.time = Room.MAX_TIME_S
    ;
            this.nextUser();
          }
          this.io.to(this.roomName).emit("timer change",this.time);
          this.time--;
        },1000)
        */
    }
    addUser(userId, userData) {
        userData.score = 0; // Add score field once user has joined a game
        console.log("user data being emitted is: " + Object.keys(userData.profilePicture));
        this.io.to(this.roomName).emit("new user", userData);
        //console.log(username);
        this.users.addUser(userData);
        if (this.#activeUser == null) {
            this.setActiveUser(userId);
        }
        if ((this.gameStatus == GameState.GAME_NOT_STARTED) && this.users.size() >= Room.MIN_PLAYERS) {
            this.startGame();
        }
        // Check if there are now enough users to start the game
    }
    removeUser(userId) {
        this.users.removeUser(userId);
        this.io.to(this.roomName).emit("remove user", userId);
        if (userId == this.#activeUser) {
            // Choose a new user
            if (this.users.size() == 0) {
                this.#activeUser = null;
            }
            else {
                this.#activeUser = this.users.getFirstUser().id;
            }
        }
    }
    getActiveUser() {
        return this.#activeUser;
    }
    setActiveUser(userId) {
        const getWord = () => {
            let val = Math.floor(Math.random() * wordArr.length);
            return wordArr[val]; // Exclamation mark tells typescript that there is definitely a value
        };
        const previousUser = this.#activeUser;
        this.#activeUser = userId;
        console.log("user id " + userId + " is the active user");
        this.io.to(userId).emit("chat message", "You are the active user!");
        this.io.to(userId).emit("drawing information request"); // Get line width and line color
        this.activeWord = getWord(); // Choose a new word for the active user
        this.io.to(userId).emit("chat message", "Your word is: " + this.activeWord);
        this.io.to(this.roomName).emit("new active user", { prevUser: previousUser, newUser: this.#activeUser });
        this.io.to(this.roomName).emit("new word", this.activeWord.length);
        this.clearCanvas();
    }
    clearCanvas() {
        this.io.to(this.roomName).emit("clear canvas");
        this.canvasEvents = [{ "action": "clear canvas" }];
    }
    nextUser() {
        const nextUser = this.users.nextUser(this.#activeUser);
        if (nextUser == undefined) {
            this.setActiveUser(this.users.getFirstUser().id);
        }
        else {
            this.setActiveUser(nextUser.id);
        }
    }
    runTimer() {
        this.timer = setInterval(() => {
            this.io.to(this.roomName).emit("timer change", this.time);
            if (this.time == 0) {
                this.time = Room.MAX_TIME_S;
                const sortedUsers = this.sortScores();
                for (const user of sortedUsers) {
                    this.io.to(this.roomName).emit("display scores", { userData: user, BETWEEN_ROUNDS_MS: Room.BETWEEN_ROUNDS_MS });
                }
                ;
                this.resetTimer();
                // INCOMPLETE -----------------------
                // sort user scores
            }
            this.time--;
        }, 1000);
    }
    resetTimer() {
        clearTimeout(this.timer);
        setTimeout(() => {
            this.runTimer();
            this.nextUser();
        }, Room.BETWEEN_ROUNDS_MS);
    }
    startGame() {
        console.log("Game started!");
        //this.nextState();
        this.gameStatus = GameState.GAME_IN_PROGRESS;
        this.nextRound();
        this.runTimer();
    }
    /*
    nextState() {
        if (this.gameStatus == GameState.GAME_NOT_STARTED) {
            this.gameStatus == GameState.GAME_IN_PROGRESS;
            this.nextState();
        } else if (this.gameStatus == GameState.GAME_IN_PROGRESS) {
            if (this.isLastUser()) {
                this.nextRound();
                this.nextState();
            } else {
                this.nextUser();
            }
        } else if (this.gameStatus == GameState.WAITING_NEXT_GAME) {
            // something
        } else {
            throw new Error("Game status "+this.gameStatus+" is not defined");
        }
    }
    */
    /**
     * Check if the current user is the last one
     */
    isLastUser() {
    }
    /**
     * Advances the game to the next round and sets the active user to undefined
     */
    nextRound() {
        this.#currentRound++;
        if (this.#currentRound > Room.MAX_ROUNDS) {
            this.endGame();
        }
    }
    endGame() {
        console.log("Game over!");
        // Emit message to all users containing game-end data
        // Reset round
        this.#currentRound = 0;
        // Ensure that the next player to become active user is the first user
        // Reset scores
        for (const [_, currentUser] of this.users.users) {
            const userData = currentUser.userData;
            userData.score = 0;
            this.io.to(this.roomName).emit("score change", { "userId": userData.id, "score": userData.score });
        }
        // Wait for a bit, then start a new game
        setTimeout(() => {
            this.startGame();
        }, 10000);
    }
    wordGuessed(userId) {
        if (this.gameStatus = GameState.GAME_IN_PROGRESS) {
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
        this.users.getUser(this.#activeUser).score += Math.floor(points / 4);
        this.io.to(this.roomName).emit("score change", { "userId": userId, "score": this.users.getUser(userId).score });
        this.io.to(this.roomName).emit("score change", { "userId": this.#activeUser, "score": this.users.getUser(this.#activeUser).score });
    }
    sortScores() {
        // store the list of users as an array instead of a map
        const userList = [];
        for (const [_, currentUser] of this.users.users) {
            userList.push(currentUser.userData);
        }
        console.log(userList);
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
