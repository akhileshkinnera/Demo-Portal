import { useOutletContext } from 'react-router-dom';
import Carousel from '../components/Carousel';
import TileGrid from '../components/TileGrid';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { data, loading, error, reload } = useOutletContext();
  const { user } = useAuth();
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="container page">
      <h1 className="page__greeting">{firstName ? `Welcome back, ${firstName}` : 'Dashboard'}</h1>

      {loading && !data && <Loader label="Loading your dashboard..." />}

      {error && !data && (
        <ErrorMessage title="We could not load the dashboard" message={error} onRetry={reload} />
      )}

      {data && (
        <>
          <Carousel slides={data.carousel} />
          <h2 className="section-title">Your modules</h2>
          <TileGrid tiles={data.tiles} />
        </>
      )}
    </div>
  );
}
