import { useNavigate } from "react-router-dom";
import { PageRoutes } from "../../organization/routes";
import { useEffect, useRef, useState } from "react";
import { socket } from "../../socket";
import { DrawAction, DrawActionName } from "../../../server/DrawAction";
import  homeCSS  from "./Home.module.css";
import arrow from "../../assets/arrow-left-bottom.svg";


type HomeProps = {
    setStarted: React.Dispatch<React.SetStateAction<boolean>>
}
function Home({ setStarted }: HomeProps) {
    const navigate = useNavigate();

    // refs
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const usernameRef = useRef<HTMLInputElement | null>(null);

    // state
    const [canvasActions, setCanvasActions] = useState<DrawAction[]>([]);
    useEffect(() => {
        const canvas = canvasRef.current!; // Should be guaranteed to have a ref at the time useEffect is called
        const ctx = canvas.getContext("2d")!;
        let mouseDown = false;
        let prevY = 0;
        let prevX = 0;
        function mouseDownEvent(e: MouseEvent) {
            mouseDown = true;
            const boundingRect = canvas.getBoundingClientRect();
            prevX = e.pageX - boundingRect.left;
            prevY = e.pageY - boundingRect.top;
        }

        function mouseUpEvent() {
            mouseDown = false;
        }

        function mouseMoveEvent(e: MouseEvent) {
            if (!mouseDown) {
                return // Nothing to be done here
            }
            const boundingRect = canvas.getBoundingClientRect();
            const newX = e.pageX - boundingRect.left;
            const newY = e.pageY - boundingRect.top;
            ctx.beginPath();
            //console.log(`prevX ${prevX}, prevY ${prevY}, newX ${newX}, newY ${newY}`);
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(newX, newY);
            ctx.stroke();
            const newAction: DrawAction = {
                action: DrawActionName.Draw,
                startX: prevX,
                startY: prevY,
                endX: newX,
                endY: newY,
                color: "black",
                lineWidth: 100000 // Not used currently
            }
            setCanvasActions(prevActions => [...prevActions, newAction])
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
        const canvas = canvasRef.current!; // Should be guaranteed to have a ref at the time useEffect is called
        const ctx = canvas.getContext("2d")!;
        ctx.closePath();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        setCanvasActions([]); // Clear recorded canvas actions
    }

    function getStarted() {
        socket.emit("setUsername", usernameRef.current!.value);
        const canvas = canvasRef.current!;
        socket.emit("setProfilePicture", {
            height: canvas.height,
            width: canvas.width,
            drawActions: canvasActions
        })
        setStarted(true);
        navigate(PageRoutes.LobbySelect)
    }
    return (
        <div className={homeCSS["home"]}>
            <h1>NotSkribbl.io</h1>
            <div className={homeCSS["center-container"]}>
                <figure>
                    <div className={homeCSS["description"]}>
                        <h3>Draw me!</h3>
                        <img src={arrow} className={homeCSS["description-decoration"]} alt="arrow" />
                    </div>
                    <canvas id="home-canvas" style={{ border: "1px solid black" }} ref={canvasRef}></canvas>
                    <button id="canvas-reset" onClick={clearCanvas}>reset</button>
                </figure>
                <h3>My name is...</h3>
                <input type="text" id="set-username" autoComplete="off" placeholder="Enter your username" maxLength={25} ref={usernameRef} />
                <button className={homeCSS["start"]} onClick={getStarted}>Start!</button>
            </div>
        </div>
    )
}

export { Home };