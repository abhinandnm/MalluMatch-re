/**
 * MatchMaker Service for MalluMatch
 */

class MatchMaker {
  constructor(io, bannedIPs, pastSessions) {
    this.io = io;
    this.bannedIPs = bannedIPs;
    this.pastSessions = pastSessions;
    this.videoQueue = [];
    this.textQueue = [];
    this.activeRooms = new Map(); // roomId -> { user1, user2, type, startTime, lastActivity, chatLogs, snapshots }
    this.userRooms = new Map(); // socketId -> roomId
    this.userIPs = new Map(); // socketId -> IP
    this.pendingDisconnections = new Map(); // socketId -> timeoutId
  }

  addUser(socket, type, interests = []) {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (this.bannedIPs.has(ip)) {
      socket.emit('banned', { message: `Your IP address has been banned for violating community guidelines.

⚔️ Take a few days off and come back when you're ready to follow the rules and be respectful to other users.

⚠️ Warning: Any further violation after your ban expires may result in a permanent lifetime ban with no further warnings.` });
      socket.disconnect();
      return;
    }
    this.userIPs.set(socket.id, ip);
    // If user is already in a queue, remove them first
    this.removeUserFromQueues(socket.id);
    
    const normalizedInterests = Array.isArray(interests) 
      ? interests.map(i => String(i).trim().toLowerCase()).filter(i => i)
      : [];
    
    socket.userInterests = normalizedInterests;
    
    const queue = type === 'video' ? this.videoQueue : this.textQueue;
    
    let partnerIndex = -1;
    let fallbackIndex = -1;

    for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        
        // Prevent matching with self
        if (p.id === socket.id) continue;

        const pInterests = p.userInterests || [];
        
        const shared = socket.userInterests.filter(int => pInterests.includes(int));
        
        if (shared.length > 0) {
            // Priority 1: Direct shared interest match
            partnerIndex = i;
            break; // Found the best possible match
        } else if (fallbackIndex === -1 && (socket.userInterests.length === 0 || pInterests.length === 0)) {
            // Priority 2: One side is "open" - save as fallback
            fallbackIndex = i;
        }
    }

    // If no direct match was found, use the first available fallback
    if (partnerIndex === -1) {
        partnerIndex = fallbackIndex;
    }

    if (partnerIndex !== -1) {
      // Find a match
      const partner = queue.splice(partnerIndex, 1)[0];
      const roomId = `room_${partner.id}_${socket.id}`;
      
      const sharedInterests = socket.userInterests.filter(int => (partner.userInterests || []).includes(int));
      let matchMsg = 'You are now chatting with a random stranger.';
      if (sharedInterests.length > 0) {
          matchMsg = `You both like ${sharedInterests.join(', ')}. Respect each other and have fun.`;
      }
      
      // Setup room
      partner.join(roomId);
      socket.join(roomId);
      
      this.activeRooms.set(roomId, { 
        user1: partner.id, 
        user2: socket.id, 
        type,
        startTime: Date.now(),
        lastActivity: Date.now(),
        chatLogs: [],
        snapshots: {}
      });
      this.userRooms.set(partner.id, roomId);
      this.userRooms.set(socket.id, roomId);
      
      this.io.to('admins').emit('active_rooms_update', Array.from(this.activeRooms.entries()));
      
      // Notify both that a match is found with asymmetric interest info
      partner.emit('match_found', { 
        roomId, 
        type, 
        message: matchMsg,
        commonInterests: sharedInterests,
        strangerInterests: socket.userInterests
      });
      
      socket.emit('match_found', { 
        roomId, 
        type, 
        message: matchMsg,
        commonInterests: sharedInterests,
        strangerInterests: partner.userInterests
      });
      
      // For WebRTC video chat, assign one as the initiator (polite/impolite pattern)
      if (type === 'video') {
         this.io.to(partner.id).emit('initiate_webrtc');
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

  handleDisconnect(socket, force = false) {
    // 1. Remove from queues
    this.removeUserFromQueues(socket.id);
    
    // 2. Handle room cleanup
    const roomId = this.userRooms.get(socket.id);
    if (!roomId) return;

    if (force) {
      // Clear any pending timeout
      const existingTimeout = this.pendingDisconnections.get(socket.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.pendingDisconnections.delete(socket.id);
      }
      this.terminateRoom(socket.id, roomId);
      return;
    }

    // Accidental disconnect - start grace period
    if (this.pendingDisconnections.has(socket.id)) return;

    const room = this.activeRooms.get(roomId);
    if (room) {
      const partnerId = room.user1 === socket.id ? room.user2 : room.user1;
      
      // Notify partner that stranger is reconnecting
      this.io.to(partnerId).emit('stranger_reconnecting', { message: 'Stranger connection lost. Waiting for reconnection...' });

      // Start grace period timeout
      const timeoutId = setTimeout(() => {
        this.terminateRoom(socket.id, roomId);
      }, 60000); // 60 seconds grace period

      this.pendingDisconnections.set(socket.id, timeoutId);
    }
  }

  terminateRoom(socketId, roomId) {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const partnerId = room.user1 === socketId ? room.user2 : room.user1;
    this.io.to(partnerId).emit('stranger_disconnected', { message: 'Stranger has left the chat.' });

    // Remove room metadata
    room.endTime = Date.now();
    this.pastSessions.unshift({ roomId, ...room });
    if (this.pastSessions.length > 500) this.pastSessions.length = 500;

    const mongoose = require('mongoose');
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const Session = require('../models/Session');
      new Session({
        roomId,
        user1: room.user1,
        user2: room.user2,
        type: room.type,
        startTime: room.startTime,
        endTime: room.endTime,
        chatLogs: room.chatLogs,
        snapshots: room.snapshots
      }).save().catch(err => console.error('Error saving session to MongoDB:', err));
    }

    this.activeRooms.delete(roomId);
    this.userRooms.delete(partnerId);
    this.userRooms.delete(socketId);
    this.pendingDisconnections.delete(socketId);

    this.io.to('admins').emit('active_rooms_update', Array.from(this.activeRooms.entries()));
    this.io.to('admins').emit('past_sessions_update', this.pastSessions);

    const partnerSocket = this.io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.leave(roomId);
    }
  }

  handleReconnect(socket) {
    // Clear any pending disconnection timeout
    const timeoutId = this.pendingDisconnections.get(socket.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingDisconnections.delete(socket.id);
      
      const roomId = this.userRooms.get(socket.id);
      if (roomId) {
        const room = this.activeRooms.get(roomId);
        if (room) {
          const partnerId = room.user1 === socket.id ? room.user2 : room.user1;
          this.io.to(partnerId).emit('stranger_reconnected', { message: 'Stranger is back!' });
        }
      }
    }
  }

  next(socket, type, interests = []) {
    // Treat as a FORCE disconnect from current chat, then re-enter queue
    this.handleDisconnect(socket, true);
    this.addUser(socket, type, interests);
  }
}

module.exports = MatchMaker;
