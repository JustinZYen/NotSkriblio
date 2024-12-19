"use strict";
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
const socket = io();
const home = document.querySelector(".home");
const createOrJoinMenu = document.querySelector(".create-or-join");
const lobby = document.getElementById("lobby");
const lobbyCreator = document.getElementById("lobby-creator");
const body = document.querySelector(".body");
export { socket, home, createOrJoinMenu, lobby, lobbyCreator, body };
