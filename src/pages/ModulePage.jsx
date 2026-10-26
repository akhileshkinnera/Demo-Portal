import { useLocation, useOutletContext } from 'react-router-dom';
import PagePlaceholder from '../components/PagePlaceholder';

/**
 * Generic page for any tile whose path is /app/module/<name>.
 * Add a row in the Tiles sheet and this page works immediately, using the sheet's title and description.
 */
export default function ModulePage() {
  const { pathname } = useLocation();
  const { data } = useOutletContext();
  const tile = data?.tiles?.find((t) => t.path === pathname);

  return (
    <PagePlaceholder
      icon={tile?.icon}
      title={tile?.title || 'Module'}
      description={tile?.description || 'This module is coming soon.'}
    />
  );
}
