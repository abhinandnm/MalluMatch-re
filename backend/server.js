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
const webpush = require('web-push');
const mongoose = require('mongoose');

webpush.setVapidDetails(
  'mailto:mallumatch.auth@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);


const app = express();

const allowedOrigins = [
  'https://mallu-match.vercel.app',
  'https://mallumatch.vercel.app',
  'https://xentoolpdf.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Use Helmet for security headers, but relax for CORS/Sockets
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "wss:", "https://*", "https://mallumatch-chat.duckdns.org"],
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  pingTimeout: 60000, // Increased to allow more stability on mobile data
  pingInterval: 25000,
  transports: ['polling', 'websocket'], // Matching frontend for solid handshake
  allowEIO3: true // Backward compatibility if needed
});

const bannedIPs = new Set();
const reports = [];
const safetyViolations = [];
const ipConnections = new Map(); // IP -> count
const tempBans = new Map(); // IP -> expiryTime
const adminStrikes = new Map(); // IP -> failureCount
const adminSessions = new Map(); // socketId -> IP

const chatLogsPath = path.join(__dirname, 'chat_logs.json');
const sessionsPath = path.join(__dirname, 'session_history.json');
const subscriptionsPath = path.join(__dirname, 'subscriptions.json');
let liveLogs = []; // Feed of all text messages
let pastSessions = []; // Past 24 hours sessions
let pushSubscriptions = [];


// Helper for IST time string
const getISTString = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// MongoDB integration with backward compatible fallback
let isMongoConnected = false;
if (process.env.MONGODB_URI) {
  console.log('Connecting to MongoDB...');
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB Atlas successfully!');
      isMongoConnected = true;
      
      try {
        const ChatLog = require('./models/ChatLog');
        const Session = require('./models/Session');
        const User = require('./models/User');

        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Load chats of past 24 hours
        const mongoChats = await ChatLog.find({ timestamp: { $gt: new Date(twentyFourHoursAgo) } }).lean();
        liveLogs = mongoChats.map(c => ({
          roomId: c.roomId,
          sender: c.sender,
          ip: c.ip,
          text: c.text,
          time: c.time,
          timestamp: c.timestamp ? c.timestamp.getTime() : Date.now()
        }));

        // Load sessions of past 24 hours
        const mongoSessions = await Session.find({ createdAt: { $gt: new Date(twentyFourHoursAgo) } }).sort({ startTime: -1 }).lean();
        pastSessions = mongoSessions.map(s => ({
          roomId: s.roomId,
          user1: s.user1,
          user2: s.user2,
          type: s.type,
          startTime: s.startTime,
          endTime: s.endTime,
          chatLogs: s.chatLogs,
          snapshots: s.snapshots
        }));

        // Load all registered users into memory for fast login searches
        const mongoUsers = await User.find({}).lean();
        users = mongoUsers.map(u => ({
          username: u.username,
          email: u.email,
          password: u.password
        }));

        console.log(`Successfully seeded ${liveLogs.length} chats, ${pastSessions.length} sessions, and ${users.length} users from MongoDB.`);
      } catch (err) {
        console.error('Error seeding data from MongoDB:', err);
      }
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB. Using local files instead:', err);
      loadLocalHistory();
    });
} else {
  console.warn('MONGODB_URI is not set. Using local JSON files database.');
  loadLocalHistory();
}

function loadLocalHistory() {
  try {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    if (fs.existsSync(chatLogsPath)) {
      liveLogs = JSON.parse(fs.readFileSync(chatLogsPath, 'utf8'));
      liveLogs = liveLogs.filter(log => log.timestamp > twentyFourHoursAgo);
    }
    
    if (fs.existsSync(sessionsPath)) {
      pastSessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
      pastSessions = pastSessions.filter(session => (session.endTime || session.startTime) > twentyFourHoursAgo);
    }
  } catch (err) {
    console.error('Error loading local history files:', err);
  }
}

// Always load push subscriptions from disk (or fallback)
try {
  if (fs.existsSync(subscriptionsPath)) {
    pushSubscriptions = JSON.parse(fs.readFileSync(subscriptionsPath, 'utf8'));
  }
} catch (err) {
  console.error('Error loading subscriptions file:', err);
}

