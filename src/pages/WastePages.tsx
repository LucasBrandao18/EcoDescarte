import { useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Recycle,
  Sprout,
  Trash2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { categories } from '../types';
import { searchWastes } from '../utils/domain';
import SearchBox from '../components/SearchBox';
import CategoryIcon from '../components/CategoryIcon';
import { WasteCard, PointCard } from '../components/Cards';
import { Badge, EmptyState, Loading, Notice, PageHeading } from '../components/UI';
export function SearchPage() {
  const { data, loading, logSearch } = useApp();
  const [params, setParams] = useSearchParams();
  const term = params.get('q') || '';
  const category = params.get('categoria') || '';
  const results = useMemo(
    () => searchWastes(data.wastes, term).filter((w) => !category || w.category === category),
    [data.wastes, term, category],
  );
  const logged = useRef('');
  useEffect(() => {
    const key = term + '|' + category;
    if (term.trim() && !loading && logged.current !== key) {
      logged.current = key;
      void logSearch(term, results[0]?.id ?? null).catch(() => {});
    }
  }, [term, category, loading, logSearch, results]);
  return (
    <div className="container page">
      <PageHeading
        eyebrow="GUIA DE DESCARTE"
        title="Um destino certo para cada material."
        description="Busque um resíduo e descubra como prepará-lo para o descarte."
      />
      <div className="search-toolbar">
        <SearchBox key={term} initial={term} />
        <label className="field">
          <span>Categoria</span>
          <select
            value={category}
            onChange={(e) => {
              const p = new URLSearchParams(params);
              if (e.target.value) p.set('categoria', e.target.value);
              else p.delete('categoria');
              setParams(p);
            }}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="result-heading">
        <p>
          {term ? (
            <>
              Resultados para <strong>“{term}”</strong>
            </>
          ) : (
            'Explore o guia de resíduos'
          )}
        </p>
        <span>
          {results.length} {results.length === 1 ? 'material encontrado' : 'materiais encontrados'}
        </span>
      </div>
      {loading ? (
        <Loading />
      ) : results.length ? (
        <div className="waste-grid">
          {results.map((w) => (
            <WasteCard key={w.id} waste={w} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Não encontramos esse material"
          description="Tente outro nome, como “pilha”, “bateria” ou “papelão”, ou escolha outra categoria."
          action={
            <Link to="/descartar" className="button secondary">
              Limpar pesquisa
            </Link>
          }
        />
      )}
      <div className="inline-tip">
        <Sprout size={21} />
        <p>
          Antes de descartar, considere reparar, reutilizar ou doar. Prolongar a vida de um produto
          também faz a diferença.
        </p>
      </div>
    </div>
  );
}
export function WasteDetailPage() {
  const { id } = useParams();
  const { data, loading } = useApp();
  if (loading) return <Loading />;
  const waste = data.wastes.find((w) => w.id === id && w.active);
  if (!waste)
    return (
      <div className="container page">
        <EmptyState
          title="Resíduo não encontrado"
          description="Este material não está disponível no guia."
          action={
            <Link to="/descartar" className="button primary">
              Pesquisar resíduos
            </Link>
          }
        />
      </div>
    );
  const points = data.points.filter((p) => p.active && p.acceptedWasteIds.includes(waste.id));
  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Caminho">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to="/descartar">Guia de descarte</Link>
        <span>/</span>
        <span>{waste.name}</span>
      </nav>
      <div className="detail-hero">
        <div className="detail-symbol">
          <CategoryIcon category={waste.category} size={52} />
        </div>
        <div>
          <Badge>{waste.category}</Badge>
          <h1>{waste.name}</h1>
          <p>{waste.description}</p>
        </div>
      </div>
      <div className="detail-layout">
        <div>
          <div className="waste-facts">
            <div>
              <Recycle />
              <span>
                Reciclável
                <strong>
                  {waste.recyclable ? 'Sim, com coleta adequada' : 'Não na coleta convencional'}
                </strong>
              </span>
            </div>
            <div>
              <Trash2 />
              <span>
                Lixo comum
                <strong>{waste.commonTrash ? 'Sim, conforme orientação local' : 'Não'}</strong>
              </span>
            </div>
            <div>
              <AlertTriangle />
              <span>
                Cuidados
                <strong>{waste.dangerous ? 'Coleta especializada' : 'Separação adequada'}</strong>
              </span>
            </div>
          </div>
          {waste.dangerous && (
            <Notice tone="warning">
              Este resíduo exige cuidados especiais. Não descarte no lixo doméstico, em pias ou no
              ambiente.
            </Notice>
          )}
          <article className="panel guide-panel">
            <h2>
              <MapPin /> Como descartar
            </h2>
            <p>{waste.disposalInstructions}</p>
            <h2>
              <PackageCheck /> Prepare antes de levar
            </h2>
            <p>{waste.preparation}</p>
            <h2>
              <Sprout /> Por que isso importa?
            </h2>
            <p>{waste.environmentalImpact}</p>
          </article>
          <p className="muted small-text">
            As condições de recebimento variam por local. Confirme materiais, quantidade e horário
            com o ponto antes de sair.
          </p>
        </div>
        <aside className="disposal-aside">
          <span className="aside-symbol">
            <MapPin size={31} />
          </span>
          <h2>Agora, encontre o lugar certo.</h2>
          <p>Veja os pontos cadastrados que recebem {waste.name.toLocaleLowerCase('pt-BR')}.</p>
          <Link className="button primary" to={`/pontos?residuo=${waste.id}`}>
            Onde descartar?
          </Link>
          <Link className="button secondary" to={`/registrar-descarte?waste=${waste.id}`}>
            Já descartei
          </Link>
          <span className="aside-note">
            <CheckCircle2 size={16} /> Registre sua ação e ganhe 10 EcoPontos.
          </span>
        </aside>
      </div>
      <section className="section-space">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONTINUE O CICLO</span>
            <h2>Pontos que recebem este material</h2>
          </div>
          <Link className="text-link" to={`/pontos?residuo=${waste.id}`}>
            Ver todos ({points.length})
          </Link>
        </div>
        {points.length ? (
          <div className="point-grid">
            {points.slice(0, 3).map((p) => (
              <PointCard key={p.id} point={p} wastes={data.wastes} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Ainda não há pontos para este material"
            description="Você pode ajudar indicando um local de coleta para análise."
            action={
              <Link className="button secondary" to="/sugerir-ponto">
                Sugerir ponto
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
