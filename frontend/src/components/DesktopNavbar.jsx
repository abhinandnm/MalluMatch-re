import { Link } from 'react-router-dom';
import UserCount from './UserCount';

export default function DesktopNavbar() {
  return (
    <header>
      <Link to="/" className="logo">
        MALLU <span>MATCH</span>
      </Link>
      <div className="tagline">Talk to strangers!</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <UserCount />
      </div>
    </header>
  );
}
