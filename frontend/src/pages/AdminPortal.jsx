import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { Send, Lock, BellRing, Shield, AlertTriangle, Monitor, Users, Download } from 'lucide-react';
import './AdminPortal.css';

const escapeHTML = (str) => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
};

const formatIST = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export default function AdminPortal() {
   const [password, setPassword] = useState('');
   const [isAuth, setIsAuth] = useState(false);
   const [message, setMessage] = useState('');
   const [status, setStatus] = useState('');
   const [reports, setReports] = useState([]);
   const [logs, setLogs] = useState([]);
   const [bannedIPs, setBannedIPs] = useState([]);
   const [tempBans, setTempBans] = useState([]);
   const [manualBanIp, setManualBanIp] = useState('');
   const [safetyViolations, setSafetyViolations] = useState([]);
   const [userCountSettings, setUserCountSettings] = useState({ customCount: 100, mode: 'realtime' });
   const [tempCustomCount, setTempCustomCount] = useState(100);
   const [adminSessions, setAdminSessions] = useState([]);
   
   // Session monitor state
   const [activeRooms, setActiveRooms] = useState([]);
   const [pastSessions, setPastSessions] = useState([]);
   const [sessionType, setSessionType] = useState('video'); // 'video' or 'text'
   const [sessionView, setSessionView] = useState('active'); // 'active' or 'past'
   const [selectedRoomId, setSelectedRoomId] = useState(null);
   const [realOnlineUsers, setRealOnlineUsers] = useState(0);
    const [adminRoomMessages, setAdminRoomMessages] = useState({});
    const [pushMessage, setPushMessage] = useState('');
    const [pushStatus, setPushStatus] = useState('');


   const [currentTime, setCurrentTime] = useState(Date.now());

   const logEndRef = useRef(null);
   const logContainerRef = useRef(null);
   const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
   const alertSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

   useEffect(() => {
     const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
     return () => clearInterval(timer);
   }, []);

   useEffect(() => {
      socket.on('admin_auth_success', ({ reports, liveLogs, bannedIPs, tempBans, userCountSettings, safetyViolations, activeRooms, pastSessions, onlineUsers, adminSessions }) => {
         setIsAuth(true);
         setReports(reports);
         setLogs(liveLogs);
         setBannedIPs(bannedIPs || []);
         setTempBans(tempBans || []);
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
         if (adminSessions) {
            setAdminSessions(adminSessions);
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

      socket.on('update_temp_bans', (updatedList) => {
         setTempBans(updatedList);
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

      socket.on('admin_sessions_update', (sessions) => {
         setAdminSessions(sessions);
      });

      return () => {
         socket.off('admin_auth_success');
         socket.off('new_report');
         socket.off('live_chat_log');
         socket.off('update_banned_ips');
         socket.off('update_temp_bans');
         socket.off('update_user_count_settings');
         socket.off('new_safety_alert');
         socket.off('update_safety_violations');
         socket.off('active_rooms_update');
         socket.off('past_sessions_update');
         socket.off('real_online_users');
         socket.off('admin_sessions_update');
      };
   }, []);

   useEffect(() => {
      if (shouldAutoScroll) {
         logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
   }, [logs, shouldAutoScroll]);

   const handleLogin = (e) => {
      e.preventDefault();
      if (!socket.connected) {
         socket.connect();
      }
      socket.emit('admin_auth', { password });
   };

   useEffect(() => {
      const handleConnect = () => {
         if (password) {
            socket.emit('admin_auth', { password });
         }
      };
      socket.on('connect', handleConnect);
      return () => {
         socket.off('connect', handleConnect);
      };
   }, [password]);

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
       console.log("Client handleKick called for targetId:", targetId);
       socket.emit('admin_kick', { targetId });
    };

    const handleWarn = (targetId) => {
       const msg = window.prompt("Enter warning/alert message for this user:");
       if (msg && msg.trim()) {
          console.log("Client handleWarn called for targetId:", targetId, "message:", msg.trim());
          socket.emit('admin_warn_user', { targetId, message: msg.trim(), password });
       }
    };

   const handleBan = (targetIP, targetId) => {
      console.log("Client handleBan called for targetIP:", targetIP, "targetId:", targetId);
      socket.emit('admin_ban', { targetIP, targetId });
   };

   const handleUnban = (ip) => {
      socket.emit('admin_unban', { ip });
   };

   const handleUnbanTemp = (ip) => {
      socket.emit('admin_unban_temp', { ip });
   };

   const handlePermBanTemp = (ip) => {
      socket.emit('admin_perm_ban_temp', { ip });
   };

   const handleManualBan = (e) => {
      e.preventDefault();
      if (manualBanIp && manualBanIp.trim()) {
         socket.emit('admin_ban', { targetIP: manualBanIp.trim() });
         setManualBanIp('');
      }
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

   const handleAdminSendMessage = (roomId) => {
      const msg = adminRoomMessages[roomId];
      if (!msg || !msg.trim()) return;
      
      socket.emit('admin_send_message', { roomId, message: msg, password });
      
      // Clear the input for this room
      setAdminRoomMessages(prev => ({
         ...prev,
         [roomId]: ''
      }));
   };

   const handleDownloadChat = () => {
      if (logs.length === 0) return;
      
      // Define CSV headers
      const headers = ['Time (IST)', 'Room', 'Sender', 'IP', 'Message'];
      
      // Convert logs to CSV rows
      const csvRows = [
         headers.join(','),
         ...logs.map(l => [
            `"${formatIST(l.timestamp) || ''}"`,
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

   const handleSendPush = async (e) => {
      e.preventDefault();
      if (!pushMessage.trim()) return;
      
      setPushStatus('Sending...');
      try {
         const backendUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : 'https://mallumatch-chat.duckdns.org';

         const response = await fetch(`${backendUrl}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: pushMessage, password })
         });
         
         const data = await response.json();
         if (data.success) {
            setPushStatus(`Sent to ${data.sent} users! (${data.expired} expired removed)`);
            setPushMessage('');
         } else {
            setPushStatus('Failed: ' + (data.message || 'Unknown error'));
         }
      } catch (err) {
         setPushStatus('Error: ' + err.message);
      }
   };

   const handleDownloadSessions = () => {

      if (displayRooms.length === 0) return;
      
      const headers = ['Room ID', 'Type', 'Status', 'Start Time (IST)', 'End Time (IST)', 'Duration', 'User 1 ID', 'User 2 ID', 'Messages'];
      
      const csvRows = [
         headers.join(','),
         ...displayRooms.map(room => {
            const status = sessionView === 'active' ? 'Active' : 'Ended';
            const duration = formatDuration(room.startTime, room.endTime);
            const startTime = formatIST(room.startTime);
            const endTime = room.endTime ? formatIST(room.endTime) : 'N/A';
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

      const timestampIST = formatIST(Date.now());
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
            Generated (IST): ${timestampIST}<br>
            Showing: ${displayRooms.length} Sessions (${sessionView === 'active' ? 'Live' : 'Past 24h'})
         </div>
      </div>
      
      <div class="session-grid">
         ${displayRooms.map(room => {
            const duration = formatDuration(room.startTime, room.endTime);
            const startTimeIST = formatIST(room.startTime);
            
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
                        <span class="log-text">${escapeHTML(log.text)}</span>
                     </div>
                    `).join('')
                  }
               </div>
               
               <div class="stats">
                  <span>Started (IST): ${startTimeIST}</span>
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
               <div className="stat-row">Active Admins: <span style={{ color: adminSessions.length > 1 ? '#fbbf24' : '#10b981' }}>{adminSessions.length}</span></div>
            </div>

            {adminSessions.length > 1 && (
               <div className="user-count-control" style={{ border: '1px solid #fbbf24', background: 'rgba(251, 191, 36, 0.05)' }}>
                  <h3 style={{ color: '#fbbf24' }}>Other Admins Online</h3>
                  <div className="ban-list">
                     {adminSessions.filter(ip => ip !== 'You').map((ip, idx) => (
                        <div key={idx} className="stat-row" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                           IP: <span>{ip}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}

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
                <form onSubmit={handleManualBan} style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                   <input
                      type="text"
                      placeholder="IP Address to ban..."
                      value={manualBanIp}
                      onChange={(e) => setManualBanIp(e.target.value)}
                      style={{
                         flex: 1,
                         padding: '6px 10px',
                         fontSize: '0.8rem',
                         background: '#0f172a',
                         border: '1px solid #334155',
                         borderRadius: '4px',
                         color: '#fff',
                         outline: 'none'
                      }}
                   />
                   <button type="submit" style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                   }}>Ban</button>
                </form>
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

             <div className="ban-management" style={{ borderTop: 'none', paddingTop: 0 }}>
                <h3>Temporarily Banned (Attackers)</h3>
                <div className="ban-list">
                   {tempBans.length === 0 && <p className="empty-msg">No temporarily banned IPs.</p>}
                   {tempBans.map(item => {
                      const timeLeft = Math.max(0, Math.round((item.expiry - currentTime) / 1000));
                      const minutes = Math.floor(timeLeft / 60);
                      const seconds = timeLeft % 60;
                      const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                      return (
                         <div key={item.ip} className="ban-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                               <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.ip}</span>
                               <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{timeStr} left</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                               <button onClick={() => handleUnbanTemp(item.ip)} className="unban-btn" style={{ flex: 1, fontSize: '0.7rem', padding: '2px 4px', background: '#3b82f6', color: '#fff', borderRadius: '4px' }}>Unban</button>
                               <button onClick={() => handlePermBanTemp(item.ip)} className="unban-btn" style={{ flex: 1, fontSize: '0.7rem', padding: '2px 4px', background: '#ef4444', color: '#fff', borderRadius: '4px' }}>Perm Ban</button>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>

            <div className="push-notification-control">
               <h3><BellRing size={16} /> Push Notification</h3>
               <p className="push-notification-subtitle">Send to all offline users</p>
               <form onSubmit={handleSendPush} className="admin-form compact">
                  <div className="input-field">
                     <textarea
                        value={pushMessage}
                        onChange={(e) => setPushMessage(e.target.value)}
                        placeholder="Push message..."
                        rows="2"
                     ></textarea>
                  </div>
                  <button type="submit" className="btn-push-send">Send Push Notification</button>
                  {pushStatus && <p className="status-mini" style={{ color: pushStatus.includes('Error') || pushStatus.includes('Failed') ? '#ef4444' : '#10b981' }}>{pushStatus}</p>}
               </form>
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
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                               <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleWarn(room.user1)} className="action-warn" style={{ flex: 1 }}>[ WARN USER {room.user1.substring(0, 4)} ]</button>
                                  <button onClick={() => handleKick(room.user1)} className="action-kick" style={{ flex: 1 }}>[ KICK ]</button>
                               </div>
                               <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleWarn(room.user2)} className="action-warn" style={{ flex: 1 }}>[ WARN USER {room.user2.substring(0, 4)} ]</button>
                                  <button onClick={() => handleKick(room.user2)} className="action-kick" style={{ flex: 1 }}>[ KICK ]</button>
                               </div>
                               {sessionView === 'active' && (
                                   <button onClick={() => handleTerminateRoom(room.id)} className="action-terminate" style={{ width: '100%', marginTop: '4px' }}>[ TERMINATE ROOM ]</button>
                               )}
                            </div>
                        </div>

                        {sessionView === 'active' && (
                           <div className="admin-message-input" onClick={(e) => e.stopPropagation()}>
                              <input 
                                 type="text" 
                                 placeholder="Message room..." 
                                 value={adminRoomMessages[room.id] || ''} 
                                 onChange={(e) => setAdminRoomMessages(prev => ({ ...prev, [room.id]: e.target.value }))}
                                 onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAdminSendMessage(room.id);
                                 }}
                              />
                              <button 
                                 onClick={() => handleAdminSendMessage(room.id)}
                                 disabled={!adminRoomMessages[room.id]?.trim()}
                              >Send</button>
                           </div>
                        )}
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
                              <strong>Time (IST):</strong> {formatIST(v.id)}
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
                              <strong>Time (IST):</strong> {formatIST(r.id)}
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
               <div 
                  className="logs-container" 
                  ref={logContainerRef}
                  onScroll={() => {
                     const container = logContainerRef.current;
                     if (container) {
                        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
                        setShouldAutoScroll(isAtBottom);
                     }
                  }}
               >
                  {logs.map((l, i) => (
                     <div key={i} className="log-entry chat-feed-entry">
                        <div className="log-main">
                           <span className="log-time">[{formatIST(l.timestamp)}]</span>
                           <span className="log-room">Room {l.roomId?.substring(5, 11) || '???'}:</span>
                           <span className="log-sender" title={l.sender}>
                              {l.sender ? (l.sender.length > 8 ? l.sender.substring(0, 8) + '...' : l.sender) : 'System'}:
                           </span>
                           <span className="log-ip">({l.ip || 'no IP'})</span>
                           <span className="log-text">{l.text}</span>
                        </div>
                        <div className="log-actions">
                           <button onClick={() => handleWarn(l.sender)} className="mini-action-btn warn" title="Warn User">Warn</button>
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
