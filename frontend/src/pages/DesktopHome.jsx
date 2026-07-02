import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import socket from '../socket';
import { Video, MessageSquare, Zap } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import './DesktopHome.css';

export default function DesktopHome() {
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(0);
  const [interestsInput, setInterestsInput] = useState('');
  const [selectedMode, setSelectedMode] = useState('text');

  useEffect(() => {
    const handleOnlineUsers = (data) => {
      setOnlineCount(typeof data === 'object' ? data.count : data);
    };

    socket.on('online_users', handleOnlineUsers);

    return () => {
      socket.off('online_users', handleOnlineUsers);
    };
  }, []);

  const handleStart = () => {
    const interests = interestsInput.split(',').map(i => i.trim().toLowerCase()).filter(i => i);
    navigate('/chat', { state: { type: selectedMode, interests } });
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-text">
          <span className="eyebrow">Text &amp; video &middot; Kerala-first</span>

          <h1>
            Kerala's own<br />
            <span className="thread-underline">random chat</span>
          </h1>
          <p className="subtitle">
            Meet someone new, nearby or across Kerala. No account, no profile — just pick a mode and start talking.
          </p>

          <div className="stats-row">
            <div className="stat-box">
              <span className="stat-value is-live">
                <span className="live-dot"></span>
                {onlineCount.toLocaleString()}
              </span>
              <span className="stat-label">Online now</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-box">
              <span className="stat-value">Free</span>
              <span className="stat-label">Always</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-box">
              <span className="stat-value">None</span>
              <span className="stat-label">Sign-up</span>
            </div>
          </div>
        </div>

        <div className="action-card-wrapper">
          <div className="action-card">
            <div className="card-header">
              <h3>Set up your chat</h3>
              <p className="action-desc">No registration required. Jump right in.</p>
            </div>

            <div className="input-group">
              <label>Your interests (optional)</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="e.g. music, movies, cricket..."
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                />
                <div className="input-tag">
                  <Zap size={12} /> what are you into?
                </div>
              </div>
              <p className="input-hint">Comma separated &middot; Matches you with people who share your vibe</p>
            </div>

            <div className="mode-selection">
              <label>Select mode</label>

              <div
                className={`mode-btn ${selectedMode === 'text' ? 'selected' : ''}`}
                onClick={() => setSelectedMode('text')}
              >
                <div className="mode-icon-wrapper">
                  <MessageSquare size={20} />
                </div>
                <div className="mode-content">
                  <span className="mode-title">Text chat</span>
                  <span className="mode-sub">Lightning-fast anonymous messaging</span>
                </div>
                <div className="mode-badge popular">Popular</div>
              </div>

              <div
                className={`mode-btn ${selectedMode === 'video' ? 'selected' : ''}`}
                onClick={() => {
                  alert("Video chats are disabled temporarily. Please use text chat.");
                  setSelectedMode('text');
                }}
              >
                <div className="mode-icon-wrapper">
                  <Video size={20} />
                </div>
                <div className="mode-content">
                  <span className="mode-title">Video chat</span>
                  <span className="mode-sub">Face to face, real-time connection</span>
                </div>
                <div className="mode-badge live">Live</div>
              </div>
            </div>

            <button className="start-chat-btn" onClick={handleStart}>
              Start chatting
            </button>

            <div className="compliance-text">
              By starting you agree to our <a href="/terms">Terms</a> &amp; <a href="/privacy">Privacy Policy</a>
              <br />Must be <strong>18+</strong> to use this platform
            </div>
          </div>
        </div>
      </div>

      <div className="seo-content-section">
        <h2>Anonymous chat with strangers online</h2>
        <p>
          Discover the thrill of meeting new people on our leading <strong>free random chat</strong> platform. Whether you are looking for a quick <strong>anonymous chat</strong> or hoping to make long-lasting global connections, Mallu Match provides the perfect, safe environment. As a popular <strong>Mallu chat app</strong>, we connect Malayalis and users from all around the world instantly!
        </p>
        <p>
          Enjoy crystal-clear <strong>random video chat</strong> or lightning-fast text messaging. No registration is required, meaning your identity is protected. Jump into a room and start exploring diverse cultures today.
        </p>
      </div>

      <AdBanner adSlot="1234567890" style={{ marginTop: '4rem', position: 'relative', zIndex: 1 }} />
    </div>
  );
}
