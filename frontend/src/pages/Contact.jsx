import { Link } from 'react-router-dom';

export default function Contact() {
  const inputStyle = {
    width: '100%', 
    padding: '0.75rem', 
    borderRadius: '12px', 
    border: '1px solid rgba(255, 255, 255, 0.1)', 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  return (
    <div className="premium-page-container">
      <div className="premium-page-card">
        <h1 style={{ textAlign: 'center' }}>Contact Us</h1>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }} onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name</label>
             <input type="text" required style={inputStyle} />
          </div>
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email</label>
             <input type="email" required style={inputStyle} />
          </div>
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Message</label>
             <textarea required rows="5" style={inputStyle}></textarea>
          </div>
          <button type="submit" className="start-chat-btn" style={{ marginTop: '1rem' }}>Send Message</button>
        </form>
        <div style={{ marginTop: '3rem', padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
          <h3>Direct Contact</h3>
          <p style={{ margin: 0 }}>
            Email: <a href="mailto:mallumatch.auth@gmail.com" style={{ fontWeight: '500' }}>mallumatch.auth@gmail.com</a>
          </p>
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
           <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
