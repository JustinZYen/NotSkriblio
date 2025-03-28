import express from "express";
import ViteExpress from "vite-express";
import { Server } from "socket.io";
import { Room } from "./Room.js";
import { UserData } from "./User.js";
import { ClientToServerEvents, InterServerEvents, RoomJoinResult, ServerToClientEvents, SocketData } from "./socket_types.js";


const app = express();

app.get("/hello", (_, res) => {
  res.send("Hello Vite + React + TypeScript!");
});

const server = ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server);

const rooms = new Map<string, Room>();
rooms.set("fblthp", new Room("fblthp", io)); // Create a room for testing purposes
io.on("connection", (socket) => {
  console.log("User connection");
  const userData: UserData = {
    id: socket.id,
    username: "",
    profilePicture: {
      width: 0,
      height: 0,
      drawActions: []
    },
    score: 0
  };
  let currentRoom: Room|undefined = undefined;

  for (const roomName of rooms.keys()) {
    socket.emit("newRoom", roomName);
  }

  socket.on("createRoom", (roomName, callback) => {
    if (rooms.has(roomName)) {
      callback(false);
    } else {
      rooms.set(roomName, new Room(roomName, io));
      io.emit("newRoom", roomName);
      callback(true);
    }
  })

  socket.on("joinRoom", (roomName, callback) => {
    if (currentRoom != undefined) {
      callback(RoomJoinResult.AlreadyJoined);
    } else if (!rooms.has(roomName)) {
      callback(RoomJoinResult.DoesNotExist);
    } else {
      currentRoom = rooms.get(roomName)!;
      socket.join(currentRoom.roomName); // Must be put before addUser or else players do not show up for themselves
      currentRoom.addUser(userData);
      callback(RoomJoinResult.Success);
    }
  })

  socket.on("setUsername", (username) => {
    if (username.length > 0) {
      userData.username = username;
    } else {
      userData.username = "User" + socket.id.substring(0, 3)
    }
    console.log("Username set to " + userData.username);
  })

  socket.on("setProfilePicture", (profileInfo) => {
    userData.profilePicture = profileInfo;
    console.log("Profile picture set");
  })

  socket.on("message",(message)=>{
    if (currentRoom != undefined) {
      if (message == currentRoom.activeWord) {
        currentRoom.wordGuessed(socket.id);
      } else {
        io.to(currentRoom.roomName).emit("message",`${userData.username}: ${message}`);
      }
    }
  })

  socket.on("disconnect",()=>{
    if (currentRoom != undefined) { // Take user out of room
      currentRoom.removeUser(socket.id);
    }
  })

  socket.on("gameDrawAction",(action)=>{
    if (currentRoom != undefined) {
      if (currentRoom.getActiveUser() == userData.id) {
        io.to(currentRoom.roomName).emit("gameDrawAction",action);
        currentRoom.canvasActions.push(action);
      }
    }
  })
});