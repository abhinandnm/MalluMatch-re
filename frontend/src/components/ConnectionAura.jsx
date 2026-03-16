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
    </div>
  );
};

export default ConnectionAura;
