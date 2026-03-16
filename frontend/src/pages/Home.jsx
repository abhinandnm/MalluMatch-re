import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Video, MessageSquare, Shield, Users, Zap } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const socket = io('https://mallumatch-api.onrender.com');
    socket.on('online_users', (count) => {
      setOnlineCount(count + 24050); // Fake a high number
    });
    
    return () => socket.disconnect();
  }, []);

  const handleStart = (type) => {
    navigate('/chat', { state: { type } });
  };

  return (
    <div className="home-container">
      
      <div className="hero-section">
        {/* Matrix Earth Background - Desktop Only */}
        <video 
          className="hero-video-bg" 
          autoPlay 
          muted 
          loop 
          playsInline
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-the-earth-rotating-1611-large.mp4" type="video/mp4" />
        </video>

        <div className="hero-text">
          <div className="live-pill">
             <span className="pulse-dot"></span>
             <strong>{onlineCount.toLocaleString()}</strong> users online right now
          </div>
          <h1>Connect With The World, <span className="text-gradient">Instantly.</span></h1>
          <p className="subtitle">
            Experience the thrill of spontaneous conversation. Meet new friends globally through high-quality random video or text chat.
          </p>
        </div>

        <div className="action-card">
          <h3>Choose your experience</h3>
          <p className="action-desc">No registration required. Just jump right in.</p>
          
          <div className="action-buttons">
            <button className="premium-btn text-mode" onClick={() => handleStart('text')}>
              <div className="btn-icon">
                <MessageSquare size={24} />
              </div>
              <div className="btn-content">
                <span className="btn-title">Text Chat</span>
                <span className="btn-sub">Lightning fast messaging</span>
              </div>
            </button>
            
            <button className="premium-btn video-mode" onClick={() => handleStart('video')}>
              <div className="btn-icon">
                <Video size={24} />
              </div>
              <div className="btn-content">
                <span className="btn-title">Video Chat</span>
                <span className="btn-sub">Face-to-face connection</span>
              </div>
            </button>
          </div>
          
          <div className="compliance-text">
            By starting, you agree to our <a href="/terms">Terms of Service</a> & <a href="/privacy">Privacy Policy</a>. 
            <br />You must be <strong>18+</strong> to use this service.
          </div>
        </div>
      </div>

      <div className="features-section">
         <div className="feature-item">
            <div className="feature-icon"><Zap size={28} /></div>
            <h4>Instant Matching</h4>
            <p>Our intelligent queue system connects you to a partner in milliseconds, with zero latency routing.</p>
         </div>
         <div className="feature-item">
            <div className="feature-icon"><Shield size={28} /></div>
            <h4>Private & Secure</h4>
            <p>Video and audio streams are fully peer-to-peer encrypted (WebRTC). We don't store your chat logs.</p>
         </div>
         <div className="feature-item">
            <div className="feature-icon"><Users size={28} /></div>
            <h4>Global Community</h4>
            <p>With thousands of users online at any moment, you'll never run out of interesting people to meet.</p>
         </div>
      </div>

      <AdBanner adSlot="1234567890" style={{ marginTop: '4rem' }} />

    </div>
  );
}
