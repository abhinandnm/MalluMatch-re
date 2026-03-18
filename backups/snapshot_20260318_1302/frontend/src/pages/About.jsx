import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #ccc' }}>
      <h1 style={{ color: '#007bff', marginBottom: '1.5rem' }}>About MalluMatch</h1>
      <p style={{ marginBottom: '1rem' }}>
        MalluMatch is a random video and text chatting platform designed to connect people instantly.
      </p>
      <p style={{ marginBottom: '1rem' }}>
        Our mission is to instantly connect strangers from around the world in a secure, peer-to-peer environment.
        Whether you want to make a new friend, practice a language, or simply have a random conversation, MalluMatch provides the perfect platform.
      </p>
      <h2 style={{ color: '#333', marginTop: '2rem', marginBottom: '1rem' }}>Safety First</h2>
      <p style={{ marginBottom: '1rem' }}>
        We require users to be 18+ and have strict community guidelines. If you encounter inappropriate behavior, please use the Next or Report buttons.
      </p>
      
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
         <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}
