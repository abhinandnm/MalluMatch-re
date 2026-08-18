import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import socket from '../socket';
import { Video, MessageSquare, Zap, CheckSquare, Square, Sparkles, Globe, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import './DesktopHome.css';

export default function DesktopHome() {
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(0);
  const [interestsInput, setInterestsInput] = useState('');
  const [selectedMode, setSelectedMode] = useState('text');
  const [ageConfirmed, setAgeConfirmed] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const handleOnlineUsers = (data) => {
      setOnlineCount(typeof data === 'object' ? data.count : data);
    };
    socket.on('online_users', handleOnlineUsers);
    return () => socket.off('online_users', handleOnlineUsers);
  }, []);

  // Google Meet style feature preview slides
  const slides = [
    {
      title: "Get a link you can share",
      desc: "Click New Chat to get a connection you can send to people you want to talk with.",
      icon: <Sparkles size={48} />
    },
    {
      title: "See everyone together",
      desc: "Connect seamlessly via high quality text and real-time WebRTC media streams.",
      icon: <Globe size={48} />
    },
    {
      title: "Your conversation is safe",
      desc: "No one outside the session can join. Automated moderation is active 24/7.",
      icon: <Lock size={48} />
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleNextSlide = () => {
    setActiveSlide(prev => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setActiveSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleStart = () => {
    if (!ageConfirmed) {
      setErrorMessage('Please confirm you are 18+ and agree to our Terms to start.');
      return;
    }
    setErrorMessage('');
    const interests = interestsInput.split(',').map(i => i.trim().toLowerCase()).filter(i => i);
    navigate('/chat', { state: { type: selectedMode, interests } });
  };

  return (
    <div className="google-meet-home">
      {/* Main Split Layout */}
      <main className="meet-main-container">
        {/* Left Side: Call to Action */}
        <div className="meet-left-hero">
          <h1 className="meet-headline">
            Video & text chat for everyone.
          </h1>

          <p className="meet-subheadline">
            Connect, collaborate, and chat with strangers from anywhere on MalluMatch.
          </p>

          <div className="meet-controls-panel">
            {/* Mode selection pills */}
            <div className="meet-mode-pills">
              <button 
                className={`meet-pill ${selectedMode === 'text' ? 'active' : ''}`}
                onClick={() => setSelectedMode('text')}
              >
                <MessageSquare size={16} /> Text Chat
              </button>
              <button 
                className={`meet-pill ${selectedMode === 'video' ? 'active' : ''}`}
                onClick={() => {
                  alert("Video chat is temporarily disabled. Please use text chat.");
                  setSelectedMode('text');
                }}
              >
                <Video size={16} /> Video Chat
              </button>
            </div>

            {/* Interest Input & Start Button Row */}
            <div className="meet-action-row">
              <button 
                className={`meet-start-btn ${!ageConfirmed ? 'disabled' : ''}`}
                onClick={handleStart}
              >
                <Video size={18} />
                <span>New Chat</span>
              </button>

              <div className="meet-input-box">
                <Zap size={18} className="meet-input-icon" />
                <input
                  type="text"
                  placeholder="Enter interests (optional)..."
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                />
              </div>
            </div>

            {/* Age Verification & Legal Acceptance */}
            <div className="meet-terms-row">
              <label 
                className="meet-terms-label"
                onClick={() => setAgeConfirmed(!ageConfirmed)}
              >
                {ageConfirmed ? (
                  <CheckSquare size={16} className="checkbox-icon checked" />
                ) : (
                  <Square size={16} className="checkbox-icon" />
                )}
                <span>
                  I am <strong>18+ years old</strong> and agree to the{' '}
                  <Link to="/terms" onClick={(e) => e.stopPropagation()}>Terms of Service</Link> &{' '}
                  <Link to="/privacy" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>.
                </span>
              </label>
              {errorMessage && <div className="meet-error-text">{errorMessage}</div>}
            </div>

            <div className="meet-divider"></div>

            <div className="meet-learn-more">
              <Link to="/about">Learn more</Link> about MalluMatch
            </div>
          </div>
        </div>

        {/* Right Side: Google Meet Graphic Carousel Card */}
        <div className="meet-right-card-container">
          <div className="meet-carousel-card">
            <button className="carousel-nav-btn prev" onClick={handlePrevSlide} title="Previous">
              <ChevronLeft size={20} />
            </button>
            <button className="carousel-nav-btn next" onClick={handleNextSlide} title="Next">
              <ChevronRight size={20} />
            </button>

            <div className="slide-icon-circle">
              {slides[activeSlide].icon}
            </div>
            <h2>{slides[activeSlide].title}</h2>
            <p>{slides[activeSlide].desc}</p>

            <div className="carousel-dots">
              {slides.map((_, idx) => (
                <span 
                  key={idx} 
                  className={`dot ${idx === activeSlide ? 'active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
