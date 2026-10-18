import { ArrowUpRight, ClipboardList, MapPin, Package, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { EmptyState, PageHeading, StatCard } from '../UI';

type BarItem = { label: string; value: number };

function countLabels(labels: string[]): BarItem[] {
  const counts = new Map<string, number>();
  labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));
}

function BarChart({
  title,
  description,
  items,
  empty,
}: {
  title: string;
  description: string;
  items: BarItem[];
  empty: string;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.value));
  return (
    <section className="panel admin-chart">
      <h2>{title}</h2>
      <p className="admin-muted">{description}</p>
      {items.length && items.some((item) => item.value > 0) ? (
        <ul className="admin-bars">
          {items.map((item) => (
            <li key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString('pt-BR')}</strong>
              </div>
              <div className="admin-bar-track" aria-hidden="true">
                <span style={{ width: `${(item.value / maximum) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Os dados começam com uma ação" description={empty} />
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const { data, mode } = useApp();
  const wasteById = new Map(data.wastes.map((waste) => [waste.id, waste]));
  const pointById = new Map(data.points.map((point) => [point.id, point]));
  const identifiedSearches = data.searchLogs.flatMap((log) =>
    log.wasteId && wasteById.has(log.wasteId) ? [wasteById.get(log.wasteId)!] : [],
  );
  const pending = data.suggestions.filter((suggestion) => suggestion.status === 'PENDENTE');
  const activePoints = data.points.filter((point) => point.active);
  const categories = activePoints.flatMap((point) => [
    ...new Set(
      point.acceptedWasteIds.flatMap((id) =>
        wasteById.has(id) ? [wasteById.get(id)!.category] : [],
      ),
    ),
  ]);
  const cities = data.disposals.flatMap((disposal) => {
    const point = pointById.get(disposal.collectionPointId);
    return point ? [`${point.city} / ${point.state}`] : [];
  });
  const today = new Date();
  const monthItems = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date),
      value: data.disposals.filter((disposal) => disposal.date.startsWith(month)).length,
    };
  });
  return (
    <>
      <PageHeading
        eyebrow="Visão geral"
        title="Pequenas ações. Dados reais."
        description={
          mode === 'demo'
            ? 'Indicadores desta demonstração, calculados a partir dos registros salvos neste navegador.'
            : 'Acompanhe a participação da comunidade e mantenha as informações de descarte atualizadas.'
        }
      />
      <div className="stat-grid admin-stats">
        <StatCard
          label="Usuários cadastrados"
          value={data.users.length}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Resíduos cadastrados"
          value={data.wastes.length}
          icon={<Package size={20} />}
        />
        <StatCard
          label="Pontos de coleta ativos"
          value={activePoints.length}
          icon={<MapPin size={20} />}
        />
        <StatCard
          label="Descartes registrados"
          value={data.disposals.length}
          icon={<ClipboardList size={20} />}
        />
        <StatCard
          label="Sugestões pendentes"
          value={pending.length}
          icon={<ClipboardList size={20} />}
        />
        <StatCard
          label="Pesquisas registradas"
          value={data.searchLogs.length}
          icon={<Search size={20} />}
        />
      </div>
      {pending.length > 0 && (
        <div className="panel admin-pending-callout">
          <div>
            <strong>
              {pending.length} {pending.length === 1 ? 'sugestão espera' : 'sugestões esperam'} sua
              análise
            </strong>
            <p>Confira os materiais, o endereço e as coordenadas antes de publicar.</p>
          </div>
          <Link className="button primary" to="/admin/sugestoes">
            Analisar sugestões <ArrowUpRight size={18} />
          </Link>
        </div>
      )}
      <div className="grid-2 admin-chart-grid">
        <BarChart
          title="Resíduos mais pesquisados"
          description="Até seis materiais com mais pesquisas identificadas."
          items={countLabels(identifiedSearches.map((waste) => waste.name)).slice(0, 6)}
          empty="As pesquisas vinculadas a materiais aparecerão aqui."
        />
        <BarChart
          title="Categorias mais pesquisadas"
          description="Pesquisas associadas a um resíduo do catálogo."
          items={countLabels(identifiedSearches.map((waste) => waste.category))}
          empty="As categorias mais procuradas aparecerão conforme o catálogo for pesquisado."
        />
        <BarChart
          title="Descartes por mês"
          description="Número de registros pela data do descarte, nos últimos seis meses."
          items={monthItems}
          empty="Não há descartes registrados nos últimos seis meses."
        />
        <BarChart
          title="Pontos por categoria"
          description="Um ponto ativo pode receber materiais de mais de uma categoria."
          items={countLabels(categories)}
          empty="Cadastre pontos de coleta e associe os materiais aceitos para ver a distribuição."
        />
        <BarChart
          title="Cidades com maior utilização"
          description="Descartes registrados por cidade do ponto de coleta. A localização pessoal não é armazenada."
          items={countLabels(cities).slice(0, 6)}
          empty="As cidades aparecerão quando a comunidade registrar descartes."
        />
        <section className="panel admin-quick-actions">
          <span className="eyebrow">Cuidar da informação</span>
          <h2>Um catálogo confiável faz a diferença.</h2>
          <p>
            Revise as orientações de descarte, mantenha os horários de coleta atualizados e analise
            as contribuições da comunidade.
          </p>
          <Link to="/admin/residuos">
            Gerenciar resíduos <ArrowUpRight size={18} />
          </Link>
          <Link to="/admin/pontos">
            Gerenciar pontos de coleta <ArrowUpRight size={18} />
          </Link>
          <Link to="/admin/usuarios">
            Acompanhar a comunidade <ArrowUpRight size={18} />
          </Link>
        </section>
      </div>
    </>
  );
}
