import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import socket from '../socket';
import { Video, MessageSquare, Shield, Users, Zap, Plus, Check } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import './DesktopHome.css';

const FLOATING_BUBBLES = [
  { icon: 'K', text: 'nee kattakada evde ullatha??', emoji: '🧐', color: '#8b5cf6', delay: '0s', left: '5%', duration: '20s' },
  { icon: 's', text: 'Saadhanam Kaiyyil undo?', emoji: '🕵️', color: '#3b82f6', delay: '5s', left: '20%', duration: '22s' },
  { icon: 'M', text: 'My phone number is double-two double-five', emoji: '', color: '#eab308', delay: '2s', left: '10%', duration: '18s' },
  { icon: 'N', text: 'സുഖമാണോ?', emoji: '👻', color: '#3b82f6', delay: '7s', left: '45%', duration: '24s' },
  { icon: 'A', text: 'are you single..?', emoji: '🔥', color: '#10b981', delay: '1s', left: '60%', duration: '15s' },
  { icon: 's', text: 'Ormayundo ee mugham?', emoji: '👮', color: '#8b5cf6', delay: '8s', left: '42%', duration: '20s' },
  { icon: 'ഹ', text: 'ഹലോ', emoji: '👋🏼', color: '#3b82f6', delay: '3s', left: '72%', duration: '19s' },
];

