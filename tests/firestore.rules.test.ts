import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { seedPoints, seedWastes } from '../src/data/seed';

const run = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
setLogLevel('silent');
run('Firestore: autorização e integridade', () => {
  let env: RulesTestEnvironment;
  const user = () => env.authenticatedContext('alice', { email: 'alice@example.com' }).firestore();
  const other = () => env.authenticatedContext('bob', { email: 'bob@example.com' }).firestore();
  const admin = () =>
    env.authenticatedContext('admin', { email: 'admin@example.com', admin: true }).firestore();
  const visitor = () => env.unauthenticatedContext().firestore();
  const disposal = () => ({
    userId: 'alice',
    wasteId: 'papel',
    collectionPointId: 'demo-centro',
    quantity: 2,
    date: '2026-01-01',
    createdAt: serverTimestamp(),
  });
  const suggestion = () => ({
    userId: 'alice',
    name: 'Ponto teste',
    address: 'Rua teste',
    number: '1',
    district: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01000-000',
    acceptedWasteIds: ['papel'],
    openingHours: '8h às 17h',
    phone: '',
    observation: '',
    status: 'PENDENTE',
    createdAt: serverTimestamp(),
  });
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-ecodescarte',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
  });
  afterAll(async () => {
    await env?.cleanup();
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore(),
        batch = writeBatch(db);
      for (const waste of seedWastes) {
        const { id, createdAt, updatedAt, ...fields } = waste;
        batch.set(doc(db, 'wastes', id), {
          ...fields,
          createdAt: Timestamp.fromDate(new Date(createdAt)),
          updatedAt: Timestamp.fromDate(new Date(updatedAt)),
        });
      }
      for (const point of seedPoints) {
        const { id, createdAt, updatedAt, ...fields } = point;
        batch.set(doc(db, 'collectionPoints', id), {
          ...fields,
          createdAt: Timestamp.fromDate(new Date(createdAt)),
          updatedAt: Timestamp.fromDate(new Date(updatedAt)),
        });
      }
      batch.set(doc(db, 'users', 'alice'), {
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user',
        photoURL: '',
        createdAt: Timestamp.now(),
      });
      batch.set(doc(db, 'wastes', 'hidden'), { ...seedWastes[0], active: false });
      await batch.commit();
    });
  });
  it('permite leitura pública filtrada e bloqueia itens inativos e consultas amplas', async () => {
    await assertSucceeds(
      getDocs(query(collection(visitor(), 'wastes'), where('active', '==', true))),
    );
    await assertSucceeds(getDoc(doc(visitor(), 'collectionPoints', 'demo-centro')));
    await assertFails(getDoc(doc(visitor(), 'wastes', 'hidden')));
    await assertFails(getDocs(collection(visitor(), 'wastes')));
    await assertSucceeds(getDocs(collection(admin(), 'wastes')));
  });
  it('protege perfis, papéis e EcoPontos contra alterações do cliente', async () => {
    await assertSucceeds(updateDoc(doc(user(), 'users', 'alice'), { name: 'Alice Silva' }));
    await assertFails(updateDoc(doc(user(), 'users', 'alice'), { role: 'admin' }));
    await assertFails(updateDoc(doc(user(), 'users', 'alice'), { ecoPoints: 500 }));
    await assertFails(updateDoc(doc(other(), 'users', 'alice'), { name: 'Invasor' }));
    await assertFails(getDoc(doc(other(), 'users', 'alice')));
    await assertFails(
      setDoc(doc(other(), 'users', 'bob'), {
        name: 'Bob',
        email: 'bob@example.com',
        role: 'admin',
        photoURL: '',
        createdAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(other(), 'users', 'bob'), {
        name: 'Bob',
        email: 'bob@example.com',
        role: 'user',
        photoURL: '',
        createdAt: serverTimestamp(),
      }),
    );
  });
  it('aceita somente a claim administrativa, não um papel gravado no perfil', async () => {
    await env.withSecurityRulesDisabled((context) =>
      updateDoc(doc(context.firestore(), 'users', 'alice'), { role: 'admin' }),
    );
    await assertFails(
      updateDoc(doc(user(), 'wastes', 'papel'), { active: false, updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      updateDoc(doc(admin(), 'wastes', 'papel'), { active: false, updatedAt: serverTimestamp() }),
    );
  });
  it('valida dono, quantidade e compatibilidade no descarte e impede edição posterior', async () => {
    await assertSucceeds(setDoc(doc(user(), 'disposals', 'valid'), disposal()));
    await assertFails(setDoc(doc(other(), 'disposals', 'spoof'), disposal()));
    await assertFails(
      setDoc(doc(user(), 'disposals', 'incompatible'), { ...disposal(), wasteId: 'pilha' }),
    );
    await assertFails(setDoc(doc(user(), 'disposals', 'zero'), { ...disposal(), quantity: 0 }));
    await assertFails(
      setDoc(doc(user(), 'disposals', 'fraction'), { ...disposal(), quantity: 1.5 }),
    );
    await assertFails(setDoc(doc(user(), 'disposals', 'score'), { ...disposal(), ecoPoints: 999 }));
    await assertFails(updateDoc(doc(user(), 'disposals', 'valid'), { quantity: 20 }));
    await assertSucceeds(
      getDocs(query(collection(user(), 'disposals'), where('userId', '==', 'alice'))),
    );
    await assertFails(getDoc(doc(other(), 'disposals', 'valid')));
  });
  it('cria somente sugestões pendentes e exige publicação atômica na aprovação', async () => {
    await assertSucceeds(setDoc(doc(user(), 'suggestions', 's1'), suggestion()));
    await assertFails(
      setDoc(doc(user(), 'suggestions', 'approved'), { ...suggestion(), status: 'APROVADO' }),
    );
    await assertFails(updateDoc(doc(user(), 'suggestions', 's1'), { status: 'APROVADO' }));
    await assertFails(
      updateDoc(doc(admin(), 'suggestions', 's1'), {
        status: 'APROVADO',
        pointId: 'suggestion_s1',
        reviewedAt: serverTimestamp(),
      }),
    );
    const db = admin(),
      batch = writeBatch(db);
    const { id, createdAt, updatedAt, ...point } = seedPoints[0];
    void id;
    void createdAt;
    void updatedAt;
    batch.set(doc(db, 'collectionPoints', 'suggestion_s1'), {
      ...point,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'suggestions', 's1'), {
      status: 'APROVADO',
      pointId: 'suggestion_s1',
      reviewedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
    await assertFails(
      updateDoc(doc(admin(), 'suggestions', 's1'), {
        status: 'REJEITADO',
        rejectionReason: 'Duplicado',
        reviewedAt: serverTimestamp(),
      }),
    );
  });
  it('exige avaliação única com atualização atômica da média', async () => {
    const db = user(),
      review = {
        userId: 'alice',
        pointId: 'demo-centro',
        rating: 4,
        confirmed: true,
        comment: 'Conferido',
        createdAt: serverTimestamp(),
      };
    await assertFails(setDoc(doc(db, 'reviews', 'alice_demo-centro'), review));
    await assertFails(
      updateDoc(doc(db, 'collectionPoints', 'demo-centro'), {
        rating: 5,
        totalReviews: 100,
        updatedAt: serverTimestamp(),
      }),
    );
    const batch = writeBatch(db);
    batch.set(doc(db, 'reviews', 'alice_demo-centro'), review);
    batch.update(doc(db, 'collectionPoints', 'demo-centro'), {
      rating: 4,
      totalReviews: 1,
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
    await assertFails(setDoc(doc(db, 'reviews', 'alice_demo-centro'), { ...review, rating: 5 }));
    await assertFails(setDoc(doc(db, 'reviews', 'other-id'), review));
    await assertFails(getDoc(doc(other(), 'reviews', 'alice_demo-centro')));
  });
  it('registra pesquisa de visitante com identidade nula e protege as métricas', async () => {
    await assertSucceeds(
      setDoc(doc(visitor(), 'searchLogs', 'visit'), {
        term: 'papel',
        wasteId: 'papel',
        userId: null,
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(visitor(), 'searchLogs', 'spoof'), {
        term: 'papel',
        wasteId: 'papel',
        userId: 'alice',
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(getDocs(collection(user(), 'searchLogs')));
    await assertSucceeds(getDocs(collection(admin(), 'searchLogs')));
  });
  it('permite a leitura ausente e a primeira avaliação por transação', async () => {
    const db = user();
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        const pointRef = doc(db, 'collectionPoints', 'demo-centro');
        const reviewRef = doc(db, 'reviews', 'alice_demo-centro');
        const [point, review] = await Promise.all([tx.get(pointRef), tx.get(reviewRef)]);
        if (review.exists()) throw new Error('Avaliação já existe.');
        const old = point.data()!;
        tx.set(reviewRef, {
          userId: 'alice',
          pointId: 'demo-centro',
          rating: 3,
          confirmed: true,
          comment: '',
          createdAt: serverTimestamp(),
        });
        tx.update(pointRef, {
          rating: (old.rating * old.totalReviews + 3) / (old.totalReviews + 1),
          totalReviews: old.totalReviews + 1,
          updatedAt: serverTimestamp(),
        });
      }),
    );
    await assertFails(getDoc(doc(visitor(), 'reviews', 'alice_demo-centro')));
  });
  it('recusa datas impossíveis, futuras e anteriores ao intervalo permitido', async () => {
    for (const date of [
      '2099-01-01',
      '2026-02-30',
      '2026-13-01',
      '2026-00-01',
      '1999-12-31',
      '2026-01-00',
    ]) {
      await assertFails(setDoc(doc(user(), 'disposals', `date-${date}`), { ...disposal(), date }));
    }
    await assertSucceeds(
      setDoc(doc(user(), 'disposals', 'leap'), { ...disposal(), date: '2024-02-29' }),
    );
  });
});
