import { Link } from 'react-router-dom';

export default function MobileFooter() {
  return (
    <footer>
      <p>&copy; {new Date().getFullYear()} MalluMatch. All rights reserved.</p>
      <p className="developed-by">Developed by Nexa Labs</p>
      <p style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '-0.5rem', marginBottom: '1rem' }}>
        <a href="mailto:mallumatch.auth@gmail.com" style={{ color: '#a0a0a0', textDecoration: 'none' }}>mallumatch.auth@gmail.com</a>
      </p>
      <div className="footer-links">
        <Link to="/about">About Us</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/contact">Contact</Link>
      </div>
      <div className="footer-blog-links" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', fontSize: '0.85em', color: '#a0a0a0', maxWidth: '800px', margin: '1.5rem auto 0' }}>
        <Link style={{ color: '#a0a0a0', textDecoration: 'none' }} to="/blog/free-random-chat-apps-2026">Top 5 Free Random Chat Apps in 2026</Link>
        <Link style={{ color: '#a0a0a0', textDecoration: 'none' }} to="/blog/how-to-stay-anonymous-on-random-chat-apps">How to Stay Anonymous on Random Chat Apps</Link>
        <Link style={{ color: '#a0a0a0', textDecoration: 'none' }} to="/blog/chat-with-mallus-online-tips-tricks">Chat with Mallus Online Tips</Link>
        <Link style={{ color: '#a0a0a0', textDecoration: 'none' }} to="/blog/random-video-chat-safely-in-2026">Random Video Chat Safely</Link>
        <Link style={{ color: '#a0a0a0', textDecoration: 'none' }} to="/blog/best-random-chat-apps-global-connections">Best Global Random Chat Apps</Link>
      </div>
    </footer>
  );
}
