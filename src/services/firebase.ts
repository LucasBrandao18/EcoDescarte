import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  reload,
  sendEmailVerification,
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
  getDocFromServer,
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
import { getFirebase, verificationSettings } from '../config/firebase';
import type {
  AppData,
  AppUser,
  UserProfile,
  RegistrationResult,
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
  friendlyError,
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
    const { auth } = this.connection;
    await auth.authStateReady();
    const authUser = auth.currentUser;
    if (!authUser) return null;
    let claims: Record<string, unknown> = {};
    try {
      claims = (await getIdTokenResult(authUser)).claims;
    } catch {
      /* Keep the Auth identity available for recovery, without granting privileges. */
    }
    if (auth.currentUser !== authUser) return null;
    return {
      id: authUser.uid,
      name: authUser.displayName || 'Participante',
      email: authUser.email || '',
      role: claims.admin === true ? 'admin' : 'user',
      photoURL: authUser.photoURL || '',
      createdAt: authUser.metadata.creationTime || now(),
      emailVerified: authUser.emailVerified && claims.email_verified === true,
    };
  };
  private async requireUser(admin = false) {
    const user = await this.getUser();
    if (!user) throw new Error('Entre na sua conta para continuar.');
    if (!user.emailVerified) throw new Error('Confirme seu e-mail para continuar.');
    if (admin && user.role !== 'admin') throw new Error('Esta ação é restrita a administradores.');
    return user;
  }
  getData = async (): Promise<AppData> => {
    const user = await this.getUser(),
      { db } = this.connection,
      isAdmin = user?.role === 'admin' && user.emailVerified;
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
      isAdmin
        ? read<UserProfile>('users')
        : user
          ? this.readProfile(user.id).then((p) => [p])
          : Promise.resolve([]),
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
    // Auth login succeeded even if Firestore is temporarily unavailable.
    // getData reports a missing/unavailable profile without losing the session.
    await this.repairProfile().catch(() => undefined);
  };
  register = async (name: string, email: string, password: string): Promise<RegistrationResult> => {
    required(name, 'Nome', 100);
    credentials(email, password);
    const settings = verificationSettings();
    const { auth } = this.connection;
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const outcome: RegistrationResult = {
      userId: result.user.uid,
      profileReady: false,
      verification: 'failed',
    };
    try {
      await updateAuthProfile(result.user, { displayName: name.trim() });
    } catch {
      outcome.profileWarning =
        'Sua conta foi criada, mas não foi possível atualizar o nome na autenticação.';
    }
    try {
      await this.createProfile(result.user, name.trim());
      outcome.profileReady = true;
    } catch {
      outcome.profileWarning =
        'Sua conta foi criada. Tente preparar seu perfil novamente; não é necessário refazer o cadastro.';
    }
    try {
      auth.languageCode = 'pt-BR';
      await sendEmailVerification(result.user, settings);
      outcome.verification = 'sent';
    } catch (cause) {
      outcome.verificationError = friendlyError(cause);
    }
    return outcome;
  };
  private async readProfile(id: string): Promise<UserProfile> {
    const snapshot = await getDocFromServer(doc(this.connection.db, 'users', id));
    if (!snapshot.exists())
      throw new Error(
        'Seu perfil ainda precisa ser preparado. Tente preparar o perfil na página de confirmação do e-mail.',
      );
    return decode<UserProfile>(id, snapshot.data());
  }
  private async createProfile(
    user: import('firebase/auth').User,
    name = user.displayName || 'Participante',
  ) {
    const ref = doc(this.connection.db, 'users', user.uid);
    await runTransaction(this.connection.db, async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists())
        tx.set(ref, {
          name,
          email: user.email,
          role: 'user',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
        });
    });
  }
  repairProfile = async () => {
    const { auth } = this.connection;
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error('Entre na sua conta para continuar.');
    await this.createProfile(auth.currentUser);
  };
  private async verificationUser() {
    const { auth } = this.connection;
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) throw new Error('Entre na sua conta para continuar.');
    await reload(user);
    if (auth.currentUser !== user) throw new Error('A sessão mudou. Entre novamente.');
    return user;
  }
  checkEmailVerification = async () => {
    const user = await this.verificationUser();
    if (!user.emailVerified) return false;
    const token = await getIdTokenResult(user, true);
    if (this.connection.auth.currentUser !== user)
      throw new Error('A sessão mudou. Entre novamente.');
    return token.claims.email_verified === true;
  };
  resendVerificationEmail = async (): Promise<'sent' | 'verified'> => {
    const settings = verificationSettings();
    const user = await this.verificationUser();
    if (user.emailVerified) {
      await this.checkEmailVerification();
      return 'verified';
    }
    this.connection.auth.languageCode = 'pt-BR';
    await sendEmailVerification(user, settings);
    return 'sent';
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
