(function lobbyCreationMenu(socket) {
    const lobbyNameField = document.getElementById("lobby-name");
    const lobbyCreateButton = document.getElementById("lobby-create");
    const lobbyCreator = document.getElementById("lobby-creator");
    const body = document.querySelector(".body");
    lobbyCreateButton.addEventListener("click",()=>{
        socket.emit("new room",lobbyNameField.value);
        socket.emit("join room",lobbyNameField.value);
        body.style.display = "flex";
        lobbyCreator.style.display = "none";
    })
}(socket));