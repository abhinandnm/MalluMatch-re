import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #ccc' }}>
      <h1 style={{ color: '#007bff', marginBottom: '1.5rem' }}>Privacy Policy</h1>
      <p style={{ marginBottom: '1rem' }}>Last updated: {new Date().toLocaleDateString()}</p>
      <p style={{ marginBottom: '1rem' }}>
        At MalluMatch, we take your privacy seriously. This policy describes what information we collect and how it is used.
      </p>
      <ul style={{ paddingLeft: '2rem', marginBottom: '2rem' }}>
        <li><strong>Video and Audio:</strong> All video and audio streams are transmitted peer-to-peer via WebRTC. We do not record or store your video or audio on our servers.</li>
        <li><strong>Text Chat:</strong> Text messages are routed temporarily through our signaling server to deliver them to your chat partner. We do not permanently store chat logs.</li>
        <li><strong>IP Addresses:</strong> Your IP address is used for matchmaking and network routing. We may temporarily store it to enforce bans if you violate our terms of service.</li>
      </ul>
      <div style={{ textAlign: 'center' }}>
         <Link to="/" className="btn btn-outline">Back</Link>
      </div>
    </div>
  );
}
