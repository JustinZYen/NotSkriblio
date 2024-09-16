(function script(socket) {
    // Create color buttons
    const colors = {
        "black":"#0000ff",
        "red":"#ff0000",
        "orange":"#ffa500",
        "yellow":"#ffff00",
        "green":"#008000",
        "blue":"#0000ff",
        "purple":"#800080",
        "white":"#ffffff"
    };
    class ColorButton {
        constructor(color) {
            this.color = color;
            const item = document.createElement("button");
            item.classList.add("color-button");
            item.style.backgroundColor = color;
            return item;
        }
    }
    
    // Create the various buttons for the colors that you can draw in
    const colorContainer = document.querySelector(".color-container");
    for (const color of Object.keys(colors)) {
        colorContainer.appendChild(new ColorButton(color));
    }
    /*
    colorContainer.appendChild(new ColorButton("black"));
    colorContainer.appendChild(new ColorButton("red"));
    colorContainer.appendChild(new ColorButton("orange"));
    colorContainer.appendChild(new ColorButton("yellow"));
    colorContainer.appendChild(new ColorButton("green"));
    colorContainer.appendChild(new ColorButton("blue"));
    colorContainer.appendChild(new ColorButton("purple"));
    colorContainer.appendChild(new ColorButton("white"));
    */

    
    //const colors = colorContainer.children;

    // region - Chat message handling
    let form = document.getElementById('form');
    let input = document.getElementById('chat-input');
    let log = document.querySelector('#log');
    // Listening for chat messages from user
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('submitted');
        socket.emit('chat message', input.value);
        console.log(input.value);
        input.value = '';
    });
    // Listening for chat messages from server
    socket.on('chat message', (msg) => {
        const item = document.createElement('p');
        item.textContent = msg;
        log.appendChild(item);
        log.scrollTop = log.scrollHeight;
    });
    // endregion
    
    // region Handling drawing
    // region Begin canvas for drawing on
    const canvas = document.getElementById("my-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 500;
    canvas.height = 500;
    ctx.lineCap = "round";
    ctx.fillStyle = "white";
    // endregion
    // region Listeners for drawing-related actions
    // Tracking status of mouse for drawing
    let mouseDown = false;
    document.addEventListener("mousedown",()=>{
        mouseDown = true;
    });
    document.addEventListener("mouseup",()=>{
        mouseDown = false;
    });

    canvas.addEventListener("mousemove",(event)=>{
        const rect = event.target.getBoundingClientRect();
        if (mouseDown) {
            socket.emit("line drawn",{"x":event.clientX-rect.left,"y":event.clientY-rect.top});
        } else {
            socket.emit("line moved",{"x":event.clientX-rect.left,"y":event.clientY-rect.top});
        }
    });

    canvas.addEventListener("click",event => {
        if (document.getElementById("drawing-type-selector").checked) {
            socket.emit("fill area",{"x":event.offsetX,"y":event.offsetY})
        }
    });

    const widthSlider = document.getElementById("line-width-slider");
    widthSlider.addEventListener("input",()=>{
        socket.emit("line width change",widthSlider.value);
    })
    const clearButton = document.getElementById("clear-button");
    clearButton.addEventListener("click",()=>{
        socket.emit("clear canvas");
    })

    let strokeColor = "black";
    $(".color-button").on("click",event => {
        strokeColor = $(event.currentTarget).css("background-color")
        socket.emit("color change",strokeColor);
    });
    // endregion
    // region Listeners for drawing actions from the server
    socket.on("drawing information request", ()=>{        
        socket.emit("line width change",widthSlider.value);
        socket.emit("color change",strokeColor);
    });

    let x = 0;
    let y = 0;
    socket.on("line drawn",(msg)=>{
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(msg.x,msg.y);
        x = msg.x;
        y = msg.y;
        ctx.stroke();
    });
    socket.on("line moved",(msg)=>{
        x = msg.x;
        y = msg.y;
    });
    socket.on("fill area",(msg)=>{
        function getRGB(rgbString) {
            // Taken from https://www.30secondsofcode.org/js/s/rgb-to-array-or-object/
            return rgbString.match(/\d+/g).map(Number);
        }
        const mouseX = Math.round(msg.x);
        const mouseY = Math.round(msg.y);
        const targetColor = getRGB(strokeColor);
        const img = ctx.getImageData(0,0,canvas.width,canvas.height)
        const imgData = img.data;
        console.log(imgData.length);
        const pixelStack = [(mouseX+mouseY*canvas.width)*4]; // Put first element into pixel stack as index of first value representing a single pixel
        const startColor = imgData.slice(pixelStack[0],pixelStack[0]+3);
        if (targetColor[0] == startColor[0] && targetColor[1] == startColor[1] && targetColor[2] == startColor[2]) {
            console.log("target color matches start color!");
            return;
        }
        console.log("start color: "+startColor);
        while (pixelStack.length > 0) {
            let currentPixel = pixelStack.pop();
            let higherPixel = currentPixel - canvas.width*4; // Get pixel exactly above current pixel
            while (higherPixel > 0 && colorMatches(higherPixel)) {
                currentPixel = higherPixel;
                higherPixel -= canvas.width * 4;
            }
            let canAddLeft = ((currentPixel/4) % (canvas.width)) > 0;
            let canAddRight = ((currentPixel/4) % (canvas.width)) < (canvas.width-1);
            let addedLeft = false;
            let addedRight = false;
            while (currentPixel < imgData.length && colorMatches(currentPixel)) {
                colorPixel(currentPixel);
                
                if (canAddLeft) {
                    const leftPixel = currentPixel-4;
                    if (colorMatches(leftPixel)) {
                        if (!addedLeft) {
                            pixelStack.push(leftPixel);
                            addedLeft = true;
                        }
                    } else{
                        addedLeft = false;
                    }
                }
                if (canAddRight) {
                    const rightPixel = currentPixel+4;
                    if (colorMatches(rightPixel)) {
                        if (!addedRight) {
                            pixelStack.push(rightPixel);
                            addedRight = true;
                        }
                    } else{
                        addedRight = false;
                    }
                }
                
                currentPixel += canvas.width * 4;  
            }
        }

        function colorMatches(pixelIndex) {
            //console.log("pixelIndex: "+pixelIndex);
            return imgData[pixelIndex] == startColor[0] && 
            imgData[pixelIndex+1] == startColor[1] && 
            imgData[pixelIndex+2] == startColor[2];
        }

        function colorPixel(pixelIndex) {
            //console.log("color matches now?"+colorMatches(pixelIndex));
            //console.log("coloring...")
            imgData[pixelIndex] = targetColor[0];
            imgData[pixelIndex+1] = targetColor[1];
            imgData[pixelIndex+2] = targetColor[2];
            //console.log("color still matches?"+colorMatches(pixelIndex));
        }
        ctx.putImageData(img, 0, 0);
    });
    socket.on("line width change", (newWidth)=>{
        ctx.lineWidth = newWidth;
    });
    socket.on("color change",(msg)=>{
        ctx.strokeStyle = msg;
    });
    socket.on("clear canvas",()=>{
        ctx.fillRect(0,0,canvas.width,canvas.height);
    })
    // endregion
    // endregion
    
    let h1 = document.getElementById("word-bar");
    socket.on("new word", (activeWordLength) => {
        console.log("new word event received by user");
        h1.textContent = '';
        for (let i = 0; i < activeWordLength; i++) {
            h1.textContent += '_ ';
        }
    });

    const userContainer = document.getElementById("users");
    let activeUser = null;
    socket.on("new user", (userData) => {
        console.log("user data: "+userData);
        // Create name tag
        const user = document.createElement("div");
        user.classList.add("user");
        user.id = userData.id;
        const nickname = document.createElement("p");
        nickname.textContent = userData.username;
        nickname.classList.add("nickname");
        userContainer.appendChild(user);
        // Create profile picture
        const pfp = document.createElement("canvas");
        const pfpContext = pfp.getContext("2d");
        pfpContext.beginPath();
        pfpContext.moveTo(0,0);
        pfp.width = 50;
        pfp.height = 50;
        const widthMultiplier = pfp.width/userData.profilePicture.width;
        const heightMultiplier = pfp.height/userData.profilePicture.height;
        const drawInstructions = userData.profilePicture.drawActions;
        for (const instruction of drawInstructions) {
            if (instruction.action == "line drawn") {
                pfpContext.lineTo(instruction.params.x*widthMultiplier,instruction.params.y*heightMultiplier);
                pfpContext.stroke();
            } else if (instruction.action == "line moved") {
                pfpContext.moveTo(instruction.params.x*widthMultiplier,instruction.params.y*heightMultiplier);
            } else {
                console.log("Instruction "+instruction.action+" is not a valid action");
            }
        }
        const score = document.createElement("p");
        score.classList.add("score");
        score.innerText = "Score: 0";
        user.appendChild(pfp);
        user.appendChild(nickname);
        user.appendChild(score);
    });

    socket.on("remove user", (userId) => {
        document.getElementById(userId).remove();
    })

    socket.on("new active user", (userId) => {
        if (activeUser) {
            document.getElementById(activeUser).style["background-color"] = "white";
        }
        activeUser = userId;
        document.getElementById(userId).style["background-color"] = "yellow";
    });
    const timer = document.getElementById("timer");
    socket.on("timer change", (time)=>{
        timer.textContent = time;
        if (time == 0) {
            socket.emit("display scores");
        }
    });

    socket.on("score change", (scoreData) => {
        document.querySelector("#"+scoreData.userId+" .score").innerText = "Score: " + scoreData.score;
    });

    socket.on('display scores', (lobbyData)=> {
        // let tempUser = document.createElement('div');
        // tempUser.classList.add('tempUser');j
        // tempUser.textContent = user.username;
        // roundPlaceholder.appendChild(tempUser);
        document.getElementById("round-placeholder").style.display = "flex";
        setTimeout(()=>{
            document.getElementById("round-placeholder").style.display = "none";
        }, lobbyData.BETWEEN_ROUNDS_MS);
        console.log(lobbyData.userData);
    });

    // socket.on("new round", ()=>{
    //     console.log("new round");
    //     document.getElementById("round-placeholder").style.display = "block";
    //     setTimeout(()=>{
    //         document.getElementById("round-placeholder").style.display = "none";
    //     },3000);
    // });

    
}(socket));