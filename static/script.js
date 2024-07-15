const canvas = document.getElementById("my-canvas");
const ctx = canvas.getContext("2d");
ctx.beginPath();
ctx.moveTo(0,0);
canvas.width = 500;
canvas.height = 500;
let mouseDown = false;
document.addEventListener("mousedown",()=>{
    mouseDown = true
});
document.addEventListener("mouseup",()=>{
    mouseDown = false
});
// Event listener for when mouse is moved inside the canvas
canvas.addEventListener("mousemove",(event)=>{
    var rect = event.target.getBoundingClientRect();
    if (mouseDown) {
        ctx.lineTo(event.clientX-rect.left,event.clientY-rect.top);
        ctx.stroke();
    } else {
        ctx.moveTo(event.clientX-rect.left,event.clientY-rect.top);
    }
});

// Event listener for when kes are pressed
document.addEventListener("keydown",(event)=>{
    // Clear the canvas
    if (event.key == "r") {
        ctx.closePath();
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();
    }
});


const body = document.querySelector(".body");
const colorContainer = document.querySelector(".color-container");
const colors = colorContainer.children;
let form = document.getElementById('form');

class colorButton {
    constructor(color) {
        this.color = color;
        const item = document.createElement("button");
        item.classList.add("color-button");
        item.style.backgroundColor = color;
        return item;
    }
}

colorContainer.appendChild(new colorButton("red"));
colorContainer.appendChild(new colorButton("orange"));
colorContainer.appendChild(new colorButton("yellow"));
colorContainer.appendChild(new colorButton("green"));
colorContainer.appendChild(new colorButton("blue"));
colorContainer.appendChild(new colorButton("purple"));
colorContainer.appendChild(new colorButton("black"));
colorContainer.appendChild(new colorButton("grey"));

body.appendChild(colorContainer);
body.appendChild(form);

$(".color-button").on("click",event => {
    ctx.closePath();
    ctx.strokeStyle = $(event.currentTarget).css("background-color");
    ctx.beginPath();
});

$("#chat-input").on("keypress",(event)=>{
    if (event.keyCode == "13") {
        $("#log").append("\n"+$("#chat-input").val());
        $("#chat-input").val("");
    }
})

let input = document.getElementById('chat-input');
let log = document.querySelector('.log');

const socket = io();

form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('submitted');
    socket.emit('chat message', input.value);
    input.value = '';
});

socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    log.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
    console.log("message received");
});
