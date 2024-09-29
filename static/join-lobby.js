import {socket} from "./global.js";
const lobbies = document.getElementById("lobby-list");
const body = document.querySelector(".body");
const lobby = document.getElementById("lobby");

// Event listener for new room events (all rooms are emitted to users upon entering the website)
socket.on("new room", (roomName) => {
    console.log("new room being made");
    const newRoomBox = document.createElement("li");
    newRoomBox.textContent = "Room: " + roomName;
    lobbies.appendChild(newRoomBox);
    // Add event listener for choice to join specific lobby
    newRoomBox.addEventListener("click", () => {
        lobby.style.display = "none";
        body.style.display = "flex";
        console.log("Trying to join room " + newRoomBox.textContent);
        socket.emit("join room", roomName);
    })
})
