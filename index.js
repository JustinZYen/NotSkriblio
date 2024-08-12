import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import fs from 'fs';

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
  static MAX_TIME = 90;
  activeUser= null;
  activeWord= ""; 
  users = new Map();
  canvasEvents = [];
  time = Room.MAX_TIME; 
  currentRound = 1;
  userScores= new Map();
  roomName;
  constructor(roomName){
    this.roomName = roomName;
    setInterval(()=>{
      if (this.time == 0) {
        this.time = Room.MAX_TIME;
        this.nextUser();      
      }
      io.to(this.roomName).emit("timer change",this.time);
      this.time--;
    },1000)
  }

  addUser(userId, userData) {
    console.log("user data being emitted is: "+Object.keys(userData.profilePicture));
    io.to(this.roomName).emit("new user", userData);
    //console.log(username);
    this.users.set(userId, userData);
    if (this.activeUser == null) {
      this.setActiveUser(userId);
    }
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
    
    this.activeWord = getWord(); // Choose a new word for the active user
    io.to(userId).emit("chat message", "Your word is: "+this.activeWord);
    
    io.to(this.roomName).emit("clear canvas");
    io.to(this.roomName).emit("new word", this.activeWord.length);
  }

  nextUser() {
    const iter = this.users.entries();
    
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

    // Send a message to everyone that a new user has joined
    io.to(roomName).emit('chat message', userData.username + ' joined the room');
    
    // Add current user into users list
    currentRoom.addUser(socket.id, userData);

    // Load in underscores representing new empty word
    if (currentRoom.activeWord.length > 0) {
      io.to(socket.id).emit("new word",currentRoom.activeWord.length);
    }
    
   
    socket.on('disconnect', () => {
        console.log('user disconnected');
        io.to(roomName).emit('chat message', userData.username + ' left the room');
        currentRoom.removeUser(socket.id);
    })
    
    console.log("user with id "+socket.id+" joined room with name "+roomName);
    socket.on('chat message', (msg) => {
      // Check for name change
      if (/^\/name .*/.test(msg)) {
        setUsername(msg.substring(6).trim());
      }
      else {
        io.to(roomName).emit('chat message', userData.username + ": " + msg);
        if (msg == currentRoom.activeWord) {
          io.to(socket.id).emit("chat message","you guessed the word!");
          currentRoom.setActiveUser(socket.id);
        }
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
    
    function simulateRounds() {
      const MAX_ROUNDS = 3;
      while (currentRoom.currentRound <= MAX_ROUNDS) {
        for (const [_, userData] of currentRoom.users) {
          currentRoom.activeUser = userData;
        }
          currentRoom.currentRound++;
      } 
    }
  })
});



function addRoom(roomName) {
  const activeRoom = new Room(roomName);
  rooms.set(roomName,activeRoom);
}

// add in aciveRoom map:

// to add: 
// 3 rounds
// 
// each player takes turns drawing
// once all players have drawn increment round and restart


// keep track of player score
// current drawer cannot guess their own word
// Point system

