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
const rooms = new Map(); // Map room names to an object with {"activeUser":<username>, "activeWord":<word>, 
//"users":<user set/map>, "canvasEvents":<array of canvas events>}
addRoom("Room 1");
io.on('connection', (socket) => {
  for (const [roomName,_] of rooms) {
    io.to(socket.id).emit("new room",roomName);
  }
  // Initial connection actions
  let username = "User"+socket.id.substring(0,3);
  socket.on("set username",(msg) => {
    setUsername(msg);
  })
  function setUsername(newName) {
    console.log("set username received");
    if (newName != "") {
      username = newName;
      socket.emit("update username", );
    }
  }

  // Non-room-dependent events
  socket.on("new room",(roomName) => {
    addRoom(roomName);
  });

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
    for (const [_, username] of currentRoom.users) {
      io.to(socket.id).emit("new user", username);
    }

    // Draw all current drawing actions
    for (const canvasEvent of currentRoom.canvasEvents) {
      io.to(socket.id).emit(canvasEvent.action, canvasEvent.params);
    }

    // Send a message to everyone that a new user has joined
    io.to(roomName).emit('chat message', 'new user joined');
    
    // Add current user into users list
    addUser(socket.id, username);

    // Load in underscores representing new empty word
    if (currentRoom.activeWord.length > 0) {
      io.to(socket.id).emit("new word",currentRoom.activeWord.length);
    }
    
   
    socket.on('disconnect', () => {
        console.log('user disconnected');
        removeUser(socket.id);
    })
    
    console.log("user with id "+socket.id+" joined room with name "+roomName);
    socket.on('chat message', (msg) => {
      // Check for name change
      if (/^\/name .*/.test(msg)) {
        setUsername(msg.substring(6).trim());
      }
      else {
        io.to(roomName).emit('chat message', username + ": " + msg);
        if (msg == currentRoom.activeWord) {
          io.to(socket.id).emit("chat message","you guessed the word!");
          setActiveUser(socket.id);
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
    socket.on("color change", (msg)=>{
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('color change', msg);
        currentRoom.canvasEvents.push({"action":"color change", "params":msg});
      }
    });

    // Functions
    function addUser(userId, username) {
      io.to(roomName).emit("new user", username);
      console.log(username);
      currentRoom.users.set(userId, username);
      if (currentRoom.activeUser == null) {
        setActiveUser(userId);
      }
    }
    
    function removeUser(userId) {
      currentRoom.users.delete(userId);
      if (userId == currentRoom.activeUser) {
        // Choose a new user
        if (currentRoom.users.size == 0) {
          currentRoom.activeUser = null;
        } else {
          const [first] = currentRoom.users; // This gets the first element of the map as an array of key + value
          setActiveUser(first[0]);
          console.log("new user is: "+ currentRoom.activeUser);
        }
      }
    }
    
    function setActiveUser(userId) {
      currentRoom.activeUser = userId;
      console.log("user id "+userId+" is the active user");
      io.sockets.in(userId).emit("chat message", "You are the active user!");
      currentRoom.activeWord = getWord();
      io.sockets.in(userId).emit("chat message", "Your word is: "+currentRoom.activeWord);
      io.to(roomName).emit("new word", currentRoom.activeWord.length);
    }
  })
});

function addRoom(roomName) {
  rooms.set(roomName,{"activeUser":null, "activeWord":"", "users":new Map(), "canvasEvents":[]});
}

