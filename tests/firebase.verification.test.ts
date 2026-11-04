import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const user = {
    uid: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice',
    emailVerified: false,
    metadata: { creationTime: '2026-01-01' },
  };
  const auth = {
    currentUser: user as typeof user | null,
    authStateReady: vi.fn(async () => undefined),
    languageCode: '',
  };
  return {
    user,
    auth,
    create: vi.fn(),
    send: vi.fn(),
    update: vi.fn(),
    token: vi.fn(),
    reload: vi.fn(),
    transaction: vi.fn(),
    settings: vi.fn(),
    exists: false,
    writes: vi.fn(),
  };
});
vi.mock('../src/config/firebase', () => ({
  getFirebase: () => ({ auth: mock.auth, db: {} }),
  verificationSettings: mock.settings,
}));
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: mock.create,
  sendEmailVerification: mock.send,
  updateProfile: mock.update,
  getIdTokenResult: mock.token,
  reload: mock.reload,
  onIdTokenChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  runTransaction: mock.transaction,
  serverTimestamp: () => 'server-time',
  Timestamp: class {},
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));
import { FirebaseBackend } from '../src/services/firebase';

beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.currentUser = mock.user;
  mock.user.emailVerified = false;
  mock.exists = false;
  mock.create.mockResolvedValue({ user: mock.user });
  mock.send.mockResolvedValue(undefined);
  mock.update.mockResolvedValue(undefined);
  mock.reload.mockResolvedValue(undefined);
  mock.token.mockResolvedValue({ claims: { email_verified: false } });
  mock.settings.mockReturnValue({
    url: 'https://example.com/verificar-email',
    handleCodeInApp: false,
  });
  mock.transaction.mockImplementation(async (_db, action) =>
    action({
      get: async () => ({ exists: () => mock.exists }),
      set: (...args: unknown[]) => {
        mock.exists = true;
        mock.writes(...args);
      },
    }),
  );
});

describe('verificação Firebase e falhas parciais', () => {
  it('mantém a conta quando o envio falha e permite reenvio sem recriar usuário', async () => {
    mock.send.mockRejectedValueOnce({ code: 'auth/too-many-requests' });
    const backend = new FirebaseBackend();
    const result = await backend.register('Alice', 'alice@example.com', 'SenhaTeste123!');
    expect(result).toMatchObject({ userId: 'alice', profileReady: true, verification: 'failed' });
    expect(result.verificationError).toContain('Muitas tentativas');
    await expect(backend.resendVerificationEmail()).resolves.toBe('sent');
    expect(mock.create).toHaveBeenCalledTimes(1);
    expect(mock.send).toHaveBeenCalledTimes(2);
    expect(mock.auth.languageCode).toBe('pt-BR');
  });
  it('envia mesmo quando o perfil falha; reparação é idempotente', async () => {
    mock.transaction.mockRejectedValueOnce(new Error('offline'));
    const backend = new FirebaseBackend();
    const result = await backend.register('Alice', 'alice@example.com', 'SenhaTeste123!');
    expect(result).toMatchObject({ profileReady: false, verification: 'sent' });
    await backend.repairProfile();
    await backend.repairProfile();
    expect(mock.writes).toHaveBeenCalledTimes(1);
    expect(mock.create).toHaveBeenCalledTimes(1);
  });
  it('falha no nome do Auth não impede criação do perfil nem envio', async () => {
    mock.update.mockRejectedValueOnce(new Error('offline'));
    const result = await new FirebaseBackend().register(
      'Alice',
      'alice@example.com',
      'SenhaTeste123!',
    );
    expect(result.profileWarning).toContain('nome');
    expect(result.profileReady).toBe(true);
    expect(result.verification).toBe('sent');
  });
  it('valida configuração antes de criar e não trata falha na criação como conta existente', async () => {
    mock.settings.mockImplementationOnce(() => {
      throw new Error('URL inválida');
    });
    const backend = new FirebaseBackend();
    await expect(backend.register('Alice', 'alice@example.com', 'SenhaTeste123!')).rejects.toThrow(
      'URL',
    );
    expect(mock.create).not.toHaveBeenCalled();
    mock.create.mockRejectedValueOnce(new Error('criação falhou'));
    await expect(backend.register('Alice', 'alice@example.com', 'SenhaTeste123!')).rejects.toThrow(
      'criação',
    );
    expect(mock.send).not.toHaveBeenCalled();
  });
  it('não libera sessão com token antigo e exige renovação bem-sucedida', async () => {
    mock.user.emailVerified = true;
    const backend = new FirebaseBackend();
    expect((await backend.getUser())?.emailVerified).toBe(false);
    mock.token.mockRejectedValueOnce(new Error('renovação falhou'));
    await expect(backend.checkEmailVerification()).rejects.toThrow('renovação');
    mock.token.mockResolvedValue({ claims: { email_verified: true } });
    await expect(backend.checkEmailVerification()).resolves.toBe(true);
    expect(mock.token).toHaveBeenLastCalledWith(mock.user, true);
    await expect(backend.resendVerificationEmail()).resolves.toBe('verified');
    expect(mock.send).not.toHaveBeenCalled();
  });
  it('descarta resultado quando a sessão muda durante reload', async () => {
    mock.reload.mockImplementationOnce(async () => {
      mock.auth.currentUser = null;
    });
    await expect(new FirebaseBackend().checkEmailVerification()).rejects.toThrow('sessão mudou');
    expect(mock.send).not.toHaveBeenCalled();
  });
  it('preserva identidade sem conceder acesso quando não consegue obter claims', async () => {
    mock.user.emailVerified = true;
    mock.token.mockRejectedValueOnce(new Error('offline'));
    expect(await new FirebaseBackend().getUser()).toMatchObject({
      id: 'alice',
      role: 'user',
      emailVerified: false,
    });
  });
});
