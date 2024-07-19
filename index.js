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
  io.emit('chat message', 'new user joined');
  addUser(socket.id);
  socket.join(socket.id); // Join a room containing only the current user
  socket.on('disconnect', () => {
      console.log('user disconnected');
      removeUser(socket.id);
  })
  console.log("user with id "+socket.id+" joined");
  socket.on('chat message', (msg) => {
    if (msg == activeWord) {
      io.sockets.in(socket.id).emit("chat message","you guessed the word!");
      setActiveUser(socket.id);
    }
    io.emit('chat message', socket.id + ": " + msg);
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
});


function addUser(userId) {
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