import { expect, test } from '@playwright/test';
test('falha de rede da API Maps mantém lista e rotas sem erro técnico', async ({ page }) => {
  await page.route('**/maps.googleapis.com/**', (route) => route.abort('failed'));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/mapa');
  await expect(page.locator('.map-fallback')).toContainText(
    'Não foi possível carregar o Google Maps',
    { timeout: 20_000 },
  );
  await expect(page.locator('.point-card')).toHaveCount(6);
  await expect(
    page
      .locator('.point-card')
      .first()
      .getByRole('link', { name: /Como chegar/ }),
  ).toHaveAttribute('href', /https:\/\/www.google.com\/maps\/dir/);
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
