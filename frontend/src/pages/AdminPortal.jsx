import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { Send, Lock, BellRing, Shield, AlertTriangle, Monitor, Users, Download } from 'lucide-react';
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
   const [selectedRoomId, setSelectedRoomId] = useState(null);
   const [realOnlineUsers, setRealOnlineUsers] = useState(0);

   const [currentTime, setCurrentTime] = useState(Date.now());

   const logEndRef = useRef(null);
   const alertSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

   useEffect(() => {
     const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
     return () => clearInterval(timer);
   }, []);

   useEffect(() => {
      socket.on('admin_auth_success', ({ reports, liveLogs, bannedIPs, userCountSettings, safetyViolations, activeRooms, pastSessions, onlineUsers }) => {
         setIsAuth(true);
         setReports(reports);
         setLogs(liveLogs);
         setBannedIPs(bannedIPs || []);
         setSafetyViolations(safetyViolations || []);
         setActiveRooms(activeRooms || []);
         setPastSessions(pastSessions || []);
         if (typeof onlineUsers === 'number') {
            setRealOnlineUsers(onlineUsers);
         }
         if (userCountSettings) {
            setUserCountSettings(userCountSettings);
            setTempCustomCount(userCountSettings.customCount);
         }
      });

      socket.on('real_online_users', (count) => {
         setRealOnlineUsers(count);
      });

      socket.on('new_report', (report) => {
         setReports(prev => [report, ...prev]);
         alertSound.current.play().catch(() => {});
      });

      socket.on('live_chat_log', (log) => {
         setLogs(prev => [...prev, log]);
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
         socket.off('real_online_users');
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

   const handleDownloadChat = () => {
      if (logs.length === 0) return;
      
      // Define CSV headers
      const headers = ['Time', 'Room', 'Sender', 'IP', 'Message'];
      
      // Convert logs to CSV rows
      const csvRows = [
         headers.join(','),
         ...logs.map(l => [
            `"${l.time || ''}"`,
            `"${l.roomId || ''}"`,
            `"${l.sender || ''}"`,
            `"${l.ip || ''}"`,
            `"${(l.text || '').replace(/"/g, '""')}"`
         ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `mallumatch_chat_export_${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
   };

   const handleDownloadSessions = () => {
      if (displayRooms.length === 0) return;
      
      const headers = ['Room ID', 'Type', 'Status', 'Start Time', 'End Time', 'Duration', 'User 1 ID', 'User 2 ID', 'Messages'];
      
      const csvRows = [
         headers.join(','),
         ...displayRooms.map(room => {
            const status = sessionView === 'active' ? 'Active' : 'Ended';
            const duration = formatDuration(room.startTime, room.endTime);
            const startTime = new Date(room.startTime).toLocaleString();
            const endTime = room.endTime ? new Date(room.endTime).toLocaleString() : 'N/A';
            const msgCount = room.chatLogs?.length || 0;
            
            return [
               `"${room.id || ''}"`,
               `"${room.type || ''}"`,
               `"${status}"`,
               `"${startTime}"`,
               `"${endTime}"`,
               `"${duration}"`,
               `"${room.user1 || ''}"`,
               `"${room.user2 || ''}"`,
               `"${msgCount}"`
            ].join(',');
         })
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filenamePrefix = sessionView === 'active' ? 'active_rooms' : 'past_sessions';
      link.href = url;
      link.download = `mallumatch_${filenamePrefix}_${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
   };

   const handleDownloadImage = (src, filename) => {
      if (!src) return;
      const link = document.createElement('a');
      link.href = src;
      link.download = filename || `snapshot_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   const handleExportAllHTML = () => {
      if (displayRooms.length === 0) return;

      const timestamp = new Date().toLocaleString();
      const reportTitle = `MalluMatch - ${sessionType === 'video' ? 'Video' : 'Text'} Chat Session Report`;
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
   <title>${reportTitle}</title>
   <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; margin: 0; }
      .container { max-width: 1200px; margin: 0 auto; }
      .header { border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
      .header h1 { margin: 0; color: #3b82f6; font-size: 2rem; }
      .header .meta { color: #94a3b8; font-size: 0.9rem; }
      .session-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 30px; }
      .session-card { background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
      .room-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 15px; color: #f8fafc; border-bottom: 1px solid #334155; padding-bottom: 10px; display: flex; justify-content: space-between; }
      .users-container { display: flex; gap: 20px; margin-bottom: 20px; }
      .user-box { flex: 1; text-align: center; }
      .user-id { font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 8px; font-family: monospace; }
      .snapshot { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 8px; background: #000; border: 1px solid #334155; }
      .no-snapshot { height: 150px; display: flex; align-items: center; justify-content: center; background: #334155; border-radius: 8px; color: #64748b; font-size: 0.8rem; }
      .chat-log { background: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 12px; height: 150px; overflow-y: auto; font-family: monospace; font-size: 0.85rem; }
      .log-entry { margin-bottom: 4px; line-height: 1.4; border-bottom: 1px solid #1e293b; padding-bottom: 2px; }
      .log-sender { color: #3b82f6; font-weight: bold; margin-right: 8px; }
      .log-text { color: #cbd5e1; }
      .stats { display: flex; justify-content: space-between; margin-top: 15px; font-size: 0.8rem; color: #64748b; font-weight: bold; }
      @media print { body { background: white; color: black; padding: 20px; } .session-card { break-inside: avoid; border: 1px solid #ccc; background: white; color: black; } }
   </style>
</head>
<body>
   <div class="container">
      <div class="header">
         <div>
            <p style="color: #64748b; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Admin Export</p>
            <h1>${reportTitle}</h1>
         </div>
         <div class="meta">
            Generated: ${timestamp}<br>
            Showing: ${displayRooms.length} Sessions (${sessionView === 'active' ? 'Live' : 'Past 24h'})
         </div>
      </div>
      
      <div class="session-grid">
         ${displayRooms.map(room => {
            const duration = formatDuration(room.startTime, room.endTime);
            const startTime = new Date(room.startTime).toLocaleString();
            
            return `
            <div class="session-card">
               <div class="room-title">
                  <span>Room ${room.id.substring(room.id.length - 6).toUpperCase()}</span>
                  <span style="color: ${sessionView === 'active' ? '#10b981' : '#64748b'}; font-size: 0.7rem;">● ${sessionView === 'active' ? 'ACTIVE' : 'ENDED'}</span>
               </div>
               
               <div class="users-container">
                  <div class="user-box">
                     <span class="user-id">USER ID: ${room.user1.substring(0, 8)}</span>
                     ${room.snapshots?.[room.user1] ? `<img class="snapshot" src="${room.snapshots[room.user1]}">` : `<div class="no-snapshot">No Snapshot</div>`}
                  </div>
                  <div class="user-box">
                     <span class="user-id">USER ID: ${room.user2.substring(0, 8)}</span>
                     ${room.snapshots?.[room.user2] ? `<img class="snapshot" src="${room.snapshots[room.user2]}">` : `<div class="no-snapshot">No Snapshot</div>`}
                  </div>
               </div>
               
               <div class="chat-log">
                  ${room.chatLogs?.length === 0 ? '<div style="color: #475569; text-align: center; padding-top: 60px;">No messages sent</div>' : 
                    room.chatLogs.map(log => `
                     <div class="log-entry">
                        <span class="log-sender">[${log.sender.substring(0, 4)}]:</span>
                        <span class="log-text">${log.text}</span>
                     </div>
                    `).join('')
                  }
               </div>
               
               <div class="stats">
                  <span>Started: ${startTime}</span>
                  <span>Duration: ${duration}</span>
               </div>
            </div>
            `;
         }).join('')}
      </div>
   </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filenamePrefix = sessionView === 'active' ? 'active_report' : 'past_sessions_report';
      const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      link.href = url;
      link.download = `mallumatch_${filenamePrefix}_${fileTimestamp}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
               <div className="stat-row">Online Users: <span>{realOnlineUsers}</span></div>
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
                  <div className="section-actions">
                     <button className="download-chat-btn" onClick={handleDownloadSessions} title="Download sessions as CSV">
                        <Download size={16} /> Export CSV
                     </button>
                     <button className="download-chat-btn comprehensive" onClick={handleExportAllHTML} title="Export all data and images in one HTML report">
                        <Monitor size={16} /> Export All (HTML)
                     </button>
                  </div>
                  <div className="top-toggles">
                    <button className={sessionType === 'text' ? 'active tab-text' : 'tab-text'} onClick={() => setSessionType('text')}>TextChat DB</button>
                    <button className={sessionType === 'video' ? 'active tab-video' : 'tab-video'} onClick={() => setSessionType('video')}>VideoChat DB</button>
                 </div>
               </div>
               
               <div className="sub-header-row">
                 <div className="sub-toggles">
                    <button className={sessionView === 'active' ? 'active' : ''} onClick={() => setSessionView('active')}>Live Active Rooms</button>
                    <button className={sessionView === 'past' ? 'active' : ''} onClick={() => setSessionView('past')}>Past 24 Hours</button>
                 </div>
                 <div className="stats-info">Showing {displayRooms.length} rooms</div>
               </div>

               <div className="session-grid">
                  {displayRooms.length === 0 && <p className="empty-msg">No {sessionType} sessions found.</p>}
                  {displayRooms.map((room, index) => (
                     <div key={room.id} className="session-card clickable" onClick={() => setSelectedRoomId(room.id)}>
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
                                                                         <div className="snapshot-wrapper">
                                        <img src={room.snapshots[room.user1]} alt="User 1" />
                                        <button 
                                           className="snap-download-btn" 
                                           onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadImage(room.snapshots[room.user1], `room_${room.id}_user_${room.user1}_${Date.now()}.png`);
                                           }}
                                           title="Download Snapshot"
                                        ><Download size={14} /></button>
                                     </div>
                                 ) : <div className="no-snapshot">Waiting 3s...</div>
                              ) : <div className="no-snapshot text-icon"><Users size={32} /></div>}
                           </div>
                           <div className="user-snapshot text-center">
                              <span className="user-id">USER ID: {room.user2.substring(0, 4)}</span>
                              {sessionType === 'video' ? (
                                 room.snapshots?.[room.user2] ? (
                                                                         <div className="snapshot-wrapper">
                                        <img src={room.snapshots[room.user2]} alt="User 2" />
                                        <button 
                                           className="snap-download-btn" 
                                           onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadImage(room.snapshots[room.user2], `room_${room.id}_user_${room.user2}_${Date.now()}.png`);
                                           }}
                                           title="Download Snapshot"
                                        ><Download size={14} /></button>
                                     </div>
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

                        <div className="session-card-actions" onClick={(e) => e.stopPropagation()}>
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
                           <button 
                              className="snap-download-btn overlay" 
                              onClick={() => handleDownloadImage(v.evidence, `safety_violation_${v.userId}_${Date.now()}.png`)}
                              title="Download Evidence"
                           ><Download size={18} /></button>
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
                              <div className="snapshot-wrapper full-height">
                                 <img src={r.screenshot} alt="Evidence" />
                                 <button 
                                    className="snap-download-btn overlay" 
                                    onClick={() => handleDownloadImage(r.screenshot, `user_report_offender_${r.offenderId}_${Date.now()}.png`)}
                                    title="Download Evidence"
                                 ><Download size={18} /></button>
                              </div>
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
               <div className="section-header-row">
                  <h2><Send size={22} color="#2563eb" /> Live Global Chat Feed</h2>
                  <button className="download-chat-btn" onClick={handleDownloadChat} title="Download chat logs as CSV">
                     <Download size={16} /> Download CSV
                  </button>
               </div>
               <div className="logs-container">
                  {logs.map((l, i) => (
                     <div key={i} className="log-entry chat-feed-entry">
                        <div className="log-main">
                           <span className="log-time">[{l.time}]</span>
                           <span className="log-room">Room {l.roomId?.substring(5, 11) || '???'}:</span>
                           <span className="log-text">{l.text}</span>
                        </div>
                        <div className="log-actions">
                           <button onClick={() => handleKick(l.sender)} className="mini-action-btn kick" title="Kick User">Kick</button>
                           <button onClick={() => handleBan(l.ip, l.sender)} className="mini-action-btn ban" title="Ban IP">Ban</button>
                        </div>
                     </div>
                  ))}
                  <div ref={logEndRef} />
               </div>
            </section>
         </div>
      </div>
   );
}
