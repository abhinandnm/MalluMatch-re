import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { Send, Lock, BellRing, Shield, AlertTriangle, Monitor, Users } from 'lucide-react';
import './AdminPortal.css';

export default function AdminPortal() {
   const [password, setPassword] = useState('');
   const [isAuth, setIsAuth] = useState(false);
   const [message, setMessage] = useState('');
   const [status, setStatus] = useState('');
   const [reports, setReports] = useState([]);
   const [logs, setLogs] = useState([]);
   const [bannedIPs, setBannedIPs] = useState([]);
   const [safetyViolations, setSafetyViolations] = useState([]);
   const [userCountSettings, setUserCountSettings] = useState({ customCount: 100, mode: 'realtime' });
   const [tempCustomCount, setTempCustomCount] = useState(100);
   
   // Session monitor state
   const [activeRooms, setActiveRooms] = useState([]);
   const [pastSessions, setPastSessions] = useState([]);
   const [sessionType, setSessionType] = useState('video'); // 'video' or 'text'
   const [sessionView, setSessionView] = useState('active'); // 'active' or 'past'

   const [currentTime, setCurrentTime] = useState(Date.now());

   const logEndRef = useRef(null);
   const alertSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

   useEffect(() => {
     const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
     return () => clearInterval(timer);
   }, []);

   useEffect(() => {
      socket.on('admin_auth_success', ({ reports, liveLogs, bannedIPs, userCountSettings, safetyViolations, activeRooms, pastSessions }) => {
         setIsAuth(true);
         setReports(reports);
         setLogs(liveLogs);
         setBannedIPs(bannedIPs || []);
         setSafetyViolations(safetyViolations || []);
         setActiveRooms(activeRooms || []);
         setPastSessions(pastSessions || []);
         if (userCountSettings) {
            setUserCountSettings(userCountSettings);
            setTempCustomCount(userCountSettings.customCount);
         }
      });

      socket.on('new_report', (report) => {
         setReports(prev => [report, ...prev]);
         alertSound.current.play().catch(() => {});
      });

      socket.on('live_chat_log', (log) => {
         setLogs(prev => [...prev.slice(-99), log]);
      });

      socket.on('update_banned_ips', (updatedList) => {
         setBannedIPs(updatedList);
      });

      socket.on('update_user_count_settings', (settings) => {
         setUserCountSettings(settings);
         setTempCustomCount(settings.customCount);
      });

      socket.on('new_safety_alert', (violation) => {
         setSafetyViolations(prev => [violation, ...prev]);
         alertSound.current.play().catch(() => {});
      });

      socket.on('update_safety_violations', (updatedList) => {
         setSafetyViolations(updatedList);
      });

      socket.on('active_rooms_update', (rooms) => {
         setActiveRooms(rooms);
      });

      socket.on('past_sessions_update', (sessions) => {
         setPastSessions(sessions);
      });

      return () => {
         socket.off('admin_auth_success');
         socket.off('new_report');
         socket.off('live_chat_log');
         socket.off('update_banned_ips');
         socket.off('update_user_count_settings');
         socket.off('new_safety_alert');
         socket.off('update_safety_violations');
         socket.off('active_rooms_update');
         socket.off('past_sessions_update');
      };
   }, []);

   useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [logs]);

   const handleLogin = (e) => {
      e.preventDefault();
      socket.emit('admin_auth', { password });
   };

   const handleBroadcast = (e) => {
      e.preventDefault();
      socket.emit('admin_broadcast', { message, password });
      setStatus('Announcement sent!');
      setMessage('');
   };

   const handleClearBroadcast = () => {
      socket.emit('admin_broadcast', { message: '', password });
      setStatus('Announcement cleared!');
   };

   const handleKick = (targetId) => {
      socket.emit('admin_kick', { targetId });
   };

   const handleBan = (targetIP, targetId) => {
      socket.emit('admin_ban', { targetIP, targetId });
   };

   const handleUnban = (ip) => {
      socket.emit('admin_unban', { ip });
   };

   const handleUpdateUserCount = (newSettings) => {
      socket.emit('admin_update_user_count', { settings: newSettings, password });
   };

   const handleSafetyAction = (violationId, action) => {
      socket.emit('admin_handle_safety_violation', { violationId, action, password });
   };

   const handleTerminateRoom = (roomId) => {
      socket.emit('admin_terminate_room', { roomId });
   };

   const formatDuration = (startTime, endTime) => {
      const end = endTime || currentTime;
      const diff = Math.floor((end - startTime) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`;
   };

   // Prepare rooms for display
   const displayRooms = (sessionView === 'active' ? activeRooms : pastSessions)
       .map(room => {
           const rId = Array.isArray(room) ? room[0] : room.roomId;
           const rData = Array.isArray(room) ? room[1] : room;
           return { id: rId, ...rData };
       })
       .filter(room => room.type === sessionType);

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
            
            <div className="user-count-control">
               <h3>Live Stats</h3>
               <div className="stat-row">Active Rooms: <span>{activeRooms.length}</span></div>
               <div className="stat-row">Online Users (Approx): <span>{activeRooms.length * 2 + Math.floor(Math.random() * 5)}</span></div>
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
               <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="blast-btn" style={{ flex: 1 }}>Blast</button>
                  <button type="button" className="blast-btn" style={{ background: '#ef4444', flex: 1 }} onClick={handleClearBroadcast}>Clear</button>
               </div>
               {status && <p className="status-mini">{status}</p>}
            </form>

            <div className="user-count-control">
               <h3>User Count Control</h3>
               <div className="control-group">
                  <label>Display Mode</label>
                  <div className="mode-toggle">
                     <button
                        className={userCountSettings.mode === 'realtime' ? 'active' : ''}
                        onClick={() => handleUpdateUserCount({ mode: 'realtime' })}
                     >Realtime</button>
                     <button
                        className={userCountSettings.mode === 'custom' ? 'active' : ''}
                        onClick={() => handleUpdateUserCount({ mode: 'custom' })}
                     >Custom</button>
                  </div>
               </div>

               <div className="control-group">
                  <label>Custom Number</label>
                  <div className="input-with-btn">
                     <input
                        type="number"
                        value={tempCustomCount}
                        onChange={(e) => setTempCustomCount(parseInt(e.target.value) || 0)}
                     />
                     <button onClick={() => handleUpdateUserCount({ customCount: tempCustomCount })}>Set</button>
                  </div>
               </div>
            </div>

            <div className="ban-management">
               <h3>Banned IPs</h3>
               <div className="ban-list">
                  {bannedIPs.length === 0 && <p className="empty-msg">No banned IPs.</p>}
                  {bannedIPs.map(ip => (
                     <div key={ip} className="ban-item">
                        <span>{ip}</span>
                        <button onClick={() => handleUnban(ip)} className="unban-btn">Unban</button>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="dash-main">
            {/* Session Monitor DB Section */}
            <section className="session-monitor-section">
               <div className="section-header-row">
                 <h2><Monitor size={22} color="#10b981" /> Session Monitor</h2>
                 <div className="top-toggles">
                    <button className={sessionType === 'text' ? 'active tab-text' : 'tab-text'} onClick={() => setSessionType('text')}>TextChat DB</button>
                    <button className={sessionType === 'video' ? 'active tab-video' : 'tab-video'} onClick={() => setSessionType('video')}>VideoChat DB</button>
                 </div>
               </div>
               
               <div className="sub-header-row">
                 <div className="sub-toggles">
                    <button className={sessionView === 'active' ? 'active' : ''} onClick={() => setSessionView('active')}>Live Active Rooms</button>
                    <button className={sessionView === 'past' ? 'active' : ''} onClick={() => setSessionView('past')}>Past 12 Hours</button>
                 </div>
                 <div className="stats-info">Showing {displayRooms.length} rooms</div>
               </div>

               <div className="session-grid">
                  {displayRooms.length === 0 && <p className="empty-msg">No {sessionType} sessions found.</p>}
                  {displayRooms.map((room, index) => (
                     <div key={room.id} className="session-card">
                        <div className="session-card-header">
                           <h3>Room {room.id.substring(room.id.length - 6).toUpperCase()}</h3>
                           <span className={`status-indicator ${sessionView === 'active' ? 'active' : 'inactive'}`}>
                              ● {sessionView === 'active' ? 'Active' : 'Ended'}
                           </span>
                        </div>
                        
                        <div className="session-users">
                           <div className="user-snapshot text-center">
                              <span className="user-id">USER ID: {room.user1.substring(0, 4)}</span>
                              {sessionType === 'video' ? (
                                 room.snapshots?.[room.user1] ? (
                                    <img src={room.snapshots[room.user1]} alt="User 1" />
                                 ) : <div className="no-snapshot">Waiting 3s...</div>
                              ) : <div className="no-snapshot text-icon"><Users size={32} /></div>}
                           </div>
                           <div className="user-snapshot text-center">
                              <span className="user-id">USER ID: {room.user2.substring(0, 4)}</span>
                              {sessionType === 'video' ? (
                                 room.snapshots?.[room.user2] ? (
                                    <img src={room.snapshots[room.user2]} alt="User 2" />
                                 ) : <div className="no-snapshot">Waiting 3s...</div>
                              ) : <div className="no-snapshot text-icon"><Users size={32} /></div>}
                           </div>
                           <div className="session-timer">
                              T: {formatDuration(room.startTime, room.endTime)}
                           </div>
                        </div>

                        <div className="session-chat-log">
                           {room.chatLogs?.length === 0 ? (
                              <div className="empty-log">No messages sent yet.</div>
                           ) : (
                              room.chatLogs?.slice(-10).map((log, i) => (
                                 <div key={i} className="log-line">
                                    <span className="log-sender">[{log.sender.substring(0, 4)}]:</span>
                                    <span className="log-text">{log.text}</span>
                                 </div>
                              ))
                           )}
                        </div>

                        <div className="session-card-actions">
                           <button onClick={() => handleKick(room.user1)} className="action-kick">[ KICK USER {room.user1.substring(0, 4)} ]</button>
                           <button onClick={() => handleKick(room.user2)} className="action-kick">[ KICK USER {room.user2.substring(0, 4)} ]</button>
                           {sessionView === 'active' && (
                              <button onClick={() => handleTerminateRoom(room.id)} className="action-terminate">[ TERMINATE ROOM ]</button>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </section>

            {/* Other existing sections below */}
            <section className="reports-section safety-alerts">
               <h2><AlertTriangle size={22} color="#ef4444" /> AI Safety Alerts (Critical)</h2>
               <div className="reports-grid">
                  {safetyViolations.length === 0 && <p className="empty-msg">No safety violations detected.</p>}
                  {safetyViolations.map(v => (
                     <div key={v.id} className="report-card safety-card">
                        <div className="report-img safety-img">
                           <img src={v.evidence} alt="Evidence" />
                           <div className="safety-tag">{v.reason}</div>
                        </div>
                        <div className="report-info">
                           <div className="report-meta">
                              <strong>Offender:</strong> {v.userId?.substring(0, 8) || 'Unknown'}<br />
                              <strong>IP:</strong> {v.userIP}<br />
                              <strong>Time:</strong> {v.timestamp}
                           </div>
                           <div className="report-actions">
                              <button onClick={() => handleSafetyAction(v.id, 'ban')} className="action-btn ban">Ban IP</button>
                              <button onClick={() => handleSafetyAction(v.id, 'dismiss')} className="action-btn dismiss">Dismiss</button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </section>

            <section className="reports-section">
               <h2><Shield size={22} color="#ef4444" /> Recent User Reports</h2>
               <div className="reports-grid">
                  {reports.length === 0 && <p className="empty-msg">No reports yet.</p>}
                  {reports.map(r => (
                     <div key={r.id} className="report-card">
                        <div className="report-img">
                           {r.screenshot ? (
                              <img src={r.screenshot} alt="Evidence" />
                           ) : (
                              <div className="no-evidence">Text Chat Report<br /><span>(No Video)</span></div>
                           )}
                        </div>
                        <div className="report-info">
                           <div className="report-meta">
                              <strong>Target:</strong> {r.offenderId?.substring(0, 6) || 'Unknown'}...<br />
                              <strong>Reason:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{r.comment || 'N/A'}</span><br />
                              <strong>IP:</strong> {r.offenderIP}<br />
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
               <h2><Send size={22} color="#2563eb" /> Live Global Chat Feed</h2>
               <div className="logs-container">
                  {logs.map((l, i) => (
                     <div key={i} className="log-entry">
                        <span className="log-time">[{l.time}]</span>
                        <span className="log-room">Room {l.roomId?.substring(5, 11) || '???'}:</span>
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
