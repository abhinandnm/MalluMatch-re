import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import './NotificationPrompt.css';

const VAPID_PUBLIC_KEY = 'BLi8JDHGkQt1qISz7-3iLJacpY0FQSgTpVtftT0nUPozM';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationPrompt = ({ onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and not already granted/denied
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => setShow(true), 5000); // Show after 5 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        const backendUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000' 
          : 'https://mallumatch-chat.duckdns.org'; // Fallback if not on same origin

        await fetch(`${backendUrl}/api/push/subscribe`, {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('Successfully subscribed to push notifications');
      }
      setShow(false);
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      setShow(false);
      if (onClose) onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="notification-prompt-overlay">
      <div className="notification-prompt-card">
        <div className="notification-prompt-header">
           <Bell className="bell-icon" size={24} />
           <h3>Stay Connected!</h3>
        </div>
        <p>Would you like to get notified when MalluMatch has high traffic? Don't miss your match!</p>
        <div className="notification-prompt-actions">
          <button className="btn-not-now" onClick={() => { setShow(false); if (onClose) onClose(); }}>Maybe Later</button>
          <button className="btn-allow" onClick={handleSubscribe}>Enable Alerts</button>
        </div>
        <button className="btn-close-icon" onClick={() => { setShow(false); if (onClose) onClose(); }}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
