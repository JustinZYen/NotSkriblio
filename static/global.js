"use strict";
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
const socket = io();
const homepage = document.querySelector(".homepage");
const createOrJoinMenu = document.querySelector(".create-or-join");
const lobby = document.getElementById("lobby");
const lobbyCreator = document.getElementById("lobby-creator");
const body = document.querySelector(".body");
export { socket, homepage, createOrJoinMenu, lobby, lobbyCreator, body };
