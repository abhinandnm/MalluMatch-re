import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Video, HelpCircle, MessageSquare } from 'lucide-react';
import UserCount from './UserCount';
import ThemeToggle from './ThemeToggle';

export default function DesktopNavbar() {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      setTimeString(`${time} • ${date}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="google-meet-header">
      <div className="header-left">
        <Link to="/" className="google-meet-logo">
          <div className="logo-icon-wrap">
            <Video size={22} className="logo-icon-svg" />
          </div>
          <span className="logo-text-google">
            Mallu<span className="logo-text-accent">Match</span>
          </span>
        </Link>
      </div>

      <div className="header-right">
        {timeString && <span className="google-time-text">{timeString}</span>}
        <UserCount />
        <ThemeToggle />
        <Link to="/about" className="header-icon-btn" title="About & Help">
          <HelpCircle size={20} />
        </Link>
        <Link to="/contact" className="header-icon-btn" title="Feedback & Support">
          <MessageSquare size={20} />
        </Link>
      </div>
    </header>
  );
}
