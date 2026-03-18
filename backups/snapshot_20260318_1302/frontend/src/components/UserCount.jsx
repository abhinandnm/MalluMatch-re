import React, { useState, useEffect } from 'react';
import socket from '../socket';
import { Users } from 'lucide-react';

export default function UserCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    socket.on('online_users', (data) => {
      // The backend now sends { count: number }
      setCount(typeof data === 'object' ? data.count : data);
    });

    return () => {
      socket.off('online_users');
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
