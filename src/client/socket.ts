import {io, Socket} from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "../server/socket_types";

//const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000';
const URL = undefined;

export const socket: Socket<ServerToClientEvents,ClientToServerEvents> = io(URL);