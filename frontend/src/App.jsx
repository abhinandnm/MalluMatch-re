// Triggering fresh build for rollback verification
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ChatRoom from './pages/ChatRoom';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import AdminPortal from './pages/AdminPortal';
import AgeVerification from './components/AgeVerification';
import AnnouncementBanner from './components/AnnouncementBanner';
import NotificationPrompt from './components/NotificationPrompt';

import Article1 from './pages/blog/Article1';
import Article2 from './pages/blog/Article2';
import Article3 from './pages/blog/Article3';
import Article4 from './pages/blog/Article4';
import Article5 from './pages/blog/Article5';
import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import SEOUpdater from './components/SEOUpdater';

const AppWrapper = () => {
  const [ageVerified, setAgeVerified] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const chimeSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'));

  useEffect(() => {
    socket.on('global_announcement', ({ message }) => {
      setAnnouncement(message);
      // Play calm chime for broadcast
      chimeSound.current.currentTime = 0;
      chimeSound.current.play().catch(e => console.log("Audio blocked."));
    });

    return () => {
      socket.off('global_announcement');
    };
  }, []);

  useEffect(() => {
    /*
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
    */
  }, []);



  return (
    <Router>
      <SEOUpdater />
      {announcement && (
        <AnnouncementBanner 
          message={announcement} 
          onClear={() => setAnnouncement('')} 
        />
      )}

      <AppContent 
        ageVerified={ageVerified} 
        setAgeVerified={setAgeVerified}
        announcement={announcement} 
        setAnnouncement={setAnnouncement} 
      />
    </Router>
  );
};

const AppContent = ({ ageVerified, setAgeVerified, announcement, setAnnouncement }) => {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const isAdminPage = location.pathname.startsWith('/admin-portal');

  return (
    <div className={`app-container ${(!ageVerified && !isAdminPage) ? 'blur-sm' : ''} ${announcement ? 'has-announcement' : ''}`}>
      {!ageVerified && !isAdminPage && <AgeVerification onVerify={() => setAgeVerified(true)} />}
      {ageVerified && !isAdminPage && <NotificationPrompt />}
      <Navbar />

      <main className={`main-content ${isChatPage ? 'no-padding' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<ChatRoom />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin-portal" element={<AdminPortal />} />
          <Route path="/blog/free-random-chat-apps-2026" element={<Article1 />} />
          <Route path="/blog/how-to-stay-anonymous-on-random-chat-apps" element={<Article2 />} />
          <Route path="/blog/chat-with-mallus-online-tips-tricks" element={<Article3 />} />
          <Route path="/blog/random-video-chat-safely-in-2026" element={<Article4 />} />
          <Route path="/blog/best-random-chat-apps-global-connections" element={<Article5 />} />
        </Routes>
      </main>
      {!isChatPage && <Footer />}
    </div>
  );
};

export default AppWrapper;
