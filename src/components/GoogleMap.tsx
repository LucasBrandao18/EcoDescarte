import { useEffect, useRef, useState } from 'react';
import { importLibrary } from '@googlemaps/js-api-loader';
import { MapPin, Map } from 'lucide-react';
import type { CollectionPoint, Waste } from '../types';
import { loadMaps, mapsAvailable } from '../services/maps';
import { routeUrl } from '../utils/domain';
export default function GoogleMap({
  points,
  wastes,
  origin,
}: {
  points: CollectionPoint[];
  wastes: Waste[];
  origin?: { lat: number; lng: number };
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    let info: google.maps.InfoWindow | undefined;
    setError('');
    setLoading(true);
    const onAuthFailure = () => {
      if (!disposed) {
        setError(
          'O Google Maps não autorizou o carregamento. Confira a chave e as restrições de domínio. A lista continua disponível.',
        );
        setLoading(false);
      }
    };
    window.addEventListener('ecodescarte:maps-auth-failure', onAuthFailure);
    async function initialize() {
      try {
        const { Map } = await loadMaps();
        const { AdvancedMarkerElement } = await importLibrary('marker');
        if (disposed || !container.current) return;
        const map = new Map(container.current, {
          center: origin ?? points[0] ?? { lat: -23.5505, lng: -46.6333 },
          zoom: 12,
          mapId: 'DEMO_MAP_ID',
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        info = new google.maps.InfoWindow();
        const bounds = new google.maps.LatLngBounds();
        points.forEach((p) => {
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: p.lat, lng: p.lng },
            title: p.name,
          });
          markers.push(marker);
          bounds.extend({ lat: p.lat, lng: p.lng });
          marker.addListener('click', () => {
            const card = document.createElement('div');
            card.className = 'map-info';
            const title = document.createElement('h3');
            title.textContent = p.name;
            const address = document.createElement('p');
            address.textContent = `${p.address}, ${p.number} · ${p.city}${p.demo ? ' · Local fictício de demonstração' : ''}`;
            const accepted = document.createElement('p');
            accepted.textContent = wastes
              .filter((w) => p.acceptedWasteIds.includes(w.id))
              .map((w) => w.name)
              .join(', ');
            const details = document.createElement('a');
            details.href = `/pontos/${p.id}`;
            details.textContent = 'Ver detalhes';
            const route = document.createElement('a');
            route.href = routeUrl(p, origin);
            route.textContent = 'Como chegar';
            route.target = '_blank';
            route.rel = 'noreferrer';
            card.append(title, address, accepted, details, document.createTextNode(' · '), route);
            info?.setContent(card);
            info?.open({ anchor: marker, map });
          });
        });
        if (points.length > 1) {
          map.fitBounds(bounds, 60);
        }
        setLoading(false);
      } catch (err) {
        if (!disposed) {
          setError(
            !mapsAvailable && err instanceof Error
              ? err.message
              : 'Não foi possível carregar o Google Maps. Use a lista de pontos ou tente novamente.',
          );
          setLoading(false);
        }
      }
    }
    void initialize();
    return () => {
      disposed = true;
      window.removeEventListener('ecodescarte:maps-auth-failure', onAuthFailure);
      markers.forEach((m) => {
        m.map = null;
      });
      info?.close();
    };
  }, [points, wastes, origin, attempt]);
  return (
    <div className="map-shell">
      {error ? (
        <div className="map-fallback">
          <span className="map-fallback-icon">
            <Map size={40} />
          </span>
          <h3>
            {mapsAvailable ? 'O mapa está indisponível' : 'Encontre seu próximo ponto de coleta'}
          </h3>
          <p>{error}</p>
          <span>
            <MapPin size={16} /> A lista de pontos e os links de rotas continuam disponíveis.
          </span>
          {mapsAvailable && (
            <button className="button secondary" onClick={() => setAttempt((x) => x + 1)}>
              Tentar novamente
            </button>
          )}
        </div>
      ) : (
        <>
          <div ref={container} className="google-map" aria-label="Mapa dos pontos de coleta" />
          {loading && (
            <div className="map-loading" role="status">
              Carregando mapa…
            </div>
          )}
        </>
      )}
    </div>
  );
}
