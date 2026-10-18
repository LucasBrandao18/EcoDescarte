import { expect, test } from '@playwright/test';

test('fluxo público da busca ao ponto compatível, com estado vazio e 404', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Não sabe onde');
  await page.getByLabel('O que você deseja descartar?').fill('pilhas');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page
    .locator('.waste-card')
    .filter({ has: page.getByRole('heading', { name: 'Pilha', exact: true }) })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pilha');
  await expect(page.locator('.guide-panel')).toContainText('Nunca coloque no lixo doméstico');
  await page.getByRole('link', { name: 'Onde descartar?', exact: true }).click();
  await expect(page.locator('.point-card')).toHaveCount(2);
  await page
    .locator('.point-card')
    .filter({ hasText: 'Estação Circular' })
    .getByRole('link', { name: 'Ver detalhes' })
    .click();
  await expect(page.getByRole('link', { name: 'Como chegar', exact: true })).toHaveAttribute(
    'href',
    /https:\/\/www.google.com\/maps\/dir\/\?api=1&destination=-23.567,-46.693/,
  );
  await page.goto('/descartar?q=residuoxyz');
  await expect(page.getByRole('heading', { name: 'Não encontramos esse material' })).toBeVisible();
  await page.goto('/pagina-inexistente');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('novo caminho');
  await page.getByRole('link', { name: 'Voltar ao início', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test('recusa de localização e mapa sem chave preservam busca, lista e rotas', async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.goto('/mapa');
  await expect(page.locator('.map-fallback')).toContainText(
    'Configure a chave da API do Google Maps',
  );
  await page.getByRole('button', { name: 'Usar minha localização' }).click();
  await expect(page.locator('.notice.warning')).toContainText(
    /Localização não autorizada|Não conseguimos localizar/,
  );
  await page.getByLabel('Cidade ou bairro').fill('Pinheiros');
  await expect(page.locator('.point-card')).toHaveCount(1);
  await expect(page.locator('.point-card')).toContainText('Estação Circular');
  await page.getByLabel('Cidade ou bairro').fill('Cidade inexistente');
  await expect(
    page.getByRole('heading', { name: 'Ainda não encontramos um ponto aqui' }),
  ).toBeVisible();
});

test('localização permitida ordena por proximidade sem persistir coordenadas', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -23.567, longitude: -46.693 });
  await page.goto('/pontos');
  await page.getByRole('button', { name: 'Usar minha localização' }).click();
  await expect(page.locator('.notice.success')).toContainText('Resultados ordenados');
  await expect(page.locator('.point-card').first()).toContainText('Estação Circular');
  await expect(page.locator('.point-card').first().locator('.distance')).toHaveText('0.0 km');
  await expect(
    page
      .locator('.point-card')
      .first()
      .getByRole('link', { name: /Como chegar/ }),
  ).toHaveAttribute('href', /origin=-23.567,-46.693/);
  const personalLocation = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => /location|latitude|longitude|geolocation/i.test(k)),
  );
  expect(personalLocation).toEqual([]);
});

test('login preserva o material e o ponto escolhidos pelo visitante', async ({ page }) => {
  await page.goto('/registrar-descarte?waste=pilha&point=demo-pinheiros');
  await page.getByRole('link', { name: 'Entrar na minha conta' }).click();
  await page.getByRole('button', { name: 'Entrar como usuário demo' }).click();
  await expect(page).toHaveURL(/registrar-descarte\?waste=pilha&point=demo-pinheiros$/);
  await expect(page.getByRole('combobox', { name: 'Qual material você descartou?' })).toHaveValue(
    'pilha',
  );
  await expect(page.getByRole('combobox', { name: /Ponto de coleta/ })).toHaveValue(
    'demo-pinheiros',
  );
});

for (const width of [375, 768, 1024, 1440])
  test(`navegação e layout sem transbordamento em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const route of [
      '/',
      '/descartar',
      '/residuos/pilha',
      '/pontos',
      '/mapa',
      '/sobre',
      '/ods-12',
      '/cadastro',
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        route,
      ).toBe(true);
      if (route === '/')
        await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
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
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        route,
      ).toBe(true);
    }
    if (await page.getByRole('button', { name: 'Abrir menu' }).isVisible())
      await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Descartar', exact: true })
      .click();
    await expect(page).toHaveURL(/\/descartar$/);
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
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        route,
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
