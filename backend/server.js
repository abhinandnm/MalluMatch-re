require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

class MatchMaker {
  constructor() {
    this.videoQueue = [];
    this.textQueue = [];
    this.activeRooms = new Map(); // roomId -> { user1, user2, type }
    this.userRooms = new Map(); // socketId -> roomId
  }

  addUser(socket, type) {
    // If user is already in a queue, remove them first
    this.removeUserFromQueues(socket.id);
    
    const queue = type === 'video' ? this.videoQueue : this.textQueue;
    
    if (queue.length > 0) {
      // Find a match
      const partner = queue.shift();
      const roomId = `room_${partner.id}_${socket.id}`;
      
      // Setup room
      partner.join(roomId);
      socket.join(roomId);
      
      this.activeRooms.set(roomId, { user1: partner.id, user2: socket.id, type });
      this.userRooms.set(partner.id, roomId);
      this.userRooms.set(socket.id, roomId);
      
      // Notify both that a match is found
      io.to(roomId).emit('match_found', { 
        roomId, 
        type, 
        message: 'You are now chatting with a random stranger.' 
      });
      
      // For WebRTC video chat, assign one as the initiator (polite/impolite pattern)
      if (type === 'video') {
         io.to(partner.id).emit('initiate_webrtc');
      }
    } else {
      // Add to queue
      queue.push(socket);
    }
  }

  removeUserFromQueues(socketId) {
    this.videoQueue = this.videoQueue.filter(s => s.id !== socketId);
    this.textQueue = this.textQueue.filter(s => s.id !== socketId);
  }

  handleDisconnect(socket) {
    // 1. Remove from queues
    this.removeUserFromQueues(socket.id);
    
    // 2. Remove from active rooms and notify partner
    const roomId = this.userRooms.get(socket.id);
    if (roomId) {
      const room = this.activeRooms.get(roomId);
      if (room) {
        const partnerId = room.user1 === socket.id ? room.user2 : room.user1;
        io.to(partnerId).emit('stranger_disconnected', { message: 'Stranger has disconnected.' });
        
        // Remove room metadata
        this.activeRooms.delete(roomId);
        this.userRooms.delete(partnerId);
        
        // Partner leaves the socket room
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.leave(roomId);
        }
      }
      this.userRooms.delete(socket.id);
    }
  }

  next(socket, type) {
    // Treat as a disconnect from current chat, then re-enter queue
    this.handleDisconnect(socket);
    this.addUser(socket, type);
  }
}

const matchMaker = new MatchMaker();

let onlineUsers = 0;

io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('online_users', onlineUsers);

  socket.on('join_queue', ({ type }) => {
    // type: 'video' | 'text'
    matchMaker.addUser(socket, type);
  });

  socket.on('next_stranger', ({ type }) => {
    matchMaker.next(socket, type);
  });
  
  socket.on('stop_chat', () => {
     matchMaker.handleDisconnect(socket);
  });

  // Signaling messages for WebRTC
  socket.on('webrtc_offer', (data) => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('webrtc_offer', data);
    }
  });

  socket.on('webrtc_answer', (data) => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('webrtc_answer', data);
    }
  });

  socket.on('webrtc_ice_candidate', (data) => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('webrtc_ice_candidate', data);
    }
  });
  
  // Text Chat messages
  socket.on('chat_message', (msg) => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('chat_message', { sender: 'stranger', text: msg });
    }
  });

  // Admin handles a global broadcast
  socket.on('admin_broadcast', ({ message, password }) => {
    // Simple admin password check
    if (password === 'ccyr0149') {
      io.emit('global_announcement', { message });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers--;
    io.emit('online_users', onlineUsers);
    matchMaker.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
