"use strict";
import {socket} from "./global.js";

const homepage = <HTMLElement>document.querySelector(".homepage")!;
const createOrJoinMenu = <HTMLElement>document.querySelector(".create-or-join")!;
const profileCanvas:HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("home-canvas")!; // Tell typescript that the element is definitely not null
const homeInput = <HTMLInputElement>document.getElementById("set-username")!;

const ctx = profileCanvas.getContext("2d")!;
ctx.beginPath();
ctx.moveTo(0, 0);
profileCanvas.width = 200;
profileCanvas.height = 200;
let mouseDown = false;

document.addEventListener("mousedown", () => {
    mouseDown = true;
});

document.addEventListener("mouseup", () => {
    mouseDown = false;
});

let drawActions:{action:string, params:{x:number,y:number}}[] = []; // Array storing drawing actions done so far
profileCanvas.addEventListener("mousemove", (event) => {
    if (mouseDown) {
        /*
        console.log("trying to draw in canvas");
        console.log("mouse x: "+event.clientX+" canvas x: "+rect.left);
        console.log("mouse y: "+event.clientY+" canvas y: "+rect.top);
        */
        ctx.lineTo(event.offsetX, event.offsetY);
        ctx.stroke();
        drawActions.push({ "action": "line drawn", "params": { "x": event.offsetX, "y": event.offsetY} });
    } else {
        ctx.moveTo(event.offsetX, event.offsetY);
        drawActions.push({ "action": "line moved", "params": { "x": event.offsetX, "y": event.offsetY} });
    }
});

const resetButton = document.getElementById("canvas-reset")!;
resetButton.addEventListener("click", () => {
    ctx.closePath();
    ctx.clearRect(0, 0, profileCanvas.width, profileCanvas.height);
    ctx.beginPath();
    drawActions = []; // Clear drawing actions
});

const startButton = document.querySelector(".start")!;
startButton.addEventListener('click', () => {
    createOrJoinMenu.style.display = "flex";
    homepage.style.display = "none";
    socket.emit("set username", homeInput.value);
    socket.emit("set profile picture", { "width": profileCanvas.width, "height": profileCanvas.height, "drawActions": drawActions });
});