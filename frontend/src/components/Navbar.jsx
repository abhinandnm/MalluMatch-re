import { Link } from 'react-router-dom';
import UserCount from './UserCount';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  return (
    <header>
      <Link to="/" className="logo">
        MALLU <span>MATCH</span>
      </Link>
      <div className="tagline">Talk to strangers!</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <UserCount />
        <ThemeToggle />
      </div>
    </header>
  );
}
