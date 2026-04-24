import React from 'react';
import { Megaphone, X } from 'lucide-react';
import './AnnouncementBanner.css';

const AnnouncementBanner = ({ message, onClear }) => {
  if (!message) return null;

  return (
    <div className="announcement-banner">
      <div className="announcement-content">
        <Megaphone size={20} className="shake" />
        <span className="announcement-text">{message}</span>
      </div>
      <button className="announcement-close" onClick={onClear}>
        <X size={18} />
      </button>
    </div>
  );
};

export default AnnouncementBanner;