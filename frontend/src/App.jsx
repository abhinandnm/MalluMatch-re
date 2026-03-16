import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ChatRoom from './pages/ChatRoom';
import About from './pages/About';
import AdminPortal from './pages/AdminPortal';
import AgeVerification from './components/AgeVerification';
import AnnouncementBanner from './components/AnnouncementBanner';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [ageVerified, setAgeVerified] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('https://mallumatch-api.onrender.com');
    
    socketRef.current.on('global_announcement', ({ message }) => {
      setAnnouncement(message);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <Router>
      {!ageVerified && <AgeVerification onVerify={() => setAgeVerified(true)} />}
      
      {announcement && (
        <AnnouncementBanner 
          message={announcement} 
          onClear={() => setAnnouncement('')} 
        />
      )}

      <div className={`app-container ${!ageVerified ? 'blur-sm' : ''} ${announcement ? 'has-announcement' : ''}`}>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<ChatRoom />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin-portal" element={<AdminPortal />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
