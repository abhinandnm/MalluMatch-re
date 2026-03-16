import React, { useEffect, useState } from 'react';
import './ConnectionAura.css';

const ConnectionAura = ({ active }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 5000); // Effect durations
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!isVisible && !active) return null;

  return (
    <div className={`aura-container ${active ? 'active' : ''}`}>
      {/* Mobile Notch Glow */}
      <div className="notch-glow"></div>
      
      {/* Desktop/Global Ripple Effect */}
      <div className="ripple-overlay">
        <div className="ripple ripple-1"></div>
        <div className="ripple ripple-2"></div>
        <div className="ripple ripple-3"></div>
      </div>

      {/* Screen Edge Glow Effect */}
      <div className="edge-glow-container">
        <div className="edge-glow-bar top"></div>
        <div className="edge-glow-bar bottom"></div>
        <div className="edge-glow-bar left"></div>
        <div className="edge-glow-bar right"></div>
      </div>
    </div>
  );
};

export default ConnectionAura;
