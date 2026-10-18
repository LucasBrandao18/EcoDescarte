import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const environment = import.meta.env;
const options = {
  apiKey: environment.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: environment.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: environment.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: environment.VITE_FIREBASE_APP_ID?.trim(),
};
const configured = Object.values(options).some(Boolean);
const complete = !!(options.apiKey && options.authDomain && options.projectId && options.appId);
const requestedMode = environment.VITE_DATA_MODE || 'auto';
export const firebaseMode =
  requestedMode === 'demo'
    ? 'demo'
    : configured || requestedMode === 'firebase'
      ? 'firebase'
      : 'demo';
export const configurationError = !['auto', 'demo', 'firebase'].includes(requestedMode)
  ? 'Modo de dados inválido. Use auto, demo ou firebase em VITE_DATA_MODE.'
  : firebaseMode === 'firebase' && !complete
    ? 'Configuração do Firebase incompleta. Preencha API_KEY, AUTH_DOMAIN, PROJECT_ID e APP_ID no arquivo .env e reinicie o servidor.'
    : null;
export function getFirebase() {
  if (configurationError) throw new Error(configurationError);
  if (!complete) throw new Error('O Firebase não está configurado.');
  const app = getApps().length ? getApp() : initializeApp(options);
  const auth = getAuth(app),
    db = getFirestore(app);
  if (environment.VITE_USE_EMULATORS === 'true' && !emulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    emulatorsConnected = true;
  }
  return { auth, db };
}
let emulatorsConnected = false;
