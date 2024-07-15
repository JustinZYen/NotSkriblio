import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});
app.use(express.static(join(__dirname, '/static')));

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  io.emit('chat message', 'new user joined');
  socket.on('disconnect', () => {
      console.log('user disconnected');
  })
});

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
   });
});