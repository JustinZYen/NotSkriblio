import { useEffect, useRef, useState } from "react";
import { DrawActionName } from "../../../server/DrawAction";
import { socket } from "../../socket";
import gameCanvasCSS from "./GameCanvas.module.css";

const colors = ["black", "red", "orange", "yellow", "green", "blue", "purple", "white"];
const initialLineWidth = 5;

type GameCanvasProps = {
    canvasRef: React.RefObject<HTMLCanvasElement|null>
}



function GameCanvas({ canvasRef }: GameCanvasProps) {
    const selectedColor = useRef(colors[0]);
    const useFill = useRef(false);
    const lineWidth = useRef(initialLineWidth);
    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 600;

    function getScaledMousePos(e: MouseEvent) {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log("Canvas ref does not exist");
            return;
        }
        const boundingRect = canvas.getBoundingClientRect();
        const mouseX = e.pageX - boundingRect.left;
        const mouseY = e.pageY - boundingRect.top;
        const scaledX = mouseX * CANVAS_WIDTH / boundingRect.width;
        const scaledY = mouseY * CANVAS_HEIGHT / boundingRect.height;
        return [scaledX,scaledY];
    }

    useEffect(() => {
        const canvas = canvasRef.current!; // Should be guaranteed to have a ref at the time useEffect is called
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        console.log(`Canvas real width: ${canvas.getBoundingClientRect().width}`);
        ctx.fillStyle="white";
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill does not work properly without this
        let mouseDown = false;
        let prevY = 0;
        let prevX = 0;

        function mouseDownEvent(e: MouseEvent) {
            mouseDown = true;
            [prevX,prevY] = getScaledMousePos(e)!;
            if (useFill.current == true) {
                fillArea(e);
            }
        }

        function mouseUpEvent() {
            mouseDown = false;
        }

        function mouseMoveEvent(e: MouseEvent) {
            if (!mouseDown || useFill.current == true) {
                return // Nothing to be done here
            }
            const [newX,newY] = getScaledMousePos(e)!;
            socket.emit("gameDrawAction",{
                action: DrawActionName.Draw,
                startX:prevX,
                startY:prevY,
                endX:newX ,
                endY:newY ,
                color:selectedColor.current,
                lineWidth:lineWidth.current
            })
            prevX = newX;
            prevY = newY;
        }
        document.addEventListener("mousedown", mouseDownEvent);
        document.addEventListener("mouseup", mouseUpEvent);
        document.addEventListener("mousemove", mouseMoveEvent);
        return () => {
            document.removeEventListener("mousedown", mouseDownEvent);
            document.removeEventListener("mouseup", mouseUpEvent);
            document.removeEventListener("mousemove", mouseMoveEvent);
        }
    }, []);

    function clearCanvas() {
        socket.emit("gameDrawAction",{
            action: DrawActionName.Clear
        });
    }

    function fillArea(e: MouseEvent) {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log("Canvas ref does not exist");
            return;
        }
        const [newX,newY] = getScaledMousePos(e)!;
        if (newX < 0 || newX > CANVAS_WIDTH || newY < 0 || newY > CANVAS_HEIGHT) {
            return; // Clicked out of bounds of canvas
        }
        const targetColor = selectedColor.current;
        socket.emit("gameDrawAction",{
            action: DrawActionName.Fill,
            x:newX,
            y:newY,
            color:targetColor
        })
    }

    return (
        <div className={gameCanvasCSS["game-canvas"]}>
            <canvas className={gameCanvasCSS["my-canvas"]} ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}></canvas>
            <div className={gameCanvasCSS["drawing-options"]}>
                <div className={gameCanvasCSS["adjust"]}>
                    <p>line thickness:</p>
                    <input type="range" min="1" max="20" defaultValue={initialLineWidth} id="line-width-slider" onChange={(e)=>{lineWidth.current = parseInt(e.target.value)}}/>
                </div>
                <div id="reset">
                    <button id="clear-button" onClick={clearCanvas}>Clear Drawing</button>
                </div>
                <div className={gameCanvasCSS["color-container"]}>
                    {colors.map((color) =>
                        <button key={color} onClick={() => { selectedColor.current = color }} style={{
                            backgroundColor: color
                        }}>
                        </button>
                    )}
                </div>
                <div className={gameCanvasCSS["drawing-type"]}>
                    <p>Use fill tool?</p>
                    <input type="checkbox" id="drawing-type-selector" onChange={(e) => { useFill.current = e.target.checked }} />
                </div>
            </div >
        </div>
    )
}

export { GameCanvas };