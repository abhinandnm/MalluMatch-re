import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Lock, BellRing } from 'lucide-react';
import './AdminPortal.css';

export default function AdminPortal() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('https://mallumatch-api.onrender.com');
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!message.trim() || !password.trim()) {
      setStatus('Please enter both password and message.');
      return;
    }

    socketRef.current.emit('admin_broadcast', { message, password });
    setStatus('Broadcast request sent! Check the home page.');
    setMessage('');
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
           <div className="admin-icon"><BellRing size={24} /></div>
           <h1>Admin Broadcast Center</h1>
           <p>Send a real-time announcement to every user currently on MalluMatch.</p>
        </div>

        <form className="admin-form" onSubmit={handleBroadcast}>
           <div className="input-field">
              <label><Lock size={14} /> Admin Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secret password..."
              />
           </div>

           <div className="input-field">
              <label>Announcement Message</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your global message here..."
                rows="4"
              ></textarea>
           </div>

           {status && <div className={`admin-status ${status.includes('sent') ? 'success' : 'error'}`}>{status}</div>}

           <button type="submit" className="blast-btn">
              <Send size={18} />
              <span>Blast Announcement</span>
           </button>
        </form>
      </div>
    </div>
  );
}
