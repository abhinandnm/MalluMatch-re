require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const bannedIPs = new Set();
const reports = [];
const liveLogs = []; // Feed of all text messages
const safetyViolations = [];
const userStrikes = new Map(); // IP -> count
const pastSessions = []; // Past 12 hours sessions

class MatchMaker {
  constructor() {
    this.videoQueue = [];
    this.textQueue = [];
    this.activeRooms = new Map(); // roomId -> { user1, user2, type }
    this.userRooms = new Map(); // socketId -> roomId
    this.userIPs = new Map(); // socketId -> IP
  }

  addUser(socket, type, interests = []) {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (bannedIPs.has(ip)) {
      socket.emit('banned', { message: 'Your IP is banned for violating community guidelines.' });
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
    for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        const pInterests = p.userInterests || [];
        
        const shared = socket.userInterests.filter(int => pInterests.includes(int));
        
        if (shared.length > 0) {
            // Priority 1: Direct interest match
            partnerIndex = i;
            break;
        } else if (socket.userInterests.length === 0 || pInterests.length === 0) {
            // Priority 2: One or both are "open" (no specific interests)
            partnerIndex = i;
            break;
        }
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
        chatLogs: [],
        snapshots: {}
      });
      this.userRooms.set(partner.id, roomId);
      this.userRooms.set(socket.id, roomId);
      
      io.to('admins').emit('active_rooms_update', Array.from(this.activeRooms.entries()));
      
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
        room.endTime = Date.now();
        pastSessions.unshift({ roomId, ...room });
        if (pastSessions.length > 500) pastSessions.length = 500; // Keep up to 500
        
        this.activeRooms.delete(roomId);
        this.userRooms.delete(partnerId);
        
        io.to('admins').emit('active_rooms_update', Array.from(this.activeRooms.entries()));
        io.to('admins').emit('past_sessions_update', pastSessions);
        
        // Partner leaves the socket room
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.leave(roomId);
        }
      }
      this.userRooms.delete(socket.id);
    }
  }

  next(socket, type, interests = []) {
    // Treat as a disconnect from current chat, then re-enter queue
    this.handleDisconnect(socket);
    this.addUser(socket, type, interests);
  }
}

const matchMaker = new MatchMaker();

let onlineUsers = 0;

let userCountSettings = {
  customCount: 100,
  mode: 'realtime' // 'realtime' or 'custom'
};
let currentAnnouncement = '';

// Load settings from file if exists
const settingsPath = path.join(__dirname, 'settings.json');
try {
  if (fs.existsSync(settingsPath)) {
    const data = fs.readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed.userCountSettings) {
      userCountSettings = { ...userCountSettings, ...parsed.userCountSettings };
    }
    if (parsed.currentAnnouncement !== undefined) {
      currentAnnouncement = parsed.currentAnnouncement;
    }
  }
} catch (err) {
  console.error('Error loading settings.json:', err);
}

const saveSettings = () => {
  const data = {
    userCountSettings,
    currentAnnouncement
  };
  fs.writeFile(settingsPath, JSON.stringify(data, null, 2), (err) => {
    if (err) console.error('Error saving settings.json:', err);
  });
};

const broadcastUserCount = () => {
  const displayCount = userCountSettings.mode === 'custom' 
    ? userCountSettings.customCount 
    : onlineUsers;
  io.emit('online_users', { count: displayCount });
};

