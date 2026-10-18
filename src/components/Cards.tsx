import { Link } from 'react-router-dom';
import { Clock3, MapPin, ShieldCheck, Star, Recycle, AlertTriangle } from 'lucide-react';
import type { CollectionPoint, Waste } from '../types';
import { Badge } from './UI';
import CategoryIcon from './CategoryIcon';
import { routeUrl } from '../utils/domain';
export function WasteCard({ waste }: { waste: Waste }) {
  return (
    <Link to={`/residuos/${waste.id}`} className="waste-card">
      <div
        className={`category-symbol category-${waste.category === 'Eletrônicos' ? 'blue' : waste.dangerous ? 'amber' : 'green'}`}
      >
        <CategoryIcon category={waste.category} size={28} />
      </div>
      <span className="card-category">{waste.category}</span>
      <h3>{waste.name}</h3>
      <p>{waste.description}</p>
      <div className="waste-card-bottom">
        {waste.dangerous ? (
          <span className="safety-label">
            <AlertTriangle size={15} /> Coleta especial
          </span>
        ) : (
          <span className="eco-label">
            <Recycle size={15} /> {waste.recyclable ? 'Pode ser reciclado' : 'Descarte responsável'}
          </span>
        )}
        <span className="card-link">Ver orientação</span>
      </div>
    </Link>
  );
}
export function PointCard({
  point,
  wastes,
  distance,
  origin,
}: {
  point: CollectionPoint;
  wastes: Waste[];
  distance?: number;
  origin?: { lat: number; lng: number };
}) {
  const accepted = wastes.filter((w) => point.acceptedWasteIds.includes(w.id));
  return (
    <article className="point-card">
      <div className="point-card-top">
        <span className="point-icon">
          <MapPin size={25} />
        </span>
        <div>
          {point.demo && <Badge tone="amber">Demonstração</Badge>}
          {point.verified && (
            <span className="verified">
              <ShieldCheck size={14} /> Verificado
            </span>
          )}
        </div>
        {distance !== undefined && <span className="distance">{distance.toFixed(1)} km</span>}
      </div>
      <Link className="point-title" to={`/pontos/${point.id}`}>
        <h3>{point.name}</h3>
      </Link>
      <p className="point-address">
        {point.address}, {point.number}
        <br />
        {point.district} · {point.city}/{point.state}
      </p>
      <div className="accepted-tags">
        {accepted.slice(0, 3).map((w) => (
          <span key={w.id}>{w.name}</span>
        ))}
        {accepted.length > 3 && <span>+{accepted.length - 3}</span>}
      </div>
      <div className="point-meta">
        <span>
          <Clock3 size={15} />
          {point.openingHours}
        </span>
        <span>
          <Star size={15} />
          {point.totalReviews
            ? `${point.rating.toFixed(1)} (${point.totalReviews})`
            : 'Sem avaliações'}
        </span>
      </div>
      <div className="point-actions">
        <Link to={`/pontos/${point.id}`} className="button secondary">
          Ver detalhes
        </Link>
        <a
          className="text-link"
          target="_blank"
          rel="noreferrer"
          href={routeUrl(point, origin)}
          aria-label={`Como chegar a ${point.name}`}
        >
          Como chegar
        </a>
      </div>
    </article>
  );
}
