import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppContextValue, AppData, AppUser } from '../types';
import { emptyData } from '../data/seed';
import { configurationError, firebaseMode } from '../config/firebase';
import { DemoBackend } from '../services/demo';
import { FirebaseBackend } from '../services/firebase';
import type { Backend } from '../services/backend';
import { friendlyError } from '../services/validation';

const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [backend] = useState<Backend>(() =>
    firebaseMode === 'firebase' ? new FirebaseBackend() : new DemoBackend(),
  );
  const [data, setData] = useState<AppData>(emptyData),
    [user, setUser] = useState<AppUser | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(configurationError);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (configurationError) throw new Error(configurationError);
      const [profile, next] = await Promise.race([
        Promise.all([backend.getUser(), backend.getData()]),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  'O serviço demorou para responder. Confira sua conexão e tente novamente.',
                ),
              ),
            15_000,
          );
        }),
      ]);
      if (current === generation.current) {
        setUser(profile);
        setData(next);
        setError(null);
      }
    } catch (cause) {
      if (current === generation.current) {
        setError(friendlyError(cause));
        setUser(null);
        setData(emptyData());
      }
    } finally {
      clearTimeout(timer);
      if (current === generation.current) setLoading(false);
    }
  }, [backend]);
  useEffect(() => {
    void refresh();
    if (configurationError) return;
    const unsubscribe = backend.subscribe(() => {
      setData(emptyData());
      setLoading(true);
      void refresh();
    });
    return () => {
      generation.current++;
      unsubscribe();
    };
  }, [backend, refresh]);
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
    login: (email, password) => execute(() => backend.login(email, password)),
    register: (name, email, password) => execute(() => backend.register(name, email, password)),
    loginDemo: (role) => execute(() => backend.loginDemo(role)),
    logout: () => execute(() => backend.logout()),
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
        if (user?.role === 'admin') await refresh();
      } catch {
        /* Metrics must never block the public search flow. */
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
