let button = document.querySelector(".start");
let homepage = document.querySelector(".homepage");
let body = document.querySelector(".body");
let input = document.getElementById("home-input");

let socket = io();

button.addEventListener('click', () => {  
    body.style.display = "flex";
    homepage.style.display = "none";
    socket.emit("set username", input.value);
});