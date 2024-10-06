"use strict";

import {socket} from "./global.js";
const lobby = document.getElementById("lobby")!;
const lobbyCreator = document.getElementById("lobby-creator")!;
const createOrJoinMenu = <HTMLElement>document.querySelector(".create-or-join")!

// Listen for choice to create a new lobby
const createLobby = document.querySelector(".create-lobby")!;
createLobby.addEventListener("click", () => {
    lobbyCreator.style.display = "flex";
    createOrJoinMenu.style.display = "none";
})

// Listen for choice to join a pre-existing lobby
const joinLobby = document.querySelector(".join-lobby")!;
joinLobby.addEventListener("click", () => {
    lobby.style.display = "flex";
    createOrJoinMenu.style.display = "none";
})
