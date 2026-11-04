import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppContextValue, AppData, AppUser, RegistrationResult } from '../types';
import { emptyData } from '../data/seed';
import { configurationError, firebaseMode } from '../config/firebase';
import { DemoBackend } from '../services/demo';
import { FirebaseBackend } from '../services/firebase';
import type { Backend } from '../services/backend';
import { friendlyError } from '../services/validation';

const AppContext = createContext<AppContextValue | null>(null);
function publicData(previous: AppData): AppData {
  return {
    ...emptyData(),
    wastes: previous.wastes.filter((w) => w.active),
    points: previous.points.filter((p) => p.active),
  };
}
async function bounded<T>(action: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      action,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error('O serviço demorou para responder. Confira sua conexão e tente novamente.'),
            ),
          15_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [backend] = useState<Backend>(() =>
    firebaseMode === 'firebase' ? new FirebaseBackend() : new DemoBackend(),
  );
  const [data, setData] = useState<AppData>(emptyData);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(configurationError);
  const [registering, setRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSentAt, setVerificationSentAt] = useState<number | null>(null);
  const generation = useRef(0);
  const sessionId = useRef<string | null>(null);
  const sessionVersion = useRef(0);
  const registeringRef = useRef(false);
  const operation = useRef<Promise<unknown> | null>(null);
  const operationKind = useRef<'check' | 'resend' | null>(null);

  const clearSession = useCallback(() => {
    generation.current++;
    sessionVersion.current++;
    sessionId.current = null;
    operation.current = null;
    operationKind.current = null;
    setUser(null);
    setData(publicData);
    setRegistrationResult(null);
    setVerificationSentAt(null);
    setVerificationError(null);
    setVerificationBusy(false);
  }, []);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    let sessionResolved = false;
    try {
      if (configurationError) throw new Error(configurationError);
      const session = await bounded(backend.getUser());
      if (current !== generation.current) return;
      sessionResolved = true;
      if (sessionId.current !== (session?.id || null)) {
        sessionVersion.current++;
        sessionId.current = session?.id || null;
        setData(publicData);
        setVerificationSentAt(null);
        setVerificationError(null);
        setRegistrationResult((previous) => (previous?.userId === session?.id ? previous : null));
      }
      setUser(session);
      setLoading(false);
      const next = await bounded(backend.getData());
      if (current !== generation.current) return;
      const profile = next.users.find((p) => p.id === session?.id);
      setUser(
        session && profile
          ? {
              ...session,
              name: profile.name,
              photoURL: profile.photoURL,
              createdAt: profile.createdAt,
            }
          : session,
      );
      setData(next);
      setError(null);
    } catch (cause) {
      if (current !== generation.current) return;
      setError(friendlyError(cause));
      if (!sessionResolved) {
        sessionVersion.current++;
        sessionId.current = null;
        setUser(null);
      }
      setData(publicData);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    void refresh();
    if (configurationError) return;
    const unsubscribe = backend.subscribe(() => {
      void refresh();
    });
    return () => {
      generation.current++;
      sessionVersion.current++;
      unsubscribe();
    };
  }, [backend, refresh]);

  const checkEmailVerification = useCallback((): Promise<boolean> => {
    if (operation.current) {
      if (operationKind.current === 'resend') {
        const queuedUid = sessionId.current;
        return operation.current.then(() =>
          sessionId.current === queuedUid ? checkEmailVerification() : false,
        );
      }
      return operation.current as Promise<boolean>;
    }
    const uid = sessionId.current;
    const version = sessionVersion.current;
    setVerificationBusy(true);
    setVerificationError(null);
    const task = Promise.resolve().then(async () => {
      try {
        const verified = await backend.checkEmailVerification();
        if (sessionId.current !== uid || sessionVersion.current !== version) return false;
        await refresh();
        return sessionId.current === uid && sessionVersion.current === version && verified;
      } catch (cause) {
        const message = friendlyError(cause);
        if (sessionId.current === uid && sessionVersion.current === version)
          setVerificationError(message);
        throw new Error(message);
      } finally {
        if (operation.current === task) {
          operation.current = null;
          operationKind.current = null;
          setVerificationBusy(false);
        }
      }
    });
    operation.current = task;
    operationKind.current = 'check';
    return task;
  }, [backend, refresh]);

  useEffect(() => {
    if (backend.mode !== 'firebase' || !user || user.emailVerified || registering) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible')
        void checkEmailVerification().catch(() => undefined);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [backend.mode, user?.id, user?.emailVerified, registering, checkEmailVerification]);

  const execute = async (action: () => Promise<void>) => {
    try {
      await action();
      await refresh();
    } catch (cause) {
      throw new Error(friendlyError(cause));
    }
  };

  const value: AppContextValue = {
    data,
    user,
    mode: backend.mode,
    loading,
    error,
    refresh,
    registering,
    registrationResult,
    verificationBusy,
    verificationError,
    verificationSentAt,
    checkEmailVerification,
    login: async (email, password) => {
      clearSession();
      await execute(() => backend.login(email, password));
    },
    loginDemo: async (role) => {
      clearSession();
      await execute(() => backend.loginDemo(role));
    },
    logout: async () => {
      clearSession();
      await execute(() => backend.logout());
    },
    register: async (name, email, password) => {
      if (registeringRef.current) throw new Error('Aguarde a criação da conta.');
      registeringRef.current = true;
      setRegistering(true);
      setRegistrationResult(null);
      try {
        const result = await backend.register(name, email, password);
        await refresh();
        if (sessionId.current === result.userId) {
          setRegistrationResult(result);
          if (result.verification === 'sent') setVerificationSentAt(Date.now());
        }
        return result;
      } catch (cause) {
        throw new Error(friendlyError(cause));
      } finally {
        registeringRef.current = false;
        setRegistering(false);
      }
    },
    resendVerificationEmail: () => {
      if (operation.current) throw new Error('Aguarde a consulta em andamento.');
      if (verificationSentAt && Date.now() - verificationSentAt < 60_000)
        throw new Error('Aguarde 60 segundos antes de reenviar.');
      const uid = sessionId.current;
      const version = sessionVersion.current;
      setVerificationBusy(true);
      setVerificationError(null);
      const task = Promise.resolve().then(async () => {
        try {
          const result = await backend.resendVerificationEmail();
          if (sessionId.current !== uid || sessionVersion.current !== version)
            throw new Error('A sessão mudou. Entre novamente.');
          if (result === 'sent') {
            setVerificationSentAt(Date.now());
            setRegistrationResult((previous) =>
              previous
                ? { ...previous, verification: 'sent', verificationError: undefined }
                : previous,
            );
          }
          await refresh();
          return result;
        } catch (cause) {
          const message = friendlyError(cause);
          if (sessionId.current === uid && sessionVersion.current === version)
            setVerificationError(message);
          throw new Error(message);
        } finally {
          if (operation.current === task) {
            operation.current = null;
            operationKind.current = null;
            setVerificationBusy(false);
          }
        }
      });
      operation.current = task;
      operationKind.current = 'resend';
      return task;
    },
    repairProfile: () =>
      execute(async () => {
        await backend.repairProfile();
        setRegistrationResult((previous) =>
          previous ? { ...previous, profileReady: true, profileWarning: undefined } : previous,
        );
      }),
    resetPassword: async (email) => {
      try {
        await backend.resetPassword(email);
      } catch (cause) {
        throw new Error(friendlyError(cause));
      }
    },
    updateProfile: (name) => execute(() => backend.updateProfile(name)),
    saveWaste: (waste) => execute(() => backend.saveWaste(waste)),
    savePoint: (point) => execute(() => backend.savePoint(point)),
    suggestPoint: (input) => execute(() => backend.suggestPoint(input)),
    moderateSuggestion: (id, approve, coordinates, reason) =>
      execute(() => backend.moderateSuggestion(id, approve, coordinates, reason)),
    recordDisposal: (input) => execute(() => backend.recordDisposal(input)),
    reviewPoint: (input) => execute(() => backend.reviewPoint(input)),
    logSearch: async (term, wasteId) => {
      try {
        await backend.logSearch(term, wasteId);
        if (user?.role === 'admin' && user.emailVerified) await refresh();
      } catch {
        /* Metrics must never block public search. */
      }
    },
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp deve estar dentro de AppProvider.');
  return context;
}
