import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Users } from 'lucide-react';

export default function UserCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const socket = io('https://mallumatch-api.onrender.com');
    
    socket.on('online_users', (data) => {
      // The backend now sends { count: number }
      setCount(typeof data === 'object' ? data.count : data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="user-count-badge">
      <div className="pulse-dot"></div>
      <Users size={14} />
      <span>{count.toLocaleString()} Online</span>
    </div>
  );
}
