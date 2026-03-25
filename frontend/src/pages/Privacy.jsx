import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sectionStyle = {
    marginBottom: '2rem',
    animation: 'slideUp 0.5s ease forwards',
    opacity: 0,
    transform: 'translateY(10px)'
  };

  const headerStyle = {
    color: 'var(--color-primary)',
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '4rem auto', 
      padding: '3rem 2rem', 
      background: 'var(--glass-bg)', 
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-lg)', 
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-premium)',
      color: 'var(--color-text)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes slideUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .privacy-content li {
          margin-bottom: 0.5rem;
          list-style-type: none;
          position: relative;
          padding-left: 1.5rem;
        }
        .privacy-content li::before {
          content: "•";
          color: var(--color-primary);
          position: absolute;
          left: 0;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline !important;
        }
      `}</style>
      
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '0.5rem', 
          background: 'linear-gradient(135deg, var(--color-primary), #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Privacy Policy</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Last updated: March 25, 2026</p>
      </div>

      <div className="privacy-content">
        <p style={{ marginBottom: '2rem', fontSize: '1.1rem', textAlign: 'center' }}>
          Welcome to Mallu Match. Your privacy is important to us.
        </p>

        <section style={{ ...sectionStyle, animationDelay: '0.1s' }}>
          <h2 style={headerStyle}>1. Information We Collect</h2>
          <p style={{ marginBottom: '1rem' }}>We may collect the following information:</p>
          <ul>
            <li>Messages sent during chats</li>
            <li>IP address and device information</li>
            <li>Usage data (time spent, interactions)</li>
          </ul>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.2s' }}>
          <h2 style={headerStyle}>2. Chat Monitoring</h2>
          <p style={{ marginBottom: '1rem' }}>To maintain a safe environment, we monitor and review chat conversations, including text (and media if applicable).</p>
          <ul>
            <li>Chat data may be temporarily stored for moderation purposes</li>
            <li>This data is automatically deleted within 24 hours</li>
          </ul>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.3s' }}>
          <h2 style={headerStyle}>3. Purpose of Data Collection</h2>
          <p style={{ marginBottom: '1rem' }}>We use collected data to:</p>
          <ul>
            <li>Provide and improve our service</li>
            <li>Prevent abuse, spam, and harmful behavior</li>
            <li>Ensure user safety</li>
          </ul>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.4s' }}>
          <h2 style={headerStyle}>4. Data Retention</h2>
          <ul>
            <li>Chat data is stored for a limited time (up to 24 hours)</li>
            <li>After that, it is automatically deleted from our systems</li>
          </ul>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.5s' }}>
          <h2 style={headerStyle}>5. Sharing of Information</h2>
          <p style={{ marginBottom: '1rem' }}>We do not sell or share your personal data with third parties, except:</p>
          <ul>
            <li>When required by law</li>
            <li>To prevent fraud or misuse</li>
          </ul>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.6s' }}>
          <h2 style={headerStyle}>6. Cookies</h2>
          <p>We may use cookies or similar technologies to improve user experience.</p>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.7s' }}>
          <h2 style={headerStyle}>7. User Responsibility</h2>
          <p>Users must follow community guidelines. Any violation may result in bans or restrictions.</p>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.8s' }}>
          <h2 style={headerStyle}>8. Security</h2>
          <p>We take reasonable measures to protect your data, but no system is 100% secure.</p>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.9s' }}>
          <h2 style={headerStyle}>9. Changes to This Policy</h2>
          <p>We may update this policy at any time. Continued use of the service means you accept the updated policy.</p>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '1.0s', borderTop: '1px solid var(--color-border)', paddingTop: '2rem', marginTop: '3rem' }}>
          <h2 style={headerStyle}>10. Contact</h2>
          <p>For any questions, contact us at: <a href="mailto:mallumatch.auth@gmail.com" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'bold' }}>mallumatch.auth@gmail.com</a></p>
        </section>
      </div>

      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
         <Link to="/" className="btn" style={{ 
           padding: '0.8rem 2.5rem', 
           borderRadius: '100px',
           background: 'var(--color-primary)',
           color: 'white',
           border: 'none',
           boxShadow: '0 4px 15px var(--color-primary-glow)'
         }}>Back to Home</Link>
      </div>
    </div>
  );
}
