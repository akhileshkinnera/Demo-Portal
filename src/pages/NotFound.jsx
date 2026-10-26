import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="container page not-found">
      <h1>404</h1>
      <p className="muted">Sorry, we could not find that page.</p>
      <Link to={isAuthenticated ? '/app/home' : '/'} className="btn btn--primary">
        {isAuthenticated ? 'Back to dashboard' : 'Go to main page'}
      </Link>
    </div>
  );
}
