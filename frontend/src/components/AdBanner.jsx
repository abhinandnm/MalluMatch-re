import React, { useEffect } from 'react';

/**
 * A reusable AdSense banner component.
 * @param {Object} props
 * @param {string} props.adSlot - The AdSense Slot ID
 * @param {string} props.adFormat - The ad format (e.g., 'auto', 'fluid')
 * @param {boolean} props.fullWidthResponsive - Whether the ad is responsive
 * @param {Object} props.style - Inline styles for the ad container
 */
const AdBanner = ({ adSlot, adFormat = 'auto', fullWidthResponsive = true, style = {} }) => {
  useEffect(() => {
    try {
      // Trigger AdSense to push the ad
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="ad-container" style={{ margin: '20px 0', textAlign: 'center', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client="ca-pub-6749230340776803" // Your actual Publisher ID
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      ></ins>
    </div>
  );
};

export default AdBanner;
