import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Icon from '../components/Icon';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { validateIdentifier, validatePassword } from '../utils/validators';
import './LoginPage.css';

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password.',
  LOCKED: 'Too many failed attempts. Please try again in 15 minutes.',
};

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />;
  }

  const errors = {
    identifier: validateIdentifier(identifier),
    password: validatePassword(password),
  };
  const showError = (field) => (touched[field] ? errors[field] : '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    setServerError('');
    if (errors.identifier || errors.password) return;

    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      // Return to the page the user originally wanted, otherwise the dashboard.
      const target = location.state?.from;
      navigate(typeof target === 'string' && target.startsWith('/app') ? target : '/app/home', { replace: true });
    } catch (err) {
      setServerError(ERROR_MESSAGES[err.code] || err.message || 'Login failed. Please try again.');
      setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__top container">
        <Logo />
      </div>

      <main className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">Sign in</h1>
        <p className="muted">Enter your credentials to access the dashboard.</p>

        {location.state?.from && !serverError && (
          <p className="notice" role="status">Please log in to continue.</p>
        )}
        {serverError && (
          <div className="alert alert--error" role="alert">
            <Icon name="alert" size={20} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="identifier">Username or email</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
              aria-invalid={Boolean(showError('identifier'))}
              aria-describedby={showError('identifier') ? 'identifier-error' : undefined}
              disabled={submitting}
            />
            {showError('identifier') && <p id="identifier-error" className="field__error">{showError('identifier')}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="field__password">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                aria-invalid={Boolean(showError('password'))}
                aria-describedby={showError('password') ? 'password-error' : undefined}
                disabled={submitting}
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
              </button>
            </div>
            {showError('password') && <p id="password-error" className="field__error">{showError('password')}</p>}
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? <Loader inline label="Signing in..." /> : null}
            <span>{submitting ? 'Signing in...' : 'Login'}</span>
          </button>
        </form>

        <p className="login-card__back"><Link to="/">&larr; Back to main page</Link></p>
      </main>
    </div>
  );
}
