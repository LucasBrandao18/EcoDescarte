import { afterEach, describe, expect, it, vi } from 'vitest';
import { verificationSettings } from '../src/config/firebase';
afterEach(() => vi.unstubAllEnvs());
describe('configuração do retorno de verificação', () => {
  it('aceita HTTPS e desenvolvimento local explícito sem depender de window', () => {
    for (const url of [
      'https://preview.example/verificar-email',
      'http://127.0.0.1:5178/verificar-email',
    ]) {
      vi.stubEnv('VITE_AUTH_CONTINUE_URL', url);
      expect(verificationSettings()).toEqual({ url, handleCodeInApp: false });
    }
  });
  it('recusa configuração ausente, insegura, credenciais e rota errada', () => {
    for (const url of [
      '',
      'http://example.com/verificar-email',
      'https://user:secret@example.com/verificar-email',
      'https://example.com/entrar',
      'https://example.com/verificar-email?oobCode=x',
    ]) {
      vi.stubEnv('VITE_AUTH_CONTINUE_URL', url);
      expect(() => verificationSettings()).toThrow('VITE_AUTH_CONTINUE_URL');
    }
  });
});
