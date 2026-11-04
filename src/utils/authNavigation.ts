const returnKey = 'ecodescarte-verification-return-v1';
export function authDestination(from: unknown, fallback = '/perfil'): string {
  const source = from as { pathname?: string; search?: string; hash?: string } | null;
  const candidate =
    typeof from === 'string'
      ? from
      : typeof source?.pathname === 'string'
        ? source.pathname + (source.search || '') + (source.hash || '')
        : '';
  try {
    if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
    const url = new URL(candidate, 'https://ecodescarte.invalid');
    if (
      url.origin !== 'https://ecodescarte.invalid' ||
      /^\/(entrar|cadastro|recuperar-senha|verificar-email)(?:[/?#]|$)/.test(
        decodeURIComponent(url.pathname),
      )
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
export function rememberVerificationReturn(userId: string, destination: string) {
  try {
    sessionStorage.setItem(
      returnKey,
      JSON.stringify({ userId, destination: authDestination(destination) }),
    );
  } catch {
    /* Navigation still works without session storage. */
  }
}
export function verificationReturn(userId: string, fallback: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(returnKey) || 'null');
    return saved?.userId === userId ? authDestination(saved.destination, fallback) : fallback;
  } catch {
    return fallback;
  }
}
export function clearVerificationReturn() {
  try {
    sessionStorage.removeItem(returnKey);
  } catch {
    /* Optional navigation state. */
  }
}
