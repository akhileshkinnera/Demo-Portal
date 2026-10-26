import { Link } from 'react-router-dom';
import Icon from './Icon';

/** Shared layout for modules that are not built yet (Reports, Services, Settings, extra tiles). */
export default function PagePlaceholder({ icon = 'default', title, description, children }) {
  return (
    <div className="container page">
      <div className="page__header">
        <span className="page__icon"><Icon name={icon} size={28} /></span>
        <div>
          <h1>{title}</h1>
          {description && <p className="muted">{description}</p>}
        </div>
      </div>
      <div className="card">
        {children || (
          <>
            <p><strong>This module is ready to be built out.</strong></p>
            <p className="muted">Add your content for "{title}" here by editing the matching file in <code>src/pages</code>.</p>
          </>
        )}
      </div>
      <p><Link to="/app/home" className="btn btn--outline btn--sm">Back to dashboard</Link></p>
    </div>
  );
}
