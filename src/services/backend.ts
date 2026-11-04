import type { AppContextValue, AppData, AppUser } from '../types';
export type Backend = Omit<
  AppContextValue,
  | 'data'
  | 'user'
  | 'loading'
  | 'error'
  | 'refresh'
  | 'registering'
  | 'registrationResult'
  | 'verificationBusy'
  | 'verificationError'
  | 'verificationSentAt'
> & {
  getUser: () => Promise<AppUser | null>;
  getData: () => Promise<AppData>;
  subscribe: (callback: () => void) => () => void;
};
