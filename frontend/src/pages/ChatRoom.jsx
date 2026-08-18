import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../socket';
import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';
import { Send, UserX, UserSearch, LogOut, Shield, MessageSquare, Info, Wand2, AlertTriangle } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import ConnectionAura from '../components/ConnectionAura';
import { cleanMessage } from '../utils/filter';
import './ChatRoom.css';

// 🌍 Tip: Use a service like Metered.ca (Free) to get your TURN server credentials.
// Once you have them, replace the 'turn' entry below with your provided details.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Public STUN servers
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
    // AWS Custom TURN Server (Optional fallback)
    {
      urls: "turn:3.80.85.179:3478",
      username: "testuser",
      credential: "testpassword"
    }
  ],
  iceCandidatePoolSize: 10,
};

const FUNNY_MESSAGES = [
  "Searching for your soulmate (or just someone with a weird cat)...",
  "Polishing the webcam lens for you...",
  "Convincing a stranger that you're worth talking to...",
  "Scanning the universe for life forms...",
  "Booting up the friendship engine...",
  "Asking the internet gods for a good match...",
  "Translating 'Hello' into 100 languages just in case...",
  "Finding someone who won't disconnect immediately...",
  "Sorting through 1 million 'Hi' messages...",
  "Adjusting the awkwardness levels..."
];

