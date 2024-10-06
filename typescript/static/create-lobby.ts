"use strict";

import { socket } from "./global.js";
const lobbyNameField = <HTMLInputElement>document.getElementById("lobby-name");
const lobbyCreateButton = document.getElementById("lobby-create")!;
const lobbyCreator = document.getElementById("lobby-creator")!;
const body = <HTMLElement>document.querySelector(".body");

// Event listener for when the button to create the lobby is clicked
lobbyCreateButton.addEventListener("click", () => {
    socket.emit("join room", lobbyNameField.value);
    body.style.display = "flex";
    lobbyCreator.style.display = "none";
})