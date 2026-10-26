import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Logo from './Logo';
import { LOGOUT_PATH, classifyLink } from '../utils/links';
import './Navbar.css';

/**
 * Navigation tabs come from the "Tabs" sheet.
 * A tab whose path is "/logout" signs the user out and returns to the Main Page.
 * If tabs fail to load, a Logout button is still shown so the user is never stuck.
 */
export default function Navbar({ tabs = [], loading, onLogout, userName }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile menu after navigating.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    navigate('/', { replace: true }); // go to the Main Page first...
    onLogout(); // ...then clear the session (batched into one render)
  };

  const usable = tabs.filter((t) => t.path === LOGOUT_PATH || classifyLink(t.path)?.type === 'internal');
  const hasLogoutTab = usable.some((t) => t.path === LOGOUT_PATH);

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Logo to="/app/home" light />

        <button
          type="button"
          className="navbar__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>

        <nav id="main-nav" className={open ? 'navbar__nav navbar__nav--open' : 'navbar__nav'} aria-label="Main">
          {loading && !usable.length && <span className="navbar__loading">Loading menu...</span>}

          {usable.map((tab) =>
            tab.path === LOGOUT_PATH ? (
              <button key={tab.id || tab.label} type="button" className="navbar__link navbar__link--button" onClick={handleLogout}>
                <Icon name={tab.icon || 'logout'} size={18} />
                <span>{tab.label || 'Logout'}</span>
              </button>
            ) : (
              <NavLink
                key={tab.id || tab.label}
                to={tab.path}
                className={({ isActive }) => (isActive ? 'navbar__link navbar__link--active' : 'navbar__link')}
              >
                <Icon name={tab.icon} size={18} />
                <span>{tab.label}</span>
              </NavLink>
            ),
          )}

          {!hasLogoutTab && !loading && (
            <button type="button" className="navbar__link navbar__link--button" onClick={handleLogout}>
              <Icon name="logout" size={18} />
              <span>Logout</span>
            </button>
          )}

          {userName && <span className="navbar__user" title={userName}>{userName}</span>}
        </nav>
      </div>
    </header>
  );
}
