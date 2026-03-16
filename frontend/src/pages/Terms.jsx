import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #ccc' }}>
      <h1 style={{ color: '#007bff', marginBottom: '1.5rem' }}>Terms of Service</h1>
      <p style={{ marginBottom: '1rem' }}>
        By using MalluMatch, you agree to these terms:
      </p>
      <ul style={{ paddingLeft: '2rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>You must be 18 years of age or older to use this platform.</li>
        <li>You agree not to transmit any unlawful, harassing, defamatory, abusive, threatening, harmful, vulgar, obscene, or otherwise objectionable material.</li>
        <li>You are solely responsible for your interactions with other users.</li>
        <li>We reserve the right to temporarily or permanently ban users who violate these terms.</li>
      </ul>
      <div style={{ textAlign: 'center' }}>
         <Link to="/" className="btn btn-outline">Back</Link>
      </div>
    </div>
  );
}
