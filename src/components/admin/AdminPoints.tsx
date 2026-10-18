import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { CollectionPoint } from '../../types';
import { normalize, safeWebsite } from '../../utils/domain';
import { Badge, EmptyState, Notice, PageHeading, useFeedback } from '../UI';
import {
  AdminCheckbox,
  AdminInput,
  AdminTextarea,
  brazilStates,
  ConfirmStatus,
  coordinatesError,
  FormError,
} from './AdminFields';

function emptyPoint(demo: boolean): CollectionPoint {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    address: '',
    number: '',
    district: '',
    city: '',
    state: 'SP',
    zipCode: '',
    lat: 0,
    lng: 0,
    phone: '',
    website: '',
    openingHours: '',
    acceptedWasteIds: [],
    verified: false,
    active: true,
    rating: 0,
    totalReviews: 0,
    demo,
    createdAt: now,
    updatedAt: now,
  };
}

function PointEditor({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: CollectionPoint;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, savePoint, mode } = useApp();
  const [point, setPoint] = useState(initial);
  const [lat, setLat] = useState(isNew ? '' : String(initial.lat));
  const [lng, setLng] = useState(isNew ? '' : String(initial.lng));
  const [error, setError] = useState<string | null>(null);
  const { busy, run, feedback } = useFeedback();
  function set<K extends keyof CollectionPoint>(key: K, value: CollectionPoint[K]) {
    setPoint((previous) => ({ ...previous, [key]: value }));
  }
  function toggleMaterial(id: string, checked: boolean) {
    setPoint((previous) => ({
      ...previous,
      acceptedWasteIds: checked
        ? [...previous.acceptedWasteIds, id]
        : previous.acceptedWasteIds.filter((value) => value !== id),
    }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (
      [
        point.name,
        point.description,
        point.address,
        point.number,
        point.district,
        point.city,
        point.openingHours,
      ].some((value) => !value.trim())
    ) {
      setError(
        'Preencha o nome, a descrição, o endereço completo e os horários. Para locais sem número, use S/N.',
      );
      return;
    }
    if (!/^\d{5}-?\d{3}$/.test(point.zipCode.trim())) {
      setError('Informe um CEP válido com oito números, como 01001-000.');
      return;
    }
    const coordinateError = coordinatesError(lat, lng);
    if (coordinateError) {
      setError(coordinateError);
      return;
    }
    if (!point.acceptedWasteIds.length) {
      setError('Selecione pelo menos um material recebido neste ponto.');
      return;
    }
    if (point.website && !safeWebsite(point.website)) {
      setError('Informe um site válido, começando com https:// ou http://.');
      return;
    }
    if (point.phone.trim() && !/^[\d\s()+.\-]{8,25}$/.test(point.phone.trim())) {
      setError(
        'Confira o telefone. Informe o DDD e o número, usando apenas números, espaços e sinais de telefone.',
      );
      return;
    }
    const record: CollectionPoint = {
      ...point,
      name: point.name.trim(),
      description: point.description.trim(),
      address: point.address.trim(),
      number: point.number.trim(),
      district: point.district.trim(),
      city: point.city.trim(),
      zipCode: point.zipCode.trim(),
      phone: point.phone.trim(),
      website: point.website.trim(),
      openingHours: point.openingHours.trim(),
      lat: Number(lat),
      lng: Number(lng),
      acceptedWasteIds: [...new Set(point.acceptedWasteIds)],
      demo: mode === 'demo' || point.demo,
      updatedAt: new Date().toISOString(),
    };
    if (await run(() => savePoint(record), 'Ponto salvo com sucesso.')) onSaved();
  }
  const materials = data.wastes
    .filter((waste) => waste.active || point.acceptedWasteIds.includes(waste.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <section className="panel admin-editor" aria-labelledby="point-editor-title">
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">Rede de coleta</span>
          <h2 id="point-editor-title">
            {isNew ? 'Cadastrar ponto de coleta' : `Editar ${initial.name}`}
          </h2>
        </div>
        <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
          <X size={18} /> Fechar
        </button>
      </div>
      <p className="admin-muted">
        Os campos com * são obrigatórios. Confirme com o estabelecimento os materiais recebidos e os
        horários.
      </p>
      <form onSubmit={submit} className="admin-form">
        <div className="form-grid">
          <AdminInput
            label="Nome do local"
            name="point-name"
            value={point.name}
            onChange={(event) => set('name', event.target.value)}
            required
            minLength={2}
            maxLength={160}
            autoFocus
          />
          <AdminInput
            label="Horário de funcionamento"
            name="point-hours"
            value={point.openingHours}
            onChange={(event) => set('openingHours', event.target.value)}
            placeholder="Segunda a sexta, das 8h às 17h"
            required
            maxLength={300}
          />
          <AdminTextarea
            label="Descrição do ponto"
            name="point-description"
            value={point.description}
            onChange={(event) => set('description', event.target.value)}
            required
            maxLength={2000}
          />
          <AdminInput
            label="Logradouro"
            name="point-address"
            value={point.address}
            onChange={(event) => set('address', event.target.value)}
            required
            maxLength={200}
            autoComplete="address-line1"
          />
          <AdminInput
            label="Número"
            name="point-number"
            value={point.number}
            onChange={(event) => set('number', event.target.value)}
            required
            maxLength={30}
            placeholder="123 ou S/N"
          />
          <AdminInput
            label="Bairro"
            name="point-district"
            value={point.district}
            onChange={(event) => set('district', event.target.value)}
            required
            maxLength={100}
          />
          <AdminInput
            label="Cidade"
            name="point-city"
            value={point.city}
            onChange={(event) => set('city', event.target.value)}
            required
            maxLength={100}
            autoComplete="address-level2"
          />
          <div className="field">
            <label htmlFor="point-state">Estado *</label>
            <select
              id="point-state"
              value={point.state}
              onChange={(event) => set('state', event.target.value)}
              required
              autoComplete="address-level1"
            >
              {brazilStates.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </div>
          <AdminInput
            label="CEP"
            name="point-zip"
            value={point.zipCode}
            onChange={(event) => set('zipCode', event.target.value)}
            required
            pattern="[0-9]{5}-?[0-9]{3}"
            maxLength={9}
            placeholder="01001-000"
            autoComplete="postal-code"
            inputMode="numeric"
          />
          <AdminInput
            label="Latitude"
            name="point-lat"
            type="number"
            min={-90}
            max={90}
            step="any"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            required
            placeholder="-23.55052"
            hint="Coordenadas do ponto, em graus decimais."
          />
          <AdminInput
            label="Longitude"
            name="point-lng"
            type="number"
            min={-180}
            max={180}
            step="any"
            value={lng}
            onChange={(event) => setLng(event.target.value)}
            required
            placeholder="-46.63331"
            hint="Copie as coordenadas verificadas no Google Maps."
          />
          <AdminInput
            label="Telefone"
            name="point-phone"
            type="tel"
            value={point.phone}
            onChange={(event) => set('phone', event.target.value)}
            maxLength={25}
            placeholder="(11) 3333-0000"
            autoComplete="tel"
          />
          <AdminInput
            label="Site"
            name="point-website"
            type="url"
            value={point.website}
            onChange={(event) => set('website', event.target.value)}
            maxLength={1000}
            placeholder="https://…"
          />
          <fieldset className="admin-span admin-material-fieldset">
            <legend>Materiais aceitos *</legend>
            <p className="admin-muted">Selecione somente os materiais confirmados pelo local.</p>
            <div className="admin-material-options">
              {materials.map((waste) => (
                <AdminCheckbox
                  key={waste.id}
                  checked={point.acceptedWasteIds.includes(waste.id)}
                  onChange={(event) => toggleMaterial(waste.id, event.target.checked)}
                >
                  {waste.name}
                  {!waste.active && ' (inativo)'}
                </AdminCheckbox>
              ))}
            </div>
            {!materials.length && <p>Cadastre um resíduo antes de adicionar um ponto de coleta.</p>}
          </fieldset>
          <fieldset className="admin-span admin-choice-group">
            <legend>Qualidade das informações</legend>
            <AdminCheckbox
              checked={point.verified}
              onChange={(event) => set('verified', event.target.checked)}
            >
              Informações verificadas pela administração
            </AdminCheckbox>
            <AdminCheckbox
              checked={mode === 'demo' || point.demo}
              disabled={mode === 'demo'}
              onChange={(event) => set('demo', event.target.checked)}
            >
              Ponto fictício / dado de demonstração
            </AdminCheckbox>
          </fieldset>
        </div>
        <p className="admin-muted">
          Status:{' '}
          <Badge tone={point.active ? 'green' : 'gray'}>{point.active ? 'Ativo' : 'Inativo'}</Badge>
          . As avaliações são calculadas a partir das contribuições dos usuários
          {point.totalReviews > 0
            ? ` (${point.rating.toFixed(1)} de 5 · ${point.totalReviews} avaliações)`
            : '.'}
        </p>
        {mode === 'demo' && (
          <Notice>Os pontos criados na demonstração ficam identificados como fictícios.</Notice>
        )}
        <FormError message={error} />
        {feedback}
        <div className="admin-actions">
          <button className="button primary" disabled={busy || !materials.length}>
            {busy ? 'Salvando…' : 'Salvar ponto'}
          </button>
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AdminPoints() {
  const { data, savePoint, mode } = useApp();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('todos');
  const [editor, setEditor] = useState<{ point: CollectionPoint; isNew: boolean } | null>(null);
  const [confirm, setConfirm] = useState<CollectionPoint | null>(null);
  const [saved, setSaved] = useState(false);
  const { busy, run, feedback } = useFeedback();
  const cities = [...new Set(data.points.map((point) => `${point.city} / ${point.state}`))].sort(
    (a, b) => a.localeCompare(b, 'pt-BR'),
  );
  const filtered = data.points
    .filter(
      (point) =>
        (!query ||
          normalize(`${point.name} ${point.address} ${point.district}`).includes(
            normalize(query),
          )) &&
        (!city || `${point.city} / ${point.state}` === city) &&
        (status === 'todos' || point.active === (status === 'ativos')),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  function open(point: CollectionPoint, isNew: boolean) {
    setEditor({ point, isNew });
    setConfirm(null);
    setSaved(false);
  }
  async function changeStatus() {
    if (!confirm) return;
    if (
      await run(
        () =>
          savePoint({ ...confirm, active: !confirm.active, updatedAt: new Date().toISOString() }),
        confirm.active ? 'Ponto desativado. O histórico foi preservado.' : 'Ponto reativado.',
      )
    )
      setConfirm(null);
  }
  return (
    <>
      <PageHeading
        eyebrow="Administração"
        title="Gerenciar pontos de coleta"
        description="Cuide da rede que conecta as pessoas ao descarte responsável."
        action={
          <button
            className="button primary"
            onClick={() => open(emptyPoint(mode === 'demo'), true)}
          >
            <Plus size={18} /> Novo ponto
          </button>
        }
      />
      {editor && (
        <PointEditor
          key={editor.point.id}
          initial={editor.point}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setSaved(true);
          }}
        />
      )}
      {saved && <Notice tone="success">Ponto de coleta salvo com sucesso.</Notice>}
      {feedback}
      {confirm && (
        <ConfirmStatus
          name={confirm.name}
          active={confirm.active}
          busy={busy}
          onConfirm={changeStatus}
          onCancel={() => setConfirm(null)}
        />
      )}
      <section className="panel">
        <div className="admin-filters">
          <div className="field admin-search">
            <label htmlFor="point-filter">Pesquisar ponto</label>
            <div>
              <Search size={18} aria-hidden="true" />
              <input
                id="point-filter"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, endereço ou bairro"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="city-filter">Cidade</label>
            <select id="city-filter" value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">Todas as cidades</option>
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="point-status">Status</label>
            <select
              id="point-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
            </select>
          </div>
        </div>
        <p className="admin-muted">
          {filtered.length} {filtered.length === 1 ? 'ponto encontrado' : 'pontos encontrados'}
        </p>
        {filtered.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ponto de coleta</th>
                  <th>Localização</th>
                  <th>Materiais</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((point) => (
                  <tr key={point.id}>
                    <td>
                      <strong>{point.name}</strong>
                      <small>
                        {point.demo
                          ? 'Demonstração · local fictício'
                          : point.verified
                            ? 'Informações verificadas'
                            : 'Informações não verificadas'}
                      </small>
                    </td>
                    <td>
                      {point.city} / {point.state}
                      <small>
                        {point.address}, {point.number}
                      </small>
                    </td>
                    <td>{point.acceptedWasteIds.length} tipos</td>
                    <td>
                      <Badge tone={point.active ? 'green' : 'gray'}>
                        {point.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="button secondary small"
                          aria-label={`Editar ${point.name}`}
                          onClick={() => open(point, false)}
                        >
                          <Pencil size={15} /> Editar
                        </button>
                        <button
                          className={`button ${point.active ? 'danger' : 'secondary'} small`}
                          onClick={() => {
                            setConfirm(point);
                            setEditor(null);
                          }}
                          aria-label={`${point.active ? 'Desativar' : 'Reativar'} ${point.name}`}
                          disabled={busy}
                        >
                          {point.active ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum ponto encontrado"
            description="Ajuste os filtros ou cadastre um novo ponto de coleta."
          />
        )}
      </section>
    </>
  );
}
