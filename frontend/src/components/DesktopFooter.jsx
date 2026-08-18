import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronUp, ChevronDown } from 'lucide-react';

export default function DesktopFooter() {
  const [blogsOpen, setBlogsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setBlogsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const blogArticles = [
    { title: 'Top 5 Free Random Chat Apps in 2026', path: '/blog/free-random-chat-apps-2026' },
    { title: 'How to Stay Anonymous on Random Chat Apps', path: '/blog/how-to-stay-anonymous-on-random-chat-apps' },
    { title: 'Chat with Mallus Online Tips & Tricks', path: '/blog/chat-with-mallus-online-tips-tricks' },
    { title: 'Random Video Chat Safely in 2026', path: '/blog/random-video-chat-safely-in-2026' },
    { title: 'Best Global Random Chat Apps', path: '/blog/best-random-chat-apps-global-connections' },
  ];

  return (
    <footer className="google-desktop-footer">
      <div className="footer-left-nav">
        <Link to="/about">About Us</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/contact">Contact</Link>

        {/* Single Blogs Popover Button */}
        <div className="blogs-popover-container" ref={dropdownRef}>
          <button 
            className={`blogs-menu-btn ${blogsOpen ? 'active' : ''}`}
            onClick={() => setBlogsOpen(!blogsOpen)}
          >
            <BookOpen size={15} />
            <span>Blogs</span>
            {blogsOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {blogsOpen && (
            <div className="blogs-dropdown-menu">
              <div className="blogs-dropdown-header">Articles & Guides</div>
              {blogArticles.map((article, idx) => (
                <Link
                  key={idx}
                  to={article.path}
                  className="blogs-dropdown-item"
                  onClick={() => setBlogsOpen(false)}
                >
                  {article.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="footer-right-info">
        <span>&copy; {new Date().getFullYear()} MalluMatch. All rights reserved.</span>
        <span className="dot-divider">•</span>
        <span>Developed by Nexa Labs</span>
      </div>
    </footer>
  );
}
