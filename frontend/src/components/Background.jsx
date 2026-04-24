import React, { useEffect, useState } from 'react';

const MSGS = [
  {t:"ഹലോ! ആരെങ്കിലും ഉണ്ടോ? 😄", a:"🌴"},
  {t:"Chat cheytho? From Kozhikode 🌴", a:"🎵"},
  {t:"Anyone into music? 🎵", a:"🎨"},
  {t:"Malappuram represent! 👋", a:"🌊"},
  {t:"കൊള്ളാം site! Super fast ⚡", a:"⚡"},
  {t:"Found someone from Thrissur ❤", a:"🌺"},
  {t:"Namaskaram! 🙏", a:"🦚"},
  {t:"Gaming fans here? 🎮", a:"🎮"},
  {t:"Completely anonymous 😎", a:"✨"},
  {t:"Free and no ads! 🎉", a:"🎭"},
  {t:"Hello strangers 👋", a:"🌙"},
  {t:"Instant match, wow! ⚡", a:"🎪"},
  {t:"Video works great 📹", a:"📱"},
  {t:"No sign-up needed 🙌", a:"🌴"},
];

export default function Background() {
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    let activeBubbles = 0;
    const MAX_BUBBLES = 6;

    const makeBubble = () => {
      if (activeBubbles >= MAX_BUBBLES) return;
      activeBubbles++;

      const msg = MSGS[Math.floor(Math.random() * MSGS.length)];
      const isR = Math.random() > 0.5;
      const dur = 26 + Math.random() * 16; 
      const sx = (Math.random() - 0.5) * 60;  

      const id = Date.now() + Math.random();
      
      const newBubble = {
        id,
        msg,
        isR,
        dur,
        sx,
        left: 5 + Math.random() * 78,
        delay: -(Math.random() * dur * 0.5),
      };

      setBubbles(prev => [...prev, newBubble]);

      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== id));
        activeBubbles = Math.max(0, activeBubbles - 1);
      }, dur * 1000 * 1.2);
    };

    // Initial trickle
    const timeouts = [];
    for(let i=0; i<5; i++) {
      timeouts.push(setTimeout(makeBubble, i * 1800));
    }
    
    const interval = setInterval(makeBubble, 5000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div id="bg">
      <div className="mesh"></div>
      <div className="dot-grid"></div>
      {bubbles.map(b => (
        <div 
          key={b.id} 
          className={`bbl ${b.isR ? 'r' : ''}`}
          style={{
            left: `${b.left}%`,
            '--sx': `${b.sx}px`,
            '--ex': `${-b.sx * 0.6}px`,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`
          }}
        >
          <div className="bbl-av">{b.msg.a}</div>
          <div className="bbl-txt">{b.msg.t}</div>
        </div>
      ))}
    </div>
  );
}
