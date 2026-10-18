export const categories = [
  'Eletrônicos',
  'Papel',
  'Plástico',
  'Vidro',
  'Metal',
  'Pilhas e baterias',
  'Óleo',
  'Medicamentos',
  'Outros',
] as const;
export type Category = (typeof categories)[number];
export interface Waste {
  id: string;
  name: string;
  normalizedName: string;
  synonyms: string[];
  category: Category;
  description: string;
  recyclable: boolean;
  dangerous: boolean;
  commonTrash: boolean;
  disposalInstructions: string;
  preparation: string;
  environmentalImpact: string;
  icon: string;
  image: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CollectionPoint {
  id: string;
  name: string;
  description: string;
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lng: number;
  phone: string;
  website: string;
  openingHours: string;
  acceptedWasteIds: string[];
  verified: boolean;
  active: boolean;
  rating: number;
  totalReviews: number;
  demo: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  photoURL: string;
  createdAt: string;
}
export interface Suggestion {
  id: string;
  userId: string;
  name: string;
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  acceptedWasteIds: string[];
  openingHours: string;
  phone: string;
  observation: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  pointId?: string;
}
export interface Disposal {
  id: string;
  userId: string;
  wasteId: string;
  collectionPointId: string;
  quantity: number;
  date: string;
  createdAt: string;
}
export interface Review {
  id: string;
  userId: string;
  pointId: string;
  rating: number;
  confirmed: boolean;
  comment: string;
  createdAt: string;
}
export interface SearchLog {
  id: string;
  wasteId: string | null;
  term: string;
  userId: string | null;
  createdAt: string;
}
export interface AppData {
  wastes: Waste[];
  points: CollectionPoint[];
  users: AppUser[];
  suggestions: Suggestion[];
  disposals: Disposal[];
  reviews: Review[];
  searchLogs: SearchLog[];
}
export type SuggestionInput = Omit<
  Suggestion,
  'id' | 'userId' | 'status' | 'createdAt' | 'reviewedAt' | 'rejectionReason' | 'pointId'
>;
export type DisposalInput = Pick<Disposal, 'wasteId' | 'collectionPointId' | 'quantity' | 'date'>;
export type ReviewInput = Pick<Review, 'pointId' | 'rating' | 'comment'>;
export interface AppContextValue {
  data: AppData;
  user: AppUser | null;
  mode: 'demo' | 'firebase';
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginDemo: (role: 'user' | 'admin') => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  saveWaste: (waste: Waste) => Promise<void>;
  savePoint: (point: CollectionPoint) => Promise<void>;
  suggestPoint: (input: SuggestionInput) => Promise<void>;
  moderateSuggestion: (
    id: string,
    approve: boolean,
    coordinates?: { lat: number; lng: number },
    reason?: string,
  ) => Promise<void>;
  recordDisposal: (input: DisposalInput) => Promise<void>;
  reviewPoint: (input: ReviewInput) => Promise<void>;
  logSearch: (term: string, wasteId: string | null) => Promise<void>;
}
