import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Leaf,
  MapPin,
  Plus,
  Recycle,
  Sprout,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  AuthRequired,
  Badge,
  EmptyState,
  Notice,
  PageHeading,
  StatCard,
  useFeedback,
} from '../components/UI';
import { formatDate, levels, localDate, userStats } from '../utils/domain';
import type { Suggestion, SuggestionInput } from '../types';
import {
  sanitizeSuggestionField,
  suggestionHours,
  validateSuggestion,
} from '../services/validation';

function SuggestionList({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions.length)
    return (
      <EmptyState
        title="Você conhece um bom ponto de coleta?"
        description="Envie uma sugestão. Após a análise, ela poderá ajudar outras pessoas."
        action={
          <Link to="/sugerir-ponto" className="button secondary">
            Sugerir ponto
          </Link>
        }
      />
    );
  return (
    <div className="suggestion-list">
      {[...suggestions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((item) => (
          <div className="history-item" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <p>
                {item.city} / {item.state} · Enviada em {formatDate(item.createdAt)}
              </p>
              {item.status === 'REJEITADO' && item.rejectionReason && (
                <p>Motivo: {item.rejectionReason}</p>
              )}
              {item.status === 'APROVADO' && item.pointId && (
                <Link className="text-link" to={`/pontos/${item.pointId}`}>
                  Conhecer o ponto aprovado <ArrowRight size={15} />
                </Link>
              )}
            </div>
            <Badge
              tone={
                item.status === 'APROVADO' ? 'green' : item.status === 'REJEITADO' ? 'red' : 'amber'
              }
            >
              {item.status === 'APROVADO'
                ? 'Aprovada'
                : item.status === 'REJEITADO'
                  ? 'Não aprovada'
                  : 'Em análise'}
            </Badge>
          </div>
        ))}
    </div>
  );
}

export function ProfilePage() {
  const { user, data, updateProfile, mode } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const { busy, run, feedback } = useFeedback();
  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);
  if (!user) return <AuthRequired />;
  const stats = userStats(data, user.id);
  const recent = data.disposals
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  async function save(event: FormEvent) {
    event.preventDefault();
    const saved = await run(async () => {
      if (name.trim().length < 2) throw new Error('Informe um nome com pelo menos 2 caracteres.');
      await updateProfile(name.trim());
    }, 'Seu nome foi atualizado.');
    if (saved) setEditing(false);
  }
  return (
    <>
      <PageHeading
        eyebrow="CADA ATITUDE CONTA"
        title={`Olá, ${user.name.split(' ')[0]}.`}
        description="Acompanhe suas contribuições e continue construindo novos hábitos."
        action={
          <Link className="button primary" to="/registrar-descarte">
            <Plus size={18} /> Registrar descarte
          </Link>
        }
      />
      {mode === 'demo' && (
        <Notice>
          Seu histórico pertence a esta demonstração e fica armazenado neste navegador.
        </Notice>
      )}
      <div className="stat-grid">
        <StatCard
          label="EcoPontos conquistados"
          value={stats.ecoPoints}
          icon={<Leaf size={20} />}
        />
        <StatCard
          label="Descartes registrados"
          value={stats.disposals}
          icon={<Recycle size={20} />}
        />
        <StatCard label="Tipos de materiais" value={stats.materials} icon={<Sprout size={20} />} />
        <StatCard label="Pontos sugeridos" value={stats.suggestions} icon={<MapPin size={20} />} />
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="section-heading">
            <h2>Sua jornada sustentável</h2>
            <Award size={25} />
          </div>
          <Badge>{stats.level}</Badge>
          <p>
            {stats.nextLevel
              ? `Faltam ${stats.nextLevel.min - stats.ecoPoints} EcoPontos para ${stats.nextLevel.name}.`
              : 'Você alcançou o nível Embaixador Eco. Continue compartilhando bons hábitos!'}
          </p>
          <Link className="text-link" to="/ecopontos">
            Entenda seus EcoPontos <ArrowRight size={16} />
          </Link>
          <p className="muted">
            Os indicadores mostram ações registradas por você. Eles não medem peso reciclado nem
            impacto ambiental comprovado.
          </p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Seu perfil</h2>
            {!editing && (
              <button className="button secondary" type="button" onClick={() => setEditing(true)}>
                Editar nome
              </button>
            )}
          </div>
          {feedback}
          {user.photoURL && (
            <img
              className="profile-photo"
              width="64"
              height="64"
              src={user.photoURL}
              alt={`Foto de ${user.name}`}
            />
          )}
          {editing ? (
            <form className="form-grid" onSubmit={save}>
              <label className="field">
                Nome
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="button-row">
                <button className="button primary" disabled={busy}>
                  {busy ? 'Salvando…' : 'Salvar nome'}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false);
                    setName(user.name);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <p>
              <strong>{user.name}</strong>
              <br />
              {user.email}
            </p>
          )}
          <p className="muted">
            <CalendarDays size={15} /> Por aqui desde {formatDate(user.createdAt)}
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Seus últimos passos</h2>
          <Link className="text-link" to="/historico">
            Ver histórico <ArrowRight size={16} />
          </Link>
        </div>
        {recent.length ? (
          <div className="suggestion-list">
            {recent.map((item) => (
              <div className="history-item" key={item.id}>
                <div>
                  <strong>
                    {data.wastes.find((w) => w.id === item.wasteId)?.name || 'Resíduo indisponível'}
                  </strong>
                  <p>
                    {data.points.find((point) => point.id === item.collectionPointId)?.name ||
                      'Ponto indisponível'}{' '}
                    · {formatDate(item.date)} · {item.quantity} unidade(s)
                  </p>
                </div>
                <Badge>+10 EcoPontos</Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sua jornada começa com um passo."
            description="Depois de realizar um descarte, registre a ação para acompanhar seu histórico."
            action={
              <Link className="button secondary" to="/descartar">
                Encontrar orientações
              </Link>
            }
          />
        )}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Suas sugestões de pontos</h2>
          <Link className="text-link" to="/sugerir-ponto">
            Nova sugestão <Plus size={16} />
          </Link>
        </div>
        <SuggestionList suggestions={data.suggestions.filter((item) => item.userId === user.id)} />
      </section>
    </>
  );
}

export function HistoryPage() {
  const { user, data } = useApp();
  if (!user) return <AuthRequired />;
  const disposals = data.disposals
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeading
        eyebrow="MEU IMPACTO"
        title="Cada passo fica na história."
        description="Consulte os descartes que você registrou e acompanhe suas sugestões."
        action={
          <Link className="button primary" to="/registrar-descarte">
            <Plus size={18} /> Registrar descarte
          </Link>
        }
      />
      <section className="panel">
        <h2>Histórico de descartes</h2>
        {disposals.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Data do descarte</th>
                  <th scope="col">Material</th>
                  <th scope="col">Ponto de coleta</th>
                  <th scope="col">Quantidade</th>
                  <th scope="col">EcoPontos</th>
                </tr>
              </thead>
              <tbody>
                {disposals.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>
                      {data.wastes.find((w) => w.id === item.wasteId)?.name ||
                        'Material indisponível'}
                    </td>
                    <td>
                      {data.points.find((point) => point.id === item.collectionPointId)?.name ||
                        'Ponto indisponível'}
                    </td>
                    <td>{item.quantity} un.</td>
                    <td>
                      <Badge>+10</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum descarte registrado ainda."
            description="Encontre um ponto adequado e registre seu descarte depois de realizá-lo."
            action={
              <Link className="button secondary" to="/descartar">
                Pesquisar material
              </Link>
            }
          />
        )}
        <p className="muted">
          As quantidades são informadas em unidades. Cada registro rende 10 EcoPontos,
          independentemente da quantidade.
        </p>
      </section>
      <section className="panel">
        <h2>Suas sugestões</h2>
        <SuggestionList suggestions={data.suggestions.filter((item) => item.userId === user.id)} />
      </section>
    </>
  );
}

const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];
const blankSuggestion: SuggestionInput = {
  name: '',
  address: '',
  number: '',
  district: '',
  city: '',
  state: '',
  zipCode: '',
  acceptedWasteIds: [],
  openingHours: '',
  phone: '',
  observation: '',
};

