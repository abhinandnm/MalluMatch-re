import { io } from 'socket.io-client';

const SOCKET_URL = 'https://mallumatch-api.onrender.com';
const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

export default socket;
