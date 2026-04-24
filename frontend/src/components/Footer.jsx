import useIsMobile from '../hooks/useIsMobile';
import DesktopFooter from './DesktopFooter';
import MobileFooter from './MobileFooter';

export default function Footer() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileFooter /> : <DesktopFooter />;
}
