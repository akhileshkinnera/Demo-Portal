import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={light ? 'logo logo--light' : 'logo'} aria-label={`${APP_NAME} home`}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0b2447" />
        <path d="M9 21V11l7-4 7 4v10l-7 4z" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="3" fill="#ffffff" />
      </svg>
      <span className="logo__text">{APP_NAME}</span>
    </Link>
  );
}
