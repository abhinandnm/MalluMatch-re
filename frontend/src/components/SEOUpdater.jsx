import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function SEOUpdater() {
  const location = useLocation();

  useEffect(() => {
    const baseUrl = 'https://mallu-match.vercel.app';
    const currentUrl = `${baseUrl}${location.pathname}`;

    // Update or create canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentUrl);
  }, [location.pathname]);

  return null;
}