const saveHistory = () => {
  try {
    fs.writeFileSync(subscriptionsPath, JSON.stringify(pushSubscriptions, null, 2));
    if (!isMongoConnected) {
      fs.writeFileSync(chatLogsPath, JSON.stringify(liveLogs, null, 2));
      fs.writeFileSync(sessionsPath, JSON.stringify(pastSessions, null, 2));
    }
  } catch (err) {
    console.error('Error saving history files:', err);
  }
};

// Periodic cleanup every hour (only clean in-memory representations, MongoDB does TTL automatically)
setInterval(() => {
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  // Clean live logs in memory
  const initialLogsLength = liveLogs.length;
  liveLogs = liveLogs.filter(log => log.timestamp > twentyFourHoursAgo);
  
  // Clean past sessions in memory
  const initialSessionsLength = pastSessions.length;
  pastSessions = pastSessions.filter(session => {
     const sessionTime = session.endTime || session.startTime;
     return sessionTime > twentyFourHoursAgo;
  });

  if (liveLogs.length !== initialLogsLength || pastSessions.length !== initialSessionsLength) {
    saveHistory();
    // Update connected admins
    io.to('admins').emit('admin_auth_success', { 
       reports, 
       liveLogs, 
       bannedIPs: Array.from(bannedIPs),
       userCountSettings,
       safetyViolations,
       activeRooms: Array.from(matchMaker.activeRooms.entries()),
       pastSessions,
       onlineUsers,
       adminSessions: Array.from(adminSessions.values())
    });
  }
}, 60 * 60 * 1000);


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
  
  if (isMongoConnected) {
    const User = require('./models/User');
    new User(newUser).save().catch(err => console.error('Error saving user to MongoDB:', err));
  } else {
    saveUsers();
  }
  
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

// Push Notification Endpoints
app.post('/api/push/subscribe', (req, res) => {
  const subscription = req.body;
  
  // Check if already exists
  const exists = pushSubscriptions.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    pushSubscriptions.push(subscription);
    saveHistory();
  }
  
  res.status(201).json({});
});

app.post('/api/push/send', async (req, res) => {
  const { message, password } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const payload = JSON.stringify({
    title: 'MalluMatch Alert',
    body: message,
    icon: '/logo.png',
    badge: '/logo.png',
    data: {
      url: 'https://mallu-match.vercel.app'
    }
  });

  const notifications = pushSubscriptions.map(subscription => {
    return webpush.sendNotification(subscription, payload).catch(err => {
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`Push subscription ${subscription.endpoint} has expired or is no longer valid.`);
        return { expired: true, endpoint: subscription.endpoint };
      }
      console.error('Push error:', err);
      return { error: true };
    });
  });

  const results = await Promise.all(notifications);
  
  // Cleanup expired subscriptions
  const expiredEndpoints = results
    .filter(r => r && r.expired)
    .map(r => r.endpoint);
    
  if (expiredEndpoints.length > 0) {
    pushSubscriptions = pushSubscriptions.filter(s => !expiredEndpoints.includes(s.endpoint));
    saveHistory();
  }

  res.json({ 
    success: true, 
    sent: results.filter(r => r && !r.error && !r.expired).length,
    failed: results.filter(r => r && r.error).length,
    expired: expiredEndpoints.length
  });
});

const broadcastUserCount = () => {

  const displayCount = userCountSettings.mode === 'custom' 
    ? userCountSettings.customCount 
    : onlineUsers;
  io.emit('online_users', { count: displayCount });
  io.to('admins').emit('real_online_users', onlineUsers);
};

