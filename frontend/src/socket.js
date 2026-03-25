import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://mallumatch-chat.duckdns.org';
const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 20000,
  transports: ['websocket', 'polling']
});

socket.on("connect_error", (error) => {
  console.error("Socket Connection Error:", error.message);
  if (error.description) console.error("Error Description:", error.description);
  if (error.context) console.error("Error Context:", error.context);
});

export default socket;