io.on('connection', (socket) => {
  onlineUsers++;
  broadcastUserCount();
  
  // Send the current global announcement to newly connected users if it exists
  if (currentAnnouncement) {
    socket.emit('global_announcement', { message: currentAnnouncement });
  }

  socket.on('join_queue', ({ type, interests }) => {
    matchMaker.addUser(socket, type, interests);
  });

  socket.on('next_stranger', ({ type, interests }) => {
    matchMaker.next(socket, type, interests);
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
  
  // Text Chat messages + Live Logging
  socket.on('chat_message', (msg) => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      const logEntry = { roomId, sender: socket.id, text: msg, time: new Date().toLocaleTimeString() };
      liveLogs.push(logEntry);
      if (liveLogs.length > 100) liveLogs.shift();

      const room = matchMaker.activeRooms.get(roomId);
      if (room) {
        room.chatLogs.push(logEntry);
        // Optimize: could emit a specific event, but active_rooms_update works for full state
        io.to('admins').emit('active_rooms_update', Array.from(matchMaker.activeRooms.entries()));
      }

      // Send to partner
      socket.to(roomId).emit('chat_message', { sender: 'stranger', text: msg });

      // Send to all admins
      io.to('admins').emit('live_chat_log', logEntry);
    }
  });

  socket.on('send_snapshot', ({ snapshot }) => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      const room = matchMaker.activeRooms.get(roomId);
      if (room) {
        room.snapshots[socket.id] = snapshot;
        io.to('admins').emit('active_rooms_update', Array.from(matchMaker.activeRooms.entries()));
      }
    }
  });

  // Admin Actions
  socket.on('admin_auth', ({ password }) => {
    if (password === 'ccyr0149') {
      socket.join('admins');
      socket.emit('admin_auth_success', { 
        reports, 
        liveLogs, 
        bannedIPs: Array.from(bannedIPs),
        userCountSettings,
        safetyViolations,
        activeRooms: Array.from(matchMaker.activeRooms.entries()),
        pastSessions
      });
    }
  });

  socket.on('report_safety_violation', ({ evidence, reason }) => {
    const ip = matchMaker.userIPs.get(socket.id);
    const violation = {
      id: Date.now(),
      userId: socket.id,
      userIP: ip,
      evidence,
      reason,
      timestamp: new Date().toLocaleTimeString()
    };

    safetyViolations.push(violation);
    if (safetyViolations.length > 50) safetyViolations.shift();

    io.to('admins').emit('new_safety_alert', violation);
  });

  socket.on('admin_handle_safety_violation', ({ violationId, action, password }) => {
    if (password !== 'ccyr0149') return;

    const index = safetyViolations.findIndex(v => v.id === violationId);
    if (index === -1) return;

    const violation = safetyViolations[index];

    if (action === 'ban') {
      bannedIPs.add(violation.userIP);
      const targetSocket = io.sockets.sockets.get(violation.userId);
      if (targetSocket) {
        targetSocket.emit('banned', { message: 'Your IP has been banned for safety violations.' });
        targetSocket.disconnect();
      }
    }

    safetyViolations.splice(index, 1);
    
    io.to('admins').emit('update_safety_violations', safetyViolations);
    if (action === 'ban') {
      io.to('admins').emit('update_banned_ips', Array.from(bannedIPs));
    }
  });

  socket.on('admin_update_user_count', ({ settings, password }) => {
    if (password === 'ccyr0149') {
      userCountSettings = { ...userCountSettings, ...settings };
      saveSettings();
      broadcastUserCount();
      // Notify all admins of the update
      io.to('admins').emit('update_user_count_settings', userCountSettings);
    }
  });

  socket.on('admin_broadcast', ({ message, password }) => {
    if (password === 'ccyr0149') {
      currentAnnouncement = message;
      saveSettings();
      io.emit('global_announcement', { message });
    }
  });

  socket.on('admin_unban', ({ ip }) => {
    if (!socket.rooms.has('admins')) return;
    bannedIPs.delete(ip);
    // Notify all admins of the update
    io.to('admins').emit('update_banned_ips', Array.from(bannedIPs));
  });

  socket.on('report_user', ({ screenshot, comment }) => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (!roomId) return;
    
    const room = matchMaker.activeRooms.get(roomId);
    if (!room) return;

    const partnerId = room.user1 === socket.id ? room.user2 : room.user1;
    const partnerIP = matchMaker.userIPs.get(partnerId);

    const report = {
      id: Date.now(),
      offenderId: partnerId,
      offenderIP: partnerIP,
      reporterId: socket.id,
      screenshot,
      comment: comment || "No reason specified",
      timestamp: new Date().toLocaleTimeString()
    };

    reports.push(report);
    if (reports.length > 50) reports.shift();

    io.to('admins').emit('new_report', report);
  });

  socket.on('admin_kick', ({ targetId }) => {
    if (!socket.rooms.has('admins')) return;
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit('kicked', { message: 'You have been kicked by an admin.' });
      targetSocket.disconnect();
    }
  });

  socket.on('admin_terminate_room', ({ roomId }) => {
    if (!socket.rooms.has('admins')) return;
    const room = matchMaker.activeRooms.get(roomId);
    if (room) {
       const targetSocket = io.sockets.sockets.get(room.user1);
       if (targetSocket) {
          targetSocket.emit('stranger_disconnected', { message: 'Room terminated by admin.' });
          matchMaker.handleDisconnect(targetSocket);
       }
    }
  });

  socket.on('admin_ban', ({ targetIP, targetId }) => {
    if (!admins.has(socket.id)) return;
    bannedIPs.add(targetIP);
    
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit('banned', { message: 'Your IP has been banned.' });
      targetSocket.disconnect();
    } else {
       for (const [sId, ip] of matchMaker.userIPs) {
          if (ip === targetIP) {
             const s = io.sockets.sockets.get(sId);
             if (s) s.disconnect();
          }
       }
    }
    // Notify all admins of the update
    io.to('admins').emit('update_banned_ips', Array.from(bannedIPs));
  });

  socket.on('disconnect', () => {
    onlineUsers--;
    broadcastUserCount();
    matchMaker.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
