import type {
  AppData,
  AppUser,
  CollectionPoint,
  DisposalInput,
  ReviewInput,
  SuggestionInput,
  Waste,
} from '../types';
import { createDemoData } from '../data/seed';
import type { Backend } from './backend';
import {
  credentials,
  now,
  required,
  uid,
  validateDisposal,
  validatePoint,
  validateReview,
  validateSuggestion,
  validateWaste,
} from './validation';

export const DEMO_STORAGE_KEY = 'ecodescarte-demo-v1';
type Account = { id: string; email: string; salt: string; hash: string };
type StoredDemo = { version: 1; data: AppData; accounts: Account[]; sessionId: string | null };
function load(): StoredDemo {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDemo;
      if (
        parsed.version === 1 &&
        Array.isArray(parsed.data?.wastes) &&
        Array.isArray(parsed.accounts)
      )
        return parsed;
    }
  } catch {
    /* An unavailable or damaged local store starts a fresh, explicitly local demo. */
  }
  return { version: 1, data: createDemoData(), accounts: [], sessionId: null };
}
function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function passwordDigest(password: string, salt: string) {
  if (!crypto.subtle)
    throw new Error('O cadastro local precisa de HTTPS ou localhost para proteger sua senha.');
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 210000 },
    material,
    256,
  );
  return toHex(new Uint8Array(bits));
}
export class DemoBackend implements Backend {
  readonly mode = 'demo' as const;
  private state = load();
  private listeners = new Set<() => void>();
  private save() {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      throw new Error(
        'Não foi possível salvar a demonstração neste navegador. Libere o armazenamento local.',
      );
    }
  }
  private auth() {
    const user = this.state.data.users.find((u) => u.id === this.state.sessionId);
    if (!user) throw new Error('Entre na sua conta para continuar.');
    return user;
  }
  private admin() {
    const user = this.auth();
    if (user.role !== 'admin') throw new Error('Esta ação é restrita a administradores.');
    return user;
  }
  private emit() {
    this.listeners.forEach((listener) => listener());
  }
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    const storage = (event: StorageEvent) => {
      if (event.key === DEMO_STORAGE_KEY) {
        this.state = load();
        callback();
      }
    };
    window.addEventListener('storage', storage);
    return () => {
      this.listeners.delete(callback);
      window.removeEventListener('storage', storage);
    };
  };
  getUser = async () => this.state.data.users.find((u) => u.id === this.state.sessionId) || null;
  getData = async (): Promise<AppData> => {
    const user = await this.getUser(),
      data = structuredClone(this.state.data);
    if (user?.role === 'admin') return data;
    return {
      ...data,
      wastes: data.wastes.filter((w) => w.active),
      points: data.points.filter((p) => p.active),
      users: user ? [user] : [],
      suggestions: data.suggestions.filter((s) => s.userId === user?.id),
      disposals: data.disposals.filter((d) => d.userId === user?.id),
      reviews: data.reviews.filter((r) => r.userId === user?.id),
      searchLogs: [],
    };
  };
  login = async (email: string, password: string) => {
    credentials(email);
    const account = this.state.accounts.find((a) => a.email === email.trim().toLowerCase());
    if (!account || (await passwordDigest(password, account.salt)) !== account.hash)
      throw new Error(
        'E-mail ou senha incorretos. Para explorar, use um dos acessos de demonstração.',
      );
    this.state.sessionId = account.id;
    this.save();
    this.emit();
  };
  register = async (name: string, email: string, password: string) => {
    required(name, 'Nome', 100);
    credentials(email, password);
    email = email.trim().toLowerCase();
    if (this.state.data.users.some((u) => u.email === email))
      throw new Error('Este e-mail já está cadastrado.');
    const id = uid(),
      salt = toHex(crypto.getRandomValues(new Uint8Array(16))),
      hash = await passwordDigest(password, salt);
    const user: AppUser = {
      id,
      name: name.trim(),
      email,
      role: 'user',
      photoURL: '',
      createdAt: now(),
    };
    this.state.data.users.push(user);
    this.state.accounts.push({ id, email, salt, hash });
    this.state.sessionId = id;
    this.save();
    this.emit();
  };
  loginDemo = async (role: 'user' | 'admin') => {
    this.state.sessionId = role === 'admin' ? 'demo-admin' : 'demo-user';
    this.save();
    this.emit();
  };
  logout = async () => {
    this.state.sessionId = null;
    this.save();
    this.emit();
  };
  resetPassword = async (email: string) => {
    credentials(email);
    throw new Error(
      'No modo demonstração não há envio de e-mail. Use os acessos de demonstração ou configure o Firebase para recuperar senhas.',
    );
  };
  updateProfile = async (name: string) => {
    required(name, 'Nome', 100);
    this.auth().name = name.trim();
    this.save();
  };
  saveWaste = async (waste: Waste) => {
    this.admin();
    validateWaste(waste);
    const index = this.state.data.wastes.findIndex((w) => w.id === waste.id);
    const entry = {
      ...waste,
      normalizedName: waste.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
      createdAt: index < 0 ? now() : this.state.data.wastes[index].createdAt,
      updatedAt: now(),
    };
    if (index < 0) this.state.data.wastes.push(entry);
    else this.state.data.wastes[index] = entry;
    this.save();
  };
  savePoint = async (point: CollectionPoint) => {
    this.admin();
    validatePoint(point);
    const index = this.state.data.points.findIndex((p) => p.id === point.id);
    const previous = this.state.data.points[index];
    const entry = {
      ...point,
      rating: previous?.rating || 0,
      totalReviews: previous?.totalReviews || 0,
      demo: true,
      createdAt: previous?.createdAt || now(),
      updatedAt: now(),
    };
    if (index < 0) this.state.data.points.push(entry);
    else this.state.data.points[index] = entry;
    this.save();
  };
  suggestPoint = async (input: SuggestionInput) => {
    const user = this.auth();
    validateSuggestion(input);
    if (
      !input.acceptedWasteIds.every((id) =>
        this.state.data.wastes.some((w) => w.id === id && w.active),
      )
    )
      throw new Error('Selecione apenas materiais ativos.');
    this.state.data.suggestions.push({
      ...input,
      id: uid(),
      userId: user.id,
      status: 'PENDENTE',
      createdAt: now(),
    });
    this.save();
  };
  moderateSuggestion = async (
    id: string,
    approve: boolean,
    coordinates?: { lat: number; lng: number },
    reason?: string,
  ) => {
    this.admin();
    const suggestion = this.state.data.suggestions.find((s) => s.id === id);
    if (!suggestion) throw new Error('Sugestão não encontrada.');
    if (suggestion.status !== 'PENDENTE') throw new Error('Esta sugestão já foi analisada.');
    if (approve) {
      if (!coordinates) throw new Error('Informe as coordenadas do ponto antes de aprovar.');
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
        ...coordinates,
        verified: true,
        active: true,
        rating: 0,
        totalReviews: 0,
        demo: true,
        createdAt: now(),
        updatedAt: now(),
      };
      validatePoint(point);
      this.state.data.points.push(point);
      suggestion.pointId = point.id;
    } else {
      required(reason || '', 'Motivo da rejeição', 1000);
      suggestion.rejectionReason = reason!.trim();
    }
    suggestion.status = approve ? 'APROVADO' : 'REJEITADO';
    suggestion.reviewedAt = now();
    this.save();
  };
  recordDisposal = async (input: DisposalInput) => {
    const user = this.auth();
    validateDisposal(input, this.state.data);
    this.state.data.disposals.push({ ...input, id: uid(), userId: user.id, createdAt: now() });
    this.save();
  };
  reviewPoint = async (input: ReviewInput) => {
    const user = this.auth();
    validateReview(input);
    const point = this.state.data.points.find((p) => p.id === input.pointId && p.active);
    if (!point) throw new Error('Este ponto está indisponível.');
    const id = `${user.id}_${input.pointId}`;
    if (this.state.data.reviews.some((r) => r.id === id))
      throw new Error('Você já confirmou as informações deste ponto.');
    this.state.data.reviews.push({
      ...input,
      comment: input.comment.trim(),
      id,
      userId: user.id,
      confirmed: true,
      createdAt: now(),
    });
    point.rating = (point.rating * point.totalReviews + input.rating) / (point.totalReviews + 1);
    point.totalReviews++;
    point.updatedAt = now();
    this.save();
  };
  logSearch = async (term: string, wasteId: string | null) => {
    const normalized = term.trim().slice(0, 120);
    if (!normalized) return;
    this.state.data.searchLogs.push({
      id: uid(),
      term: normalized,
      wasteId,
      userId: this.state.sessionId,
      createdAt: now(),
    });
    this.state.data.searchLogs = this.state.data.searchLogs.slice(-1000);
    this.save();
  };
}
