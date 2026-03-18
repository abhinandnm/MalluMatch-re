import { Link } from 'react-router-dom';
import UserCount from './UserCount';

export default function Navbar() {
  return (
    <header>
      <Link to="/" className="logo">
        Mallu<span>Match</span>
      </Link>
      <div className="tagline">Talk to strangers!</div>
      <UserCount />
    </header>
  );
}
