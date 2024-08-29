import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import fs from 'fs';
import { time } from 'node:console';

let wordArr = [];
fs.readFile('static/words.txt', (err, data) => {
  if (err) throw err;
  wordArr = data.toString().split(/[\r\n]+/);
  //console.log(data.toString().split(/[\r\n]+/));
});

let getWord = () => {
  let val = Math.floor(Math.random() * wordArr.length);
  return wordArr[val];
}

const app = express();
const server = createServer(app);
const io = new Server(server);

// Set up associated files
const __dirname = dirname(fileURLToPath(import.meta.url));
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});
app.use(express.static(join(__dirname, 'static/')));

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});

/*
const userIds = new Set(); 
let activeUser = null;
let activeWord = null;
*/


class Room {
  static MAX_TIME = 20;
  static MAX_ROUNDS = 3; 
  static MIN_PLAYERS = 2; // Need 3 players to start the game
  currentRound = 0;
  activeUser= null;
  activeWord= "";
  users = new Map(); // Maps user ids to {"id":user id, "username":username, "profilePicture":{}, "score":score}
  canvasEvents = [];
  time = Room.MAX_TIME; 
  roomName;
  gameStarted = false;
  constructor(roomName){
    this.roomName = roomName;
    /*
    setInterval(()=>{
      if (this.time == 0) {
        this.time = Room.MAX_TIME;
        this.nextUser();      
      }
      io.to(this.roomName).emit("timer change",this.time);
      this.time--;
    },1000)
    */
  }

