(function createOrJoinMenu() {
    const lobby = document.getElementById("lobby");
    const lobbyCreator = document.getElementById("lobby-creator");
    const createOrJoinMenu = document.querySelector(".create-or-join")

    const createLobby = document.querySelector(".create");
    createLobby.addEventListener("click",()=>{
        lobbyCreator.style.display = "flex";
        createOrJoinMenu.style.display = "none";
    })
    const joinLobby = document.querySelector(".join");
    joinLobby.addEventListener("click",()=>{
        lobby.style.display = "flex";
        createOrJoinMenu.style.display = "none";
    })
}());