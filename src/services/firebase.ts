import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebase } from '../config/firebase';
import type {
  AppData,
  AppUser,
  CollectionPoint,
  DisposalInput,
  ReviewInput,
  SuggestionInput,
  Waste,
} from '../types';
import type { Backend } from './backend';
import {
  credentials,
  now,
  required,
  validateDisposal,
  validatePoint,
  validateReview,
  validateSuggestion,
  validateWaste,
} from './validation';

function decode<T>(id: string, data: DocumentData): T {
  return {
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value instanceof Timestamp ? value.toDate().toISOString() : value,
      ]),
    ),
    id,
  } as T;
}

export class FirebaseBackend implements Backend {
  readonly mode = 'firebase' as const;
  private get connection() {
    return getFirebase();
  }
  subscribe = (callback: () => void) => onIdTokenChanged(this.connection.auth, () => callback());
  getUser = async (): Promise<AppUser | null> => {
    const { auth, db } = this.connection;
    await auth.authStateReady();
    const authUser = auth.currentUser;
    if (!authUser) return null;
    const [token, snapshot] = await Promise.all([
      getIdTokenResult(authUser),
      getDoc(doc(db, 'users', authUser.uid)),
    ]);
    const saved = snapshot.exists() ? decode<AppUser>(snapshot.id, snapshot.data()) : null;
    return {
      id: authUser.uid,
      name: saved?.name || authUser.displayName || 'Participante',
      email: authUser.email || '',
      role: token.claims.admin === true ? 'admin' : 'user',
      photoURL: saved?.photoURL || authUser.photoURL || '',
      createdAt: saved?.createdAt || authUser.metadata.creationTime || now(),
    };
  };
  private async requireUser(admin = false) {
    const user = await this.getUser();
    if (!user) throw new Error('Entre na sua conta para continuar.');
    if (admin && user.role !== 'admin') throw new Error('Esta ação é restrita a administradores.');
    return user;
  }
  getData = async (): Promise<AppData> => {
    const user = await this.getUser(),
      { db } = this.connection,
      isAdmin = user?.role === 'admin';
    const read = async <T>(name: string, filter?: [string, unknown]) => {
      const source = collection(db, name);
      const snapshot = await getDocs(
        filter ? query(source, where(filter[0], '==', filter[1])) : source,
      );
      return snapshot.docs.map((item) => decode<T>(item.id, item.data()));
    };
    const [wastes, points, users, suggestions, disposals, reviews, searchLogs] = await Promise.all([
      read<Waste>('wastes', isAdmin ? undefined : ['active', true]),
      read<CollectionPoint>('collectionPoints', isAdmin ? undefined : ['active', true]),
      isAdmin ? read<AppUser>('users') : Promise.resolve(user ? [user] : []),
      user
        ? read<AppData['suggestions'][number]>(
            'suggestions',
            isAdmin ? undefined : ['userId', user.id],
          )
        : Promise.resolve([]),
      user
        ? read<AppData['disposals'][number]>('disposals', isAdmin ? undefined : ['userId', user.id])
        : Promise.resolve([]),
      user
        ? read<AppData['reviews'][number]>('reviews', isAdmin ? undefined : ['userId', user.id])
        : Promise.resolve([]),
      isAdmin ? read<AppData['searchLogs'][number]>('searchLogs') : Promise.resolve([]),
    ]);
    return { wastes, points, users, suggestions, disposals, reviews, searchLogs };
  };
  login = async (email: string, password: string) => {
    credentials(email);
    await signInWithEmailAndPassword(this.connection.auth, email.trim(), password);
  };
  register = async (name: string, email: string, password: string) => {
    required(name, 'Nome', 100);
    credentials(email, password);
    const { auth, db } = this.connection;
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, 'users', result.user.uid), {
      name: name.trim(),
      email: result.user.email,
      role: 'user',
      photoURL: '',
      createdAt: serverTimestamp(),
    });
    await updateAuthProfile(result.user, { displayName: name.trim() });
  };
  logout = async () => {
    await signOut(this.connection.auth);
  };
  resetPassword = async (email: string) => {
    credentials(email);
    await sendPasswordResetEmail(this.connection.auth, email.trim());
  };
  loginDemo = async () => {
    throw new Error('Acesso de demonstração está desabilitado quando o Firebase está configurado.');
  };
  updateProfile = async (name: string) => {
    const user = await this.requireUser();
    required(name, 'Nome', 100);
    const { auth, db } = this.connection;
    const ref = doc(db, 'users', user.id);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) await updateDoc(ref, { name: name.trim() });
    else
      await setDoc(ref, {
        name: name.trim(),
        email: user.email,
        role: 'user',
        photoURL: '',
        createdAt: serverTimestamp(),
      });
    await updateAuthProfile(auth.currentUser!, { displayName: name.trim() });
  };
  saveWaste = async (waste: Waste) => {
    await this.requireUser(true);
    validateWaste(waste);
    const { db } = this.connection;
    const ref = doc(db, 'wastes', waste.id),
      existing = await getDoc(ref);
    const { id, ...fields } = waste;
    void id;
    await setDoc(ref, {
      ...fields,
      normalizedName: waste.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };
  savePoint = async (point: CollectionPoint) => {
    await this.requireUser(true);
    validatePoint(point);
    const { db } = this.connection;
    const ref = doc(db, 'collectionPoints', point.id);
    const { id, ...fields } = point;
    void id;
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      tx.set(ref, {
        ...fields,
        rating: existing.data()?.rating || 0,
        totalReviews: existing.data()?.totalReviews || 0,
        createdAt: existing.exists() ? existing.data()!.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  };
  suggestPoint = async (input: SuggestionInput) => {
    const user = await this.requireUser();
    validateSuggestion(input);
    await addDoc(collection(this.connection.db, 'suggestions'), {
      ...input,
      userId: user.id,
      status: 'PENDENTE',
      createdAt: serverTimestamp(),
    });
  };
  moderateSuggestion = async (
    id: string,
    approve: boolean,
    coordinates?: { lat: number; lng: number },
    reason?: string,
  ) => {
    await this.requireUser(true);
    const { db } = this.connection;
    if (approve && !coordinates)
      throw new Error('Informe as coordenadas do ponto antes de aprovar.');
    if (!approve) required(reason || '', 'Motivo da rejeição', 1000);
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'suggestions', id),
        snapshot = await tx.get(ref);
      if (!snapshot.exists()) throw new Error('Sugestão não encontrada.');
      const suggestion = decode<AppData['suggestions'][number]>(id, snapshot.data());
      if (suggestion.status !== 'PENDENTE') throw new Error('Esta sugestão já foi analisada.');
      if (approve) {
        const point: CollectionPoint = {
          id: `suggestion_${id}`,
          name: suggestion.name,
          description: suggestion.observation,
          address: suggestion.address,
          number: suggestion.number,
          district: suggestion.district,
          city: suggestion.city,
          state: suggestion.state,
          zipCode: suggestion.zipCode,
          phone: suggestion.phone,
          website: '',
          openingHours: suggestion.openingHours,
          acceptedWasteIds: suggestion.acceptedWasteIds,
          ...coordinates!,
          verified: true,
          active: true,
          rating: 0,
          totalReviews: 0,
          demo: false,
          createdAt: now(),
          updatedAt: now(),
        };
        validatePoint(point);
        const pointRef = doc(db, 'collectionPoints', point.id);
        const pointSnapshot = await tx.get(pointRef);
        if (pointSnapshot.exists()) throw new Error('Esta sugestão já possui um ponto associado.');
        const { id: pointId, ...fields } = point;
        tx.set(pointRef, { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        tx.update(ref, { status: 'APROVADO', pointId, reviewedAt: serverTimestamp() });
      } else
        tx.update(ref, {
          status: 'REJEITADO',
          rejectionReason: reason!.trim(),
          reviewedAt: serverTimestamp(),
        });
    });
  };
  recordDisposal = async (input: DisposalInput) => {
    const user = await this.requireUser(),
      { db } = this.connection;
    await runTransaction(db, async (tx) => {
      const w = await tx.get(doc(db, 'wastes', input.wasteId)),
        p = await tx.get(doc(db, 'collectionPoints', input.collectionPointId));
      validateDisposal(input, {
        wastes: w.exists() ? [decode<Waste>(w.id, w.data())] : [],
        points: p.exists() ? [decode<CollectionPoint>(p.id, p.data())] : [],
      });
      tx.set(doc(collection(db, 'disposals')), {
        ...input,
        userId: user.id,
        createdAt: serverTimestamp(),
      });
    });
  };
  reviewPoint = async (input: ReviewInput) => {
    const user = await this.requireUser();
    validateReview(input);
    const { db } = this.connection;
    await runTransaction(db, async (tx) => {
      const pointRef = doc(db, 'collectionPoints', input.pointId),
        reviewRef = doc(db, 'reviews', `${user.id}_${input.pointId}`);
      const [p, r] = await Promise.all([tx.get(pointRef), tx.get(reviewRef)]);
      if (!p.exists() || !p.data().active) throw new Error('Este ponto está indisponível.');
      if (r.exists()) throw new Error('Você já confirmou as informações deste ponto.');
      const point = decode<CollectionPoint>(p.id, p.data());
      tx.set(reviewRef, {
        ...input,
        comment: input.comment.trim(),
        userId: user.id,
        confirmed: true,
        createdAt: serverTimestamp(),
      });
      tx.update(pointRef, {
        rating: (point.rating * point.totalReviews + input.rating) / (point.totalReviews + 1),
        totalReviews: point.totalReviews + 1,
        updatedAt: serverTimestamp(),
      });
    });
  };
  logSearch = async (term: string, wasteId: string | null) => {
    const text = term.trim().slice(0, 120);
    if (!text) return;
    const { db, auth } = this.connection;
    await auth.authStateReady();
    await addDoc(collection(db, 'searchLogs'), {
      term: text,
      wasteId,
      userId: auth.currentUser?.uid || null,
      createdAt: serverTimestamp(),
    });
  };
}
