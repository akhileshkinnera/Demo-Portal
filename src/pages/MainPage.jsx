import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../config';
import './MainPage.css';

const FEATURES = [
  { icon: 'shield', title: 'Secure access', text: 'Sign in with your own account. Sessions expire automatically to keep your data safe.' },
  { icon: 'layers', title: 'Everything in one place', text: 'Reports, services and company updates are organised on a single dashboard.' },
  { icon: 'bolt', title: 'Always up to date', text: 'Announcements and modules update instantly, with no waiting for a new release.' },
];

export default function MainPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="shell">
      <header className="public-header">
        <div className="container public-header__inner">
          <Logo />
          {isAuthenticated ? (
            <Link to="/app/home" className="btn btn--primary">Go to Dashboard</Link>
          ) : (
            <Link to="/login" className="btn btn--primary">Login</Link>
          )}
        </div>
      </header>

      <main className="shell__main">
        <section className="hero">
          <div className="container hero__inner">
            <p className="hero__eyebrow">Welcome</p>
            <h1 className="hero__title">Welcome to {APP_NAME}</h1>
            <p className="hero__lead">
              A secure, single place to find your reports, use company services and stay on top of important announcements.
            </p>
            <div className="hero__actions">
              <Link to={isAuthenticated ? '/app/home' : '/login'} className="btn btn--light btn--lg">
                {isAuthenticated ? 'Open Dashboard' : 'Login to get started'}
              </Link>
            </div>
          </div>
        </section>

        <section className="container features" aria-label="Features">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature">
              <span className="feature__icon"><Icon name={f.icon} size={26} /></span>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
