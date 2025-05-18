import "./theme.css";

import { act, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./pages/home/Home";
import { LobbySelect } from "./pages/lobby_select/LobbySelect";
import { PageRoutes } from "./organization/routes";
import { JoinLobby } from "./pages/join_lobby/JoinLobby";
import { CreateLobby } from "./pages/create_lobby/CreateLobby";
import { socket } from "./socket";
import { Game } from "./pages/game/Game";
import { Redirector } from "./helpers/Redirector";
import { UserData } from "../server/User";
import { DrawAction, DrawActionName } from "../server/DrawAction";

function App() {
  const [rooms, setRooms] = useState<string[]>([]);
  const [started, setStarted] = useState(false); // Keep track of whether the player has interacted with the home screen
  const [users, setUsers] = useState(new Map<string, UserData>());
  const [activeUser, setActiveUser] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<string[]>([]);
  const [displayingScores, setDisplayingScores] = useState(false);
  const [time, setTime] = useState<number | undefined>(undefined);
  const [wordLength, setWordLength] = useState<number|undefined>(undefined);

  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const undrawnActions = useRef<DrawAction[]>([]);

  function handleDrawAction(action: DrawAction) {
    const canvas = gameCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      function fillArea(x: number, y: number, color: string) {
        if (!canvas) {
          console.log("trying to fill area when canvas ref does not exist");
          return;
        }
        function getRGB(color: string) {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
          tempCtx.fillStyle = color;
          tempCtx.fillRect(0, 0, 1, 1);
          const data = tempCtx.getImageData(0, 0, 1, 1).data;
          return [data[0], data[1], data[2]];
        }

        function colorMatches(pixelIndex: number) {
          //console.log("pixelIndex: "+pixelIndex);
          return imgData[pixelIndex] == startColor[0] &&
            imgData[pixelIndex + 1] == startColor[1] &&
            imgData[pixelIndex + 2] == startColor[2];
        }
        function colorPixel(pixelIndex: number) {
          //console.log("color matches now?"+colorMatches(pixelIndex));
          //console.log("coloring...")
          imgData[pixelIndex] = targetColor[0]!;
          imgData[pixelIndex + 1] = targetColor[1]!;
          imgData[pixelIndex + 2] = targetColor[2]!;
          //console.log("color still matches?"+colorMatches(pixelIndex));
        }
        const mouseX = Math.round(x);
        const mouseY = Math.round(y);
        const targetColor = getRGB(color);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const imgData = img.data;
        console.log(imgData.length);
        const pixelStack = [(mouseX + mouseY * canvas.width) * 4]; // Put first element into pixel stack as index of first value representing a single pixel
        const startColor = imgData.slice(pixelStack[0], pixelStack[0]! + 3);
        if (targetColor[0] == startColor[0] && targetColor[1] == startColor[1] && targetColor[2] == startColor[2]) {
          return;
        }
        while (pixelStack.length > 0) {
          let currentPixel = pixelStack.pop()!;
          let higherPixel = currentPixel - canvas.width * 4; // Get pixel exactly above current pixel
          while (higherPixel > 0 && colorMatches(higherPixel)) {
            currentPixel = higherPixel;
            higherPixel -= canvas.width * 4;
          }
          let canAddLeft = ((currentPixel / 4) % (canvas.width)) > 0;
          let canAddRight = ((currentPixel / 4) % (canvas.width)) < (canvas.width - 1);
          let addedLeft = false;
          let addedRight = false;
          while (currentPixel < imgData.length && colorMatches(currentPixel)) {
            colorPixel(currentPixel);

            if (canAddLeft) {
              const leftPixel = currentPixel - 4;
              if (colorMatches(leftPixel)) {
                if (!addedLeft) {
                  pixelStack.push(leftPixel);
                  addedLeft = true;
                }
              } else {
                addedLeft = false;
              }
            }
            if (canAddRight) {
              const rightPixel = currentPixel + 4;
              if (colorMatches(rightPixel)) {
                if (!addedRight) {
                  pixelStack.push(rightPixel);
                  addedRight = true;
                }
              } else {
                addedRight = false;
              }
            }
            currentPixel += canvas.width * 4;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      switch (action.action) {
        case DrawActionName.Clear:
          ctx.closePath();
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.beginPath();
          break;
        case DrawActionName.Draw:
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.lineWidth;
          ctx.moveTo(action.startX, action.startY);
          ctx.lineTo(action.endX, action.endY);
          ctx.stroke();
          break;
        case DrawActionName.Fill:
          fillArea(action.x, action.y, action.color);
          break;
        default:
          console.log("Unhandled draw action");
      }
    } else {
      console.log("received draw action that cannot be drawn (canvas ref missing)");
      undrawnActions.current.push(action);
    }
  }
  useEffect(() => { // Event listener for game canvas events specifically, as they are more complex
    socket.on("gameDrawAction", handleDrawAction);
    return () => {
      socket.off("gameDrawAction", handleDrawAction);
    }
  }, [])

  useEffect(() => { // Set up socket event listeners
    function addRoom(roomName: string) {
      console.log("adding new room with name " + roomName);
      setRooms(prevRooms => [...prevRooms, roomName]);
    }

    function processUsersList(usersData: UserData[]) {
      const newMap = new Map<string, UserData>();
      for (const user of usersData) {
        newMap.set(user.id, user);
      }
      setUsers(newMap);
    }

    function addNewUser(user: UserData) {
      setUsers(prevUsers => {
        const newMap = new Map(prevUsers);
        newMap.set(user.id, user);
        return newMap;
      });
    }

    function removeUser(userId: string) {
      setUsers(prevUsers => {
        const newMap = new Map(prevUsers);
        newMap.delete(userId);
        return newMap;
      });
    }

    function addNewMessage(message: string) {
      setMessages(prevMessages => [...prevMessages, message]);
    }

    function newActiveUser({ newUserId }: { newUserId?: string }) { // Prev user not really necessary for this implementation
      setActiveUser(newUserId);
    }

    function handleScoreChange({ userId, score }: { userId: string, score: number }) {
      setUsers(prevUsers => {
        const newMap = new Map(prevUsers);
        const targetUser = newMap.get(userId)
        if (targetUser) {
          targetUser.score = score;
        }
        return newMap;
      })
    }

    function enableScoreDisplay() {
      setDisplayingScores(true);
    }

    function disableScoreDisplay() {
      setDisplayingScores(false);
    }

    function setNewTime(newTime: number | undefined) {
      setTime(newTime);
    }

    function setNewWordLength(newWordLength:number) {
      setWordLength(newWordLength);
    }

    socket.on("newRoom", addRoom);

    // Room emits
    socket.on("intialUserList", processUsersList);
    socket.on("newUser", addNewUser);
    socket.on("removeUser", removeUser);
    socket.on("message", addNewMessage)
    socket.on("newActiveUser", newActiveUser)
    socket.on("scoreChange", handleScoreChange);
    socket.on("displayScores", enableScoreDisplay);
    socket.on("stopDisplayScores", disableScoreDisplay);
    socket.on("timeChange", setNewTime);
    socket.on("newWord",setNewWordLength);
    return () => { // Clean up socket event listeners (better style or something)
      socket.off("newRoom", addRoom);
      socket.off("intialUserList", processUsersList);
      socket.off("newUser", addNewUser);
      socket.off("removeUser", removeUser);
      socket.off("message", addNewMessage);
      socket.off("newActiveUser", newActiveUser);
      socket.off("scoreChange", handleScoreChange);
      socket.off("displayScores", enableScoreDisplay);
      socket.off("stopDisplayScores", disableScoreDisplay);
      socket.off("timeChange", setNewTime);
      socket.off("newWord",setNewWordLength);
    }
  }, [])

  useEffect(() => { // Try to draw draw actions that were received while canvas was not mounted (maybe not the best way)
    const canvas = gameCanvasRef.current;
    if (canvas) {
      const actions = undrawnActions.current;
      while (actions.length > 0) {
        handleDrawAction(actions.shift()!);
      }
    }
  })

  return (
    <BrowserRouter>
      <Routes>
        <Route path={PageRoutes.Home} element={
          <Home setStarted={setStarted} />
        } />
        <Route path={PageRoutes.LobbySelect} element={
          <Redirector valid={started}>
            <LobbySelect />
          </Redirector>
        } />
        <Route path={PageRoutes.JoinLobby} element={
          <Redirector valid={started}>
            <JoinLobby rooms={rooms} />
          </Redirector>
        } />
        <Route path={PageRoutes.CreateLobby} element={
          <Redirector valid={started}>
            <CreateLobby />
          </Redirector>
        } />
        <Route path={PageRoutes.Game} element={
          <Redirector valid={started}>
            <Game users={users} activeUserId={activeUser} messages={messages}  displayScores={displayingScores} time={time} wordLength={wordLength} canvasRef={gameCanvasRef}/>
          </Redirector>
        } />
        <Route path={"/*"} element={
          <Navigate to={PageRoutes.Home}></Navigate>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export { App };
