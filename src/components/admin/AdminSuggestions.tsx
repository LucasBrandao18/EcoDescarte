import { useState, type FormEvent } from 'react';
import { Check, ExternalLink, MapPin, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import type { Suggestion } from '../../types';
import { formatDate, normalize } from '../../utils/domain';
import { Badge, EmptyState, Notice, PageHeading, useFeedback } from '../UI';
import { AdminInput, AdminTextarea, coordinatesError, FormError } from './AdminFields';

const statusLabels = { PENDENTE: 'Pendente', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado' };

function SuggestionReview({
  suggestion,
  onDone,
}: {
  suggestion: Suggestion;
  onDone: (message: string) => void;
}) {
  const { moderateSuggestion, mode } = useApp();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { busy, run, feedback } = useFeedback();
  const address = `${suggestion.address}, ${suggestion.number}, ${suggestion.district}, ${suggestion.city}, ${suggestion.state}, ${suggestion.zipCode}`;
  async function approve(event: FormEvent) {
    event.preventDefault();
    const validation = coordinatesError(lat, lng);
    setError(validation);
    if (validation) return;
    const success = await run(
      () => moderateSuggestion(suggestion.id, true, { lat: Number(lat), lng: Number(lng) }),
      'Sugestão aprovada.',
    );
    if (success)
      onDone(
        'Sugestão aprovada. O ponto já pode aparecer nas consultas públicas e os EcoPontos do autor foram atualizados.',
      );
  }
  async function reject(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (reason.trim().length < 5) {
      setError('Explique o motivo da rejeição com pelo menos cinco caracteres.');
      return;
    }
    if (
      await run(
        () => moderateSuggestion(suggestion.id, false, undefined, reason.trim()),
        'Sugestão rejeitada.',
      )
    )
      onDone('Sugestão rejeitada. O motivo fica disponível para quem a enviou.');
  }
  return (
    <div className="admin-review-box">
      <h3>{rejecting ? 'Informar motivo da rejeição' : 'Conferir e publicar este ponto'}</h3>
      {rejecting ? (
        <form className="admin-form" onSubmit={reject}>
          <AdminTextarea
            label="Motivo da rejeição"
            name={`rejection-${suggestion.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={5}
            maxLength={1000}
            placeholder="Explique quais informações não puderam ser confirmadas."
            autoFocus
          />
          <p className="admin-muted">
            Esse motivo será mostrado à pessoa que enviou a sugestão. A decisão encerra a análise
            desta contribuição.
          </p>
          <FormError message={error} />
          {feedback}
          <div className="admin-actions">
            <button className="button danger" disabled={busy}>
              {busy ? 'Salvando…' : 'Confirmar rejeição'}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
            >
              Voltar à análise
            </button>
          </div>
        </form>
      ) : (
        <form className="admin-form" onSubmit={approve}>
          <p>
            Confira o endereço, os horários e os materiais aceitos. Informe as coordenadas do
            estabelecimento antes de aprovar.
          </p>
          <a
            className="text-link"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          >
            Conferir endereço no Google Maps <ExternalLink size={15} />
          </a>
          <div className="form-grid">
            <AdminInput
              label="Latitude confirmada"
              name={`suggestion-lat-${suggestion.id}`}
              type="number"
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              required
              min={-90}
              max={90}
              step="any"
              placeholder="-23.55052"
            />
            <AdminInput
              label="Longitude confirmada"
              name={`suggestion-lng-${suggestion.id}`}
              type="number"
              value={lng}
              onChange={(event) => setLng(event.target.value)}
              required
              min={-180}
              max={180}
              step="any"
              placeholder="-46.63331"
            />
          </div>
          {mode === 'demo' && (
            <Notice>O ponto aprovado nesta demonstração será identificado como fictício.</Notice>
          )}
          <FormError message={error} />
          {feedback}
          <div className="admin-actions">
            <button className="button primary" disabled={busy}>
              <Check size={17} /> {busy ? 'Publicando…' : 'Aprovar e publicar'}
            </button>
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => {
                setRejecting(true);
                setError(null);
              }}
            >
              <X size={17} /> Rejeitar sugestão
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AdminSuggestions() {
  const { data } = useApp();
  const [status, setStatus] = useState('PENDENTE');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const filtered = data.suggestions
    .filter(
      (suggestion) =>
        (!status || suggestion.status === status) &&
        (!query ||
          normalize(`${suggestion.name} ${suggestion.city} ${suggestion.address}`).includes(
            normalize(query),
          )),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = data.suggestions.filter((suggestion) => suggestion.status === 'PENDENTE').length;
  function done(text: string) {
    setSelected(null);
    setMessage(text);
  }
  return (
    <>
      <PageHeading
        eyebrow="Contribuições da comunidade"
        title="Analisar sugestões"
        description="Cada novo ponto precisa de uma conferência antes de fazer parte da rede."
        action={
          <Badge tone={pending ? 'orange' : 'green'}>
            {pending} {pending === 1 ? 'pendente' : 'pendentes'}
          </Badge>
        }
      />
      {message && <Notice tone="success">{message}</Notice>}
      <div className="panel admin-filters">
        <div className="field">
          <label htmlFor="suggestion-search">Pesquisar sugestão</label>
          <input
            id="suggestion-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Local, cidade ou endereço"
          />
        </div>
        <div className="field">
          <label htmlFor="suggestion-status">Status da análise</label>
          <select
            id="suggestion-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setSelected(null);
            }}
          >
            <option value="PENDENTE">Pendentes</option>
            <option value="APROVADO">Aprovadas</option>
            <option value="REJEITADO">Rejeitadas</option>
            <option value="">Todas</option>
          </select>
        </div>
      </div>
      {filtered.length ? (
        <div className="admin-suggestions">
          {filtered.map((suggestion) => {
            const author = data.users.find((user) => user.id === suggestion.userId);
            const isSelected = selected === suggestion.id;
            return (
              <article className="panel admin-suggestion" key={suggestion.id}>
                <div className="admin-section-heading">
                  <div>
                    <div className="admin-badges">
                      <Badge
                        tone={
                          suggestion.status === 'PENDENTE'
                            ? 'orange'
                            : suggestion.status === 'APROVADO'
                              ? 'green'
                              : 'gray'
                        }
                      >
                        {statusLabels[suggestion.status]}
                      </Badge>
                      <small className="admin-muted">
                        Enviada em {formatDate(suggestion.createdAt)}
                      </small>
                    </div>
                    <h2>{suggestion.name}</h2>
                    <p className="admin-suggestion-address">
                      <MapPin size={17} /> {suggestion.address}, {suggestion.number} ·{' '}
                      {suggestion.city} / {suggestion.state}
                    </p>
                  </div>
                  {suggestion.status === 'PENDENTE' && (
                    <button
                      type="button"
                      className={`button ${isSelected ? 'secondary' : 'primary'}`}
                      onClick={() => {
                        setSelected(isSelected ? null : suggestion.id);
                        setMessage(null);
                      }}
                      aria-expanded={isSelected}
                      aria-controls={`suggestion-detail-${suggestion.id}`}
                    >
                      {isSelected ? 'Fechar análise' : 'Analisar sugestão'}
                    </button>
                  )}
                </div>
                <dl className="admin-detail-grid">
                  <div>
                    <dt>Bairro / CEP</dt>
                    <dd>
                      {suggestion.district} · {suggestion.zipCode}
                    </dd>
                  </div>
                  <div>
                    <dt>Funcionamento</dt>
                    <dd>{suggestion.openingHours}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>{suggestion.phone || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Enviada por</dt>
                    <dd>{author?.name ?? 'Usuário cadastrado'}</dd>
                  </div>
                </dl>
                <div className="admin-badges">
                  {suggestion.acceptedWasteIds.map((id) => (
                    <Badge tone="gray" key={id}>
                      {data.wastes.find((waste) => waste.id === id)?.name ??
                        'Material indisponível'}
                    </Badge>
                  ))}
                </div>
                {suggestion.observation && (
                  <p className="admin-observation">
                    <strong>Observação:</strong> {suggestion.observation}
                  </p>
                )}
                {suggestion.reviewedAt && (
                  <p className="admin-muted">Analisada em {formatDate(suggestion.reviewedAt)}.</p>
                )}
                {suggestion.rejectionReason && (
                  <Notice tone="warning">
                    <strong>Motivo da rejeição:</strong> {suggestion.rejectionReason}
                  </Notice>
                )}
                {suggestion.status === 'APROVADO' && suggestion.pointId && (
                  <Link className="text-link" to={`/pontos/${suggestion.pointId}`}>
                    Ver ponto publicado <ExternalLink size={15} />
                  </Link>
                )}
                {isSelected && suggestion.status === 'PENDENTE' && (
                  <div id={`suggestion-detail-${suggestion.id}`}>
                    <SuggestionReview suggestion={suggestion} onDone={done} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={status === 'PENDENTE' ? 'Tudo em dia por aqui' : 'Nenhuma sugestão encontrada'}
          description={
            status === 'PENDENTE' && !query
              ? 'As próximas contribuições da comunidade aparecerão aqui para análise.'
              : 'Experimente outro termo ou selecione um status diferente.'
          }
        />
      )}
    </>
  );
}
