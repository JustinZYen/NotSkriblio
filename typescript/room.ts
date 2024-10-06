import fs from 'fs';
import { Server } from 'socket.io';

let wordArr:string[] = [];
fs.readFile('static/words.txt', (err, data) => {
  if (err) throw err;
  wordArr = data.toString().split(/[\r\n]+/);
  //console.log(data.toString().split(/[\r\n]+/));
});
type userDataType = {id:string, username:string, profilePicture:{}, score:number}
class Room {
    static MAX_TIME = 10;
    static MAX_ROUNDS = 3;
    static MIN_PLAYERS = 1; // Need 3 players to start the game
    static BETWEEN_ROUNDS_MS = 5000;
    currentRound = 0;
    activeUser:string|null = null;
    activeWord = "";
    users = new Map<string,userDataType>(); // Maps user ids to {"id":user id, "username":username, "profilePicture":{}, "score":score}
    canvasEvents:{action:string,params?:{x:number,y:number}}[] = [];
    timer:NodeJS.Timeout;
    time = Room.MAX_TIME;
    roomName;
    gameStarted = false;
    io; // socketio Server object
    constructor(roomName:string, io:Server) {
        this.roomName = roomName;
        this.io = io;
        /*
        setInterval(()=>{
          if (this.time == 0) {
            this.time = Room.MAX_TIME;
            this.nextUser();      
          }
          this.io.to(this.roomName).emit("timer change",this.time);
          this.time--;
        },1000)
        */
    }

    addUser(userId:string, userData:userDataType) {
        userData.score = 0; // Add score field once user has joined a game
        console.log("user data being emitted is: " + Object.keys(userData.profilePicture));
        this.io.to(this.roomName).emit("new user", userData);
        //console.log(username);
        this.users.set(userId, userData);
        if (this.activeUser == null) {
            this.setActiveUser(userId);
        }
        if (!this.gameStarted && this.users.size >= Room.MIN_PLAYERS) {
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
                this.time = Room.MAX_TIME;
                this.resetTimer();
            }
            this.time--;
        }, 1000)
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
        this.gameStarted = true;
        this.nextRound();
        this.runTimer();
    }

    nextRound() {
        this.currentRound++;
        if (this.currentRound > Room.MAX_ROUNDS) {
            console.log("Game over!");
        }
    }

    wordGuessed(userId:string) {
        if (this.gameStarted) {
            // Player who guessed the word gets points
            // Pass active player to the next person
            console.log('time guessed: ' + this.time);
            this.addScore(userId);
            // this.nextUser();
            // this.time = Room.MAX_TIME;
        }
    }

    addScore(userId:string) {
        let points = 500 - (Room.MAX_TIME - this.time) * 5;
        // Gain 500 points for guessing instantly and -5 points for every extra second it takes to guess
        // Drawer gains a quarter of the number of points the guesser gained

        // this.users.get(userId).score += points
        // this.io.to(userId).emit('update points', points);
        // this.io.to(this.activeUser).emit('update points', points);

        this.users.get(userId)!.score += points;
        this.users.get(this.activeUser!)!.score += Math.floor(points / 4);

        this.io.to(this.roomName).emit("score change", { "userId": userId, "score": this.users.get(userId)!.score });
        this.io.to(this.roomName).emit("score change", { "userId": this.activeUser, "score": this.users.get(this.activeUser!)!.score });
    }
}

export { Room };