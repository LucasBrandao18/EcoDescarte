import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEMO_STORAGE_KEY } from '../../src/services/demo';

test.beforeEach(async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar como usuário demo' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await page.goto('/sugerir-ponto');
});

async function fillSuggestion(page: Page) {
  await page.getByLabel(/^Nome do local/).fill('Ecoponto Centro');
  await page.getByLabel(/^Endereço/).fill('Avenida Amazonas');
  await page.getByLabel(/^Número/).fill('123');
  await page.getByLabel(/^Bairro/).fill('Santa Efigênia');
  await page.getByLabel(/^CEP/).fill('30140071');
  await page.getByLabel(/^Cidade/).fill('Belo Horizonte');
  await page.getByLabel(/^Estado/).selectOption('MG');
  await page.getByRole('checkbox', { name: 'Pilha', exact: true }).check();
  await page.getByRole('combobox', { name: 'Abre às', exact: true }).selectOption('08:00');
  await page.getByRole('combobox', { name: 'Fecha às', exact: true }).selectOption('18:00');
  await page.getByLabel(/^Observações/).fill('Entrada pela portaria 2. Coleta das 8h às 17h.');
}

async function paste(page: Page, field: Locator, value: string) {
  const previous = await page.evaluate(() => navigator.clipboard.readText());
  try {
    await page.evaluate((text) => navigator.clipboard.writeText(text), value);
    await field.focus();
    await field.press('Control+V');
  } finally {
    await page.evaluate((text) => navigator.clipboard.writeText(text), previous);
  }
}

async function savedSuggestions(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).data.suggestions,
    DEMO_STORAGE_KEY,
  );
}

test('sanitiza digitação e colagem, preservando acentos e limitando os campos numéricos', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const [label, input, result] of [
    [/^Nome do local/, 'Ecoponto 123@ Centro', 'Ecoponto Centro'],
    [/^Endereço/, 'Avenida 123@ Amazonas', 'Avenida Amazonas'],
    [/^Bairro/, 'Santa 2@ Efigênia', 'Santa Efigênia'],
    [/^Cidade/, 'Belo123  Horizonte!', 'Belo Horizonte'],
  ] as const) {
    const field = page.getByLabel(label);
    await field.pressSequentially(input);
    await expect(field).toHaveValue(result);
    await field.fill('');
    await paste(page, field, input);
    await expect(field).toHaveValue(result);
  }
  for (const [label, input, result] of [
    [/^Número/, '1A2-3.456,789', '123456'],
    [/^CEP/, '30abc140-071', '30140071'],
    [/^Telefone/, '31abc99999-8888', '31999998888'],
  ] as const) {
    const field = page.getByLabel(label);
    await field.pressSequentially(input);
    await expect(field).toHaveValue(result);
    await field.fill('');
    await paste(page, field, input);
    await expect(field).toHaveValue(result);
  }
});

test('usa selects de meia em meia hora, acessíveis por teclado, e bloqueia intervalos inválidos', async ({
  page,
}, testInfo) => {
  await fillSuggestion(page);
  const opens = page.getByRole('combobox', { name: 'Abre às', exact: true });
  const closes = page.getByRole('combobox', { name: 'Fecha às', exact: true });
  const expected = [
    'Selecione',
    ...Array.from(
      { length: 48 },
      (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
    ),
  ];
  await expect(opens.locator('option')).toHaveText(expected);
  await expect(closes.locator('option')).toHaveText(expected);
  await expect(
    page.getByRole('group', { name: 'Horário de funcionamento' }).locator('input'),
  ).toHaveCount(0);
  await opens.focus();
  await opens.press('ArrowDown');
  await opens.press('Tab');
  await expect(opens).toHaveValue('08:30');
  await expect(closes).toBeFocused();

  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const opensBox = (await opens.boundingBox())!;
    const closesBox = (await closes.boundingBox())!;
    if (width === 375) expect(closesBox.y).toBeGreaterThan(opensBox.y);
    else expect(closesBox.y).toBe(opensBox.y);
    await page.screenshot({ path: testInfo.outputPath(`suggestion-${width}.png`), fullPage: true });
  }

  for (const [start, end] of [
    ['', '18:00'],
    ['08:00', ''],
    ['08:00', '08:00'],
    ['18:00', '08:00'],
  ]) {
    await opens.selectOption(start);
    await closes.selectOption(end);
    await page.getByRole('button', { name: 'Enviar para análise' }).click();
    if (!start || !end) {
      expect(
        await (!start ? opens : closes).evaluate(
          (el) => (el as HTMLSelectElement).validationMessage,
        ),
      ).toBe('Selecione um horário de funcionamento válido.');
    } else {
      await expect(page.getByRole('alert')).toHaveText(
        'Selecione um horário de funcionamento válido.',
      );
    }
    expect(await savedSuggestions(page)).toHaveLength(0);
  }
});

test('valida CEP e telefone antes do envio e preserva a exigência de materiais', async ({
  page,
}) => {
  await fillSuggestion(page);
  const send = page.getByRole('button', { name: 'Enviar para análise' });
  await page.getByLabel(/^CEP/).fill('3014007');
  await send.click();
  await expect(page.getByRole('alert')).toHaveText('Informe um CEP com 8 números.');
  expect(await savedSuggestions(page)).toHaveLength(0);
  await page.getByLabel(/^CEP/).fill('30140071');
  await page.getByLabel(/^Telefone/).fill('319999999');
  await send.click();
  await expect(page.getByRole('alert')).toHaveText(
    'Informe um telefone com DDD e 10 ou 11 números.',
  );
  expect(await savedSuggestions(page)).toHaveLength(0);
  await page.getByLabel(/^Telefone/).fill('');
  await page.getByRole('checkbox', { name: 'Pilha', exact: true }).uncheck();
  await send.click();
  await expect(page.getByRole('alert')).toHaveText(
    'Selecione ao menos um material recebido pelo local.',
  );
  expect(await savedSuggestions(page)).toHaveLength(0);
});

for (const phone of ['', '3133334444', '31999998888']) {
  test(`envia sugestão pendente e visível ao admin com telefone ${phone || 'vazio'}`, async ({
    page,
  }) => {
    await fillSuggestion(page);
    await page.getByLabel(/^Telefone/).fill(phone);
    await page.getByRole('button', { name: 'Enviar para análise' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Ponto de coleta sugerido com sucesso' }),
    ).toBeVisible();
    const saved = await savedSuggestions(page);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name: 'Ecoponto Centro',
      address: 'Avenida Amazonas',
      number: '123',
      district: 'Santa Efigênia',
      zipCode: '30140071',
      city: 'Belo Horizonte',
      state: 'MG',
      acceptedWasteIds: ['pilha'],
      openingHours: '08:00 - 18:00',
      phone,
      observation: 'Entrada pela portaria 2. Coleta das 8h às 17h.',
      status: 'PENDENTE',
    });
    await expect(page.getByRole('combobox', { name: 'Abre às', exact: true })).toHaveValue('');
    await expect(page.getByRole('combobox', { name: 'Fecha às', exact: true })).toHaveValue('');
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/entrar');
    await page.getByRole('button', { name: 'Admin demo' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/admin/sugestoes');
    const suggestion = page.locator('.admin-suggestion').filter({ hasText: 'Ecoponto Centro' });
    await expect(suggestion).toContainText('Pendente');
    await expect(suggestion).toContainText('08:00 - 18:00');
    await expect(suggestion).toContainText('Entrada pela portaria 2. Coleta das 8h às 17h.');
  });
}