  addUser(userId, userData) {
    userData.score = 0; // Add score field once user has joined a game
    console.log("user data being emitted is: "+Object.keys(userData.profilePicture));
    io.to(this.roomName).emit("new user", userData);
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
  
  removeUser(userId) {
    this.users.delete(userId);
    io.to(this.roomName).emit("remove user", userId);
    if (userId == this.activeUser) {
      // Choose a new user
      if (this.users.size == 0) {
        this.activeUser = null;
      } else {
        const [first] = this.users; // This gets the first element of the map as an array of key + value
        this.setActiveUser(first[0]); // Set active user to id of first user
        console.log("new user is: "+ this.activeUser);
      }
    }
  }

  setActiveUser(userId) {
    this.activeUser = userId;
    console.log("user id "+userId+" is the active user");
    io.to(userId).emit("chat message", "You are the active user!");
    io.to(userId).emit("drawing information request"); // Get line width and line color
    this.activeWord = getWord(); // Choose a new word for the active user
    io.to(userId).emit("chat message", "Your word is: "+this.activeWord);
    io.to(this.roomName).emit("new active user",this.activeUser);
    io.to(this.roomName).emit("new word", this.activeWord.length);
    this.clearCanvas();
  }

  clearCanvas() {
    io.to(this.roomName).emit("clear canvas");
    this.canvasEvents = [];
  }
  nextUser() {
    const iter = this.users.entries();
    for (const [username,_] of iter) {
      if (username == this.activeUser) {
        const iterNext = iter.next().value;
        if (iterNext) {  // Check if there is a next user (otherwise loop back to start)
          this.setActiveUser(iterNext[0]);
        } else {
          const [first] = this.users; // This gets the first element of the map as an array of key + value
          this.setActiveUser(first[0]);
          this.nextRound();
        }
      }
    }
    // If reaching the end of the player list, advance to the next round
    // If final round, do something
  }

  startGame() {
    console.log("Game started!");
    this.gameStarted = true;
    this.nextRound();
    setInterval(()=>{
      if (this.time == 0) {
        this.time = Room.MAX_TIME;
        console.log(this.users);
        io.to(this.roomName).emit("display scores", this.users);
        this.nextUser();  
      }
      io.to(this.roomName).emit("timer change",this.time);
      this.time--;
    },1000)
    // Not sure what else to add
  }

  nextRound() {
    this.currentRound++;
    if (this.currentRound > Room.MAX_ROUNDS) {
      console.log("Game over!");
    } 
    // else {
    //   io.to(this.roomName).emit("new round");
    // }
  }

  wordGuessed(userId) {
    if (this.gameStarted) {
      // Player who guessed the word gets points
      // Pass active player to the next person
      console.log('time guessed: ' + this.time);
      this.addScore(userId);
      // this.nextUser();
      // this.time = Room.MAX_TIME;
    }
  }

  addScore(userId) {
    let points =  500 - (Room.MAX_TIME - this.time) * 5;
    // Gain 500 points for guessing instantly and -5 points for every extra second it takes to guess
    // Drawer gains a quarter of the number of points the guesser gained
    
    // this.users.get(userId).score += points
    // io.to(userId).emit('update points', points);
    // io.to(this.activeUser).emit('update points', points);

    this.users.get(userId).score += points;
    this.users.get(this.activeUser).score += Math.floor(points / 4);

    io.to(this.roomName).emit("score change", {"userId":userId,"score":this.users.get(userId).score});
    io.to(this.roomName).emit("score change", {"userId":this.activeUser,"score":this.users.get(this.activeUser).score});
  }
}

const rooms = new Map(); // Map room names to an object with {"activeUser":<username>, "activeWord":<word>, 
//"users":<user set/map>, "canvasEvents":<array of canvas events>, "time":<current time>}
addRoom("Room 1");
io.on('connection', (socket) => {
  for (const [roomName,_] of rooms) {
    io.to(socket.id).emit("new room",roomName);
  }
  // Initial connection actions
  const userData = {"id":socket.id, "username":"User"+socket.id.substring(0,3), "profilePicture":{}};
  socket.on("set username",(msg) => {
    setUsername(msg);
  })
  function setUsername(newName) {
    //console.log("set username received");
    if (newName != "") {
      userData.username = newName;
      //socket.emit("update username", userData.username);
    }
  }

  socket.on("set profile picture",(msg) => {
    userData.profilePicture = msg;
  });

  socket.on('update points', (points) => {
    userData.score += points;
  });

  // Non-room-dependent events
  /*
  socket.on("new room",(roomName) => {
    addRoom(roomName);
  });
  */
  // Actions that only occur once the user joins a room
  socket.on("join room",(roomName) => {
    // Make current user join the room
    socket.join(roomName);

    // Instantiate variable representing current room
    if (!rooms.has(roomName)) {
      addRoom(roomName);
    }
    const currentRoom = rooms.get(roomName);

    // Load the users that are currently in the room
    for (const [_, userData] of currentRoom.users) {
      io.to(socket.id).emit("new user", userData);
    }

    // Draw all current drawing actions
    for (const canvasEvent of currentRoom.canvasEvents) {
      io.to(socket.id).emit(canvasEvent.action, canvasEvent.params);
    }

    // Highlight the active user
    io.to(socket.id).emit("new active user", currentRoom.activeUser);

    // Send a message to everyone that a new user has joined
    io.to(roomName).emit('chat message', userData.username + ' joined the room');
    
    // Add current user into users list
    currentRoom.addUser(socket.id, userData);

    // Load in underscores representing new empty word
    if (currentRoom.activeWord.length > 0) {
      io.to(socket.id).emit("new word", currentRoom.activeWord.length);
    }
   
    socket.on('disconnect', () => {
        console.log('user disconnected');
        io.to(roomName).emit('chat message', userData.username + ' left the room');
        currentRoom.removeUser(socket.id);
    })
    
    console.log("user with id "+socket.id+" joined room with name "+roomName);
    socket.on('chat message', (msg) => {
      msg = msg.trim();
      if (socket.id != currentRoom.activeUser  && msg.toLowerCase() == currentRoom.activeWord) {
        currentRoom.wordGuessed(socket.id, time);
        io.to(socket.id).emit("chat message","You guessed the word!");
        //currentRoom.setActiveUser(socket.id);
      } else {
        io.to(roomName).emit('chat message', userData.username + ": " + msg);
      }
    });
    
    socket.on("line drawn", (msg)=>{
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('line drawn', msg);
        currentRoom.canvasEvents.push({"action":"line drawn", "params":msg});
      }
    });
    socket.on("line moved", (msg)=>{
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('line moved', msg);
        currentRoom.canvasEvents.push({"action":"line moved", "params":msg});
      }
    });
    socket.on("line width change", (newWidth) => {
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('line width change', newWidth);
        currentRoom.canvasEvents.push({"action":"line width change", "params":newWidth});
      }
    })
    socket.on("color change", (msg)=>{
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('color change', msg);
        currentRoom.canvasEvents.push({"action":"color change", "params":msg});
      }
    });
    socket.on("clear canvas",()=>{
      currentRoom.clearCanvas();
    });
  })
});

function addRoom(roomName) {
  const activeRoom = new Room(roomName);
  rooms.set(roomName,activeRoom);
}