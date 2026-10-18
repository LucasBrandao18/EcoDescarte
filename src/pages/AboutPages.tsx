import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Leaf,
  MapPin,
  Recycle,
  ShieldCheck,
  Sprout,
  Users,
} from 'lucide-react';
import { PageHeading } from '../components/UI';
export function AboutPage() {
  return (
    <div className="container page">
      <PageHeading
        eyebrow="SOBRE O ECODESCARTE"
        title="Informação que muda destinos."
        description="Uma conexão entre quem quer fazer a coisa certa e a orientação de que precisa."
      />
      <div className="about-lead">
        <div className="about-mark">
          <Leaf size={90} />
          <span>
            Um novo ciclo.
            <br />
            Um futuro melhor.
          </span>
        </div>
        <article className="prose">
          <h2>Um problema cotidiano. Uma solução acessível.</h2>
          <p>
            O EcoDescarte é uma plataforma desenvolvida para facilitar o descarte correto de
            resíduos, permitindo que cidadãos encontrem orientações e locais adequados de coleta.
          </p>
          <p>
            Pilhas, eletrônicos, óleo e medicamentos exigem destinos específicos. A falta de
            informação dificulta escolhas responsáveis, mesmo quando existe vontade de contribuir.
          </p>
          <p>
            Este projeto acadêmico de Tecnologia da Informação foi criado como uma solução
            relacionada à ODS 12 da ONU: Consumo e Produção Responsáveis.
          </p>
          <Link className="button secondary" to="/ods-12">
            Entenda nossa conexão com a ODS 12
          </Link>
        </article>
      </div>
      <div className="grid-3 section-space">
        {[
          {
            icon: BookOpen,
            title: 'Informar',
            text: 'Orientações práticas para reconhecer resíduos e preparar o descarte.',
          },
          {
            icon: MapPin,
            title: 'Conectar',
            text: 'Pontos organizados pelos materiais que recebem, com mapa e rotas.',
          },
          {
            icon: Users,
            title: 'Mobilizar',
            text: 'Uma comunidade que sugere locais e acompanha suas próprias ações.',
          },
        ].map((c) => (
          <article key={c.title} className="panel value-card">
            <c.icon size={29} />
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </article>
        ))}
      </div>
      <section className="panel prose" id="demonstracao">
        <h2>Uma demonstração transparente</h2>
        <p>
          Sem a configuração do Firebase, o sistema funciona em modo de demonstração. Contas,
          sugestões, avaliações e descartes são salvos somente neste navegador. Você pode
          experimentar uma conta de usuário ou de administrador na tela de entrada.
        </p>
        <p>
          Todos os pontos da base inicial são fictícios e estão identificados. Seus endereços e
          rotas servem apenas para demonstrar a aplicação. Antes do uso real, a equipe responsável
          deve cadastrar e verificar locais verdadeiros com os operadores de coleta.
        </p>
        <p>
          EcoPontos representam atividades registradas no sistema. Os descartes são autorrelatados:
          não são certificações ambientais nem estimativas de carbono ou de massa reciclada.
        </p>
      </section>
      <section className="panel prose" id="privacidade">
        <h2>
          <ShieldCheck size={23} /> Sua privacidade importa
        </h2>
        <p>
          Sua localização é solicitada apenas ao escolher “Usar minha localização”. As coordenadas
          são usadas temporariamente para calcular proximidade e gerar rotas, sem armazenamento no
          perfil ou histórico.
        </p>
        <p>
          Em modo Firebase, nome, e-mail e atividades vinculadas à conta são armazenados para
          oferecer seu histórico e administrar sugestões. As rotas abrem o Google Maps; esse serviço
          tem sua própria política de privacidade.
        </p>
        <p>
          Ao pesquisar, o sistema registra o termo, o material encontrado e a data. Evite inserir
          informações pessoais na busca. A operação real deve definir responsável, canal de
          atendimento, retenção e procedimento de exclusão de dados antes da publicação.
        </p>
      </section>
    </div>
  );
}
export function OdsPage() {
  return (
    <div className="container page">
      <PageHeading
        eyebrow="NOSSA CONEXÃO COM A AGENDA 2030"
        title="O futuro também depende do que descartamos."
        description="Tecnologia a serviço do consumo e da produção responsáveis."
      />
      <section className="ods-feature">
        <div className="ods-block">
          <strong>12</strong>
          <span>
            CONSUMO E PRODUÇÃO
            <br />
            RESPONSÁVEIS
          </span>
          <Recycle size={86} />
        </div>
        <div>
          <h2>O que é a ODS 12?</h2>
          <p>
            Os 17 Objetivos de Desenvolvimento Sustentável formam uma agenda global da ONU para
            enfrentar desafios sociais, econômicos e ambientais. A ODS 12 propõe padrões mais
            sustentáveis de consumo e produção.
          </p>
          <p>
            O EcoDescarte se conecta especialmente à redução da geração de resíduos, ao manejo
            adequado e à ampliação do acesso à informação sobre sustentabilidade.
          </p>
          <a
            href="https://brasil.un.org/pt-br/sdgs/12"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Leia as metas da ODS 12 na ONU Brasil
          </a>
        </div>
      </section>
      <section className="section-space">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DA DÚVIDA À AÇÃO</span>
            <h2>Como o EcoDescarte contribui</h2>
          </div>
        </div>
        <div className="impact-flow">
          {[
            {
              icon: BookOpen,
              title: 'O problema',
              text: 'Falta de informação pode levar ao descarte incorreto.',
            },
            {
              icon: Leaf,
              title: 'A conexão',
              text: 'EcoDescarte reúne orientação, pontos de coleta e conscientização.',
            },
            {
              icon: CheckCircle2,
              title: 'A ação',
              text: 'Pessoas mais informadas conseguem escolher destinos adequados.',
            },
            {
              icon: Sprout,
              title: 'A contribuição',
              text: 'Mais reutilização, reciclagem e cuidado com os resíduos.',
            },
          ].map((s, i) => (
            <div className="flow-card" key={s.title}>
              <span>0{i + 1}</span>
              <s.icon size={28} />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="grid-3">
        <article className="panel">
          <span className="eyebrow">META 12.4</span>
          <h3>Manejo adequado</h3>
          <p>
            Orientações para resíduos que precisam de coleta especializada, como pilhas e
            medicamentos.
          </p>
        </article>
        <article className="panel">
          <span className="eyebrow">META 12.5</span>
          <h3>Menos resíduos</h3>
          <p>Incentivo à prevenção, à reutilização e à reciclagem antes da disposição final.</p>
        </article>
        <article className="panel">
          <span className="eyebrow">META 12.8</span>
          <h3>Mais informação</h3>
          <p>Um guia acessível para apoiar escolhas conscientes no cotidiano.</p>
        </article>
      </section>
      <section className="community-banner section-space">
        <Sprout size={38} />
        <div>
          <h2>A mudança começa na próxima escolha.</h2>
          <p>Descubra como dar um destino adequado ao que você já não usa.</p>
        </div>
        <Link className="button primary" to="/descartar">
          Pesquisar um material
        </Link>
      </section>
    </div>
  );
}
export function NotFoundPage() {
  return (
    <div className="container page not-found">
      <span className="eyebrow">PÁGINA NÃO ENCONTRADA</span>
      <strong>404</strong>
      <h1>Vamos encontrar um novo caminho?</h1>
      <p>O endereço que você abriu não existe ou foi alterado.</p>
      <Link className="button primary" to="/">
        Voltar ao início
      </Link>
    </div>
  );
}
