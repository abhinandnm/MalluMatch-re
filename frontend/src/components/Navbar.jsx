import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header>
      <Link to="/" className="logo">
        Mallu<span>Match</span>
      </Link>
      <div className="tagline">Talk to strangers!</div>
    </header>
  );
}