export function SuggestPage() {
  const { user, data, suggestPoint } = useApp();
  const [form, setForm] = useState<SuggestionInput>({ ...blankSuggestion });
  const { busy, run, feedback } = useFeedback();
  if (!user) return <AuthRequired />;
  const wastes = data.wastes
    .filter((item) => item.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const [opensAt = '', closesAt = ''] = form.openingHours.split(' - ');
  function field(key: keyof Omit<SuggestionInput, 'acceptedWasteIds'>, value: string) {
    setForm((current) => ({ ...current, [key]: sanitizeSuggestionField(key, value) }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const saved = await run(async () => {
      if (!form.acceptedWasteIds.length)
        throw new Error('Selecione ao menos um material recebido pelo local.');
      const cleaned = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value,
        ]),
      ) as unknown as SuggestionInput;
      validateSuggestion(cleaned);
      await suggestPoint(cleaned);
    }, 'Ponto de coleta sugerido com sucesso! Ele será analisado antes de aparecer publicamente. Acompanhe o status no seu perfil.');
    if (saved) setForm({ ...blankSuggestion });
  }
  return (
    <>
      <PageHeading
        eyebrow="CONSTRUA ESSA REDE COM A GENTE"
        title="Conhece um ponto de coleta?"
        description="Sua indicação pode aproximar outras pessoas do descarte correto."
      />
      <div className="grid-2 suggest-layout">
        <section className="panel">
          {feedback}
          <form className="form-grid" onSubmit={submit}>
            <label className="field">
              Nome do local *
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
                placeholder="Nome do estabelecimento ou ecoponto"
              />
            </label>
            <div className="grid-2">
              <label className="field">
                Endereço *
                <input
                  autoComplete="address-line1"
                  required
                  maxLength={160}
                  value={form.address}
                  onChange={(e) => field('address', e.target.value)}
                  placeholder="Rua ou avenida"
                />
              </label>
              <label className="field">
                Número *
                <input
                  required
                  inputMode="numeric"
                  value={form.number}
                  onChange={(e) => field('number', e.target.value)}
                  placeholder="Até 6 números"
                />
              </label>
            </div>
            <div className="grid-2">
              <label className="field">
                Bairro *
                <input
                  required
                  maxLength={80}
                  value={form.district}
                  onChange={(e) => field('district', e.target.value)}
                />
              </label>
              <label className="field">
                CEP *
                <input
                  autoComplete="postal-code"
                  inputMode="numeric"
                  required
                  value={form.zipCode}
                  onChange={(e) => field('zipCode', e.target.value)}
                  placeholder="00000000"
                />
              </label>
            </div>
            <div className="grid-2">
              <label className="field">
                Cidade *
                <input
                  autoComplete="address-level2"
                  required
                  maxLength={80}
                  value={form.city}
                  onChange={(e) => field('city', e.target.value)}
                />
              </label>
              <label className="field">
                Estado *
                <select
                  autoComplete="address-level1"
                  required
                  value={form.state}
                  onChange={(e) => field('state', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="material-options">
              <legend>Materiais recebidos *</legend>
              <p className="muted">
                Selecione somente os materiais que você sabe que o local recebe.
              </p>
              <div className="checkbox-grid">
                {wastes.map((waste) => (
                  <label className="checkbox-label" key={waste.id}>
                    <input
                      type="checkbox"
                      checked={form.acceptedWasteIds.includes(waste.id)}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          acceptedWasteIds: e.target.checked
                            ? [...current.acceptedWasteIds, waste.id]
                            : current.acceptedWasteIds.filter((id) => id !== waste.id),
                        }))
                      }
                    />
                    {waste.name}
                  </label>
                ))}
              </div>
              {!wastes.length && (
                <p>Nenhum material disponível para seleção. Tente novamente mais tarde.</p>
              )}
            </fieldset>
            <div className="field" role="group" aria-labelledby="suggestion-hours-label">
              <span id="suggestion-hours-label">Horário de funcionamento *</span>
              <div className="grid-2">
                <label className="field">
                  Abre às
                  <select
                    required
                    value={opensAt}
                    onInvalid={(e) =>
                      e.currentTarget.setCustomValidity(
                        'Selecione um horário de funcionamento válido.',
                      )
                    }
                    onChange={(e) => {
                      e.currentTarget.setCustomValidity('');
                      field('openingHours', `${e.target.value} - ${closesAt}`);
                    }}
                  >
                    <option value="">Selecione</option>
                    {suggestionHours.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Fecha às
                  <select
                    required
                    value={closesAt}
                    onInvalid={(e) =>
                      e.currentTarget.setCustomValidity(
                        'Selecione um horário de funcionamento válido.',
                      )
                    }
                    onChange={(e) => {
                      e.currentTarget.setCustomValidity('');
                      field('openingHours', `${opensAt} - ${e.target.value}`);
                    }}
                  >
                    <option value="">Selecione</option>
                    {suggestionHours.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <label className="field">
              Telefone do local (opcional)
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => field('phone', e.target.value)}
                placeholder="11999999999"
              />
            </label>
            <label className="field">
              Observações (opcional)
              <textarea
                rows={4}
                maxLength={1000}
                value={form.observation}
                onChange={(e) => field('observation', e.target.value)}
                placeholder="Compartilhe orientações de acesso, restrições de recebimento ou a fonte da informação."
              />
            </label>
            <p className="muted">* Campos obrigatórios. Evite dados pessoais nas observações.</p>
            <button className="button primary" disabled={busy || !wastes.length}>
              {busy ? 'Enviando sugestão…' : 'Enviar para análise'}
            </button>
          </form>
        </section>
        <aside className="panel suggestion-help">
          <MapPin size={36} />
          <h2>Uma boa indicação vai longe.</h2>
          <p>
            Informe o endereço completo e os materiais aceitos. Esses detalhes ajudam a equipe a
            avaliar a sugestão.
          </p>
          <ol>
            <li>Você envia as informações.</li>
            <li>A equipe analisa e confirma a localização.</li>
            <li>Se aprovada, a sugestão se torna um ponto público.</li>
          </ol>
          <Notice>
            Você recebe <strong>30 EcoPontos</strong> quando sua sugestão é aprovada. O envio, por
            si só, não soma pontos.
          </Notice>
          <Link className="text-link" to="/historico">
            Acompanhar minhas sugestões <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}

