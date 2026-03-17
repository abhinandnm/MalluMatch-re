import { io } from 'socket.io-client';

const SOCKET_URL = 'https://mallumatch-api.onrender.com';
const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true
});

export default socket;
