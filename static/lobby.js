(function lobby(){
    const lobbies = document.getElementById("lobby-list");
    socket.on("new room",(roomName) => {
        const newRoomBox = document.createElement("ul");
        newRoomBox.textContent = "Room: "+roomName;
        lobbies.appendChild(newRoomBox);
        newRoomBox.addEventListener("click",() => {
            console.log("newRoomBox with text "+newRoomBox.textContent+" clicked");
            socket.emit("join room",roomName);
        })
    })
}());