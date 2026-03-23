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
    // AWS Custom TURN Server
    {
      urls: "turn:3.80.85.179:3478",
      username: "testuser",
      credential: "testpassword"
    },
    {
      urls: "turn:3.80.85.179:3478?transport=tcp",
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
      if (chatType === 'video' && !nsfwModelRef.current) {
        loadSafetyModel();
      }
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
    if (isConnected && chatType === 'video' && nsfwModelRef.current) {
      checkIntervalRef.current = setInterval(checkVideoSafety, 1500);
    }
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
        setMessages((prev) => [...prev, msg]);
        if (msg.sender !== 'me') {
          playSfx(receiveSound);
          // Automatically open chat panel when stranger sends a message
          setShowChat(true);
        }
      });

      socket.on('kicked', ({ message }) => {
        playSfx(alertSound);
        alert(message || 'You have been kicked by an admin.');
        navigate('/');
      });

      socket.on('banned', ({ message }) => {
        playSfx(alertSound);
        alert(message || 'Your IP has been banned for violating community guidelines.');
        navigate('/');
      });

      // 🔥 FIXED: Attach listeners BEFORE starting media/queue to avoid missing events
      if (socket.connected) {
         setupMedia();
      }

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
      socket.off('kicked');
      socket.off('banned');
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
      if (state === 'failed' || state === 'disconnected') {
        setStatus("Connection unstable. Trying to reconnect...");
        // After 5s of failure, alert about firewall/NAT if still disconnected
        setTimeout(() => {
          if (peerConnectionRef.current?.iceConnectionState === 'failed') {
            setStatus("Connection blocked by network firewall. Try switching to Data/WiFi.");
          }
        }, 5000);
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
    cleanupPeerConnection();
    socket.emit('next_stranger', { type: chatType, interests: userInterests });
  };

  const handleStop = () => {
    socket.emit('stop_chat');
    setIsConnected(false);
    isConnectedRef.current = false;
    setSharedInterests([]);
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
      const filteredMsg = cleanMessage(inputMsg);
      const msgObj = { sender: 'me', text: filteredMsg };
      setMessages((prev) => [...prev, msgObj]);
      socket.emit('chat_message', inputMsg);
      playSfx(receiveSound); // The single "bop"
      setInputMsg('');
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
    <div className={`desktop-ui-container ${chatType === 'video' ? 'video-mode' : 'text-mode'}`}>
      <ConnectionAura active={auraActive} />

      {/* Left Sidebar */}
      <div className="left-sidebar">
        <div className="sidebar-panel warning-panel">
          <div className="warning-content">
            <div className="warning-icon">
              <AlertTriangle size={24} color="#facc15" />
              <span>WARNING</span>
            </div>
            <p>Any abuse or inappropriate behavior will be recorded and may be shared with our official platforms and authorities.</p>
            <p className="strict">Strict action will be taken.</p>
            <p>You are not anonymous.</p>
            <p className="behave">Behave.</p>
          </div>
        </div>

        <div className="sidebar-panel session-panel">
          <div className="session-info">
            <p className="session-label">Session Duration</p>
            <p className="session-value">{formatSessionTime(sessionTime)}</p>
            <div className="moderation-messages">

            </div>
          </div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="main-stage">
        <div className="video-container-primary">
          {!isConnected ? (
            <div className="stranger-placeholder">
              <div className="premium-loader-container">
                <div className="pulse-ring ring-1"></div>
                <div className="pulse-ring ring-2"></div>
                <div className="pulse-ring ring-3"></div>
                <div className="scanner-line"></div>
                <div className="glow-circle-inner premium">
                  <span className="funny-message-text">
                    {searchingText}
                  </span>
                </div>
              </div>
            </div>
          ) : chatType === 'text' ? (
            <div className="text-chat-active-overlay">
              <h1 className="text-chat-title">Text Chat Active</h1>
              <p className="text-chat-subtitle">
                {sharedInterests.length > 0 
                  ? `You both like: ${sharedInterests.join(', ')}` 
                  : strangerInterests.length > 0 
                    ? `Stranger is interested in: ${strangerInterests.join(', ')}`
                    : status}
              </p>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video hidden"
                style={{ display: 'none' }}
              ></video>
            </div>
          ) : (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            ></video>
          )}

          {/* Interest Matching Badge for Video Chat Overlay (or generic overlay) */}
          {isConnected && chatType === 'video' && sharedInterests.length > 0 && (
            <div className="interest-match-badge" style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 179, 71, 0.9)',
              color: '#000',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              zIndex: 10,
              boxShadow: '0 4px 15px rgba(255, 179, 71, 0.3)',
              fontSize: '0.95rem'
            }}>
              🎯 {sharedInterests.length > 0 
                ? `Both interested in: ${sharedInterests.join(', ')}`
                : `Stranger likes: ${strangerInterests.join(', ')}`}
            </div>
          )}

          <div className="video-overlay-top-right" style={{ display: 'none' }}>
            <button className="mute-btn" title="Toggle Audio">
              <div className="mic-icon-cross">/</div>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
          </div>

          <div className="video-overlay-bottom-left">

          </div>

          {/* User Cam Overlay */}
          <div className="user-cam-overlay">
            <div className="user-video-wrapper">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`local-video filter-${selectedFilter} ${safetyViolation ? 'blur-heavy' : ''}`}
              ></video>
              <div className="overlay-mic-status" style={{ display: 'none' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="#ff4444" strokeWidth="2" fill="none"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bottom-navbar">
        <div className="nav-left">
          <div className="digital-clock">
            <span className="time">{currentTime}</span>
          </div>
        </div>

        <div className="nav-center">
          <button className="nav-circle-btn btn-new-match" onClick={() => { playSfx(tapSound); handleNext(); }} title="New Match">
            <UserSearch size={24} />
          </button>

          <button className="nav-circle-btn btn-filters" onClick={() => setShowFilters(!showFilters)} title="Filters">
            <Wand2 size={24} />
          </button>

          <button className="nav-circle-btn btn-report" onClick={() => { playSfx(tapSound); reportUser(); }} title="Report User">
            <Shield size={24} />
          </button>

          <button 
            className={`nav-circle-btn btn-chat ${showChat ? 'active' : ''}`} 
            onClick={() => { playSfx(tapSound); setShowChat(!showChat); }} 
            title="Toggle Chat"
          >
            <MessageSquare size={24} />
          </button>

          <button className="nav-circle-btn btn-home" onClick={() => { playSfx(tapSound); handleHome(); }} title="Back Home">
            <LogOut size={24} />
          </button>
        </div>

        <div className="nav-right">
          {/* Empty right section to maintain flex balance */}
        </div>
      </div>

      {/* Floating Chat Sidebar (Conditional) */}
      {showChat && (
        <div className="floating-chat-sidebar">
          <div className="chat-header">
            <span>Stranger Chat</span>
            <button className="close-chat" onClick={() => setShowChat(false)}>×</button>
          </div>
          <div className="chat-body" ref={chatboxRef}>
            <div className="status-msg">{status}</div>
            {messages.map((m, i) => (
              <div key={i} className={`message-bubble ${m.sender === 'me' ? 'me' : 'stranger'}`}>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="chat-footer">
            <input 
              type="text" 
              placeholder="Type message..." 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={(e) => sendMessage(e)} disabled={!isConnected || !inputMsg.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

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
