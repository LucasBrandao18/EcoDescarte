import { readFileSync } from 'node:fs';
import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, Timestamp, writeBatch } from 'firebase/firestore';
import { seedPoints, seedWastes } from '../../src/data/seed';
import AxeBuilder from '@axe-core/playwright';

const projectId = 'demo-ecodescarte';
let env: RulesTestEnvironment;
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  if (
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
    process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080'
  )
    throw new Error('Execute test:e2e:firebase com emuladores locais.');
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore(),
      batch = writeBatch(db);
    for (const [name, entries] of [
      ['wastes', seedWastes],
      ['collectionPoints', seedPoints],
    ] as const) {
      for (const { id, createdAt, updatedAt, ...fields } of entries)
        batch.set(doc(db, name, id), {
          ...fields,
          createdAt: Timestamp.fromDate(new Date(createdAt)),
          updatedAt: Timestamp.fromDate(new Date(updatedAt)),
        });
    }
    await batch.commit();
  });
});
test.afterAll(async () => {
  await env?.cleanup();
});

async function register(page: Page, email: string) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa de Teste');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Senha/).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('SenhaTeste123!');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/verificar-email$/);
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible();
}
async function confirm(request: APIRequestContext, email: string) {
  const response = await request.get(
    `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`,
  );
  const codes = (await response.json()) as {
    oobCodes: { email: string; oobCode: string; requestType: string }[];
  };
  const code = codes.oobCodes
    .filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL')
    .at(-1)!;
  expect(code).toBeTruthy();
  const applied = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key-only',
    { data: { oobCode: code.oobCode } },
  );
  expect(applied.ok()).toBe(true);
}

test('cadastro pendente, perfil consultável, bloqueios seletivos, reload e retorno após confirmação', async ({
  page,
  request,
}) => {
  await page.goto('/registrar-descarte?point=demo-pinheiros');
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByRole('link', { name: 'Criar uma conta', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa de Teste');
  const email = `retorno.${Date.now()}@example.com`;
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Senha/).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('SenhaTeste123!');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/verificar-email$/);
  await expect(page.getByRole('button', { name: /Reenviar em/ })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Já confirmei', exact: true }).click();
  await expect(page.getByText(/Seu e-mail ainda não foi confirmado/)).toBeVisible();
  await page.goto('/perfil');
  await expect(
    page
      .locator('.panel')
      .filter({ has: page.getByRole('heading', { name: 'Seu perfil', exact: true }) }),
  ).toContainText(email);
  await expect(page.getByRole('button', { name: 'Editar nome' })).toHaveCount(0);
  await page.goto('/historico');
  await expect(page).toHaveURL(/\/historico$/);
  await page.goto('/pontos/demo-pinheiros');
  await expect(page.getByRole('heading', { name: 'Planeje sua visita' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar e avaliar' })).toHaveCount(0);
  await page.goto('/verificar-email');
  await confirm(request, email);
  await page.getByRole('button', { name: 'Já confirmei', exact: true }).click();
  await expect(page).toHaveURL(/\/registrar-descarte\?point=demo-pinheiros$/);
  await page.goto('/perfil');
  await expect(page.getByRole('button', { name: 'Editar nome' })).toBeVisible();
});

test('falha no envio preserva conta, reenvio funciona e retorno à aba consulta sem reenviar', async ({
  page,
  request,
}) => {
  let blocked = true;
  let sends = 0;
  await page.route('**/accounts:sendOobCode*', async (route) => {
    sends++;
    if (blocked)
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 400, message: 'TOO_MANY_ATTEMPTS_TRY_LATER' } }),
      });
    else await route.continue();
  });
  const email = `reenvio.${Date.now()}@example.com`;
  await register(page, email);
  await expect(page.getByText(/Sua conta foi criada, mas não conseguimos enviar/)).toBeVisible();
  blocked = false;
  await page.getByRole('button', { name: 'Reenviar e-mail', exact: true }).click();
  await expect(page.getByRole('button', { name: /Reenviar em/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Já confirmei', exact: true })).toBeEnabled();
  expect(sends).toBe(2);
  await confirm(request, email);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveURL(/\/perfil$/);
  expect(sends).toBe(2);
});

test('página pendente permanece acessível quando Firestore falha e é acessível no celular', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page, `offline.${Date.now()}@example.com`);
  await page.screenshot({
    path: testInfo.outputPath('verificar-email-mobile.png'),
    fullPage: true,
  });
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).port === '8080') await route.abort();
    else await route.continue();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Já confirmei', exact: true })).toBeVisible();
  await expect(
    page.getByText(/O serviço demorou para responder|O serviço está indisponível/).first(),
  ).toBeVisible({ timeout: 25_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
