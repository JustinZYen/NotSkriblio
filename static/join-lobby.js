(function lobby(socket) {
    const lobbies = document.getElementById("lobby-list");
    const body = document.querySelector(".body");
    const lobby = document.getElementById("lobby");
    const createLobbyButton = document.querySelector("#lobby button");
    socket.on("new room",(roomName) => {
        console.log("new room being made");
        const newRoomBox = document.createElement("li");
        newRoomBox.textContent = "Room: "+roomName;
        lobbies.appendChild(newRoomBox);
        newRoomBox.addEventListener("click",() => {
            lobby.style.display = "none";
            body.style.display = "flex";
            console.log("newRoomBox with text "+newRoomBox.textContent+" clicked");
            socket.emit("join room",roomName);
        })
    })

    /*
    const lobbyCreator = document.getElementById("lobby-creator");
    createLobbyButton.addEventListener("click",()=>{
        console.log("createLobbyButton clicked");
        lobby.style.display = "none";
        lobbyCreator.style.display = "flex";
    })
    */
}(socket));