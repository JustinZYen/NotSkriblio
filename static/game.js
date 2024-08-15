(function script(socket) {
    // Create color buttons
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
    colorContainer.appendChild(new ColorButton("black"));
    colorContainer.appendChild(new ColorButton("red"));
    colorContainer.appendChild(new ColorButton("orange"));
    colorContainer.appendChild(new ColorButton("yellow"));
    colorContainer.appendChild(new ColorButton("green"));
    colorContainer.appendChild(new ColorButton("blue"));
    colorContainer.appendChild(new ColorButton("purple"));
    colorContainer.appendChild(new ColorButton("white"));


    // Begin canvas for drawing on
    const canvas = document.getElementById("my-canvas");
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(0,0);
    canvas.width = 500;
    canvas.height = 500;

    // Tracking status of mouse for drawing
    let mouseDown = false;
    document.addEventListener("mousedown",()=>{
        mouseDown = true;
    });
    document.addEventListener("mouseup",()=>{
        mouseDown = false;
    });

    //const colors = colorContainer.children;
    let form = document.getElementById('form');

   

    // let body = document.getElementById("body-content");
    // body.appendChild(colorContainer);

    /*
    $(".color-button").on("click",event => {
        ctx.closePath();
        ctx.strokeStyle = $(event.currentTarget).css("background-color");
        ctx.beginPath();
    });
    */

    let input = document.getElementById('chat-input');
    let log = document.querySelector('#log');


    form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('submitted');
        socket.emit('chat message', input.value);
        console.log(input.value);
        input.value = '';
    });

    socket.on('chat message', (msg) => {
        const item = document.createElement('p');
        item.textContent = msg;
        log.appendChild(item);
        log.scrollTop = log.scrollHeight;
    });

    // Listeners for drawing-related actions
    canvas.addEventListener("mousemove",(event)=>{
        var rect = event.target.getBoundingClientRect();
        if (mouseDown) {
            socket.emit("line drawn",{"x":event.clientX-rect.left,"y":event.clientY-rect.top});
        } else {
            socket.emit("line moved",{"x":event.clientX-rect.left,"y":event.clientY-rect.top});
        }
    });
    const widthSlider = document.getElementById("line-width-slider");
    widthSlider.addEventListener("input",(event)=>{
        socket.emit("line width change",event.target.value);
    })
    $(".color-button").on("click",event => {
        socket.emit("color change",$(event.currentTarget).css("background-color"));
    });


    socket.on("line drawn",(msg)=>{
        ctx.lineTo(msg.x,msg.y);
        ctx.stroke();
    });
    socket.on("line moved",(msg)=>{
        ctx.moveTo(msg.x,msg.y);
    });
    socket.on("line width change", (newWidth)=>{
        ctx.closePath();
        ctx.lineWidth = newWidth;
        ctx.beginPath();
    });
    socket.on("color change",(msg)=>{
        ctx.closePath();
        ctx.strokeStyle = msg;
        ctx.beginPath();
    });
    socket.on("clear canvas",()=>{
        ctx.closePath();
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();
    })

    let h1 = document.getElementById("word-bar");
    socket.on("new word", (activeWordLength) => {
        console.log("new word event received by user");
        h1.textContent = '';
        for (let i = 0; i < activeWordLength; i++) {
            h1.textContent += '_ ';
        }
    });

    const userContainer = document.getElementById("users");

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

    const timer = document.getElementById("timer");
    socket.on("timer change", (time)=>{
        timer.textContent = time;
    });

    socket.on("score change", (scoreData) => {
        document.querySelector("#"+scoreData.userId+" .score").innerText = "Score: " + scoreData.score;
    })

    socket.on("new round", ()=>{
        console.log("new round");
        document.getElementById("round-placeholder").style.display = "block";
        setTimeout(()=>{
            document.getElementById("round-placeholder").style.display = "none";
        },3000);
    });

}(socket));