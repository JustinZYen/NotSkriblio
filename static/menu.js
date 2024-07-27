(function menu(socket) {
    let button = document.querySelector(".start");
    let homepage = document.querySelector(".homepage");
    let homeInput = document.getElementById("set-username");
    let createOrJoinMenu = document.querySelector(".create-or-join")

    button.addEventListener('click', () => {  
        createOrJoinMenu.style.display = "flex";
        homepage.style.display = "none";
        socket.emit("set username", homeInput.value);
    });
}(socket));