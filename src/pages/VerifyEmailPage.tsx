import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { AuthRequired, Loading, Notice, useFeedback } from '../components/UI';
import {
  authDestination,
  clearVerificationReturn,
  rememberVerificationReturn,
  verificationReturn,
} from '../utils/authNavigation';

function maskedEmail(email: string) {
  const [name, domain] = email.split('@');
  return domain ? `${name.slice(0, 2)}***@${domain}` : 'seu endereço de e-mail';
}

export default function VerifyEmailPage() {
  const {
    user,
    mode,
    loading,
    registering,
    registrationResult,
    verificationBusy,
    verificationError,
    verificationSentAt,
    checkEmailVerification,
    resendVerificationEmail,
    repairProfile,
    logout,
    error,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { busy, run, feedback } = useFeedback();
  const [now, setNow] = useState(Date.now());
  const fallback = user?.role === 'admin' ? '/admin' : '/perfil';
  const destination = location.state?.from
    ? authDestination(location.state.from, fallback)
    : user
      ? verificationReturn(user.id, fallback)
      : fallback;
  const outcome = registrationResult?.userId === user?.id ? registrationResult : null;
  useEffect(() => {
    if (user && !user.emailVerified && location.state?.from)
      rememberVerificationReturn(user.id, destination);
    if (
      user?.emailVerified &&
      !loading &&
      !registering &&
      !error &&
      outcome?.profileReady !== false
    ) {
      clearVerificationReturn();
      navigate(destination, { replace: true });
    }
  }, [
    user?.id,
    user?.emailVerified,
    loading,
    registering,
    error,
    outcome?.profileReady,
    destination,
    navigate,
    location.state,
  ]);
  useEffect(() => {
    if (!verificationSentAt) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time - verificationSentAt >= 60_000) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationSentAt]);
  if (loading || registering) return <Loading />;
  if (!user)
    return (
      <div className="container page">
        <AuthRequired />
      </div>
    );
  const remaining = verificationSentAt
    ? Math.max(0, Math.ceil((60_000 - (now - verificationSentAt)) / 1000))
    : 0;
  const disabled = busy || verificationBusy;
  return (
    <div className="container page verification-page">
      <section className="panel verification-card" aria-labelledby="verification-title">
        <MailCheck size={42} aria-hidden="true" />
        <h1 id="verification-title">
          {user.emailVerified ? 'Seu e-mail está confirmado' : 'Confirme seu e-mail'}
        </h1>
        {mode === 'demo' ? (
          <Notice>Esta é uma demonstração local. Nenhum e-mail é enviado.</Notice>
        ) : (
          <>
            <p>
              {verificationSentAt ? 'Solicitamos o envio de um link para ' : 'Confirme o endereço '}
              <strong>{maskedEmail(user.email)}</strong> para contribuir com o EcoDescarte.
            </p>
            <p>
              Abra o link recebido. Confira também a pasta de spam. Ao voltar a esta aba,
              consultaremos a confirmação; você também pode usar “Já confirmei”.
            </p>
          </>
        )}
        {outcome?.verification === 'failed' && !verificationSentAt && (
          <Notice tone="warning">
            Sua conta foi criada, mas não conseguimos enviar o e-mail. Use “Reenviar e-mail” para
            tentar novamente. {outcome.verificationError}
          </Notice>
        )}
        {outcome?.profileWarning && <Notice tone="warning">{outcome.profileWarning}</Notice>}
        {verificationError && <Notice tone="error">{verificationError}</Notice>}
        {feedback}
        <div className="verification-actions">
          {!user.emailVerified && mode === 'firebase' && (
            <>
              <button
                className="button primary"
                disabled={disabled}
                onClick={() =>
                  void run(async () => {
                    if (!(await checkEmailVerification()))
                      throw new Error(
                        'Seu e-mail ainda não foi confirmado. Abra o link recebido e tente novamente.',
                      );
                  }, 'E-mail confirmado. Abrindo sua conta…')
                }
              >
                {' '}
                {verificationBusy ? 'Consultando…' : 'Já confirmei'}
              </button>
              <button
                className="button secondary"
                disabled={disabled || remaining > 0}
                onClick={() =>
                  void run(async () => {
                    await resendVerificationEmail();
                  }, 'Solicitação concluída. Se o e-mail estiver pendente, confira a mensagem recebida.')
                }
              >
                {remaining > 0 ? `Reenviar em ${remaining}s` : 'Reenviar e-mail'}
              </button>
            </>
          )}
          {(outcome?.profileReady === false || error) && (
            <button
              className="button secondary"
              disabled={disabled}
              onClick={() => void run(repairProfile, 'Perfil preparado.')}
            >
              Tentar preparar perfil
            </button>
          )}
          <Link to="/perfil" className="text-link">
            Consultar meu perfil e histórico
          </Link>
          <button
            className="button secondary"
            disabled={disabled}
            onClick={() =>
              void run(async () => {
                await logout();
                clearVerificationReturn();
                navigate('/', { replace: true });
              }, 'Você saiu da conta.')
            }
          >
            Sair
          </button>
        </div>
        <p className="small-text muted">
          A confirmação é necessária para sugerir pontos, registrar descartes, avaliar e editar seu
          perfil. A consulta ao catálogo e ao mapa permanece disponível.
        </p>
      </section>
    </div>
  );
}
