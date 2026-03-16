import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Lock, BellRing, Shield } from 'lucide-react';
import './AdminPortal.css';

export default function AdminPortal() {
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const socketRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('https://mallumatch-api.onrender.com');
    
    socketRef.current.on('admin_auth_success', ({ reports, liveLogs }) => {
      setIsAuth(true);
      setReports(reports);
      setLogs(liveLogs);
    });

    socketRef.current.on('new_report', (report) => {
       setReports(prev => [report, ...prev]);
    });

    socketRef.current.on('live_chat_log', (log) => {
       setLogs(prev => [...prev.slice(-99), log]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleLogin = (e) => {
    e.preventDefault();
    socketRef.current.emit('admin_auth', { password });
  };

  const handleBroadcast = (e) => {
    e.preventDefault();
    socketRef.current.emit('admin_broadcast', { message, password });
    setStatus('Announcement sent!');
    setMessage('');
  };

  const handleKick = (targetId) => {
    socketRef.current.emit('admin_kick', { targetId });
  };

  const handleBan = (targetIP, targetId) => {
    socketRef.current.emit('admin_ban', { targetIP, targetId });
  };

  if (!isAuth) {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <div className="admin-header">
            <div className="admin-icon"><Lock size={24} /></div>
            <h1>Secure Admin Login</h1>
            <p>Enter your master password to access moderation tools.</p>
          </div>
          <form onSubmit={handleLogin} className="admin-form">
            <div className="input-field">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                autoFocus
              />
            </div>
            <button type="submit" className="blast-btn">Enter Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dash-sidebar">
         <div className="admin-header">
            <h2><BellRing size={20} /> Controls</h2>
         </div>
         <form className="admin-form compact" onSubmit={handleBroadcast}>
           <div className="input-field">
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Broadcast to all users..."
                rows="3"
              ></textarea>
           </div>
           <button type="submit" className="blast-btn">Blast</button>
           {status && <p className="status-mini">{status}</p>}
         </form>

         <div className="live-stats">
            <h3>Live Stats</h3>
            <div className="stat-row">Active Reports: <span>{reports.length}</span></div>
         </div>
      </div>

      <div className="dash-main">
         <section className="reports-section">
            <h2><Shield size={22} color="#ef4444" /> Recent Reports</h2>
            <div className="reports-grid">
               {reports.length === 0 && <p className="empty-msg">No reports yet.</p>}
               {reports.map(r => (
                  <div key={r.id} className="report-card">
                     <div className="report-img">
                        <img src={r.screenshot} alt="Evidence" />
                     </div>
                     <div className="report-info">
                        <div className="report-meta">
                           <strong>Target:</strong> {r.offenderId.substring(0,6)}...<br/>
                           <strong>IP:</strong> {r.offenderIP}<br/>
                           <strong>Time:</strong> {r.timestamp}
                        </div>
                        <div className="report-actions">
                           <button onClick={() => handleKick(r.offenderId)} className="action-btn kick">Kick</button>
                           <button onClick={() => handleBan(r.offenderIP, r.offenderId)} className="action-btn ban">Ban IP</button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </section>

         <section className="logs-section">
            <h2><Send size={22} color="#2563eb" /> Live Chat Feed</h2>
            <div className="logs-container">
               {logs.map((l, i) => (
                  <div key={i} className="log-entry">
                     <span className="log-time">[{l.time}]</span>
                     <span className="log-room">Room {l.roomId.substring(5,11)}:</span>
                     <span className="log-text">{l.text}</span>
                  </div>
               ))}
               <div ref={logEndRef} />
            </div>
         </section>
      </div>
    </div>
  );
}
