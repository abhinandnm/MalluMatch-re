import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send, UserX, UserSearch, LogOut, Shield, MessageSquare, Info, Wand2 } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import ConnectionAura from '../components/ConnectionAura';
import './ChatRoom.css';

// 🌍 Tip: Use a service like Metered.ca (Free) to get your TURN server credentials.
// Once you have them, replace the 'turn' entry below with your provided details.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Metered.ca TURN Servers
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "ac675f7e704f87c62cf6ab5a",
      credential: "JEuecFeIRtJPsQoQ"
    },
    {
      urls: "turn:global.relay.metered.ca:443?transport=tcp",
      username: "ac675f7e704f87c62cf6ab5a",
      credential: "JEuecFeIRtJPsQoQ"
    }
  ],
  iceCandidatePoolSize: 10,
};

export default function ChatRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const chatType = location.state?.type || 'text';
  
  const [status, setStatus] = useState('Connecting to server...');
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [auraActive, setAuraActive] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const FILTERS = [
    { id: 'none', label: 'None', color: '#64748b' },
    { id: 'bw', label: 'B&W', color: '#94a3b8' },
    { id: 'retro', label: 'Retro', color: '#b45309' },
    { id: 'xray', label: 'X-Ray', color: '#ffffff' },
    { id: 'disco', label: 'Disco', color: '#ec4899' },
    { id: 'mystic', label: 'Mystic', color: '#a855f7' },
    { id: 'alien', label: 'Alien', color: '#22c55e' }
  ];
  
  const socketRef = useRef(null);
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
      if (socketRef.current?.connected) {
        console.log("🚀 Emitting join_queue...");
        socketRef.current.emit('join_queue', { type: chatType });
        setStatus('Looking for a partner...');
      } else {
        console.log("⏳ Socket not connected, will join on connect.");
      }
      isMediaInitializing.current = false;
    }
  }, [chatType]);

    useEffect(() => {
      console.log("⚡ ChatRoom Effect Initializing...");
      socketRef.current = io('https://mallumatch-api.onrender.com');
      
      socketRef.current.on('connect', () => {
        console.log("🔗 Socket connected.");
        if (!isMediaInitializing.current && (!localStreamRef.current || !localStreamRef.current.active)) {
           setupMedia();
        } else if (socketRef.current.connected) {
           socketRef.current.emit('join_queue', { type: chatType });
        }
      });

      // Move setupMedia call to the end of listener attachments to avoid race conditions
      // (Originally here, now moved below all .on() calls)

      socketRef.current.on('match_found', ({ message }) => {
        console.log("🎮 match_found event received!");
        setIsConnected(true);
        setAuraActive(true);
        setStatus("Partner found! Respect each other and have fun.");
        setMessages([]);
        createPeerConnection();
        playSfx(matchSound);
        setTimeout(() => setAuraActive(false), 5000);
        
        // Auto-hide sidebar to reveal video on match
        if (chatType === 'video') {
          console.log("📱 Auto-hiding sidebar for video chat.");
          setShowChat(false);
        }
      });

      socketRef.current.on('stranger_disconnected', ({ message }) => {
        setIsConnected(false);
        setStatus("Stranger has disconnected.");
        cleanupPeerConnection();
        playSfx(disconnectSound);
      });

      socketRef.current.on('initiate_webrtc', async () => {
        if (!peerConnectionRef.current) return;
        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socketRef.current.emit('webrtc_offer', offer);
        } catch (err) {
          console.error("Error creating offer", err);
        }
      });

      socketRef.current.on('webrtc_offer', async (offer) => {
        if (!peerConnectionRef.current) return;
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          socketRef.current.emit('webrtc_answer', answer);
        } catch (err) {
          console.error("Error handling offer", err);
        }
      });

      socketRef.current.on('webrtc_answer', async (answer) => {
        if (!peerConnectionRef.current) return;
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error handling answer", err);
        }
      });

      socketRef.current.on('webrtc_ice_candidate', async (candidate) => {
        if (!peerConnectionRef.current) return;
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate", err);
        }
      });

      socketRef.current.on('chat_message', (msg) => {
        setMessages((prev) => [...prev, msg]);
        if (msg.sender !== 'me') {
          playSfx(receiveSound);
        }
      });

      socketRef.current.on('kicked', ({ message }) => {
        playSfx(alertSound);
        alert(message || 'You have been kicked by an admin.');
        navigate('/');
      });

      socketRef.current.on('banned', ({ message }) => {
        playSfx(alertSound);
        alert(message || 'Your IP has been banned for violating community guidelines.');
        navigate('/');
      });

      // 🔥 FIXED: Attach listeners BEFORE starting media/queue to avoid missing events
      if (socketRef.current.connected) {
         setupMedia();
      }

      return () => {
        cleanupPeerConnection();
        if (localStreamRef.current) {
           localStreamRef.current.getTracks().forEach(track => track.stop());
           localStreamRef.current = null;
        }
        if (socketRef.current) socketRef.current.disconnect();
      };
    }, [chatType, setupMedia]);

  // High-reliability auto-hide for mobile matching
  useEffect(() => {
    if (isConnected && chatType === 'video' && window.innerWidth < 768) {
      console.log("📱 High-reliability auto-hide triggered.");
      setShowChat(false);
    }
  }, [isConnected, chatType]);

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
        socketRef.current.emit('webrtc_ice_candidate', event.candidate);
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
    setStatus('Looking for a partner...');
    setMessages([]);
    cleanupPeerConnection();
    socketRef.current.emit('next_stranger', { type: chatType });
  };

  const handleStop = () => {
    socketRef.current.emit('stop_chat');
    setIsConnected(false);
    setStatus('You have disconnected.');
  };

  const handleHome = () => {
    handleStop();
    navigate('/');
  };

  const reportUser = () => {
    let screenshot = null;

    if (remoteVideoRef.current && remoteVideoRef.current.videoWidth > 0) {
      // Capture a snapshot of the remote video if available
      const canvas = document.createElement('canvas');
      canvas.width = remoteVideoRef.current.videoWidth || 640;
      canvas.height = remoteVideoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height);
      screenshot = canvas.toDataURL('image/webp', 0.5); // Compressed screenshot
    }
    
    socketRef.current.emit('report_user', { screenshot });
    playSfx(reportSound);
    setStatus('User reported. Moderation team notified.');
    setTimeout(() => setStatus(isConnected ? 'Chatting with stranger...' : 'Searching...'), 3000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMsg.trim() && isConnected) {
      const msgObj = { sender: 'me', text: inputMsg };
      setMessages((prev) => [...prev, msgObj]);
      socketRef.current.emit('chat_message', inputMsg);
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

  return (
    <div className={`chatbox-container ${chatType === 'video' ? 'meet-layout' : 'text-layout'}`}>
      <ConnectionAura active={auraActive} />
      
      <div className="main-content-stage">
        {chatType === 'video' && (
          <div className="video-column meet-style">
             <div className="video-feed stranger-video">
                {!isConnected && <div className="video-status">Waiting for partner...</div>}
                {!isConnected && status.includes('denied') && (
                  <button className="premium-btn" onClick={() => setupMedia()} style={{ marginTop: '1rem' }}>
                    Retry Camera
                  </button>
                )}
                <video 
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el && remoteStream) el.srcObject = remoteStream;
                  }} 
                  autoPlay 
                  playsInline
                ></video>
             </div>
             <div className="video-feed self-video">
                <video 
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStream) el.srcObject = localStream;
                  }} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`filter-${selectedFilter}`}
                ></video>
                <div className="self-label">You</div>
             </div>
          </div>
        )}

        {chatType === 'text' && (
          <div className="text-mode-placeholder">
             <h2>Text Chat Active</h2>
             <p>{status}</p>
          </div>
        )}

        <div className="meet-controls-bar">
          {showFilters && (
            <div className="filter-menu">
              {FILTERS.map(f => (
                <div 
                  key={f.id} 
                  className={`filter-option ${selectedFilter === f.id ? 'active' : ''}`}
                  onClick={() => { setSelectedFilter(f.id); setShowFilters(false); playSfx(tapSound); }}
                >
                  <div className={`filter-preview-circle filter-${f.id}`} style={{ backgroundColor: f.color }}></div>
                  <span className="filter-label">{f.label}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="controls-group">
            {!isConnected && status.includes('disconnected') ? (
              <button className="meet-btn next-btn" onClick={() => { playSfx(tapSound); handleNext(); }} title="Match New Partner">
                <UserSearch size={22} />
              </button>
            ) : (
              <button className="meet-btn stop-btn" onClick={() => { playSfx(tapSound); handleStop(); }} disabled={!isConnected && !status.includes('Looking')} title="Stop Chat">
                <UserX size={22} />
              </button>
            )}

            <button className={`meet-btn filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)} title="Funny Filters">
               <Wand2 size={20} />
            </button>

            <button className="meet-btn report-btn" onClick={() => { playSfx(tapSound); reportUser(); }} title="Report User">
              <Shield size={20} />
            </button>

            <button className={`meet-btn chat-toggle-btn ${showChat ? 'active' : ''}`} onClick={() => setShowChat(!showChat)} title="Toggle Chat">
              <MessageSquare size={20} />
            </button>

            <button className="meet-btn exit-btn danger" onClick={() => { playSfx(tapSound); handleHome(); }} title="Exit to Home">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className={`chat-sidebar ${showChat ? 'visible' : 'hidden'} ${chatType === 'text' ? 'full-ui' : ''}`}>
        <div className="sidebar-header">
           <div className="status-indicator">
              <span className={`status-dot ${isConnected ? 'active' : ''}`}></span>
              <span>{isConnected ? "Connected" : "Disconnected"}</span>
           </div>
           
           <div className="mobile-sidebar-actions">
             {!isConnected && status.includes('disconnected') ? (
                <button className="sidebar-action-btn next" onClick={() => { playSfx(tapSound); handleNext(); }} title="Match New Partner">
                  <UserSearch size={18} />
                </button>
              ) : (
                <button className="sidebar-action-btn stop" onClick={() => { playSfx(tapSound); handleStop(); }} disabled={!isConnected && !status.includes('Looking')} title="Stop Chat">
                  <UserX size={18} />
                </button>
              )}
              
              <button className="sidebar-action-btn report" onClick={() => { playSfx(tapSound); reportUser(); }} title="Report User">
                <Shield size={18} />
              </button>
           </div>

           <button className="close-sidebar-btn" onClick={() => setShowChat(false)}>×</button>
        </div>

        <div className="chat-log" ref={chatboxRef}>
          <AdBanner adSlot="0987654321" adFormat="rectangle" style={{ maxHeight: '100px', marginBottom: '10px' }} />
          <div className="log-status-message">
            {status}
          </div>
          
          {messages.map((m, i) => (
            <div key={i} className={`logbox ${m.sender === 'me' ? 'log-me' : 'log-stranger'}`}>
               <span className="log-identity">{m.sender === 'me' ? 'You' : 'Stranger'}</span>
               <div className="log-msg-bubble">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="sidebar-input-area">
          <div className="input-wrap">
             <textarea 
               className="chatmsg"
               disabled={!isConnected}
               value={inputMsg}
               onChange={(e) => setInputMsg(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder={isConnected ? "Send a message..." : "Waiting..."}
             ></textarea>
             <button className="sidebar-send-btn" onClick={(e) => { sendMessage(e); }} disabled={!isConnected || !inputMsg.trim()}>
                <Send size={18} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
