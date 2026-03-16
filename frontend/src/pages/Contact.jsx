import { Link } from 'react-router-dom';

export default function Contact() {
  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #ccc' }}>
      <h1 style={{ color: '#007bff', marginBottom: '1.5rem' }}>Contact Us</h1>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
        <div>
           <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
           <input type="text" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333' }} />
        </div>
        <div>
           <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
           <input type="email" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333' }} />
        </div>
        <div>
           <label style={{ display: 'block', marginBottom: '0.5rem' }}>Message</label>
           <textarea required rows="5" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333' }}></textarea>
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Send Message</button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
         <Link to="/" style={{ color: '#666', textDecoration: 'none' }}>Back to Home</Link>
      </div>
    </div>
  );
}
