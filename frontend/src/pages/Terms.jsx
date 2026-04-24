import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="premium-page-container">
      <div className="premium-page-card">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1>Terms of Service</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '-1.5rem' }}>Last updated: March 25, 2026</p>
        </div>

        <div className="terms-content">
          <p style={{ marginBottom: '2.5rem', fontSize: '1.1rem', textAlign: 'center' }}>
            By using MalluMatch, you agree to comply with the following terms and conditions. 
            Please read them carefully.
          </p>

          <section>
            <h2>1. Eligibility</h2>
            <p>You must be at least <strong>18 years of age</strong> to use MalluMatch. By using this platform, you represent and warrant that you are of legal age.</p>
          </section>

          <section>
            <h2>2. User Conduct</h2>
            <p>Users are expected to maintain a respectful environment. You agree NOT to:</p>
            <ul>
              <li>Transmit any unlawful, harassing, defamatory, or abusive material.</li>
              <li>Share obscene, harmful, vulgar, or otherwise objectionable content.</li>
              <li>Engage in spamming, phishing, or spreading malware.</li>
              <li>Harass or threaten other users in any form.</li>
            </ul>
          </section>

          <section>
            <h2>3. Safety & Moderation</h2>
            <p>To ensure the safety of our community:</p>
            <ul>
              <li>We monitor chat conversations (text and media blocks) for policy violations.</li>
              <li>We use automated systems and manual reviews to prevent abuse.</li>
              <li>Violations may result in temporary or permanent bans without prior notice.</li>
            </ul>
          </section>

          <section>
            <h2>4. Data & Privacy</h2>
            <p>Your use of the service is also governed by our <Link to="/privacy">Privacy Policy</Link>. We retain chat data for a maximum of 24 hours for safety moderation purposes before permanent deletion.</p>
          </section>

          <section>
            <h2>5. Disclaimer of Liability</h2>
            <p>MalluMatch is provided "as is" without any warranties. We are not responsible for the behavior of users or any damages arising from your use of the platform. You are solely responsible for your interactions.</p>
          </section>

          <section>
            <h2>6. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the platform constitutes your acceptance of the updated terms.</p>
          </section>
        </div>

        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
           <Link to="/" className="start-chat-btn" style={{ display: 'inline-flex', width: 'auto', padding: '1rem 2rem' }}>I Understand</Link>
        </div>
      </div>
    </div>
  );
}