export default function DesktopHome() {
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(0);
  const [interestsInput, setInterestsInput] = useState('');
  const [selectedMode, setSelectedMode] = useState('text');
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleOnlineUsers = (data) => {
      setOnlineCount(typeof data === 'object' ? data.count : data);
    };
    
    socket.on('online_users', handleOnlineUsers);

    return () => {
      socket.off('online_users', handleOnlineUsers);
    };
  }, []);

  // Cursor glow effect
  useEffect(() => {
    const cursorGlow = document.getElementById('cursor-glow');
    
    const handleMouseMove = (e) => {
      if (cursorGlow) {
        requestAnimationFrame(() => {
          cursorGlow.style.left = `${e.clientX}px`;
          cursorGlow.style.top = `${e.clientY}px`;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Particle trailing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let particlesArray = [];
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#eab308', '#e879f9'];

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    const mouse = { x: null, y: null };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      for (let i = 0; i < 3; i++) {
        particlesArray.push(new Particle());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    class Particle {
      constructor() {
        this.x = mouse.x;
        this.y = mouse.y;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.1) this.size -= 0.05;
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const handleParticles = () => {
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
        
        for (let j = i; j < particlesArray.length; j++) {
          const dx = particlesArray[i].x - particlesArray[j].x;
          const dy = particlesArray[i].y - particlesArray[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 40) {
            ctx.beginPath();
            ctx.strokeStyle = particlesArray[i].color + '40'; // add transparency
            ctx.lineWidth = 0.5;
            ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
            ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
            ctx.stroke();
          }
        }
        
        if (particlesArray[i].size <= 0.1) {
          particlesArray.splice(i, 1);
          i--;
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      handleParticles();
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleStart = () => {
    const interests = interestsInput.split(',').map(i => i.trim().toLowerCase()).filter(i => i);
    navigate('/chat', { state: { type: selectedMode, interests } });
  };

  return (
    <div className="home-container">
      {/* Interactive Particle Canvas */}
      <canvas ref={canvasRef} className="particle-canvas"></canvas>
      
      {/* Cursor Glow Effect */}
      <div id="cursor-glow" className="cursor-glow"></div>

      <div className="hero-section">
        {/* Floating Bubbles Background */}
        <div className="floating-bubbles-bg">
          {FLOATING_BUBBLES.map((bubble, index) => (
            <div
              key={index}
              className="bubble-pill"
              style={{
                left: bubble.left,
                borderColor: `${bubble.color}50`,
                animationDelay: bubble.delay,
                animationDuration: bubble.duration
              }}
            >
              <div className="bubble-icon" style={{ color: bubble.color, backgroundColor: `${bubble.color}20` }}>
                {bubble.icon}
              </div>
              <span className="bubble-text">{bubble.text}</span>
              <span className="bubble-emoji">{bubble.emoji}</span>
            </div>
          ))}
        </div>

        <div className="hero-text">

          <h1>
            Kerala's Own<br />
            <span className="text-gradient">Random Chat App</span>
          </h1>
          <p className="subtitle">
            Welcome to Mallu Match. Chat with strangers online through high-quality random video and text. Secure, free, and anonymous.
          </p>

          <div className="stats-row">
            <div className="stat-box">
              <span className="stat-value">{onlineCount.toLocaleString()}</span>
              <span className="stat-label">ONLINE NOW</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-box">
              <span className="stat-value">Free</span>
              <span className="stat-label">ALWAYS</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-box">
              <span className="stat-value">💬</span>
              <span className="stat-label">Ultra Fast</span>
            </div>
          </div>
        </div>

        <div className="action-card-wrapper">
          <div className="floating-badge top-left">
            <span className="badge-icon-star">✦</span> Always Free
          </div>

          <div className="action-card">
            <div className="card-header">
              <h3>Choose Your Experience</h3>
              <p className="action-desc">No registration required. Jump right in.</p>
            </div>

            <div className="input-group">
              <label>YOUR INTERESTS (OPTIONAL)</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="e.g. music, movies, cricket..."
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                />
                <div className="input-tag">
                  <Zap size={12} fill="#eab308" color="#eab308" /> what are you into?
                </div>
              </div>
              <p className="input-hint">Comma separated &middot; Matches you with people who share your vibe</p>
            </div>

            <div className="mode-selection">
              <label>SELECT MODE</label>

              <div
                className={`mode-btn ${selectedMode === 'text' ? 'selected' : ''}`}
                onClick={() => setSelectedMode('text')}
              >
                <div className="mode-icon-wrapper">
                  <MessageSquare size={20} />
                </div>
                <div className="mode-content">
                  <span className="mode-title">Text Chat</span>
                  <span className="mode-sub">Lightning-fast anonymous messaging</span>
                </div>
                <div className="mode-badge popular">POPULAR</div>
              </div>

              <div
                className={`mode-btn ${selectedMode === 'video' ? 'selected' : ''}`}
                onClick={() => setSelectedMode('video')}
              >
                <div className="mode-icon-wrapper">
                  <Video size={20} />
                </div>
                <div className="mode-content">
                  <span className="mode-title">Video Chat</span>
                  <span className="mode-sub">Face to face real-time connection</span>
                </div>
                <div className="mode-badge live">LIVE</div>
              </div>
            </div>

            <button className="start-chat-btn" onClick={handleStart}>
              Start Chatting Now ✦
            </button>

            <div className="compliance-text">
              By starting you agree to our <a href="/terms">Terms</a> & <a href="/privacy">Privacy Policy</a>
              <br />Must be <strong>18+</strong> to use this platform
            </div>
          </div>

          <div className="floating-badge bottom-left">
            <Shield size={14} /> Anonymous
          </div>
        </div>
      </div>

      <div className="seo-content-section" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#b3b3b3', maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1rem' }}>Anonymous Chat with Strangers Online</h2>
        <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
          Discover the thrill of meeting new people on our leading <strong>free random chat</strong> platform. Whether you are looking for a quick <strong>anonymous chat</strong> or hoping to make long-lasting global connections, Mallu Match provides the perfect, safe environment. As a popular <strong>Mallu chat app</strong>, we connect Malayalis and users from all around the world instantly!
        </p>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
          Enjoy crystal-clear <strong>random video chat</strong> or lightning-fast text messaging. No registration is required, meaning your identity is protected. Jump into a room and start exploring diverse cultures today.
        </p>
      </div>

      <AdBanner adSlot="1234567890" style={{ marginTop: '4rem', position: 'relative', zIndex: 1 }} />
    </div>
  );
}

