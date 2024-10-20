"use strict";

import { socket,createOrJoinMenu,lobbyCreator,body} from "./global.js";
const lobbyNameField = <HTMLInputElement>document.getElementById("lobby-name");
const lobbyCreateButton = document.getElementById("lobby-create")!;

const backButton = lobbyCreator.querySelector(".back-button")!;
backButton.addEventListener("click", ()=>{
    lobbyCreator.style.display = "none";
    createOrJoinMenu.style.display = "flex";
})

// Event listener for when the button to create the lobby is clicked
lobbyCreateButton.addEventListener("click", () => {
    socket.emit("join room", lobbyNameField.value);
    body.style.display = "flex";
    lobbyCreator.style.display = "none";
})