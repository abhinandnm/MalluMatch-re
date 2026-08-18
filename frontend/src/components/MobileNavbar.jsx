import { Link } from 'react-router-dom';
import UserCount from './UserCount';
import ThemeToggle from './ThemeToggle';

export default function MobileNavbar() {
  return (
    <header className="google-meet-header mobile">
      <Link to="/" className="google-meet-logo">
        <span className="logo-text-google">
          Mallu<span className="logo-text-accent">Match</span>
        </span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <UserCount />
        <ThemeToggle />
      </div>
    </header>
  );
}
