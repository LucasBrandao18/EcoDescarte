import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { categories, type Waste } from '../../types';
import { normalize, safeWebsite } from '../../utils/domain';
import { Badge, EmptyState, Notice, PageHeading, useFeedback } from '../UI';
import { AdminCheckbox, AdminInput, AdminTextarea, ConfirmStatus, FormError } from './AdminFields';

function emptyWaste(): Waste {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    normalizedName: '',
    synonyms: [],
    category: 'Outros',
    description: '',
    recyclable: true,
    dangerous: false,
    commonTrash: false,
    disposalInstructions: '',
    preparation: '',
    environmentalImpact: '',
    icon: '♻️',
    image: '',
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function WasteEditor({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: Waste;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { saveWaste } = useApp();
  const [waste, setWaste] = useState(initial);
  const [synonyms, setSynonyms] = useState(initial.synonyms.join(', '));
  const [error, setError] = useState<string | null>(null);
  const { busy, run, feedback } = useFeedback();
  function set<K extends keyof Waste>(key: K, value: Waste[K]) {
    setWaste((previous) => ({ ...previous, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (
      [
        waste.name,
        waste.description,
        waste.disposalInstructions,
        waste.preparation,
        waste.environmentalImpact,
      ].some((value) => !value.trim())
    ) {
      setError('Preencha o nome e todas as orientações obrigatórias.');
      return;
    }
    if (waste.dangerous && waste.commonTrash) {
      setError(
        'Um resíduo perigoso não pode ser indicado para o lixo comum. Revise as opções de descarte.',
      );
      return;
    }
    if (waste.image && !safeWebsite(waste.image)) {
      setError('Informe um endereço de imagem válido, começando com https:// ou http://.');
      return;
    }
    const record: Waste = {
      ...waste,
      name: waste.name.trim(),
      normalizedName: normalize(waste.name),
      synonyms: [
        ...new Set(
          synonyms
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ],
      description: waste.description.trim(),
      disposalInstructions: waste.disposalInstructions.trim(),
      preparation: waste.preparation.trim(),
      environmentalImpact: waste.environmentalImpact.trim(),
      image: waste.image.trim(),
      icon: waste.icon.trim() || '♻️',
      updatedAt: new Date().toISOString(),
    };
    if (await run(() => saveWaste(record), 'Resíduo salvo com sucesso.')) onSaved();
  }
  return (
    <section className="panel admin-editor" aria-labelledby="waste-editor-title">
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">Catálogo de materiais</span>
          <h2 id="waste-editor-title">{isNew ? 'Cadastrar resíduo' : `Editar ${initial.name}`}</h2>
        </div>
        <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
          <X size={18} /> Fechar
        </button>
      </div>
      <p className="admin-muted">
        Os campos com * são obrigatórios. Escreva orientações claras para quem está descartando pela
        primeira vez.
      </p>
      <form onSubmit={submit} className="admin-form">
        <div className="form-grid">
          <AdminInput
            label="Nome do resíduo"
            name="waste-name"
            value={waste.name}
            onChange={(event) => set('name', event.target.value)}
            required
            minLength={2}
            maxLength={120}
            autoFocus
          />
          <div className="field">
            <label htmlFor="waste-category">Categoria *</label>
            <select
              id="waste-category"
              value={waste.category}
              onChange={(event) => set('category', event.target.value as Waste['category'])}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <AdminInput
            label="Sinônimos"
            name="waste-synonyms"
            value={synonyms}
            onChange={(event) => setSynonyms(event.target.value)}
            placeholder="pilha, pilhas, bateria"
            hint="Separe os nomes alternativos por vírgulas."
            maxLength={1000}
          />
          <AdminInput
            label="Nome normalizado"
            name="waste-normalized"
            value={normalize(waste.name)}
            readOnly
            hint="Gerado automaticamente para facilitar a pesquisa."
          />
          <AdminTextarea
            label="Descrição"
            name="waste-description"
            value={waste.description}
            onChange={(event) => set('description', event.target.value)}
            required
            maxLength={2000}
          />
          <fieldset className="admin-span admin-choice-group">
            <legend>Características do descarte</legend>
            <AdminCheckbox
              checked={waste.recyclable}
              onChange={(event) => set('recyclable', event.target.checked)}
            >
              É reciclável
            </AdminCheckbox>
            <AdminCheckbox
              checked={waste.dangerous}
              onChange={(event) => set('dangerous', event.target.checked)}
            >
              É perigoso / exige cuidado especial
            </AdminCheckbox>
            <AdminCheckbox
              checked={waste.commonTrash}
              onChange={(event) => set('commonTrash', event.target.checked)}
            >
              Pode ir para o lixo comum
            </AdminCheckbox>
          </fieldset>
          <AdminTextarea
            label="Orientação de descarte"
            name="waste-instructions"
            value={waste.disposalInstructions}
            onChange={(event) => set('disposalInstructions', event.target.value)}
            required
            maxLength={3000}
          />
          <AdminTextarea
            label="Preparação para descarte"
            name="waste-preparation"
            value={waste.preparation}
            onChange={(event) => set('preparation', event.target.value)}
            required
            maxLength={2000}
          />
          <AdminTextarea
            label="Impacto ambiental do descarte inadequado"
            name="waste-impact"
            value={waste.environmentalImpact}
            onChange={(event) => set('environmentalImpact', event.target.value)}
            required
            maxLength={2000}
          />
          <AdminInput
            label="Ícone"
            name="waste-icon"
            value={waste.icon}
            onChange={(event) => set('icon', event.target.value)}
            maxLength={30}
            hint="Use um emoji, por exemplo ♻️ ou 🔋."
          />
          <AdminInput
            label="URL da imagem"
            name="waste-image"
            type="url"
            value={waste.image}
            onChange={(event) => set('image', event.target.value)}
            placeholder="https://…"
            maxLength={1000}
          />
        </div>
        <p className="admin-muted">
          Visibilidade:{' '}
          <Badge tone={waste.active ? 'green' : 'gray'}>{waste.active ? 'Ativo' : 'Inativo'}</Badge>
          . Você pode alterar o status na lista de resíduos.
        </p>
        <FormError message={error} />
        {feedback}
        <div className="admin-actions">
          <button className="button primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar resíduo'}
          </button>
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AdminWastes() {
  const { data, saveWaste } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('todos');
  const [editor, setEditor] = useState<{ waste: Waste; isNew: boolean } | null>(null);
  const [confirm, setConfirm] = useState<Waste | null>(null);
  const [saved, setSaved] = useState(false);
  const { busy, run, feedback } = useFeedback();
  const filtered = data.wastes
    .filter(
      (waste) =>
        (!query ||
          normalize(`${waste.name} ${waste.synonyms.join(' ')}`).includes(normalize(query))) &&
        (!category || waste.category === category) &&
        (status === 'todos' || waste.active === (status === 'ativos')),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  function open(waste: Waste, isNew: boolean) {
    setEditor({ waste, isNew });
    setConfirm(null);
    setSaved(false);
  }
  async function changeStatus() {
    if (!confirm) return;
    if (
      await run(
        () =>
          saveWaste({ ...confirm, active: !confirm.active, updatedAt: new Date().toISOString() }),
        confirm.active ? 'Resíduo desativado. O histórico foi preservado.' : 'Resíduo reativado.',
      )
    )
      setConfirm(null);
  }
  return (
    <>
      <PageHeading
        eyebrow="Administração"
        title="Gerenciar resíduos"
        description="Informação bem cuidada para cada material encontrar o destino certo."
        action={
          <button className="button primary" onClick={() => open(emptyWaste(), true)}>
            <Plus size={18} /> Novo resíduo
          </button>
        }
      />
      {editor && (
        <WasteEditor
          key={editor.waste.id}
          initial={editor.waste}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setSaved(true);
          }}
        />
      )}
      {saved && (
        <Notice tone="success">Resíduo salvo com sucesso. O catálogo está atualizado.</Notice>
      )}
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
            <label htmlFor="waste-filter">Pesquisar material</label>
            <div>
              <Search size={18} aria-hidden="true" />
              <input
                id="waste-filter"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome ou sinônimo"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="category-filter">Categoria</label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todas as categorias</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="waste-status">Status</label>
            <select
              id="waste-status"
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
          {filtered.length} {filtered.length === 1 ? 'resíduo encontrado' : 'resíduos encontrados'}
        </p>
        {filtered.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Resíduo</th>
                  <th>Categoria</th>
                  <th>Características</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((waste) => (
                  <tr key={waste.id}>
                    <td>
                      <strong>
                        {waste.icon} {waste.name}
                      </strong>
                      <small>{waste.synonyms.slice(0, 3).join(', ') || 'Sem sinônimos'}</small>
                    </td>
                    <td>{waste.category}</td>
                    <td>
                      <div className="admin-badges">
                        {waste.recyclable && <Badge>Reciclável</Badge>}
                        {waste.dangerous && <Badge tone="orange">Cuidado especial</Badge>}
                        {!waste.recyclable && !waste.dangerous && <span>Descarte orientado</span>}
                      </div>
                    </td>
                    <td>
                      <Badge tone={waste.active ? 'green' : 'gray'}>
                        {waste.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="button secondary small"
                          aria-label={`Editar ${waste.name}`}
                          onClick={() => open(waste, false)}
                        >
                          <Pencil size={15} /> Editar
                        </button>
                        <button
                          className={`button ${waste.active ? 'danger' : 'secondary'} small`}
                          onClick={() => {
                            setConfirm(waste);
                            setEditor(null);
                          }}
                          aria-label={`${waste.active ? 'Desativar' : 'Reativar'} ${waste.name}`}
                          disabled={busy}
                        >
                          {waste.active ? 'Desativar' : 'Reativar'}
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
            title="Nenhum resíduo encontrado"
            description="Experimente outro termo ou ajuste os filtros."
          />
        )}
      </section>
    </>
  );
}
