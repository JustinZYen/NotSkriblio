(function lobby(socket) {
    const lobbies = document.getElementById("lobby-list");
    let body = document.querySelector(".body");
    let lobby = document.getElementById("lobby");
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
}(socket));