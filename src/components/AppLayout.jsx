import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../context/AuthContext';
import useContent from '../hooks/useContent';

/**
 * Shell for every protected page: navigation bar + page + footer.
 * Content (carousel, tabs, tiles) is loaded once here and shared with child pages.
 */
export default function AppLayout() {
  const { token, user, logout } = useAuth();
  const content = useContent(token, logout);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar tabs={content.data?.tabs} loading={content.loading} onLogout={logout} userName={user?.name} />
      <main id="main" className="shell__main">
        <Outlet context={content} />
      </main>
      <Footer />
    </div>
  );
}
