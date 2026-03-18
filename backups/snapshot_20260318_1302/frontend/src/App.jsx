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
import { useState, useEffect, useRef } from 'react';
import socket from './socket';

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

  return (
    <Router>
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
  const isAdminPage = location.pathname === '/admin-portal';

  return (
    <div className={`app-container ${(!ageVerified && !isAdminPage) ? 'blur-sm' : ''} ${announcement ? 'has-announcement' : ''}`}>
      {!ageVerified && !isAdminPage && <AgeVerification onVerify={() => setAgeVerified(true)} />}
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
        </Routes>
      </main>
      {!isChatPage && <Footer />}
    </div>
  );
};

export default AppWrapper;
