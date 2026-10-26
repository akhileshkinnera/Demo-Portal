import { Link } from 'react-router-dom';
import Icon from './Icon';
import { classifyLink } from '../utils/links';
import './TileGrid.css';

function Tile({ tile }) {
  const link = classifyLink(tile.path);
  const inner = (
    <>
      <span className="tile__icon"><Icon name={tile.icon} size={26} /></span>
      <span className="tile__title">{tile.title}</span>
      {tile.description && <span className="tile__desc">{tile.description}</span>}
    </>
  );

  if (link?.type === 'internal') {
    return <Link to={link.to} className="tile">{inner}</Link>;
  }
  if (link?.type === 'external') {
    return <a href={link.href} className="tile" target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return <div className="tile tile--disabled" aria-disabled="true">{inner}</div>;
}

export default function TileGrid({ tiles = [] }) {
  if (!tiles.length) {
    return <p className="muted">No modules are available yet.</p>;
  }
  return (
    <div className="tile-grid">
      {tiles.map((tile, i) => (
        <Tile key={tile.id || i} tile={tile} />
      ))}
    </div>
  );
}
