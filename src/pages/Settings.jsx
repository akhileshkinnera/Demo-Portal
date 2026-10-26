import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, session } = useAuth();
  const expires = session ? new Date(session.exp).toLocaleTimeString() : '';

  return (
    <PagePlaceholder icon="settings" title="Settings" description="Your account and session details.">
      <dl className="details">
        <div><dt>Name</dt><dd>{user?.name || '-'}</dd></div>
        <div><dt>Email</dt><dd>{user?.email || '-'}</dd></div>
        <div><dt>Role</dt><dd>{user?.role || '-'}</dd></div>
        <div><dt>Session expires at</dt><dd>{expires || '-'}</dd></div>
      </dl>
    </PagePlaceholder>
  );
}
