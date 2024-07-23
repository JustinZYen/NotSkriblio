let button = document.querySelector(".start");
let homepage = document.querySelector(".homepage");
let body = document.querySelector(".body");

button.addEventListener('click', () => {
    console.log("button clicked");
    body.style.display = "flex";
    homepage.style.display = "none";
});