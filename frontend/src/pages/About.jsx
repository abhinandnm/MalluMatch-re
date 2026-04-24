import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="premium-page-container">
      <div className="premium-page-card">
        <h1>About MalluMatch</h1>
        <p>
          MalluMatch is a random video and text chatting platform designed to connect people instantly.
        </p>
        <p>
          Our mission is to instantly connect strangers from around the world in a secure, peer-to-peer environment.
          Whether you want to make a new friend, practice a language, or simply have a random conversation, MalluMatch provides the perfect platform.
        </p>
        <h2>Safety First</h2>
        <p>
          We require users to be 18+ and have strict community guidelines. If you encounter inappropriate behavior, please use the Next or Report buttons.
        </p>
        
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
           <Link to="/" className="start-chat-btn" style={{ display: 'inline-flex', width: 'auto', padding: '1rem 2rem' }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
