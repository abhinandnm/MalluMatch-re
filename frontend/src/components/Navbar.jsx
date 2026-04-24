import useIsMobile from '../hooks/useIsMobile';
import DesktopNavbar from './DesktopNavbar';
import MobileNavbar from './MobileNavbar';

export default function Navbar() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileNavbar /> : <DesktopNavbar />;
}
