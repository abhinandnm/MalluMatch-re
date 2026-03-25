import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function Terms() {
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
        .terms-content li {
          margin-bottom: 0.8rem;
          list-style-type: none;
          position: relative;
          padding-left: 1.5rem;
        }
        .terms-content li::before {
          content: "✓";
          color: var(--color-primary);
          position: absolute;
          left: 0;
          font-weight: bold;
        }
      `}</style>
      
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '0.5rem', 
          background: 'linear-gradient(135deg, var(--color-primary), #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Terms of Service</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Last updated: March 25, 2026</p>
      </div>

      <div className="terms-content">
        <p style={{ marginBottom: '2.5rem', fontSize: '1.1rem', textAlign: 'center' }}>
          By using MalluMatch, you agree to comply with the following terms and conditions. 
          Please read them carefully.
        </p>

        <section style={{ ...sectionStyle, animationDelay: '0.1s' }}>
          <h2 style={headerStyle}>1. Eligibility</h2>
          <p>You must be at least <strong>18 years of age</strong> to use MalluMatch. By using this platform, you represent and warrant that you are of legal age.</p>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.2s' }}>
          <h2 style={headerStyle}>2. User Conduct</h2>
          <p style={{ marginBottom: '1rem' }}>Users are expected to maintain a respectful environment. You agree NOT to:</p>
          <ul>
            <li>Transmit any unlawful, harassing, defamatory, or abusive material.</li>
            <li>Share obscene, harmful, vulgar, or otherwise objectionable content.</li>
            <li>Engage in spamming, phishing, or spreading malware.</li>
            <li>Harass or threaten other users in any form.</li>
          </ul>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.3s' }}>
          <h2 style={headerStyle}>3. Safety & Moderation</h2>
          <p style={{ marginBottom: '1rem' }}>To ensure the safety of our community:</p>
          <ul>
            <li>We monitor chat conversations (text and media blocks) for policy violations.</li>
            <li>We use automated systems and manual reviews to prevent abuse.</li>
            <li>Violations may result in temporary or permanent bans without prior notice.</li>
          </ul>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.4s' }}>
          <h2 style={headerStyle}>4. Data & Privacy</h2>
          <p>Your use of the service is also governed by our <Link to="/privacy" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Privacy Policy</Link>. We retain chat data for a maximum of 24 hours for safety moderation purposes before permanent deletion.</p>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.5s' }}>
          <h2 style={headerStyle}>5. Disclaimer of Liability</h2>
          <p>MalluMatch is provided "as is" without any warranties. We are not responsible for the behavior of users or any damages arising from your use of the platform. You are solely responsible for your interactions.</p>
        </section>

        <section style={{ ...sectionStyle, animationDelay: '0.6s' }}>
          <h2 style={headerStyle}>6. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the platform constitutes your acceptance of the updated terms.</p>
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
         }}>I Understand</Link>
      </div>
    </div>
  );
}