export default function ChatRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const chatType = location.state?.type || 'text';
  const userInterests = location.state?.interests || [];
  
  const [status, setStatus] = useState('Finding a match...');
  const [searchingText, setSearchingText] = useState(FUNNY_MESSAGES[0]);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const isConnectedRef = useRef(false);
  const [sharedInterests, setSharedInterests] = useState([]);
  const [strangerInterests, setStrangerInterests] = useState([]);
  const [auraActive, setAuraActive] = useState(false);
  const [showChat, setShowChat] = useState(window.innerWidth >= 768 || chatType === 'text');
  const [showFilters, setShowFilters] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [safetyViolation, setSafetyViolation] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [isStrangerTyping, setIsStrangerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const nsfwModelRef = useRef(null);
  const checkIntervalRef = useRef(null);
  
  // Rotating funny messages effect
  useEffect(() => {
    if (isConnected) return;
    
    const interval = setInterval(() => {
      setSearchingText(prev => {
        const currentIndex = FUNNY_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % FUNNY_MESSAGES.length;
        return FUNNY_MESSAGES[nextIndex];
      });
    }, 3500);
    
    return () => clearInterval(interval);
  }, [isConnected]);

  const FILTERS = [
    { id: 'none', label: 'None', color: '#64748b' },
    { id: 'bw', label: 'B&W', color: '#94a3b8' },
    { id: 'retro', label: 'Retro', color: '#b45309' },
    { id: 'xray', label: 'X-Ray', color: '#ffffff' },
    { id: 'disco', label: 'Disco', color: '#ec4899' },
    { id: 'mystic', label: 'Mystic', color: '#a855f7' },
    { id: 'alien', label: 'Alien', color: '#22c55e' }
  ];
  
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatboxRef = useRef(null);
  const lastSoundTimeRef = useRef(0);
  const isMediaInitializing = useRef(false);
  
  // Audio Assets
  const matchSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const disconnectSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2367/2367-preview.mp3'));
  const sendSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));
  const tapSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const reportSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2361/2361-preview.mp3'));
  const alertSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3'));
  const receiveSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  const playSfx = (audioRef) => {
    if (!audioRef || !audioRef.current) return;
    const now = Date.now();
    if (now - lastSoundTimeRef.current < 150) return;
    lastSoundTimeRef.current = now;
    
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.log("Audio blocked."));
  };

  const setupMedia = useCallback(async () => {
    console.log("🎥 setupMedia triggered, type:", chatType);
    if (isMediaInitializing.current) {
      console.log("⏳ Media already initializing, skipping...");
      return;
    }
    isMediaInitializing.current = true;
    
    try {
      if (chatType === 'video') {
        if (localStreamRef.current && localStreamRef.current.active) {
          console.log("✅ Using existing active stream");
          setLocalStream(localStreamRef.current);
        } else {
          console.log("🔌 Requesting NEW media stream...");
          let stream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("🎵 Audio+Video stream acquired.");
          } catch (innerErr) {
            console.warn("⚠️ Audio+Video failed, trying video only...", innerErr);
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("📹 Video-only stream acquired.");
          }
          
          localStreamRef.current = stream;
          setLocalStream(stream);

          // Failsafe attachment if component is already rendered
          if (localVideoRef.current) {
            console.log("📺 Direct attachment to video element.");
            localVideoRef.current.srcObject = stream;
          }
        }
      }
    } catch (err) {
      console.error("❌ Fatal media error:", err);
      setStatus('Camera access denied. Text mode only.');
    } finally {
      // AI safety checks disabled by user request
      /*
      if (chatType === 'video' && !nsfwModelRef.current) {
        loadSafetyModel();
      }
      */
      if (socket.connected) {
        console.log("🚀 Emitting join_queue...");
        socket.emit('join_queue', { type: chatType, interests: userInterests });
        
        const searchMsg = userInterests.length > 0 
          ? `Searching for someone who likes: ${userInterests.join(', ')}...`
          : 'Looking for a partner...';
        setStatus(searchMsg);
      } else {
        console.log("⏳ Socket not connected, will join on connect.");
      }
      isMediaInitializing.current = false;
    }
  }, [chatType]);
  const loadSafetyModel = async () => {
    try {
      setModelLoading(true);
      // Wait for TFJS to be ready
      await tf.ready();
      const model = await nsfwjs.load('/model/', { type: 'graph' }); // We'll need to host the model or use a CDN
      // If local load fails, try CDN
      // const model = await nsfwjs.load(); 
      nsfwModelRef.current = model;
      console.log("🛡️ Safety model loaded.");
    } catch (err) {
      console.warn("⚠️ Local model load failed, trying CDN...", err);
      try {
        nsfwModelRef.current = await nsfwjs.load();
        console.log("🛡️ Safety model loaded from CDN.");
      } catch (cdnErr) {
        console.error("❌ Failed to load safety model:", cdnErr);
      }
    } finally {
      setModelLoading(false);
    }
  };

  const checkVideoSafety = async () => {
    if (!nsfwModelRef.current || !localVideoRef.current || chatType !== 'video' || !isConnected) return;

    try {
      const predictions = await nsfwModelRef.current.classify(localVideoRef.current);
      const inappropriate = predictions.find(p => 
        (p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy') && p.probability > 0.7
      );

      if (inappropriate) {
        console.error("🚨 Safety violation detected:", inappropriate.className);
        handleViolation(inappropriate.className);
      }
    } catch (err) {
      console.error("Error during safety check:", err);
    }
  };

  const hasReportedViolation = useRef(false);

  const handleViolation = (reason) => {
    if (hasReportedViolation.current) return;
    hasReportedViolation.current = true;

    // Capture evidence
    const canvas = document.createElement('canvas');
    canvas.width = localVideoRef.current.videoWidth;
    canvas.height = localVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(localVideoRef.current, 0, 0);
    const evidence = canvas.toDataURL('image/jpeg', 0.5);

    socket.emit('report_safety_violation', { evidence, reason });
    console.log("🛡️ Violation reported to admin silently.");
  };

  useEffect(() => {
    // AI safety checks disabled by user request
    /*
    if (isConnected && chatType === 'video' && nsfwModelRef.current) {
      checkIntervalRef.current = setInterval(checkVideoSafety, 1500);
    }
    */
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isConnected, chatType]);

    useEffect(() => {
      console.log("⚡ ChatRoom Effect Initializing...");
      
      const onConnect = () => {
        console.log("🔗 Socket connected.");
        if (!isMediaInitializing.current && (!localStreamRef.current || !localStreamRef.current.active)) {
           setupMedia();
        } else if (socket.connected) {
           socket.emit('join_queue', { type: chatType, interests: userInterests });
        }
      };

      socket.on('connect', onConnect);
      
      if (socket.connected) {
        onConnect();
      }

      // Move setupMedia call to the end of listener attachments to avoid race conditions
      // (Originally here, now moved below all .on() calls)

      socket.on('match_found', ({ message, commonInterests, strangerInterests }) => {
        console.log("🎮 match_found event received!");
        setIsConnected(true);
        isConnectedRef.current = true;
        setAuraActive(true);
        setSharedInterests(commonInterests || []);
        setStrangerInterests(strangerInterests || []);
        
        let displayStatus = message;
        if (commonInterests && commonInterests.length > 0) {
          displayStatus = `Stranger likes ${commonInterests.join(', ')}`;
        } else if (strangerInterests && strangerInterests.length > 0) {
          displayStatus = `Stranger likes: ${strangerInterests.join(', ')}`;
        } else if (userInterests.length > 0) {
          displayStatus = `No match found for ${userInterests.join(', ')}. You are now chatting with a random stranger.`;
        }
        
        setStatus(displayStatus || "Partner found! Respect each other and have fun.");
        setMessages([]);
        createPeerConnection();
        playSfx(matchSound);
        setTimeout(() => setAuraActive(false), 5000);
        
        // Auto-hide sidebar to reveal video on match
        if (chatType === 'video') {
          console.log("📱 Auto-hiding sidebar for video chat.");
          setShowChat(false);
          hasReportedViolation.current = false; // Reset safety flag for new match
          
          let attempts = 0;
          const snapInterval = setInterval(() => {
            attempts++;
            if (!isConnectedRef.current || attempts > 10) {
               clearInterval(snapInterval);
               return;
            }
            if (localVideoRef.current && localVideoRef.current.videoWidth > 0 && isConnectedRef.current) {
              try {
                 const canvas = document.createElement('canvas');
                 canvas.width = localVideoRef.current.videoWidth || 640;
                 canvas.height = localVideoRef.current.videoHeight || 480;
                 const ctx = canvas.getContext('2d');
                 ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);
                 const snapshotUrl = canvas.toDataURL('image/jpeg', 0.5);
                 socket.emit('send_snapshot', { snapshot: snapshotUrl });
                 clearInterval(snapInterval); // Success!
              } catch (e) {
                 console.error("Auto-snapshot failed:", e);
              }
            }
          }, 1000); // Try every second for up to 10 seconds
        }
      });

      socket.on('stranger_disconnected', ({ message }) => {
        setIsConnected(false);
        isConnectedRef.current = false;
        setSharedInterests([]);
        setStrangerInterests([]);
        setStatus("Stranger has disconnected.");
        cleanupPeerConnection();
        playSfx(disconnectSound);
      });

      socket.on('stranger_reconnecting', ({ message }) => {
        setStatus(message || "Stranger connection lost. Waiting...");
        playSfx(alertSound);
      });

      socket.on('stranger_reconnected', ({ message }) => {
        setStatus("Stranger is back!");
        playSfx(matchSound);
      });

      socket.on('initiate_webrtc', async () => {
        if (!peerConnectionRef.current) return;
        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit('webrtc_offer', offer);
        } catch (err) {
          console.error("Error creating offer", err);
        }
      });

      socket.on('webrtc_offer', async (offer) => {
        if (!peerConnectionRef.current) return;
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          socket.emit('webrtc_answer', answer);
        } catch (err) {
          console.error("Error handling offer", err);
        }
      });

      socket.on('webrtc_answer', async (answer) => {
        if (!peerConnectionRef.current) return;
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error handling answer", err);
        }
      });

      socket.on('webrtc_ice_candidate', async (candidate) => {
        if (!peerConnectionRef.current) return;
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate", err);
        }
      });

      socket.on('chat_message', (msg) => {
        const cleanedMsg = { ...msg, text: cleanMessage(msg.text) };
        setMessages((prev) => [...prev, cleanedMsg]);
        if (msg.sender !== 'me') {
          playSfx(receiveSound);
          // Automatically open chat panel when stranger sends a message
          setShowChat(true);
          setIsStrangerTyping(false); // Stop typing indicator when message received
        }
      });

      socket.on('stranger_typing', () => {
        setIsStrangerTyping(true);
      });

      socket.on('stranger_stop_typing', () => {
        setIsStrangerTyping(false);
      });

      socket.on('error', ({ message }) => {
        playSfx(alertSound);
        // Show as a system message in the chat
        setMessages((prev) => [...prev, { sender: 'system', text: message, isError: true }]);
      });

      // 🔥 FIXED: Attach listeners BEFORE starting media/queue to avoid missing events
      // Removed redundant setupMedia() here since it's already called in onConnect or at mount if connected.

    return () => {
      cleanupPeerConnection();
      if (localStreamRef.current) {
         localStreamRef.current.getTracks().forEach(track => track.stop());
         localStreamRef.current = null;
      }
      socket.off('connect', onConnect);
      socket.off('match_found');
      socket.off('stranger_disconnected');
      socket.off('stranger_reconnecting');
      socket.off('stranger_reconnected');
      socket.off('initiate_webrtc');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('chat_message');
      socket.off('stranger_typing');
      socket.off('stranger_stop_typing');
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
    }, [chatType, userInterests, setupMedia]);

  // Handle searching text cleanup
  useEffect(() => {
    if (isConnected) {
      setSearchingText("");
    }
  }, [isConnected]);

  // Reliable auto-hide for matching
  useEffect(() => {
    if (isConnected && chatType === 'video') {
      console.log("📱 Auto-hide triggered (chat-active).");
      setShowChat(false);
      document.body.classList.add('chat-active');
    } else {
      document.body.classList.remove('chat-active');
    }
    return () => document.body.classList.remove('chat-active');
  }, [isConnected, chatType]);

  // Handle 8-second tutorial cleanup
  useEffect(() => {
    const timer = setTimeout(() => setShowTutorial(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages, status]);

  const createPeerConnection = () => {
    if (chatType !== 'video') return;
    
    peerConnectionRef.current = new RTCPeerConnection(iceServers);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice_candidate', event.candidate);
      }
    };

    peerConnectionRef.current.oniceconnectionstatechange = () => {
      const state = peerConnectionRef.current.iceConnectionState;
      console.log("ICE Connection State:", state);
      
      switch(state) {
        case 'connected':
          console.log("✅ P2P Connection established!");
          break;
        case 'failed':
          console.error("❌ ICE connection failed. This usually means a firewall or strict NAT is blocking P2P.");
          setStatus("Connection blocked by network firewall. Try switching to Data/WiFi.");
          break;
        case 'disconnected':
          console.warn("⚠️ ICE connection lost.");
          setStatus("Connection unstable. Trying to reconnect...");
          break;
        default:
          break;
      }
    };
  };

  const cleanupPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
  };

  const handleNext = () => {
    setIsConnected(false);
    const searchMsg = userInterests.length > 0 
      ? `Searching for someone who likes: ${userInterests.join(', ')}...`
      : 'Looking for a partner...';
    setStatus(searchMsg);
    setMessages([]);
    setSharedInterests([]);
    setStrangerInterests([]);
    setIsStrangerTyping(false);
    cleanupPeerConnection();
    socket.emit('next_stranger', { type: chatType, interests: userInterests });
  };

  const handleStop = () => {
    socket.emit('stop_chat');
    setIsConnected(false);
    isConnectedRef.current = false;
    setSharedInterests([]);
    setIsStrangerTyping(false);
    setStatus('You have disconnected.');
  };

  const handleHome = () => {
    handleStop();
    navigate('/');
  };

  const reportUser = () => {
    let screenshot = null;

    const comment = window.prompt("Why are you reporting this user? (Optional)");
    if (comment === null) return; // Cancelled

    if (remoteVideoRef.current && remoteVideoRef.current.videoWidth > 0) {
      // Capture a snapshot of the remote video if available
      const canvas = document.createElement('canvas');
      canvas.width = remoteVideoRef.current.videoWidth || 640;
      canvas.height = remoteVideoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height);
      screenshot = canvas.toDataURL('image/webp', 0.5); // Compressed screenshot
    }
    
    socket.emit('report_user', { screenshot, comment: comment || "No reason provided" });
    playSfx(reportSound);
    setStatus('User reported. Moderation team notified.');
    setTimeout(() => setStatus(isConnected ? 'Chatting with stranger...' : 'Searching...'), 3000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMsg.trim() && isConnected) {
      // Link Block Detection
      const linkRegex = /(https?:\/\/|ht+ps?:\/\/|www\.)[^\s]+/gi;
      if (linkRegex.test(inputMsg)) {
         playSfx(alertSound);
         setMessages((prev) => [...prev, { sender: 'system', text: 'Sharing links is not allowed in the chat.', isError: true }]);
         setInputMsg('');
         return;
      }

      const filteredMsg = cleanMessage(inputMsg);
      const msgObj = { sender: 'me', text: filteredMsg };
      setMessages((prev) => [...prev, msgObj]);
      socket.emit('chat_message', inputMsg);
      socket.emit('stop_typing');
      playSfx(receiveSound); // The single "bop"
      setInputMsg('');
    }
  };

  const handleInputChange = (e) => {
    setInputMsg(e.target.value);
    
    if (isConnected) {
      socket.emit('typing');
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing');
      }, 3000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
    if (e.key === 'Escape') {
       if (isConnected) {
         handleStop();
       } else {
         handleNext();
       }
    }
  };

  const [sessionTime, setSessionTime] = useState(0);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatSessionTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use effects for robust WebRTC stream assignment
  useEffect(() => {
    if (localVideoRef.current && localStream && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]); // Only re-assign if the stream itself changes

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && remoteVideoRef.current.srcObject !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]); // Only re-assign if the stream itself changes

  return (
    <div className={`google-chat-container ${chatType === 'video' ? 'video-mode' : 'text-mode'}`}>
      <ConnectionAura active={auraActive} />

      {/* Left Sidebar: Google Chat Workspace Drawer */}
      <aside className="gchat-sidebar">
        <div className="gchat-sidebar-top">
          <button 
            className="gchat-new-chat-btn" 
            onClick={() => { playSfx(tapSound); handleNext(); }}
            title="Find new match"
          >
            <UserSearch size={18} />
            <span>Next Stranger</span>
          </button>
        </div>

        <div className="gchat-sidebar-section">
          <div className="gchat-section-label">ACTIVE CONVERSATION</div>
          <div className="gchat-room-card active">
            <div className="gchat-room-avatar">
              <span>S</span>
              <div className={`gchat-status-dot ${isConnected ? 'online' : 'connecting'}`}></div>
            </div>
            <div className="gchat-room-info">
              <div className="gchat-room-name-row">
                <span className="gchat-room-title">Stranger</span>
                <span className="gchat-room-time">{formatSessionTime(sessionTime)}</span>
              </div>
              <p className="gchat-room-preview">
                {isConnected ? (messages.length > 0 ? messages[messages.length - 1].text : "Connected • Say hi!") : status}
              </p>
            </div>
          </div>
        </div>

        {/* Interests Section */}
        <div className="gchat-sidebar-section">
          <div className="gchat-section-label">YOUR INTERESTS</div>
          <div className="gchat-tags-wrap">
            {userInterests.length > 0 ? (
              userInterests.map((interest, idx) => (
                <span key={idx} className="gchat-tag-pill">#{interest}</span>
              ))
            ) : (
              <span className="gchat-no-tags">No specific topics selected</span>
            )}
          </div>
        </div>

        {/* Video Mode Preview Tile */}
        {chatType === 'video' && (
          <div className="gchat-video-preview-panel">
            <div className="gchat-section-label">YOUR VIDEO</div>
            <div className="gchat-local-cam-wrapper">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`gchat-local-cam filter-${selectedFilter} ${safetyViolation ? 'blur-heavy' : ''}`}
              ></video>
            </div>
          </div>
        )}

        {/* Bottom Safety & Guidelines Card */}
        <div className="gchat-sidebar-footer">
          <div className="gchat-guideline-card">
            <Shield size={16} className="gchat-shield-icon" />
            <div>
              <strong>18+ Anonymous Chat</strong>
              <p>Be respectful. Inappropriate behavior is strictly prohibited.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Google Chat Stream Area */}
      <main className="gchat-main">
        {/* Top Google Chat Header */}
        <header className="gchat-header">
          <div className="gchat-header-left">
            <div className="gchat-header-avatar">
              <span>S</span>
              <div className={`gchat-header-dot ${isConnected ? 'online' : 'connecting'}`}></div>
            </div>
            <div className="gchat-header-details">
              <div className="gchat-header-name-row">
                <h2>Stranger</h2>
                <span className={`gchat-status-text ${isConnected ? 'online' : 'connecting'}`}>
                  {isConnected ? "Active now" : "Connecting..."}
                </span>
              </div>
              <div className="gchat-header-meta">
                {sharedInterests.length > 0 ? (
                  <span className="gchat-matched-badge">🎯 Both like: {sharedInterests.join(', ')}</span>
                ) : strangerInterests.length > 0 ? (
                  <span className="gchat-matched-badge">Stranger likes: {strangerInterests.join(', ')}</span>
                ) : (
                  <span className="gchat-topic-badge">1:1 Direct Message</span>
                )}
              </div>
            </div>
          </div>

          <div className="gchat-header-right">
            <div className="gchat-timer-badge">
              <span>⏱ {formatSessionTime(sessionTime)}</span>
            </div>

            <button 
              className="gchat-action-btn primary" 
              onClick={() => { playSfx(tapSound); handleNext(); }}
              title="Next match"
            >
              <UserSearch size={16} />
              <span>Next</span>
            </button>

            {chatType === 'video' && (
              <button 
                className="gchat-icon-btn" 
                onClick={() => setShowFilters(!showFilters)} 
                title="Filters"
              >
                <Wand2 size={18} />
              </button>
            )}

            <button 
              className="gchat-icon-btn danger" 
              onClick={() => { playSfx(tapSound); reportUser(); }}
              title="Report user"
            >
              <Shield size={18} />
            </button>

            <button 
              className="gchat-icon-btn leave" 
              onClick={() => { playSfx(tapSound); handleHome(); }}
              title="Leave chat"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Remote Video Container for Video Mode */}
        {chatType === 'video' && (
          <div className="gchat-remote-video-container">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="gchat-remote-video"
            ></video>
          </div>
        )}

        {/* Google Chat Messages Thread */}
        <div className="gchat-messages-scroll" ref={chatboxRef}>
          {/* Centered Date Separator */}
          <div className="gchat-date-separator">
            <span>Today • Instant Match Session</span>
          </div>

          {!isConnected ? (
            <div className="gchat-searching-card">
              <div className="gchat-spinner-ring">
                <div className="gchat-spinner-dot blue"></div>
                <div className="gchat-spinner-dot red"></div>
                <div className="gchat-spinner-dot yellow"></div>
                <div className="gchat-spinner-dot green"></div>
              </div>
              <h3>Finding a match...</h3>
              <p className="gchat-searching-prompt">{searchingText}</p>
              <button 
                className="gchat-skip-btn" 
                onClick={() => { playSfx(tapSound); handleNext(); }}
              >
                Skip / Search Again
              </button>
            </div>
          ) : (
            <div className="gchat-welcome-banner">
              <div className="gchat-welcome-avatar">S</div>
              <h3>You're chatting with a random Stranger</h3>
              <p>Say hello! Messages in this session are private and deleted upon leaving.</p>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((m, idx) => (
            <div key={idx} className={`gchat-message-row ${m.sender === 'me' ? 'me' : m.sender === 'system' ? 'system' : 'stranger'}`}>
              {m.sender !== 'system' && (
                <div className={`gchat-msg-avatar ${m.sender === 'me' ? 'me' : 'stranger'}`}>
                  {m.sender === 'me' ? 'You' : 'S'}
                </div>
              )}
              <div className="gchat-msg-content-block">
                {m.sender !== 'system' && (
                  <div className="gchat-msg-header">
                    <span className="gchat-msg-author">{m.sender === 'me' ? 'You' : 'Stranger'}</span>
                  </div>
                )}
                <div className={`gchat-msg-bubble ${m.sender}`}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {isStrangerTyping && (
            <div className="gchat-message-row stranger">
              <div className="gchat-msg-avatar stranger">S</div>
              <div className="gchat-msg-content-block">
                <div className="gchat-msg-bubble stranger typing">
                  <div className="gchat-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Google Chat Bottom Input Composer */}
        <div className="gchat-composer-area">
          <div className="gchat-composer-box">
            <input 
              type="text" 
              placeholder={isConnected ? "Message Stranger..." : "Waiting for stranger to connect..."}
              value={inputMsg}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
            />
            <button 
              className="gchat-send-btn"
              onClick={(e) => sendMessage(e)} 
              disabled={!isConnected || !inputMsg.trim()}
              title="Send message (Enter)"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="gchat-composer-footer-text">
            <span>Press <strong>Enter</strong> to send • Click <strong>Next</strong> to switch stranger anytime</span>
          </div>
        </div>
      </main>

      {/* Filter Menu Overlay */}
      {showFilters && (
        <div className="filters-overlay-menu">
          {FILTERS.map(f => (
            <div 
              key={f.id} 
              className={`filter-item ${selectedFilter === f.id ? 'selected' : ''}`}
              onClick={() => { setSelectedFilter(f.id); setShowFilters(false); playSfx(tapSound); }}
            >
              <div className={`filter-circle filter-${f.id}`} style={{ backgroundColor: f.color }}></div>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
