require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { cleanMessage } = require('./filter');
const { isMalicious } = require('./utils/security');
const bcrypt = require('bcryptjs');

const app = express();

// Use Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // Allow CDN for nsfwjs if needed
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "wss:", "https://*"], // For socket.io and APIs
    },
  },
}));

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
const lastMessages = new Map(); // socketId -> lastMessageText
const spamStrikes = new Map(); // socketId -> strikeCount
const ipConnections = new Map(); // IP -> count
const tempBans = new Map(); // IP -> expiryTime

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

// Inactivity cleanup every 30 seconds
setInterval(() => {
  const now = Date.now();
  const inactivityLimit = 3 * 60 * 1000; // 3 minutes of total silence

  for (const [roomId, room] of matchMaker.activeRooms.entries()) {
    if (now - room.lastActivity > inactivityLimit) {
      console.log(`Room ${roomId} terminated due to inactivity.`);
      
      const user1 = io.sockets.sockets.get(room.user1);
      const user2 = io.sockets.sockets.get(room.user2);

      if (user1) user1.emit('error', { message: 'Chat ended due to inactivity.' });
      if (user2) user2.emit('error', { message: 'Chat ended due to inactivity.' });

      matchMaker.terminateRoom(room.user1, roomId);
    }
  }
}, 30 * 1000);

const MatchMaker = require('./services/matchMaker');
const matchMaker = new MatchMaker(io, bannedIPs, pastSessions);

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
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(pending.password, salt);
  const newUser = { 
    username: pending.username, 
    password: hashedPassword, 
    email: email 
  };
  users.push(newUser);
  saveUsers();
  pendingOTPs.delete(email);

  res.json({ success: true, message: 'Account verified and created successfully' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
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
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

  // Check for temporary bans
  const banExpiry = tempBans.get(ip);
  if (banExpiry && Date.now() < banExpiry) {
    socket.emit('error', { message: `Your IP is temporarily banned until ${new Date(banExpiry).toLocaleTimeString()}.` });
    socket.disconnect();
    return;
  }

  const currentIpConnections = ipConnections.get(ip) || 0;

  if (currentIpConnections >= 5) { // Limit to 5 connections per IP
    socket.emit('error', { message: 'Too many connections from this IP.' });
    socket.disconnect();
    return;
  }

  ipConnections.set(ip, currentIpConnections + 1);

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

    // 1.5 Malicious Pattern Detection
    const ip = matchMaker.userIPs.get(socket.id);
    if (isMalicious(msg)) {
      console.warn(`Malicious pattern detected from ${socket.id} (${ip})`);
      const expiry = Date.now() + 30 * 60 * 1000; // 30 minutes ban
      if (ip) tempBans.set(ip, expiry);
      
      socket.emit('error', { message: 'Malicious activity detected. You are temporarily banned.' });
      
      // Log suspicious activity
      console.log(`[SECURITY ALERT] IP ${ip} temporary banned for malicious pattern: ${msg}`);
      
      setTimeout(() => socket.disconnect(), 500);
      return;
    }

    // 2. Anti-Spam / Rate Limiting (1 message per second)
    const now = Date.now();
    const lastTime = lastMessageTime.get(socket.id) || 0;
    if (now - lastTime < 1000) {
      console.warn(`Spam detected from ${socket.id}`);
      socket.emit('error', { message: 'You are sending messages too fast. Slow down!' });
      
      // Increment strikes
      const strikes = (spamStrikes.get(socket.id) || 0) + 1;
      spamStrikes.set(socket.id, strikes);
      
      if (strikes >= 5) {
        socket.emit('error', { message: 'You have been kicked for spamming.' });
        socket.disconnect();
      }
      return;
    }
    lastMessageTime.set(socket.id, now);
    
    // 3. Duplicate Message Detection
    const lastMsg = lastMessages.get(socket.id);
    if (msg === lastMsg) {
      console.warn(`Duplicate message from ${socket.id}`);
      socket.emit('error', { message: 'Please do not send the same message twice.' });
      return;
    }
    lastMessages.set(socket.id, msg);

    // 4. Repetitive Character Detection (e.g., "aaaaaaaaa")
    // If any character repeats more than 15 times
    if (/(.)\1{14,}/.test(msg)) {
      console.warn(`Repetitive characters from ${socket.id}`);
      socket.emit('error', { message: 'Your message contains too many repetitive characters.' });
      return;
    }
    
    // 5. Strike System for Spamming
    // (Punishment logic already handled above in early returns if we wanted to be strict)
    // Let's reset strikes if they managed to send a good message
    spamStrikes.set(socket.id, 0);

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
        room.lastActivity = Date.now();
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
    if (password === process.env.ADMIN_PASSWORD) {
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
    if (password !== process.env.ADMIN_PASSWORD) return;

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
    if (password === process.env.ADMIN_PASSWORD) {
      userCountSettings = { ...userCountSettings, ...settings };
      saveSettings();
      broadcastUserCount();
      // Notify all admins of the update
      io.to('admins').emit('update_user_count_settings', userCountSettings);
    }
  });

  socket.on('admin_broadcast', ({ message, password }) => {
    if (password === process.env.ADMIN_PASSWORD) {
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
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const currentIpConnections = ipConnections.get(ip) || 0;
    if (currentIpConnections > 0) {
      ipConnections.set(ip, currentIpConnections - 1);
    } else {
      ipConnections.delete(ip);
    }

    onlineUsers--;
    broadcastUserCount();
    matchMaker.handleDisconnect(socket);
    
    // Cleanup spam tracking
    lastMessageTime.delete(socket.id);
    lastMessages.delete(socket.id);
    spamStrikes.delete(socket.id);
  });

  // Typing indication
  socket.on('typing', () => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('stranger_typing');
    }
  });

  socket.on('stop_typing', () => {
    const roomId = matchMaker.userRooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('stranger_stop_typing');
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
