import type {
  AppData,
  CollectionPoint,
  DisposalInput,
  ReviewInput,
  SuggestionInput,
  Waste,
} from '../types';
import { localDate } from '../utils/domain';

export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export function required(value: string, label: string, max = 200) {
  if (!value?.trim() || value.trim().length > max)
    throw new Error(`${label}: preencha entre 1 e ${max} caracteres.`);
}
export function credentials(email: string, password?: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (password !== undefined && password.length < 8)
    throw new Error('A senha deve ter pelo menos 8 caracteres.');
}
export function validateWaste(w: Waste) {
  required(w.name, 'Nome');
  required(w.description, 'Descrição', 2000);
  required(w.disposalInstructions, 'Orientação', 4000);
  if (!w.id || !w.category) throw new Error('Informe a categoria e o identificador do resíduo.');
}
export function validatePoint(p: CollectionPoint) {
  required(p.name, 'Nome');
  required(p.address, 'Endereço');
  required(p.city, 'Cidade');
  if (!/^[A-Z]{2}$/.test(p.state)) throw new Error('Informe a sigla do estado.');
  if (!/^\d{5}-?\d{3}$/.test(p.zipCode)) throw new Error('Informe um CEP válido.');
  if (
    !Number.isFinite(p.lat) ||
    Math.abs(p.lat) > 90 ||
    !Number.isFinite(p.lng) ||
    Math.abs(p.lng) > 180
  )
    throw new Error('Informe coordenadas válidas.');
  if (!p.acceptedWasteIds.length) throw new Error('Selecione pelo menos um material.');
}
const suggestionTextFields = {
  name: { max: 120, message: 'Use apenas letras no nome do local.' },
  address: { max: 160, message: 'Use apenas letras no endereço.' },
  district: { max: 80, message: 'Use apenas letras no bairro.' },
  city: { max: 80, message: 'Use apenas letras no nome da cidade.' },
};
const suggestionLetters = /^[A-Za-zÀÁÂÃÉÊÍÓÔÕÚÜÇàáâãéêíóôõúüç ]+$/;
export const suggestionHours = Array.from(
  { length: 48 },
  (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
);
export function sanitizeSuggestionField(
  key: keyof Omit<SuggestionInput, 'acceptedWasteIds'>,
  value: string,
) {
  if (Object.hasOwn(suggestionTextFields, key)) {
    const { max } = suggestionTextFields[key as keyof typeof suggestionTextFields];
    return value
      .normalize('NFC')
      .replace(/[^A-Za-zÀÁÂÃÉÊÍÓÔÕÚÜÇàáâãéêíóôõúüç ]/g, '')
      .replace(/ +/g, ' ')
      .slice(0, max);
  }
  const limit = key === 'number' ? 6 : key === 'zipCode' ? 8 : key === 'phone' ? 11 : 0;
  // Limita depois de sanitizar, preservando os dígitos colados com máscara.
  return limit ? value.replace(/\D/g, '').slice(0, limit) : value;
}
export function validateSuggestion(s: SuggestionInput) {
  for (const key of Object.keys(suggestionTextFields) as (keyof typeof suggestionTextFields)[]) {
    const value = s[key].normalize('NFC').trim();
    const { max, message } = suggestionTextFields[key];
    if (!value || value.length > max || !suggestionLetters.test(value)) throw new Error(message);
  }
  if (!/^\d{1,6}$/.test(s.number)) throw new Error('Informe apenas números.');
  if (!/^[A-Z]{2}$/.test(s.state)) throw new Error('Informe a sigla do estado.');
  if (!/^\d{8}$/.test(s.zipCode)) throw new Error('Informe um CEP com 8 números.');
  if (!s.acceptedWasteIds.length) throw new Error('Selecione pelo menos um material.');
  if (s.phone !== '' && !/^\d{10,11}$/.test(s.phone))
    throw new Error('Informe um telefone com DDD e 10 ou 11 números.');
  const [opensAt, closesAt] = s.openingHours.split(' - ');
  if (
    !suggestionHours.includes(opensAt) ||
    !suggestionHours.includes(closesAt) ||
    s.openingHours !== `${opensAt} - ${closesAt}` ||
    closesAt <= opensAt
  )
    throw new Error('Selecione um horário de funcionamento válido.');
}
export function validateDisposal(d: DisposalInput, data: Pick<AppData, 'wastes' | 'points'>) {
  const w = data.wastes.find((w) => w.id === d.wasteId && w.active);
  const p = data.points.find((p) => p.id === d.collectionPointId && p.active);
  if (!w || !p || !p.acceptedWasteIds.includes(w.id))
    throw new Error('Escolha um ponto ativo que receba o material selecionado.');
  if (!Number.isSafeInteger(d.quantity) || d.quantity <= 0 || d.quantity > 100000)
    throw new Error('Informe uma quantidade inteira entre 1 e 100.000.');
  const date = new Date(d.date + 'T12:00:00');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
    Number.isNaN(date.getTime()) ||
    date.getFullYear() < 2000 ||
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !==
      d.date
  )
    throw new Error('Informe uma data válida.');
  if (d.date > localDate()) throw new Error('A data do descarte não pode estar no futuro.');
}
export function validateReview(r: ReviewInput) {
  if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5)
    throw new Error('Escolha uma avaliação de 1 a 5 estrelas.');
  if (r.comment.length > 1000) throw new Error('O comentário deve ter até 1.000 caracteres.');
}
export function friendlyError(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'Escolha uma senha mais forte.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'auth/network-request-failed': 'Sem conexão com a autenticação. Confira sua internet.',
    'permission-denied':
      'Você não tem permissão para esta ação. Entre novamente ou confira as regras do Firebase.',
    unavailable: 'O serviço está indisponível. Confira sua conexão e tente novamente.',
    'failed-precondition':
      'O banco precisa de configuração. Confira os índices do Firestore no README.',
  };
  return code
    ? messages[code] ||
        'Não foi possível concluir a operação. Confira a configuração do serviço e tente novamente.'
    : error instanceof Error
      ? error.message
      : 'Não foi possível concluir a operação.';
}
