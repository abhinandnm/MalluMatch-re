require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { cleanMessage } = require('./filter');

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply rate limiter to all API routes
app.use('/api/', limiter);

const allowedOrigins = [
  'https://mallu-match.vercel.app',
  'https://mallumatch.vercel.app',
  'https://xentoolpdf.vercel.app'
];
const frontendUrl = allowedOrigins;

app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST']
}));
app.use(express.json()); // Allow parsing JSON bodies

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST']
  },
  connectionStateRecovery: {
    // max 2 mins of state recovery
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to expose backup data in the handshake
    skipMiddlewares: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const bannedIPs = new Set();
const reports = [];
const pastSessions = []; // Past 24 hours sessions
const safetyViolations = [];
const userStrikes = new Map(); // IP -> count
const lastMessageTime = new Map(); // socketId -> timestamp

const chatLogsPath = path.join(__dirname, 'chat_logs.json');
let liveLogs = []; // Feed of all text messages

// Initial load of chat logs
try {
  if (fs.existsSync(chatLogsPath)) {
    const data = fs.readFileSync(chatLogsPath, 'utf8');
    liveLogs = JSON.parse(data);
    
    // Initial cleanup of old messages (> 24h)
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    liveLogs = liveLogs.filter(log => log.timestamp > twentyFourHoursAgo);
  }
} catch (err) {
  console.error('Error loading chat_logs.json:', err);
}

const saveChatLogs = () => {
  try {
    fs.writeFileSync(chatLogsPath, JSON.stringify(liveLogs, null, 2));
  } catch (err) {
    console.error('Error saving chat_logs.json:', err);
  }
};

// Periodic cleanup every hour
setInterval(() => {
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  // Clean live logs
  const initialLogsLength = liveLogs.length;
  liveLogs = liveLogs.filter(log => log.timestamp > twentyFourHoursAgo);
  
  // Clean past sessions
  const initialSessionsLength = pastSessions.length;
  // Note: pastSessions contains room objects which have startTime
  // We clean up sessions that ended more than 24 hours ago, or if we don't have endTime, use startTime
  pastSessions = pastSessions.filter(session => {
     const sessionTime = session.endTime || session.startTime;
     return sessionTime > twentyFourHoursAgo;
  });

  if (liveLogs.length !== initialLogsLength || pastSessions.length !== initialSessionsLength) {
    saveChatLogs();
    io.to('admins').emit('admin_auth_success', { 
       reports, 
       liveLogs, 
       bannedIPs: Array.from(bannedIPs),
       userCountSettings,
       safetyViolations,
       activeRooms: Array.from(matchMaker.activeRooms.entries()),
       pastSessions,
       onlineUsers
    });
  }
}, 60 * 60 * 1000);

class MatchMaker {
  constructor() {
    this.videoQueue = [];
    this.textQueue = [];
    this.activeRooms = new Map(); // roomId -> { user1, user2, type }
    this.userRooms = new Map(); // socketId -> roomId
    this.userIPs = new Map(); // socketId -> IP
    this.pendingDisconnections = new Map(); // socketId -> timeoutId
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
    let fallbackIndex = -1;

    for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
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
      io.to(partnerId).emit('stranger_reconnecting', { message: 'Stranger connection lost. Waiting for reconnection...' });

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
    io.to(partnerId).emit('stranger_disconnected', { message: 'Stranger has left the chat.' });

    // Remove room metadata
    room.endTime = Date.now();
    pastSessions.unshift({ roomId, ...room });
    if (pastSessions.length > 500) pastSessions.length = 500;

    this.activeRooms.delete(roomId);
    this.userRooms.delete(partnerId);
    this.userRooms.delete(socketId);
    this.pendingDisconnections.delete(socketId);

    io.to('admins').emit('active_rooms_update', Array.from(this.activeRooms.entries()));
    io.to('admins').emit('past_sessions_update', pastSessions);

    const partnerSocket = io.sockets.sockets.get(partnerId);
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
          io.to(partnerId).emit('stranger_reconnected', { message: 'Stranger is back!' });
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
    if (parsed.bannedIPs) {
      parsed.bannedIPs.forEach(ip => bannedIPs.add(ip));
    }
  }
} catch (err) {
  console.error('Error loading settings.json:', err);
}

const usersPath = path.join(__dirname, 'users.json');
let users = [];
try {
  if (fs.existsSync(usersPath)) {
    users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  }
} catch (err) {
  console.error('Error loading users.json:', err);
}

const saveUsers = () => {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
};

// OTP Storage (In-memory for demo)
const pendingOTPs = new Map();

// Nodemailer Config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Auth Endpoints
app.post('/api/signup', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: 'Username, password, and email required' });
  }
  if (users.find(u => u.username === username || u.email === email)) {
    return res.status(400).json({ success: false, message: 'Username or email already exists' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store pending user
  pendingOTPs.set(email, { 
    username, 
    password, 
    otp, 
    expires: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  // Send Email
  try {
    await transporter.sendMail({
      from: `"MalluMatch" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your MalluMatch OTP Verification Code",
      text: `Welcome to MalluMatch! Your verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #ff3366; text-align: center;">Welcome to MalluMatch!</h2>
          <p>You're almost there! Use the following code to complete your registration:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check your email config.' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const pending = pendingOTPs.get(email);

  if (!pending) {
    return res.status(400).json({ success: false, message: 'OTP expired or not found' });
  }

  if (pending.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code' });
  }

  if (Date.now() > pending.expires) {
    pendingOTPs.delete(email);
    return res.status(400).json({ success: false, message: 'OTP has expired' });
  }

  // Success: Create User
  const newUser = { 
    username: pending.username, 
    password: pending.password, 
    email: email 
  };
  users.push(newUser);
  saveUsers();
  pendingOTPs.delete(email);

  res.json({ success: true, message: 'Account verified and created successfully' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, token: 'demo-token-' + Date.now(), username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

const saveSettings = () => {
  const data = {
    userCountSettings,
    currentAnnouncement,
    bannedIPs: Array.from(bannedIPs)
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
  io.to('admins').emit('real_online_users', onlineUsers);
};

io.on('connection', (socket) => {
  if (socket.recovered) {
    // Connection state was recovered
    matchMaker.handleReconnect(socket);
  } else {
    // New connection
    onlineUsers++;
    broadcastUserCount();
  }
  
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
    matchMaker.handleDisconnect(socket, true); // Force immediate disconnect
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
    // 1. Basic Validation
    if (typeof msg !== 'string' || msg.trim().length === 0 || msg.length > 1000) {
      console.warn(`Invalid message from ${socket.id}:`, msg);
      socket.emit('error', { message: 'Invalid message format or length.' });
      return;
    }

    // 2. Anti-Spam / Rate Limiting (1 message per second)
    const now = Date.now();
    const lastTime = lastMessageTime.get(socket.id) || 0;
    if (now - lastTime < 1000) {
      console.warn(`Spam detected from ${socket.id}`);
      socket.emit('error', { message: 'You are sending messages too fast. Slow down!' });
      // Optional: Disconnect if they keep spamming
      // socket.disconnect(); 
      return;
    }
    lastMessageTime.set(socket.id, now);

    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      const cleanedMsg = cleanMessage(msg);
      const logEntry = { 
        roomId, 
        sender: socket.id, 
        ip: matchMaker.userIPs.get(socket.id),
        text: cleanedMsg, 
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now()
      };
      liveLogs.push(logEntry);
      saveChatLogs();

      const room = matchMaker.activeRooms.get(roomId);
      if (room) {
        room.chatLogs.push(logEntry);
        // Optimize: could emit a specific event, but active_rooms_update works for full state
        io.to('admins').emit('active_rooms_update', Array.from(matchMaker.activeRooms.entries()));
      }

      // Send to partner
      socket.to(roomId).emit('chat_message', { sender: 'stranger', text: cleanedMsg });

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
        pastSessions,
        onlineUsers
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
      targetSocket.emit('kicked', { message: 'You were kicked by admin' });
      setTimeout(() => targetSocket.disconnect(), 500);
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
    if (!socket.rooms.has('admins')) return;
    
    let ipToBan = targetIP;
    
    // Fallback: if IP is missing from chat feed logs, try to find it from current session
    if (!ipToBan && targetId) {
      ipToBan = matchMaker.userIPs.get(targetId);
    }
    
    if (ipToBan) {
      bannedIPs.add(ipToBan);
      saveSettings();
      
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
      targetSocket.emit('banned', { message: 'You were kicked by admin' });
      setTimeout(() => targetSocket.disconnect(), 500);
    } else {
         for (const [sId, ip] of matchMaker.userIPs) {
            if (ip === ipToBan) {
               const s = io.sockets.sockets.get(sId);
               if (s) s.disconnect();
            }
         }
      }
      // Notify all admins of the update
      io.to('admins').emit('update_banned_ips', Array.from(bannedIPs));
    }
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
