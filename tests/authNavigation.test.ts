import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authDestination,
  rememberVerificationReturn,
  verificationReturn,
  clearVerificationReturn,
} from '../src/utils/authNavigation';

afterEach(() => vi.unstubAllGlobals());
describe('destino após confirmação', () => {
  it('preserva ponto, parâmetros e fragmento', () => {
    expect(
      authDestination({ pathname: '/registrar-descarte', search: '?point=teste', hash: '#form' }),
    ).toBe('/registrar-descarte?point=teste#form');
  });
  it('recusa destinos externos, inválidos e ciclos de autenticação', () => {
    for (const from of [
      'https://outro.example',
      '//outro.example',
      '/\\outro.example',
      '/entrar?from=x',
      '/verificar-email',
      '/%63adastro',
      '/%zz',
    ]) {
      expect(authDestination(from)).toBe('/perfil');
    }
    expect(authDestination('/admin/pontos')).toBe('/admin/pontos');
  });
  it('vincula o retorno à conta e funciona sem armazenamento', () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      setItem: (key: string, value: string) => memory.set(key, value),
      getItem: (key: string) => memory.get(key),
      removeItem: (key: string) => memory.delete(key),
    });
    rememberVerificationReturn('alice', '/pontos/teste');
    expect(verificationReturn('alice', '/perfil')).toBe('/pontos/teste');
    expect(verificationReturn('bob', '/perfil')).toBe('/perfil');
    clearVerificationReturn();
    expect(verificationReturn('alice', '/perfil')).toBe('/perfil');
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error();
      },
      setItem: () => {
        throw new Error();
      },
    });
    expect(() => rememberVerificationReturn('alice', '/perfil')).not.toThrow();
    expect(verificationReturn('alice', '/admin')).toBe('/admin');
  });
});
