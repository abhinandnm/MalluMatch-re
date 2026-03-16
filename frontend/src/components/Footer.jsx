import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <p>&copy; {new Date().getFullYear()} MalluMatch. All rights reserved.</p>
      <p className="developed-by">Developed by Abhinand N M</p>
      <div className="footer-links">
        <Link to="/about">About Us</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/contact">Contact</Link>
      </div>
    </footer>
  );
}
