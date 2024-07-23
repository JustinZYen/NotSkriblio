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
app.use(express.static(join(__dirname, '/static')));

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});

const userIds = new Set(); 
let activeUser = null;
let activeWord = null;
io.on('connection', (socket) => {
  socket.join(socket.id); // Join a room containing only the current user
  for (const onlineUser of userIds) {
    io.sockets.in(socket.id).emit("new user", onlineUser);
  }
  io.emit('chat message', 'new user joined');
  
  addUser(socket.id);
  let username = "User"+socket.id.substring(0,3);
  if (activeWord.length > 0) {
    io.sockets.in(socket.id).emit("new word",activeWord.length);
  }
  socket.on('disconnect', () => {
      console.log('user disconnected');
      removeUser(socket.id);
  })
  console.log("user with id "+socket.id+" joined");
  socket.on('chat message', (msg) => {
    // Check for name change
    if (/^\/name .*/.test(msg)) {
      setUsername(msg.substring(6).trim());
    }
    else {
      io.emit('chat message', username + ": " + msg);
      if (msg == activeWord) {
        io.sockets.in(socket.id).emit("chat message","you guessed the word!");
        setActiveUser(socket.id);
      }
    }
    
  });
  
  socket.on("line drawn", (msg)=>{
    if (socket.id == activeUser) {
      io.emit('line drawn', msg);
    }
  });
  socket.on("line moved", (msg)=>{
    if (socket.id == activeUser) {
      io.emit('line moved', msg);
    }
  });
  socket.on("color change", (msg)=>{
    if (socket.id == activeUser) {
      io.emit('color change', msg);
    }
  });
  
  socket.on("set username",(msg) => {
    setUsername(msg);
  })
  function setUsername(newName) {
    console.log("set username received");
    if (username != "") {
      username = newName;
    }
  }
});


function addUser(userId) {
  io.emit("new user", userId);
  userIds.add(userId);
  if (activeUser == null) {
    setActiveUser(userId);
  }
}

function removeUser(userId) {
  userIds.delete(userId);
  if (userId == activeUser) {
    // Choose a new user
    const [first] = userIds; // This gets the first element of the set
    setActiveUser(first);
    console.log("new user is: "+activeUser);
  }
}

function setActiveUser(userId) {
  activeUser = userId;
  console.log("user id "+userId+" is the active user");
  io.sockets.in(userId).emit("chat message", "You are the active user!");
  activeWord = getWord();
  io.sockets.in(userId).emit("chat message", "Your word is: "+activeWord);
  io.emit("new word", activeWord.length);
}