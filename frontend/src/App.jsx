import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ChatRoom from './pages/ChatRoom';
import About from './pages/About';
import AgeVerification from './components/AgeVerification';
import { useState } from 'react';

function App() {
  const [ageVerified, setAgeVerified] = useState(false);

  return (
    <Router>
      {!ageVerified && <AgeVerification onVerify={() => setAgeVerified(true)} />}
      
      <div className={`app-container ${!ageVerified ? 'blur-sm' : ''}`}>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<ChatRoom />} />
            <Route path="/about" element={<About />} />
            {/* Add more static pages as needed */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