io.on('connection', (socket) => {
  const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const ip = rawIp.split(',')[0].trim();
  console.log(`[CONN] New connection from ${socket.id} (IP: ${ip})`);

  // Check for temporary bans
  const banExpiry = tempBans.get(ip);
  if (banExpiry && Date.now() < banExpiry) {
    console.warn(`[REJECT] Banned IP attempt: ${ip} (Expires: ${getISTString(banExpiry)})`);
    socket.emit('error', { message: `Your IP is temporarily banned until ${getISTString(banExpiry)}.` });
    socket.disconnect();
    return;
  }

  const currentIpConnections = ipConnections.get(ip) || 0;
  if (currentIpConnections >= 50) { // Limit to 50 connections per IP
    console.warn(`[REJECT] Too many connections from IP: ${ip} (Count: ${currentIpConnections})`);
    socket.emit('error', { message: 'Too many connections from this IP.' });
    socket.disconnect();
    return;
  }

  ipConnections.set(ip, currentIpConnections + 1);

  if (socket.recovered) {
    // Connection state was recovered
    socket.wasRecovered = true;
    matchMaker.handleReconnect(socket);
  } else {
    // New connection
    socket.wasRecovered = false;
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

    // --- REVISED SPAM PROTECTION (DISABLED) ---

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
      
      if (isMongoConnected) {
        const ChatLog = require('./models/ChatLog');
        new ChatLog({
          roomId,
          sender: socket.id,
          ip: logEntry.ip,
          text: cleanedMsg,
          time: logEntry.time,
          timestamp: new Date(logEntry.timestamp)
        }).save().catch(err => console.error('Error saving message to MongoDB:', err));
      } else {
        saveHistory();
      }

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
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    
    // Check if IP is temporarily banned from admin attempts
    const banExpiry = tempBans.get(ip);
    if (banExpiry && Date.now() < banExpiry) {
      socket.emit('error', { message: 'Too many failed attempts. Try again later.' });
      return;
    }

    if (password === process.env.ADMIN_PASSWORD) {
      console.log(`[ADMIN] Successful login from IP: ${ip}`);
      adminStrikes.delete(ip);
      socket.join('admins');
      adminSessions.set(socket.id, ip);
      
      const sessionList = Array.from(adminSessions.values());
      
      socket.emit('admin_auth_success', { 
        reports, 
        liveLogs, 
        bannedIPs: Array.from(bannedIPs),
        userCountSettings,
        safetyViolations,
        activeRooms: Array.from(matchMaker.activeRooms.entries()),
        pastSessions,
        onlineUsers,
        adminSessions: sessionList
      });

      // Notify other admins
      io.to('admins').emit('admin_sessions_update', sessionList);
    } else {
      console.warn(`[SECURITY] FAILED admin login attempt from IP: ${ip}`);
      
      // Strike system for admin portal
      const strikes = (adminStrikes.get(ip) || 0) + 1;
      adminStrikes.set(ip, strikes);
      
      if (strikes >= 5) {
        const banPeriod = 60 * 60 * 1000; // 1 hour ban
        tempBans.set(ip, Date.now() + banPeriod);
        console.error(`[SECURITY] IP ${ip} temporary banned for 1 hour after 5 failed admin attempts.`);
        socket.emit('error', { message: 'Too many failed attempts. You are temporarily banned from admin actions.' });
        adminStrikes.delete(ip);
      }
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
        setTimeout(() => targetSocket.disconnect(), 3000);
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

  socket.on('admin_send_message', ({ roomId, message, password }) => {
    if (password === process.env.ADMIN_PASSWORD) {
      const cleanedMsg = cleanMessage(message);
      const logEntry = { 
        roomId, 
        sender: 'Admin', 
        ip: 'Dashboard',
        text: cleanedMsg, 
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now()
      };
      
      // Send to both users in the room
      io.to(roomId).emit('chat_message', { sender: 'system', text: `Admin: ${cleanedMsg}` });
      
      // Update logs
      liveLogs.push(logEntry);
      saveHistory();
      
      const room = matchMaker.activeRooms.get(roomId);
      if (room) {
        room.chatLogs.push(logEntry);
        io.to('admins').emit('active_rooms_update', Array.from(matchMaker.activeRooms.entries()));
      }
      
      // Send to all admins
      io.to('admins').emit('live_chat_log', logEntry);
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
      targetSocket.emit('kicked', { message: 'You have been kicked out due to violation. Repeated violations lead to a permanent ban.' });
      setTimeout(() => targetSocket.disconnect(), 3000);
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
      targetSocket.emit('banned', { message: 'You have been banned due to violation.' });
      setTimeout(() => targetSocket.disconnect(), 3000);
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
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const ip = rawIp.split(',')[0].trim();
    const currentIpConnections = ipConnections.get(ip) || 0;
    if (currentIpConnections > 0) {
      ipConnections.set(ip, currentIpConnections - 1);
    } else {
      ipConnections.delete(ip);
    }

    if (!socket.wasRecovered) {
      onlineUsers = Math.max(0, onlineUsers - 1);
    }
    broadcastUserCount();
    matchMaker.handleDisconnect(socket);
    
    // Cleanup admin session
    if (adminSessions.has(socket.id)) {
      adminSessions.delete(socket.id);
      io.to('admins').emit('admin_sessions_update', Array.from(adminSessions.values()));
    }

    // Cleanup
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
