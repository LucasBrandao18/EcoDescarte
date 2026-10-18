import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('páginas públicas e formulários atendem às verificações automáticas WCAG A/AA', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const failures: unknown[] = [];
  for (const route of ['/', '/descartar', '/residuos/pilha', '/pontos', '/entrar', '/cadastro']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    failures.push(
      ...result.violations.map((v) => ({
        route,
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    );
  }
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar como usuário demo' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  for (const route of [
    '/perfil',
    '/historico',
    '/sugerir-ponto',
    '/registrar-descarte',
    '/ecopontos',
    '/pontos/demo-centro',
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    failures.push(
      ...result.violations.map((v) => ({
        route,
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    );
  }
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Admin demo' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const route of [
    '/admin',
    '/admin/residuos',
    '/admin/pontos',
    '/admin/sugestoes',
    '/admin/usuarios',
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    failures.push(
      ...result.violations.map((v) => ({
        route,
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    );
  }
  await testInfo.attach('accessibility.json', {
    body: JSON.stringify(failures, null, 2),
    contentType: 'application/json',
  });
  expect(failures.map((item) => JSON.stringify(item))).toEqual([]);
});
