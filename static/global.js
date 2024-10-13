"use strict";
// Causes error in tsc but this is the only way I could figure out to get it working
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
const socket = io();
export { socket };
