# NotSkribblio
Webpage available at: https://notskriblio.onrender.com/

Remake of the web game Skribbl.io using Socket.io for simultaneous two-way communication and Express.JS for backend

![Image ingame](./notskriblio_apple.png)

## How It's Made: 

[![Skills](https://skillicons.dev/icons?i=nodejs,express,js,ts,html,css)](https://skillicons.dev)
<img src="https://socket.io/images/logo.svg" alt="socket.io logo" height="50">

NotSkribblio is built using Node.js with a backend powered by Express.js, while Socket.IO enables real-time, bidirectional communication between the server and clients for instant updates during the game. The code is written in TypeScript, providing type safety and enhanced developer experience. The user interface is styled with basic CSS, ensuring a clean and responsive design for an intuitive gameplay experience. Together, these technologies create a smooth, interactive drawing and guessing game with seamless multiplayer functionality.

## Optimizations/Other

Plans for changes:
- Make something show up when the game ends
   - Display final rankings
   - Players stay in the game, but their scores are reset
- undo/redo buttons (hard to implement)
- Make score show only when the current round ends
- reset room when game ends
- Add icon to the site
- Make clicking without dragging on the canvas draw a circle
Bugs:
- Lobbies can be abused by manually changing view of the page to join lobbies repeatedly
- If the active user leaves the game, the next user becomes the active user but with the now-lowered timer duration
- If game runs for too long, timer counts down far too quickly