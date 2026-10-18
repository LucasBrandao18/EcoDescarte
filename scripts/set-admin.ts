import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2),
  value = (key: string) => args.find((arg) => arg.startsWith(`--${key}=`))?.slice(key.length + 3);
const projectId = value('project') || process.env.GCLOUD_PROJECT,
  uid = value('uid'),
  revoke = args.includes('--revoke');
if (!projectId || !uid)
  throw new Error(
    'Uso: npm run admin -- --project=SEU_PROJETO --uid=UID_DO_USUARIO --confirm-write [--revoke]',
  );
if (!args.includes('--confirm-write'))
  throw new Error(
    `Revise o UID ${uid} no projeto ${projectId}. Inclua --confirm-write para ${revoke ? 'remover' : 'conceder'} o acesso administrativo.`,
  );
const emulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (emulator && !process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error(
    'Defina também FIRESTORE_EMULATOR_HOST para evitar misturar emulador de Auth com banco real.',
  );
initializeApp({ projectId, ...(emulator ? {} : { credential: applicationDefault() }) });
const auth = getAuth(),
  user = await auth.getUser(uid),
  claims = { ...user.customClaims };
if (revoke) delete claims.admin;
else claims.admin = true;
await auth.setCustomUserClaims(uid, claims);
const profile = getFirestore().collection('users').doc(uid);
if ((await profile.get()).exists) await profile.update({ role: revoke ? 'user' : 'admin' });
await auth.revokeRefreshTokens(uid);
console.log(
  `Acesso administrativo ${revoke ? 'removido' : 'concedido'} para ${user.email || uid} no projeto ${projectId}. A pessoa deve sair e entrar novamente. Tokens já emitidos podem durar até uma hora.`,
);
