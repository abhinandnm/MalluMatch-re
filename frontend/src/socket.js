import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://mallumatch-chat.duckdns.org');

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 45000,
  transports: ['polling', 'websocket'],
  withCredentials: true
});

socket.on("connect_error", (error) => {
  console.error("Socket Connection Error:", error.message);
  if (error.description) console.error("Error Description:", error.description);
  if (error.context) console.error("Error Context:", error.context);
});

export default socket;
