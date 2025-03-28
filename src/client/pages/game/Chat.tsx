import { useRef } from "react";
import { socket } from "../../socket";

import chatCSS from "./Chat.module.css";

type ChatProps = {
    messages: string[]
}
function Chat({ messages }: ChatProps) {
    const messageBox = useRef<HTMLInputElement | null>(null);

    function sendMessage(e:React.FormEvent) {
        console.log("sending message");
        e.preventDefault();
        const message = messageBox.current!.value;
        socket.emit("message", message);
        messageBox.current!.value = ""; // Clear message box
    }

    return (
        <form className={chatCSS["form"]} onSubmit={sendMessage}>
            <div className={chatCSS["log"]}>
                {messages.map(
                    (message, index) => <li key={index}>{message}</li>
                )}
            </div>
            <input type="text" id="chat-input" autoComplete="off" ref={messageBox} />
        </form>)
}

export { Chat };