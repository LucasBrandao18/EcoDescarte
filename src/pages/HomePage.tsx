import { Link } from 'react-router-dom';
import {
  BatteryCharging,
  Leaf,
  MapPin,
  Recycle,
  Search,
  BookOpen,
  Sprout,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import SearchBox from '../components/SearchBox';
import CategoryIcon from '../components/CategoryIcon';
import { WasteCard } from '../components/Cards';
import { categories } from '../types';
import { useApp } from '../contexts/AppContext';
export default function HomePage() {
  const { data } = useApp();
  const popular = ['pilha', 'celular', 'oleo', 'papelao'];
  const featured = popular
    .map((id) => data.wastes.find((w) => w.id === id && w.active))
    .filter((w) => !!w);
  const fallback = data.wastes.filter((w) => w.active).slice(0, 4);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <Leaf size={15} /> PEQUENAS ATITUDES, GRANDES MUDANÇAS
            </span>
            <h1>
              Não sabe onde
              <br />
              <em>descartar?</em>
            </h1>
            <p>
              Todo resíduo merece um destino melhor.
              <br /> Pesquise o material e encontre a forma correta de descartá-lo.
            </p>
            <SearchBox large />
            <div className="popular-searches">
              <span>Experimente:</span>
              {['pilha', 'celular', 'óleo de cozinha', 'papelão'].map((q) => (
                <Link key={q} to={`/descartar?q=${encodeURIComponent(q)}`}>
                  {q}
                </Link>
              ))}
            </div>
            <div className="hero-note">
              <ShieldCheck size={18} />
              <span>Orientações claras. Escolhas mais conscientes.</span>
            </div>
          </div>
          <div className="hero-guide">
            <div className="hero-guide-top">
              <span className="hero-tag">UM NOVO CICLO COMEÇA COM VOCÊ</span>
              <Recycle size={30} />
            </div>
            <h2>
              Pequeno no seu dia.
              <br />
              Grande para o planeta.
            </h2>
            <p>Descubra o caminho que o seu resíduo pode seguir.</p>
            <Link to="/descartar?q=pilha" className="hero-example">
              <span className="example-icon">
                <BatteryCharging size={34} />
              </span>
              <div>
                <small>QUERO DESCARTAR</small>
                <strong>Pilhas e baterias</strong>
                <span>Coleta especial · Nunca no lixo comum</span>
              </div>
            </Link>
            <div className="cycle-steps">
              <span>
                <Search size={18} /> Pesquise
              </span>
              <i />{' '}
              <span>
                <MapPin size={18} /> Encontre
              </span>
              <i />{' '}
              <span>
                <Sprout size={18} /> Transforme
              </span>
            </div>
            <div className="hero-guide-foot">
              <span className="mini-ods">12</span>
              <span>
                Juntos pelo consumo
                <br />e produção responsáveis.
              </span>
              <Leaf size={28} />
            </div>
          </div>
        </div>
      </section>
      <section className="container categories-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CADA MATERIAL TEM SEU LUGAR</span>
            <h2>O que vamos descartar hoje?</h2>
          </div>
          <Link className="text-link" to="/descartar">
            Explorar todos os resíduos
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <Link
              className="category-tile"
              key={c}
              to={`/descartar?categoria=${encodeURIComponent(c)}`}
            >
              <CategoryIcon category={c} size={27} />
              <span>{c}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="how-section">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">É MAIS SIMPLES DO QUE PARECE</span>
            <h2>Do seu cuidado a um novo começo.</h2>
            <p>Quatro passos para fazer a diferença.</p>
          </div>
          <div className="how-grid">
            {[
              {
                icon: Search,
                title: 'Pesquise o material',
                text: 'Digite o nome do objeto ou escolha uma categoria.',
              },
              {
                icon: BookOpen,
                title: 'Descubra como descartar',
                text: 'Veja orientações de preparo e cuidados importantes.',
              },
              {
                icon: MapPin,
                title: 'Encontre um ponto',
                text: 'Confira os locais que recebem o seu material.',
              },
              {
                icon: Sprout,
                title: 'Faça o descarte correto',
                text: 'Registre sua ação e acompanhe seu impacto.',
              },
            ].map((s, i) => (
              <article key={s.title} className="how-step">
                <span className="step-number">0{i + 1}</span>
                <s.icon size={28} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="container section-space">
        <div className="section-heading">
          <div>
            <span className="eyebrow">INFORMAÇÃO QUE FAZ A DIFERENÇA</span>
            <h2>Comece por estes materiais</h2>
          </div>
          <Link className="text-link" to="/descartar">
            Ver guia completo
          </Link>
        </div>
        <div className="waste-grid">
          {(featured.length === 4 ? featured : fallback).map((w) => (
            <WasteCard key={w.id} waste={w} />
          ))}
        </div>
      </section>
      <section className="container">
        <div className="community-banner">
          <span className="community-icon">
            <MapPin size={34} />
          </span>
          <div>
            <h2>Conhece um ponto de coleta?</h2>
            <p>Compartilhe esse lugar. Sua indicação pode ajudar muita gente.</p>
          </div>
          <Link to="/sugerir-ponto" className="button primary">
            Sugerir um ponto
          </Link>
        </div>
      </section>
      <section className="container home-bottom">
        <Sparkles size={19} />
        <p>Seu próximo descarte pode ser o começo de uma mudança.</p>
        <Link to="/ods-12">Conheça a ODS 12</Link>
      </section>
    </>
  );
}
