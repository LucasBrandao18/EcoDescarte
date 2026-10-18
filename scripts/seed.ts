import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { seedPoints, seedWastes } from '../src/data/seed';

const args = process.argv.slice(2),
  projectId =
    args.find((arg) => arg.startsWith('--project='))?.split('=')[1] || process.env.GCLOUD_PROJECT;
if (!projectId)
  throw new Error(
    'Informe o projeto: npm run seed -- --project=SEU_PROJETO. Para teste, inicie o emulador e use FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.',
  );
const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
if (!emulator && !args.includes('--confirm-write'))
  throw new Error(
    `O seed adicionará dados fictícios ao projeto ${projectId}. Revise o projeto e execute novamente com --confirm-write. Registros existentes serão preservados.`,
  );
initializeApp({ projectId, ...(emulator ? {} : { credential: applicationDefault() }) });
const db = getFirestore();
let inserted = 0,
  skipped = 0;
for (const [collection, entries] of [
  ['wastes', seedWastes],
  ['collectionPoints', seedPoints],
] as const) {
  for (const entry of entries) {
    const { id, createdAt, updatedAt, ...fields } = entry;
    const ref = db.collection(collection).doc(id);
    try {
      await ref.create({
        ...fields,
        createdAt: Timestamp.fromDate(new Date(createdAt)),
        updatedAt: Timestamp.fromDate(new Date(updatedAt)),
      });
      inserted++;
    } catch (error) {
      if ((error as { code?: number }).code === 6) skipped++;
      else throw error;
    }
  }
}
console.log(
  `Seed concluído em ${projectId}${emulator ? ' (emulador)' : ''}: ${inserted} inseridos, ${skipped} existentes preservados. Todos os pontos são fictícios e têm demo=true.`,
);
