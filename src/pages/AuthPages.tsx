import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, ShieldCheck } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Notice, useFeedback } from '../components/UI';

function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-intro">
        <span className="eyebrow">PEQUENAS ATITUDES. NOVOS CAMINHOS.</span>
        <Leaf size={48} />
        <h2>Seu próximo descarte pode fazer a diferença.</h2>
        <p>
          Encontre orientações, compartilhe pontos de coleta e acompanhe cada passo da sua jornada.
        </p>
        <Link className="text-link" to="/">
          <ArrowLeft size={17} /> Voltar ao início
        </Link>
      </aside>
      <section className="auth-card">
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </section>
    </div>
  );
}

function useAuthRedirect() {
  const { user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string | { pathname?: string; search?: string } } | null)
    ?.from;
  const candidate =
    typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}` : '';
  const destination =
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    !/^\/(entrar|cadastro|recuperar-senha)(?:[/?#]|$)/.test(candidate)
      ? candidate
      : user?.role === 'admin'
        ? '/admin'
        : '/perfil';
  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [user, navigate, destination]);
}

export function LoginPage() {
  const { login, loginDemo, mode } = useApp();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, run, feedback } = useFeedback();
  useAuthRedirect();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(() => login(email.trim(), password), 'Login realizado. Abrindo seu perfil…');
  }
  return (
    <AuthLayout
      title="Bom ter você de volta."
      description="Entre para acompanhar seu impacto e continuar contribuindo."
    >
      {feedback}
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          E-mail
          <input
            autoComplete="email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </label>
        <label className="field">
          Senha
          <input
            autoComplete="current-password"
            type="password"
            required
            minLength={6}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
          />
        </label>
        <Link className="text-link" to="/recuperar-senha">
          Esqueci minha senha
        </Link>
        <button className="button primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p>
        Ainda não tem conta?{' '}
        <Link className="text-link" to="/cadastro" state={location.state}>
          Criar uma conta
        </Link>
      </p>
      {mode === 'demo' && (
        <div className="demo-auth">
          <Notice tone="warning">
            Demonstração acadêmica: as contas e os registros ficam apenas neste navegador. Utilize
            dados de teste.
          </Notice>
          <p className="eyebrow">EXPERIMENTE O PROJETO</p>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void run(() => loginDemo('user'), 'Conta de demonstração aberta.')}
            >
              Entrar como usuário demo
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void run(() => loginDemo('admin'), 'Painel de demonstração aberto.')}
            >
              <ShieldCheck size={16} /> Admin demo
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register, mode } = useApp();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const { busy, run, feedback } = useFeedback();
  useAuthRedirect();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (name.trim().length < 2) throw new Error('Informe seu nome com pelo menos 2 caracteres.');
      if (password.length < 8) throw new Error('Sua senha precisa ter pelo menos 8 caracteres.');
      if (password !== confirmation)
        throw new Error('As senhas não coincidem. Confira os dois campos.');
      await register(name.trim(), email.trim(), password);
    }, 'Conta criada! Preparando seu perfil…');
  }
  return (
    <AuthLayout
      title="Comece sua jornada."
      description="Uma conta para transformar boas intenções em ações registradas."
    >
      {mode === 'demo' && (
        <Notice tone="warning">
          Cadastro de demonstração, armazenado neste navegador. Use nome, e-mail e senha de teste.
        </Notice>
      )}
      {feedback}
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          Nome
          <input
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como podemos chamar você?"
          />
        </label>
        <label className="field">
          E-mail
          <input
            autoComplete="email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </label>
        <label className="field">
          Senha
          <input
            autoComplete="new-password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
          />
          <small id="password-hint">Use pelo menos 8 caracteres.</small>
        </label>
        <label className="field">
          Confirmar senha
          <input
            autoComplete="new-password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <p className="muted">
          Sua localização é opcional e usada apenas para encontrar pontos próximos. Ela não é salva
          no seu perfil.
        </p>
        <button className="button primary" disabled={busy}>
          {busy ? 'Criando sua conta…' : 'Criar conta'}
        </button>
      </form>
      <p>
        Já tem uma conta?{' '}
        <Link className="text-link" to="/entrar" state={location.state}>
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}

export function RecoverPage() {
  const { resetPassword, mode } = useApp();
  const [email, setEmail] = useState('');
  const { busy, run, feedback } = useFeedback();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(
      () => resetPassword(email.trim()),
      mode === 'demo'
        ? 'Fluxo demonstrado. Nenhum e-mail foi enviado: a recuperação real requer Firebase Authentication configurado.'
        : 'Solicitação recebida. Se houver uma conta para esse e-mail, siga as instruções de recuperação. Confira também o spam.',
    );
  }
  return (
    <AuthLayout
      title="Recuperar sua senha."
      description="Informe o e-mail da sua conta para solicitar uma nova senha."
    >
      {mode === 'demo' && (
        <Notice tone="warning">
          O modo de demonstração não envia e-mails nem altera senhas. Para testar o envio real,
          configure o Firebase.
        </Notice>
      )}
      {feedback}
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          E-mail
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy
            ? 'Enviando solicitação…'
            : mode === 'demo'
              ? 'Demonstrar recuperação'
              : 'Enviar instruções'}
        </button>
      </form>
      <p>
        <Link className="text-link" to="/entrar">
          <ArrowLeft size={16} /> Voltar para entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
