import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  setLogLevel,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { confirmPasswordReset, getIdToken, verifyPasswordResetCode } from 'firebase/auth';
import { seedPoints, seedWastes } from '../src/data/seed';
import { userStats } from '../src/utils/domain';

const enabled =
  process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080' &&
  process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099';
setLogLevel('silent');
const projectId = 'demo-ecodescarte';
describe.skipIf(!enabled)('FirebaseBackend com Authentication e Firestore emulados', () => {
  let env: RulesTestEnvironment;
  let backend: import('../src/services/firebase').FirebaseBackend;
  let connection: ReturnType<typeof import('../src/config/firebase').getFirebase>;
  const adminApp = initializeAdmin({ projectId }, 'integration');
  beforeAll(async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'demo-key-only');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', `${projectId}.firebaseapp.com`);
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', projectId);
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:demo');
    vi.stubEnv('VITE_USE_EMULATORS', 'true');
    vi.stubEnv('VITE_DATA_MODE', 'firebase');
    env = await initializeTestEnvironment({
      projectId,
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
    await env.clearFirestore();
    await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`, {
      method: 'DELETE',
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore(),
        batch = writeBatch(db);
      for (const [name, entries] of [
        ['wastes', seedWastes],
        ['collectionPoints', seedPoints],
      ] as const) {
        for (const entry of entries) {
          const { id, createdAt, updatedAt, ...fields } = entry;
          batch.set(doc(db, name, id), {
            ...fields,
            createdAt: Timestamp.fromDate(new Date(createdAt)),
            updatedAt: Timestamp.fromDate(new Date(updatedAt)),
          });
        }
      }
      await batch.commit();
    });
    const { FirebaseBackend } = await import('../src/services/firebase');
    backend = new FirebaseBackend();
    connection = (await import('../src/config/firebase')).getFirebase();
  }, 30_000);
  afterAll(async () => {
    await backend?.logout();
    await env?.cleanup();
    await deleteAdmin(adminApp);
    vi.unstubAllEnvs();
  });
  it('autentica, recupera senha e persiste descartes, avaliação e aprovação com isolamento por usuário', async () => {
    expect((await backend.getData()).wastes).toHaveLength(22);
    await backend.logSearch('pilha', 'pilha');
    await backend.register('Alice Firebase', 'alice.integration@example.com', 'SenhaInicial123!');
    const alice = (await backend.getUser())!;
    expect(alice.role).toBe('user');
    await backend.updateProfile('Alice Integração');
    expect((await backend.getUser())?.name).toBe('Alice Integração');
    await backend.recordDisposal({
      wasteId: 'pilha',
      collectionPointId: 'demo-pinheiros',
      quantity: 4,
      date: '2026-01-01',
    });
    await backend.reviewPoint({
      pointId: 'demo-pinheiros',
      rating: 4,
      comment: 'Confirmação de teste emulado.',
    });
    await expect(
      backend.reviewPoint({ pointId: 'demo-pinheiros', rating: 5, comment: '' }),
    ).rejects.toThrow('já confirmou');
    await backend.suggestPoint({
      name: 'Ponto da integração',
      address: 'Rua de teste',
      number: '1',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01001000',
      acceptedWasteIds: ['pilha'],
      openingHours: '09:00 - 17:00',
      phone: '',
      observation: 'Teste do serviço real com emuladores.',
    });
    const contribution = (await backend.getData()).suggestions[0];
    expect(userStats(await backend.getData(), alice.id).ecoPoints).toBe(15);
    await backend.resetPassword(alice.email);
    const oob = (await (
      await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`)
    ).json()) as { oobCodes: { email: string; oobCode: string }[] };
    const code = oob.oobCodes.find((c) => c.email === alice.email)!.oobCode;
    expect(await verifyPasswordResetCode(connection.auth, code)).toBe(alice.email);
    await confirmPasswordReset(connection.auth, code, 'SenhaNova123!');
    await backend.logout();
    await expect(backend.login(alice.email, 'SenhaInicial123!')).rejects.toBeTruthy();
    await backend.login(alice.email, 'SenhaNova123!');
    expect((await backend.getUser())?.id).toBe(alice.id);
    await backend.logout();
    await backend.register('Admin Firebase', 'admin.integration@example.com', 'SenhaAdmin123!');
    const adminUser = (await backend.getUser())!;
    await getAdminAuth(adminApp).setCustomUserClaims(adminUser.id, { admin: true });
    await getIdToken(connection.auth.currentUser!, true);
    expect((await backend.getUser())?.role).toBe('admin');
    await backend.moderateSuggestion(contribution.id, true, { lat: -23.55, lng: -46.63 });
    await expect(
      backend.moderateSuggestion(contribution.id, true, { lat: -23.55, lng: -46.63 }),
    ).rejects.toThrow('já foi analisada');
    await backend.saveWaste({ ...seedWastes[0], name: 'Pilha revisada' });
    await backend.savePoint({ ...seedPoints[1], openingHours: 'Sábados 9h–12h' });
    const adminData = await backend.getData();
    expect(adminData.searchLogs).toHaveLength(1);
    expect(adminData.points.find((p) => p.id === 'demo-pinheiros')).toMatchObject({
      rating: 4,
      totalReviews: 1,
      openingHours: 'Sábados 9h–12h',
    });
    await backend.logout();
    await backend.login(alice.email, 'SenhaNova123!');
    expect(userStats(await backend.getData(), alice.id).ecoPoints).toBe(45);
    await expect(
      setDoc(doc(connection.db, 'users', alice.id), { role: 'admin' }, { merge: true }),
    ).rejects.toBeTruthy();
    await backend.logout();
    await backend.register('Bob Firebase', 'bob.integration@example.com', 'SenhaBob123!');
    const bobData = await backend.getData();
    expect(bobData.disposals).toHaveLength(0);
    expect(bobData.reviews).toHaveLength(0);
    expect(bobData.suggestions).toHaveLength(0);
    await expect(getDocs(collection(connection.db, 'disposals'))).rejects.toBeTruthy();
  }, 60_000);
});
