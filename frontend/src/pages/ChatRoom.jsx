import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send, UserX, UserSearch, LogOut, Layout } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import './ChatRoom.css';

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function ChatRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const chatType = location.state?.type || 'text';
  
  const [status, setStatus] = useState('Connecting to server...');
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatboxRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('https://mallumatch-api.onrender.com');
    
    const setupMedia = async () => {
      if (chatType === 'video') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing media devices.", err);
          setStatus('Camera access denied. Text mode only.');
        }
      }
      socketRef.current.emit('join_queue', { type: chatType });
      setStatus('Looking for a partner...');
    };

    socketRef.current.on('connect', () => {
      setupMedia();
    });

    socketRef.current.on('match_found', ({ message }) => {
      setIsConnected(true);
      setStatus("You're now chatting with a random stranger! Say hi.");
      setMessages([]);
      createPeerConnection();
    });

    socketRef.current.on('stranger_disconnected', ({ message }) => {
      setIsConnected(false);
      setStatus("Stranger has disconnected.");
      cleanupPeerConnection();
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
    });

    return () => {
      cleanupPeerConnection();
      if (localStreamRef.current) {
         localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [chatType]);

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
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('webrtc_ice_candidate', event.candidate);
      }
    };
  };

  const cleanupPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
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
    if (!remoteVideoRef.current) return;
    
    // Capture a snapshot of the remote video
    const canvas = document.createElement('canvas');
    canvas.width = remoteVideoRef.current.videoWidth || 640;
    canvas.height = remoteVideoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height);
    
    const screenshot = canvas.toDataURL('image/webp', 0.5); // Compressed screenshot
    
    socket.emit('report_user', { screenshot });
    setStatus('User reported. Moderation team notified.');
    setTimeout(() => setStatus(isConnected ? 'Chatting with stranger...' : 'Searching...'), 3000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMsg.trim() && isConnected) {
      const msgObj = { sender: 'me', text: inputMsg };
      setMessages((prev) => [...prev, msgObj]);
      socketRef.current.emit('chat_message', inputMsg);
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
    <div className="chatbox-container">
      
      {chatType === 'video' && (
        <div className="video-column">
          <div className="video-feed stranger-video">
             {!isConnected && <div className="video-status">Waiting for partner...</div>}
             <video ref={remoteVideoRef} autoPlay playsInline></video>
          </div>
          <div className="video-feed self-video">
             <video ref={localVideoRef} autoPlay playsInline muted></video>
             <div className="self-label">You</div>
          </div>
        </div>
      )}

      <div className={`chat-column ${chatType === 'text' ? 'full-width' : ''}`}>
        
        <div className="chat-header">
           <div className="status-indicator">
              <span className={`status-dot ${isConnected ? 'active' : ''}`}></span>
              <span>{isConnected ? "Connected" : "Disconnected"}</span>
           </div>
           {chatType === 'text' && <div className="mode-badge">Text Mode</div>}
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

        <div className="chat-control">
          <div className="btn-group-left">
            {!isConnected && status.includes('disconnected') ? (
              <button className="control-btn next-btn" onClick={handleNext}>
                <UserSearch size={20} />
                <div className="btn-labels">
                  <span className="btn-title">New</span>
                  <span className="btn-sub">Esc</span>
                </div>
              </button>
            ) : (
              <button className="control-btn stop-btn" onClick={handleStop} disabled={!isConnected && !status.includes('Looking')}>
                <UserX size={20} />
                <div className="btn-labels">
                  <span className="btn-title">Stop</span>
                  <span className="btn-sub">Esc</span>
                </div>
              </button>
            )}
             <button className="control-btn report-btn" onClick={reportUser} title="Report Nudity/Abuse">
                <Layout size={16} color="#ef4444" /> {/* Use Layout as a shield-like icon or similar */}
             </button>
             <button className="control-btn exit-btn" onClick={handleHome}>
                <LogOut size={16} /> {/* Exit */}
             </button>
          </div>
          
          <div className="input-wrap">
             <textarea 
               className="chatmsg"
               disabled={!isConnected}
               value={inputMsg}
               onChange={(e) => setInputMsg(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder={isConnected ? "Type a message..." : "Waiting to connect..."}
             ></textarea>
          </div>
          
          <div className="btn-group-right">
             <button className="control-btn send-btn" onClick={sendMessage} disabled={!isConnected || !inputMsg.trim()}>
                <Send size={20} className="send-icon" />
             </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
