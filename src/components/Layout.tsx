import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Notice } from './UI';
export default function Layout() {
  const { user, mode, logout, error, refresh } = useApp();
  const [menu, setMenu] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="EcoDescarte, início">
            <span className="brand-icon">
              <Leaf size={24} />
            </span>
            <span>
              eco<span>descarte</span>
              <i>.</i>
            </span>
          </Link>
          <button
            className="mobile-toggle icon-button"
            aria-label={menu ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav className={menu ? 'main-nav open' : 'main-nav'} aria-label="Navegação principal">
            <NavLink to="/" end>
              Início
            </NavLink>
            <NavLink to="/descartar">Descartar</NavLink>
            <NavLink to="/pontos">Pontos de coleta</NavLink>
            <NavLink to="/meu-impacto">Meu impacto</NavLink>
            <NavLink to="/sobre">Sobre</NavLink>
            <div className="mobile-account">
              {user ? (
                <>
                  <Link to="/perfil">Meu perfil</Link>
                  {user.role === 'admin' && <Link to="/admin">Administração</Link>}
                </>
              ) : (
                <Link to="/entrar">Entrar ou criar conta</Link>
              )}
            </div>
          </nav>
          <div className="header-account">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    className="icon-button admin-shortcut"
                    to="/admin"
                    aria-label="Administração"
                  >
                    <LayoutDashboard size={19} />
                  </Link>
                )}
                <Link to="/perfil" className="avatar" title={user.name}>
                  {user.name
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </Link>
                <button
                  className="icon-button"
                  title="Sair"
                  aria-label="Sair"
                  onClick={() =>
                    void logout()
                      .then(() => navigate('/', { replace: true }))
                      .catch(() => setLogoutError('Não foi possível sair. Tente novamente.'))
                  }
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link to="/entrar" className="login-link">
                  Entrar
                </Link>
                <Link className="button primary small" to="/cadastro">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {mode === 'demo' && (
        <div className="demo-bar">
          <span>Projeto acadêmico · Modo demonstração</span>
          <span>
            Os pontos de coleta são fictícios. <Link to="/sobre#demonstracao">Entenda</Link>
          </span>
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        {error && (
          <div className="container global-error">
            <Notice tone="error">
              {error}{' '}
              <button className="text-link" onClick={() => void refresh()}>
                Tentar novamente
              </button>
            </Notice>
          </div>
        )}
        {logoutError && <Notice tone="error">{logoutError}</Notice>}
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-main">
          <div>
            <Link className="brand" to="/">
              <span className="brand-icon">
                <Leaf size={22} />
              </span>
              <span>
                eco<span>descarte</span>
                <i>.</i>
              </span>
            </Link>
            <p>
              Descubra onde descartar.
              <br />
              Contribua para um futuro sustentável.
            </p>
          </div>
          <div>
            <strong>Um pequeno gesto. Um novo ciclo.</strong>
            <p>Informação que transforma a forma de descartar.</p>
            <div className="footer-links">
              <Link to="/sobre">Sobre o projeto</Link>
              <Link to="/ods-12">ODS 12</Link>
              <Link to="/sobre#privacidade">Privacidade</Link>
            </div>
          </div>
          <Link to="/ods-12" className="ods-mini">
            <b>12</b>
            <span>
              CONSUMO E PRODUÇÃO
              <br />
              RESPONSÁVEIS
            </span>
          </Link>
        </div>
        <div className="container footer-bottom">
          <span>EcoDescarte © {new Date().getFullYear()} · Projeto acadêmico</span>
          <span>Feito para cuidar do que vem depois.</span>
        </div>
      </footer>
    </>
  );
}
