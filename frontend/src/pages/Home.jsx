import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import socket from '../socket';
import { Video, MessageSquare, Shield, Users, Zap } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    socket.on('online_users', (data) => {
      setOnlineCount(typeof data === 'object' ? data.count : data);
    });
    
    return () => {
      socket.off('online_users');
    };
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
          <h1>The Best <span className="text-gradient">Random Chat App</span> Online</h1>
          <p className="subtitle">
            Welcome to Mallu Match. Chat with strangers online through high-quality random video and text. Secure, free, and anonymous.
          </p>
        </div>

        <div className="action-card">
          <h3>Choose your experience</h3>
          <p className="action-desc">No registration required. Just jump right in.</p>
          
          <div className="action-buttons">
            <Link to="/chat" state={{ type: 'text' }} className="premium-btn text-mode" style={{ textDecoration: 'none' }}>
              <div className="btn-icon">
                <MessageSquare size={24} />
              </div>
              <div className="btn-content">
                <span className="btn-title">Text Chat</span>
                <span className="btn-sub">Lightning fast messaging</span>
              </div>
            </Link>
            
            <Link to="/chat" state={{ type: 'video' }} className="premium-btn video-mode" style={{ textDecoration: 'none' }}>
              <div className="btn-icon">
                <Video size={24} />
              </div>
              <div className="btn-content">
                <span className="btn-title">Video Chat</span>
                <span className="btn-sub">Face-to-face connection</span>
              </div>
            </Link>
          </div>
          
          <div className="compliance-text">
            By starting, you agree to our <a href="/terms">Terms of Service</a> & <a href="/privacy">Privacy Policy</a>. 
            <br />You must be <strong>18+</strong> to use this service.
          </div>
        </div>
      </div>

      <div className="seo-content-section" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#b3b3b3', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1rem' }}>Anonymous Chat with Strangers Online</h2>
        <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
          Discover the thrill of meeting new people on our leading <strong>free random chat</strong> platform. Whether you are looking for a quick <strong>anonymous chat</strong> or hoping to make long-lasting global connections, Mallu Match provides the perfect, safe environment. As a popular <strong>Mallu chat app</strong>, we connect Malayalis and users from all around the world instantly!
        </p>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
          Enjoy crystal-clear <strong>random video chat</strong> or lightning-fast text messaging. No registration is required, meaning your identity is protected. Jump into a room and start exploring diverse cultures today.
        </p>
        <h3 style={{ fontSize: '1.4rem', color: '#ffb347', marginTop: '1.5rem' }}>Start chatting now on Mallu Match – free and anonymous!</h3>
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
