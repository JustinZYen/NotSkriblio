(function menu(socket) {
    let button = document.querySelector(".start");
    let homepage = document.querySelector(".homepage");
    let homeInput = document.getElementById("home-input");
    let body = document.querySelector(".body");
    let lobby = document.getElementById("lobby");

    button.addEventListener('click', () => {  
        lobby.style.display = "flex";
        homepage.style.display = "none";
        socket.emit("set username", homeInput.value);
    });
}(socket));