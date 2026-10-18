import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Clock3,
  Globe,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { distanceKm, normalize, routeUrl, safeWebsite } from '../utils/domain';
import { geocodeAddress, mapsAvailable } from '../services/maps';
import useUserLocation from '../hooks/useLocation';
import GoogleMap from '../components/GoogleMap';
import { PointCard } from '../components/Cards';
import { Badge, EmptyState, Loading, Notice, PageHeading, useFeedback } from '../components/UI';
export function PointsPage({ mapOnly = false }: { mapOnly?: boolean }) {
  const { data, loading } = useApp();
  const [params, setParams] = useSearchParams();
  const selectedWaste = params.get('residuo') || '';
  const [city, setCity] = useState('');
  const [view, setView] = useState<'list' | 'map'>(mapOnly ? 'map' : 'list');
  const [address, setAddress] = useState('');
  const [finding, setFinding] = useState(false);
  const [addressError, setAddressError] = useState('');
  const { location, setLocation, locate, locating, locationError } = useUserLocation();
  const points = useMemo(
    () =>
      data.points
        .filter(
          (p) =>
            p.active &&
            (!selectedWaste || p.acceptedWasteIds.includes(selectedWaste)) &&
            (!city || normalize(`${p.city} ${p.district} ${p.state}`).includes(normalize(city))),
        )
        .sort((a, b) =>
          location
            ? distanceKm(location, a) - distanceKm(location, b)
            : a.name.localeCompare(b.name),
        ),
    [data.points, selectedWaste, city, location],
  );
  return (
    <div className="container page">
      <PageHeading
        eyebrow="ENCONTRE O DESTINO CERTO"
        title={mapOnly ? 'Mapa de pontos de coleta' : 'Perto de você, melhor para todos.'}
        description="Encontre locais que recebem o seu material e planeje seu descarte."
        action={
          <Link to="/sugerir-ponto" className="button secondary">
            Sugerir um ponto
          </Link>
        }
      />
      <div className="points-filters panel">
        <label className="field">
          <span>Qual material?</span>
          <select
            value={selectedWaste}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('residuo', e.target.value);
              else next.delete('residuo');
              setParams(next);
            }}
          >
            <option value="">Todos os materiais</option>
            {data.wastes
              .filter((w) => w.active)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Cidade ou bairro</span>
          <input
            value={city}
            placeholder="Ex.: São Paulo, Vila Mariana"
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={locating} onClick={locate}>
          <LocateFixed size={18} />
          {locating ? 'Localizando…' : 'Usar minha localização'}
        </button>
      </div>
      {locationError && <Notice tone="warning">{locationError}</Notice>}
      {location && (
        <Notice tone="success">
          Resultados ordenados pela distância aproximada em linha reta. Sua localização não é salva.
          <button className="text-link" onClick={() => setLocation(undefined)}>
            Limpar localização
          </button>
        </Notice>
      )}
      {mapsAvailable && (
        <details className="address-search">
          <summary>Buscar proximidade por endereço</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setFinding(true);
              setAddressError('');
              try {
                setLocation(await geocodeAddress(address));
              } catch (err) {
                setAddressError(
                  err instanceof Error ? err.message : 'Não foi possível localizar o endereço.',
                );
              } finally {
                setFinding(false);
              }
            }}
          >
            <label className="field">
              <span>Endereço com cidade e estado</span>
              <input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, cidade, estado"
              />
            </label>
            <button className="button secondary" disabled={finding}>
              {finding ? 'Buscando…' : 'Buscar endereço'}
            </button>
          </form>
          {addressError && <Notice tone="error">{addressError}</Notice>}
        </details>
      )}
      <div className="result-heading">
        <p>
          <strong>{points.length}</strong>{' '}
          {points.length === 1 ? 'ponto encontrado' : 'pontos encontrados'}{' '}
          {selectedWaste && (
            <>
              para <strong>{data.wastes.find((w) => w.id === selectedWaste)?.name}</strong>
            </>
          )}
        </p>
        <div className="view-toggle" aria-label="Visualização">
          <button
            className={view === 'list' ? 'active' : ''}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <List size={17} />
            Lista
          </button>
          <button
            className={view === 'map' ? 'active' : ''}
            aria-pressed={view === 'map'}
            onClick={() => setView('map')}
          >
            <MapIcon size={17} />
            Mapa
          </button>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : (
        <>
          {view === 'map' && <GoogleMap points={points} wastes={data.wastes} origin={location} />}
          <div className={view === 'map' ? 'point-grid map-results' : 'point-grid'}>
            {points.map((p) => (
              <PointCard
                key={p.id}
                point={p}
                wastes={data.wastes}
                distance={location ? distanceKm(location, p) : undefined}
                origin={location}
              />
            ))}
          </div>
          {!points.length && (
            <EmptyState
              title="Ainda não encontramos um ponto aqui"
              description="Tente outra cidade ou material. Se conhece um local, envie uma sugestão."
              action={
                <Link to="/sugerir-ponto" className="button secondary">
                  Sugerir um ponto
                </Link>
              }
            />
          )}
        </>
      )}
      <p className="muted small-text points-disclaimer">
        Confirme o horário e os materiais aceitos antes da visita. Locais com o selo “Demonstração”
        são fictícios e não devem ser usados para descarte real.
      </p>
    </div>
  );
}
export function PointDetailPage() {
  const { id } = useParams();
  const { data, user, loading, reviewPoint } = useApp();
  const { busy, run, feedback } = useFeedback();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const { location, locate, locating, locationError } = useUserLocation();
  const p = data.points.find((p) => p.id === id && p.active);
  const mapPoints = useMemo(() => (p ? [p] : []), [p]);
  if (loading) return <Loading />;
  if (!p)
    return (
      <div className="container page">
        <EmptyState
          title="Ponto de coleta não encontrado"
          action={
            <Link className="button primary" to="/pontos">
              Ver pontos de coleta
            </Link>
          }
        />
      </div>
    );
  const reviewed = data.reviews.some((r) => r.pointId === p.id && r.userId === user?.id);
  const website = safeWebsite(p.website);
  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Caminho">
        <Link to="/pontos">Pontos de coleta</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <PageHeading
        eyebrow="PONTO DE COLETA"
        title={p.name}
        description={p.description}
        action={
          p.demo ? (
            <Badge tone="amber">Local fictício · demonstração</Badge>
          ) : p.verified ? (
            <Badge>
              <ShieldCheck size={14} /> Verificado
            </Badge>
          ) : undefined
        }
      />
      {p.demo && (
        <Notice tone="warning">
          Este local é fictício, criado para a apresentação acadêmica. O endereço e a rota são
          ilustrativos. Não vá até ele para descartar resíduos.
        </Notice>
      )}
      <div className="detail-layout">
        <div>
          <article className="panel point-information">
            <h2>Planeje sua visita</h2>
            <div>
              <MapPin />
              <p>
                <strong>Endereço</strong>
                {p.address}, {p.number} · {p.district}
                <br />
                {p.city}/{p.state} · CEP {p.zipCode}
              </p>
            </div>
            <div>
              <Clock3 />
              <p>
                <strong>Horário de funcionamento</strong>
                {p.openingHours}
              </p>
            </div>
            {p.phone && (
              <div>
                <Phone />
                <p>
                  <strong>Telefone</strong>
                  {p.demo ? (
                    <span>{p.phone} (ilustrativo)</span>
                  ) : (
                    <a href={`tel:${p.phone.replace(/\D/g, '')}`}>{p.phone}</a>
                  )}
                </p>
              </div>
            )}
            {website && (
              <div>
                <Globe />
                <p>
                  <strong>Site</strong>
                  <a target="_blank" rel="noreferrer" href={website}>
                    Acessar site do local
                  </a>
                </p>
              </div>
            )}
            <div>
              <Star />
              <p>
                <strong>Avaliação da comunidade</strong>
                {p.totalReviews
                  ? `${p.rating.toFixed(1)} de 5 · ${p.totalReviews} avaliações`
                  : 'Ainda não há avaliações'}
              </p>
            </div>
          </article>
          <section className="panel">
            <h2>Materiais recebidos</h2>
            <div className="accepted-materials">
              {data.wastes
                .filter((w) => p.acceptedWasteIds.includes(w.id) && w.active)
                .map((w) => (
                  <Link key={w.id} to={`/residuos/${w.id}`}>
                    <RecycleLabel name={w.name} />
                  </Link>
                ))}
            </div>
          </section>
          <GoogleMap points={mapPoints} wastes={data.wastes} origin={location} />
        </div>
        <aside>
          <div className="disposal-aside">
            <MapPin size={32} />
            <h2>Seu próximo descarte começa aqui.</h2>
            <p>Confira os materiais e o horário antes de sair.</p>
            <a
              className="button primary"
              href={routeUrl(p, location)}
              target="_blank"
              rel="noreferrer"
            >
              Como chegar
            </a>
            <button className="button secondary" disabled={locating} onClick={locate}>
              <LocateFixed size={16} />
              {locating ? 'Localizando…' : 'Usar minha localização'}
            </button>
            {locationError && <Notice tone="warning">{locationError}</Notice>}
            {location && (
              <p className="small-text">
                A aproximadamente {distanceKm(location, p).toFixed(1)} km em linha reta.
              </p>
            )}
            <Link className="text-link" to={`/registrar-descarte?point=${p.id}`}>
              Registrar descarte neste ponto
            </Link>
          </div>
          <section className="panel review-panel">
            <h3>Este ponto está atualizado?</h3>
            <p>
              Confirme as informações após conhecer o local. Cada ponto pode ser avaliado uma vez
              por conta.
            </p>
            {!user ? (
              <Link to="/entrar" className="button secondary">
                Entrar para avaliar
              </Link>
            ) : reviewed ? (
              <Notice tone="success">Você já contribuiu com este ponto. Obrigado!</Notice>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (confirmed)
                    void run(
                      () => reviewPoint({ pointId: p.id, rating, comment }),
                      'Informações confirmadas. Você ganhou 5 EcoPontos!',
                    );
                }}
              >
                <label className="field">
                  <span>Sua avaliação</span>
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'estrela' : 'estrelas'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Comentário (opcional)</span>
                  <textarea
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    required
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>Confirmo que as informações de recebimento estão corretas.</span>
                </label>
                {feedback}
                <button className="button primary" disabled={busy || !confirmed}>
                  {busy ? 'Enviando…' : 'Confirmar e avaliar'}
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
function RecycleLabel({ name }: { name: string }) {
  return (
    <>
      <CheckCircle2 size={16} />
      {name}
    </>
  );
}