export function DisposalPage() {
  const { user, data, recordDisposal } = useApp();
  const [params] = useSearchParams();
  const [wasteId, setWasteId] = useState(params.get('waste') || '');
  const [pointId, setPointId] = useState(params.get('point') || '');
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState(localDate());
  const { busy, run, feedback } = useFeedback();
  if (!user) return <AuthRequired />;
  const wastes = data.wastes.filter((item) => item.active);
  const points = data.points.filter(
    (item) => item.active && (!wasteId || item.acceptedWasteIds.includes(wasteId)),
  );
  const point = points.find((item) => item.id === pointId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const saved = await run(async () => {
      if (!wastes.some((item) => item.id === wasteId))
        throw new Error('Selecione um material disponível.');
      if (!point || !point.acceptedWasteIds.includes(wasteId))
        throw new Error('Selecione um ponto que receba o material escolhido.');
      const amount = Number(quantity);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000)
        throw new Error('Informe uma quantidade inteira entre 1 e 100.000 unidades.');
      if (!date || date > localDate() || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error('Informe a data do descarte, que não pode estar no futuro.');
      await recordDisposal({ wasteId, collectionPointId: pointId, quantity: amount, date });
    }, 'Descarte registrado com sucesso! Você conquistou 10 EcoPontos. Confira seu histórico e continue contribuindo.');
    if (saved) {
      setWasteId('');
      setPointId('');
      setQuantity('1');
      setDate(localDate());
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="UM NOVO PASSO NA SUA JORNADA"
        title="Registrar um descarte."
        description="Já levou seu material a um ponto de coleta? Conte para a gente."
      />
      <div className="grid-2">
        <section className="panel">
          {feedback}
          <form className="form-grid" onSubmit={submit}>
            <label className="field">
              Qual material você descartou?
              <select
                required
                value={wastes.some((item) => item.id === wasteId) ? wasteId : ''}
                onChange={(e) => {
                  setWasteId(e.target.value);
                  if (
                    !data.points
                      .find((item) => item.id === pointId)
                      ?.acceptedWasteIds.includes(e.target.value)
                  )
                    setPointId('');
                }}
              >
                <option value="">Selecione um material</option>
                {wastes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Ponto de coleta
              <select
                required
                disabled={!wasteId}
                value={point ? pointId : ''}
                onChange={(e) => setPointId(e.target.value)}
              >
                <option value="">
                  {wasteId ? 'Selecione um ponto compatível' : 'Selecione o material primeiro'}
                </option>
                {points.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.city}
                    {item.demo ? ' (demonstração)' : ''}
                  </option>
                ))}
              </select>
              <small>Somente pontos ativos que recebem esse material são exibidos.</small>
            </label>
            {wasteId && !points.length && (
              <Notice tone="warning">
                Ainda não há ponto cadastrado para esse material.{' '}
                <Link to="/sugerir-ponto" className="text-link">
                  Sugerir um local
                </Link>
              </Notice>
            )}
            {point?.demo && (
              <Notice tone="warning">
                Este ponto é fictício e serve apenas à demonstração acadêmica. Não se desloque até
                ele.
              </Notice>
            )}
            <div className="grid-2">
              <label className="field">
                Quantidade (unidades)
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <label className="field">
                Data do descarte
                <input
                  type="date"
                  required
                  max={localDate()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
            <p className="muted">
              Registre apenas ações realizadas. Para líquidos, conte recipientes; a quantidade não
              representa quilogramas ou litros.
            </p>
            <button className="button primary" disabled={busy || !points.length}>
              {busy ? 'Registrando…' : 'Confirmar descarte'}
            </button>
          </form>
        </section>
        <aside className="panel">
          <div className="feature-icon">
            <Recycle size={32} />
          </div>
          <h2>Uma ação. Um registro.</h2>
          <p>
            Cada descarte registrado vale <strong>10 EcoPontos</strong>, independentemente da
            quantidade de unidades.
          </p>
          <p>
            Esse histórico é autorrelatado. Ele ajuda a acompanhar seus hábitos, sem substituir
            comprovantes de coleta ou medir impacto ambiental.
          </p>
          <Link to="/historico" className="text-link">
            Consultar meu histórico <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}

export function EcoPointsPage() {
  const { user, data } = useApp();
  if (!user) return <AuthRequired />;
  const stats = userStats(data, user.id);
  const level = levels.filter((item) => item.min <= stats.ecoPoints).at(-1)!;
  const progress = stats.nextLevel
    ? Math.min(
        100,
        Math.round(((stats.ecoPoints - level.min) / (stats.nextLevel.min - level.min)) * 100),
      )
    : 100;
  const approved = data.suggestions.filter(
    (item) => item.userId === user.id && item.status === 'APROVADO',
  ).length;
  const confirmed = data.reviews.filter((item) => item.userId === user.id && item.confirmed).length;
  return (
    <>
      <PageHeading
        eyebrow="ECOPONTOS"
        title="Pequenas ações, uma grande jornada."
        description="Acompanhe suas contribuições e descubra seu próximo nível."
      />
      <section className="panel eco-summary">
        <Award size={42} />
        <span className="eyebrow">SEU NÍVEL ATUAL</span>
        <h2>{stats.level}</h2>
        <div className="eco-score">
          {stats.ecoPoints} <span>EcoPontos</span>
        </div>
        <progress
          max={100}
          value={progress}
          aria-label={
            stats.nextLevel
              ? `Progresso para ${stats.nextLevel.name}: ${progress}%`
              : 'Nível máximo alcançado'
          }
        />
        <p>
          {stats.nextLevel
            ? `Mais ${stats.nextLevel.min - stats.ecoPoints} EcoPontos para alcançar ${stats.nextLevel.name}.`
            : 'Você chegou ao nível mais alto. Suas próximas ações continuam contando.'}
        </p>
        <Link to="/registrar-descarte" className="button primary">
          Registrar meu próximo descarte <ArrowRight size={17} />
        </Link>
      </section>
      <div className="section-heading">
        <h2>Como você conquista pontos</h2>
      </div>
      <div className="grid-3">
        <section className="panel">
          <Recycle size={25} />
          <h3>Descarte registrado</h3>
          <Badge>+10 EcoPontos</Badge>
          <p>Por registro de descarte válido, sem multiplicar pela quantidade.</p>
          <strong>
            {stats.disposals} registro(s) = {stats.disposals * 10} pontos
          </strong>
        </section>
        <section className="panel">
          <MapPin size={25} />
          <h3>Sugestão aprovada</h3>
          <Badge>+30 EcoPontos</Badge>
          <p>Uma vez por sugestão aprovada pela administração.</p>
          <strong>
            {approved} aprovação(ões) = {approved * 30} pontos
          </strong>
        </section>
        <section className="panel">
          <CheckCircle2 size={25} />
          <h3>Informação confirmada</h3>
          <Badge>+5 EcoPontos</Badge>
          <p>Por confirmação registrada de um ponto. Uma avaliação por pessoa e por ponto.</p>
          <strong>
            {confirmed} confirmação(ões) = {confirmed * 5} pontos
          </strong>
        </section>
      </div>
      <section className="panel">
        <h2>Conheça os níveis</h2>
        <div className="levels-list">
          {levels.map((item, index) => (
            <div
              className={`history-item ${item.name === stats.level ? 'current-level' : ''}`}
              key={item.min}
            >
              <div>
                <strong>{item.name}</strong>
                <p>
                  {levels[index + 1]
                    ? `${item.min}–${levels[index + 1].min - 1} EcoPontos`
                    : '500 EcoPontos ou mais'}
                </p>
              </div>
              {item.name === stats.level && <Badge>Você está aqui</Badge>}
            </div>
          ))}
        </div>
        <Notice>
          Seu saldo é calculado a partir do histórico: descartes × 10 + sugestões aprovadas × 30 +
          confirmações × 5. Sugestões pendentes ou rejeitadas não geram pontos. EcoPontos não são
          créditos financeiros nem uma medição de benefício ambiental.
        </Notice>
      </section>
    </>
  );
}
