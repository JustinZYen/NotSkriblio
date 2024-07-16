import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

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
io.on('connection', (socket) => {
  io.emit('chat message', 'new user joined');
  addUser(socket.id);
  socket.on('disconnect', () => {
      console.log('user disconnected');
      removeUser(socket.id);
  })
  console.log("user with id "+socket.id+" joined");
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
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
    activeUser = userId;
  }
}
function removeUser(userId) {
  userIds.delete(userId);
  if (userId == activeUser) {
    // Choose a new user
    const [first] = userIds; // This gets the first element of the set
    activeUser = first;
    console.log("new user is: "+activeUser);
  }
}
