import { expect, test } from '@playwright/test';
test('configuração incompleta mostra erro recuperável e não cai silenciosamente em demo', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/descartar?q=pilha');
  await expect(page.getByRole('alert')).toContainText('Configuração do Firebase incompleta');
  await expect(page.locator('.demo-bar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
