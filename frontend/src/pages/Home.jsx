import useIsMobile from '../hooks/useIsMobile';
import DesktopHome from './DesktopHome';
import MobileHome from './MobileHome';

export default function Home() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHome /> : <DesktopHome />;
}
