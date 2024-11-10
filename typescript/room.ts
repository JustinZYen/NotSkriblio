import fs from 'fs';
import { Server } from 'socket.io';

let wordArr:string[] = [];
fs.readFile('static/words.txt', (err, data) => {
  if (err) throw err;
  wordArr = data.toString().split(/[\r\n]+/);
  //console.log(data.toString().split(/[\r\n]+/));
});
type userData = {id:string,
    username:string,
    profilePicture:{
        width:number,
        height:number,
        drawActions:{
            action:string,
            params:{
                x: number,
                y:number,
            }}[]}
    score:number};

enum GameState {
    GAME_NOT_STARTED,
    GAME_IN_PROGRESS,
    WAITING_NEXT_GAME
}
class Room {
    static MAX_TIME_S = 10;
    static MAX_ROUNDS = 3;
    static MIN_PLAYERS = 1; // Need 3 players to start the game
    static BETWEEN_ROUNDS_MS = 5000;
    currentRound = 0;
    activeUser:string|null = null;
    activeWord = "";
    users = new Map<string,userData>(); // Maps user ids to {"id":user id, "username":username, "profilePicture":{}, "score":score}
    canvasEvents:{action:string,params?:{x:number,y:number}}[] = [];
    timer:NodeJS.Timeout;
    time = Room.MAX_TIME_S;
    roomName;
    gameStatus = GameState.GAME_NOT_STARTED;
    io; // socketio Server object
    constructor(roomName:string, io:Server) {
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

    addUser(userId:string, userData:userData) {
        userData.score = 0; // Add score field once user has joined a game
        console.log("user data being emitted is: " + Object.keys(userData.profilePicture));
        this.io.to(this.roomName).emit("new user", userData);
        //console.log(username);
        this.users.set(userId, userData);
        if (this.activeUser == null) {
            this.setActiveUser(userId);
        }
        if ((this.gameStatus == GameState.GAME_NOT_STARTED) && this.users.size >= Room.MIN_PLAYERS) {
            this.startGame();
        }
        // Check if there are now enough users to start the game
    }

    removeUser(userId:string) {
        this.users.delete(userId);
        this.io.to(this.roomName).emit("remove user", userId);
        if (userId == this.activeUser) {
            // Choose a new user
            if (this.users.size == 0) {
                this.activeUser = null;
            } else {
                const [first] = this.users; // This gets the first element of the map as an array of key + value
                if (first != null) {
                    this.setActiveUser(first[0]); // Set active user to id of first user
                    console.log("new user is: " + this.activeUser);
                }
            }
        }
    }

    setActiveUser(userId:string) {
        const getWord = ():string => {
            let val = Math.floor(Math.random() * wordArr.length);
            return wordArr[val]!; // Exclamation mark tells typescript that there is definitely a value
        }
        const previousUser = this.activeUser;
        this.activeUser = userId;
        console.log("user id " + userId + " is the active user");
        this.io.to(userId).emit("chat message", "You are the active user!");
        this.io.to(userId).emit("drawing information request"); // Get line width and line color
        this.activeWord = getWord(); // Choose a new word for the active user
        this.io.to(userId).emit("chat message", "Your word is: " + this.activeWord);
        this.io.to(this.roomName).emit("new active user", {prevUser:previousUser,newUser:this.activeUser});
        this.io.to(this.roomName).emit("new word", this.activeWord.length);
        this.clearCanvas();
    }

    clearCanvas() {
        this.io.to(this.roomName).emit("clear canvas");
        this.canvasEvents = [{ "action": "clear canvas" }];
    }

    nextUser() {
        const iter = this.users.entries();
        for (const [username, _] of iter) {
            if (username == this.activeUser) {
                const iterNext = iter.next().value;
                if (iterNext) {  // Check if there is a next user (otherwise loop back to start)
                    this.setActiveUser(iterNext[0]);
                } else {
                    const [first] = this.users; // This gets the first element of the map as an array of key + value
                    if (first != undefined) {
                        this.setActiveUser(first[0]);
                        this.nextRound();
                    } else {
                        console.log("First user is undefined")
                    }
                }
            }
        }
        // If reaching the end of the player list, advance to the next round
        // If final round, do something
    }

    runTimer() {
        this.timer = setInterval(() => {
            this.io.to(this.roomName).emit("timer change", this.time);
            if (this.time == 0) {
                this.time = Room.MAX_TIME_S;
                const sortedUsers = this.sortScores();
                for (const user of sortedUsers) {
                    this.io.to(this.roomName).emit("display scores", {userData: user, BETWEEN_ROUNDS_MS:Room.BETWEEN_ROUNDS_MS});
                };
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
        this.currentRound++;
        if (this.currentRound > Room.MAX_ROUNDS) {
            this.endGame();
        }
    }

    endGame() {
        console.log("Game over!");
        // Emit message to all users containing game-end data
        // Reset round
        this.currentRound = 0;
        // Ensure that the next player to become active user is the first user

        // Reset scores
        for (const [_,userData] of this.users) {
            userData.score = 0;
            this.io.to(this.roomName).emit("score change", { "userId": userData.id, "score": userData.score });
        }
        // Wait for a bit, then start a new game
        setTimeout(()=> {
            this.startGame();
        },10000);
    }

    wordGuessed(userId:string) {
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
    addScore(userId:string) {
        let points = 500 - (Room.MAX_TIME_S - this.time) * 5;

        this.users.get(userId)!.score += points;
        this.users.get(this.activeUser!)!.score += Math.floor(points / 4);

        this.io.to(this.roomName).emit("score change", { "userId": userId, "score": this.users.get(userId)!.score });
        this.io.to(this.roomName).emit("score change", { "userId": this.activeUser, "score": this.users.get(this.activeUser!)!.score });
    }

    sortScores() {
        // store the list of users as an array instead of a map
        const userList: userData[] = [];
        for (const [_,userData] of this.users) {
            userList.push(userData);
        }
        console.log(userList);
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

export { Room };