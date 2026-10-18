import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LoaderCircle, Leaf, SearchX, X } from 'lucide-react';
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title = 'Nada por aqui ainda',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <SearchX size={34} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'error' | 'warning';
}) {
  return (
    <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
      <div>{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Carregando…
    </div>
  );
}
export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="stat-card">
      {icon && <span className="stat-icon">{icon}</span>}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function AuthRequired() {
  const location = useLocation();
  return (
    <div className="auth-required">
      <Leaf size={38} />
      <h1>Seu próximo passo faz a diferença.</h1>
      <p>Entre na sua conta para registrar descartes, sugerir pontos e acompanhar seu impacto.</p>
      <Link
        className="button primary"
        to="/entrar"
        state={{ from: location.pathname + location.search }}
      >
        Entrar na minha conta
      </Link>
      <Link
        className="text-link"
        to="/cadastro"
        state={{ from: location.pathname + location.search }}
      >
        Criar uma conta
      </Link>
    </div>
  );
}
export function useFeedback() {
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (feedback?.tone !== 'success') return;
    const timer = setTimeout(() => setFeedback(null), 8_000);
    return () => clearTimeout(timer);
  }, [feedback]);
  async function run(action: () => Promise<void>, success: string) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ message: success, tone: 'success' });
      return true;
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.',
        tone: 'error',
      });
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    run,
    feedback: feedback && (
      <div className={feedback.tone === 'success' ? 'feedback-toast' : undefined}>
        <Notice tone={feedback.tone}>{feedback.message}</Notice>
        {feedback.tone === 'success' && (
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setFeedback(null)}
          >
            <X size={18} />
          </button>
        )}
      </div>
    ),
  };
}
