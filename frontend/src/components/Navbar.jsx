import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header>
      <Link to="/" className="logo">
        Mallu<span>Match</span>
      </Link>
      <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
        Talk to strangers!
      </div>
    </header>
  );
}
