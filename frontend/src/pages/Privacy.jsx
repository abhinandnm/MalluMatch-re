import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="premium-page-container">
      <div className="premium-page-card">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1>Privacy Policy</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '-1.5rem' }}>Last updated: March 25, 2026</p>
        </div>

        <div className="privacy-content">
          <p style={{ marginBottom: '2rem', fontSize: '1.1rem', textAlign: 'center' }}>
            Welcome to Mallu Match. Your privacy is important to us.
          </p>

          <section>
            <h2>1. Information We Collect</h2>
            <p>We may collect the following information:</p>
            <ul>
              <li>Messages sent during chats</li>
              <li>IP address and device information</li>
              <li>Usage data (time spent, interactions)</li>
            </ul>
          </section>

          <section>
            <h2>2. Chat Monitoring</h2>
            <p>To maintain a safe environment, we monitor and review chat conversations, including text (and media if applicable).</p>
            <ul>
              <li>Chat data may be temporarily stored for moderation purposes</li>
              <li>This data is automatically deleted within 24 hours</li>
            </ul>
          </section>

          <section>
            <h2>3. Purpose of Data Collection</h2>
            <p>We use collected data to:</p>
            <ul>
              <li>Provide and improve our service</li>
              <li>Prevent abuse, spam, and harmful behavior</li>
              <li>Ensure user safety</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Retention</h2>
            <ul>
              <li>Chat data is stored for a limited time (up to 24 hours)</li>
              <li>After that, it is automatically deleted from our systems</li>
            </ul>
          </section>

          <section>
            <h2>5. Sharing of Information</h2>
            <p>We do not sell or share your personal data with third parties, except:</p>
            <ul>
              <li>When required by law</li>
              <li>To prevent fraud or misuse</li>
            </ul>
          </section>

          <section>
            <h2>6. Cookies</h2>
            <p>We may use cookies or similar technologies to improve user experience.</p>
          </section>

          <section>
            <h2>7. User Responsibility</h2>
            <p>Users must follow community guidelines. Any violation may result in bans or restrictions.</p>
          </section>

          <section>
            <h2>8. Security</h2>
            <p>We take reasonable measures to protect your data, but no system is 100% secure.</p>
          </section>

          <section>
            <h2>9. Changes to This Policy</h2>
            <p>We may update this policy at any time. Continued use of the service means you accept the updated policy.</p>
          </section>

          <section style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '2rem', marginTop: '3rem' }}>
            <h2>10. Contact</h2>
            <p>For any questions, contact us at: <a href="mailto:mallumatch.auth@gmail.com" style={{ fontWeight: 'bold' }}>mallumatch.auth@gmail.com</a></p>
          </section>
        </div>

        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
           <Link to="/" className="start-chat-btn" style={{ display: 'inline-flex', width: 'auto', padding: '1rem 2rem' }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
