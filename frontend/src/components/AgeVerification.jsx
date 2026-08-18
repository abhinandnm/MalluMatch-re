import { useState } from 'react';
import './AgeVerification.css';

export default function AgeVerification({ onVerify }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="age-verification-overlay">
      <div className="age-verification-modal">
        <h2>Welcome to MalluMatch</h2>
        <p>This platform connects you with random strangers for video and text chat.</p>
        <p className="warning">
          <strong>18+ Only:</strong> By entering, you confirm that you are at least 18 years old and agree to our terms of service!.
        </p>
        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={() => {
              setIsOpen(false);
              onVerify();
            }}
          >
            I am 18 or older
          </button>
          <a href="https://google.com" className="btn exit-btn">Exit</a>
        </div>
      </div>
    </div>
  );
}
