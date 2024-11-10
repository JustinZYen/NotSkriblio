import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
//import { time } from 'node:console';
import { Room } from './room.js'
const app = express();
const server = createServer(app);
const io = new Server(server);

// Set up associated files
const __dirname = dirname(fileURLToPath(import.meta.url));
app.get('/', (_, res) => {
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


const rooms = new Map<string,Room>(); // Map room names to an object with {"activeUser":<username>, "activeWord":<word>, 
//"users":<user set/map>, "canvasEvents":<array of canvas events>, "time":<current time>}
addRoom("Room 1");
io.on('connection', (socket) => {
  for (const [roomName, _] of rooms) {
    io.to(socket.id).emit("new room", roomName);
  }
  // Initial connection actions
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
  const userData:userData = { "id": socket.id, "username": "User" + socket.id.substring(0, 3), "profilePicture": {width:-1,height:-1,drawActions:[]}, score:-1 };
  socket.on("set username", (msg) => {
    setUsername(msg);
  })
  function setUsername(newName:string) {
    //console.log("set username received");
    if (newName != "") {
      userData.username = newName;
      //socket.emit("update username", userData.username);
    }
  }

  socket.on("set profile picture", (msg) => {
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
  socket.on("join room", (roomName) => {
    // Make current user join the room
    socket.join(roomName);

    // Instantiate variable representing current room
    if (!rooms.has(roomName)) {
      addRoom(roomName);
    }
    const currentRoom = rooms.get(roomName)!;

    // Load the users that are currently in the room
    for (const [_, userData] of currentRoom.users) {
      io.to(socket.id).emit("new user", userData);
    }

    // Draw all current drawing actions
    for (const canvasEvent of currentRoom.canvasEvents) {
      io.to(socket.id).emit(canvasEvent.action, canvasEvent.params);
    }

    // Highlight the active user
    io.to(socket.id).emit("new active user", { newUser: currentRoom.activeUser });

    // Send a message to everyone that a new user has joined
    io.to(roomName).emit('chat message', userData.username + ' joined the room');

    // Add current user into users list
    currentRoom.addUser(socket.id, userData);

    // Tell new user which user id they are
    io.to(socket.id).emit("you are",socket.id);

    // Load in underscores representing new empty word
    if (currentRoom.activeWord.length > 0) {
      io.to(socket.id).emit("new word", currentRoom.activeWord.length);
    }

    socket.on('disconnect', () => {
      console.log('user disconnected');
      io.to(roomName).emit('chat message', userData.username + ' left the room');
      currentRoom.removeUser(socket.id);
    });
    
    console.log("user with id " + socket.id + " joined room with name " + roomName);
    socket.on('chat message', (msg) => {
      msg = msg.trim();
      if (socket.id != currentRoom.activeUser && msg.toLowerCase() == currentRoom.activeWord) {
        currentRoom.wordGuessed(socket.id);
        io.to(socket.id).emit("chat message", "You guessed the word!");
        //currentRoom.setActiveUser(socket.id);
      } else {
        io.to(roomName).emit('chat message', userData.username + ": " + msg);
      }
    });

    socket.on("line drawn", (msg) => {
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('line drawn', msg);
        currentRoom.canvasEvents.push({ "action": "line drawn", "params": msg });
      }
    });
    socket.on("line moved", (msg) => {
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('line moved', msg);
        currentRoom.canvasEvents.push({ "action": "line moved", "params": msg });
      }
    });
    socket.on("fill area", (msg) => {
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('fill area', msg);
        currentRoom.canvasEvents.push({ "action": "fill area", "params": msg });
      }
    });
    socket.on("line width change", (newWidth) => {
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('line width change', newWidth);
        currentRoom.canvasEvents.push({ "action": "line width change", "params": newWidth });
      }
    })
    socket.on("color change", (msg) => {
      if (socket.id == currentRoom.activeUser) {
        io.to(roomName).emit('color change', msg);
        currentRoom.canvasEvents.push({ "action": "color change", "params": msg });
      }
    });
    socket.on("clear canvas", () => {
      currentRoom.clearCanvas();
    });
  })
});

function addRoom(roomName:string) {
  const activeRoom = new Room(roomName, io);
  rooms.set(roomName, activeRoom);
}