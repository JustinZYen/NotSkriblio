(function menu() {
let button = document.querySelector(".start");
let homepage = document.querySelector(".homepage");
let homeInput = document.getElementById("home-input");

button.addEventListener('click', () => {  
    body.style.display = "flex";
    homepage.style.display = "none";
    socket.emit("set username", homeInput.value);
});
}());