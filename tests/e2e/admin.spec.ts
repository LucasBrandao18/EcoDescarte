import { expect, test, type Page } from '@playwright/test';

async function loginDemo(page: Page, role: 'user' | 'admin') {
  await page.goto('/entrar');
  await page
    .getByRole('button', {
      name: role === 'admin' ? 'Admin demo' : /^Entrar como (?:usuário|visitante) demo$/,
    })
    .click();
  await expect(page).toHaveURL(role === 'admin' ? /\/admin$/ : /\/perfil$/);
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toHaveCount(0);
}

const ecoPoints = (page: Page) =>
  page.locator('.stat-card').filter({ hasText: 'EcoPontos conquistados' }).locator('strong');

async function submitSuggestion(page: Page, name: string) {
  await page.goto('/sugerir-ponto');
  await page.getByLabel(/^Nome do local/).fill(name);
  await page.getByLabel(/^Endereço/).fill('Rua de demonstração');
  await page.getByLabel(/^Número/).fill('123');
  await page.getByLabel(/^Bairro/).fill('Centro');
  await page.getByLabel(/^CEP/).fill('01001000');
  await page.getByLabel(/^Cidade/).fill('São Paulo');
  await page.getByLabel(/^Estado/).selectOption('SP');
  await page.getByRole('checkbox', { name: 'Pilha', exact: true }).check();
  await page.getByRole('combobox', { name: 'Abre às', exact: true }).selectOption('09:00');
  await page.getByRole('combobox', { name: 'Fecha às', exact: true }).selectOption('17:00');
  await page.getByLabel(/^Observações/).fill('Local fictício para teste acadêmico.');
  await page.getByRole('button', { name: 'Enviar para análise' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Ponto de coleta sugerido com sucesso' }),
  ).toBeVisible();
}

test('área administrativa exige autenticação e perfil de administrador', async ({ page }) => {
  await page.goto('/admin/residuos');
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByRole('button', { name: /^Entrar como (?:usuário|visitante) demo$/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Esta área é exclusiva da administração' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo resíduo' })).toHaveCount(0);
  await logout(page);
  await loginDemo(page, 'admin');
  await expect(page.getByRole('navigation', { name: 'Navegação administrativa' })).toBeVisible();
  await expect(
    page.locator('.stat-card').filter({ hasText: 'Descartes registrados' }).locator('strong'),
  ).toHaveText('0');
  await expect(
    page.getByRole('heading', { name: 'Os dados começam com uma ação', exact: true }),
  ).toHaveCount(4);
});

test('administrador cria, edita, desativa e reativa resíduo sem perder o registro', async ({
  page,
}) => {
  await loginDemo(page, 'admin');
  await page.goto('/admin/residuos');
  await page.getByRole('button', { name: 'Novo resíduo' }).click();
  const editor = page.locator('.admin-editor');
  await editor.getByLabel(/^Nome do resíduo/).fill('Cartucho E2E');
  await editor.getByLabel(/^Categoria/).selectOption('Outros');
  await editor.getByLabel(/^Sinônimos/).fill('cartucho de teste, refil teste');
  await editor.getByLabel(/^Descrição/).fill('Cartucho fictício usado para verificar o cadastro.');
  await editor
    .getByLabel(/^Orientação de descarte/)
    .fill('Entregue em um ponto especializado que confirme o recebimento.');
  await editor.getByLabel(/^Preparação para descarte/).fill('Mantenha inteiro, seco e protegido.');
  await editor
    .getByLabel(/^Impacto ambiental/)
    .fill('O descarte inadequado desperdiça materiais e pode contaminar o ambiente.');
  await editor.getByRole('button', { name: 'Salvar resíduo' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Resíduo salvo com sucesso' }),
  ).toBeVisible();
  const originalRow = page.getByRole('row').filter({ hasText: 'Cartucho E2E' });
  await expect(originalRow).toHaveCount(1);
  await originalRow.getByRole('button', { name: 'Editar Cartucho E2E', exact: true }).click();
  await editor.getByLabel(/^Nome do resíduo/).fill('Cartucho de Impressão E2E');
  await expect(editor.getByLabel('Nome normalizado')).toHaveValue('cartucho de impressao e2e');
  await editor
    .getByLabel(/^Orientação de descarte/)
    .fill('Orientação revisada: confirme a logística reversa com o fabricante.');
  await editor.getByRole('button', { name: 'Salvar resíduo' }).click();
  const revisedRow = page.getByRole('row').filter({ hasText: 'Cartucho de Impressão E2E' });
  await expect(revisedRow).toHaveCount(1);

  await page.goto('/descartar?q=refil%20teste');
  await page.getByRole('heading', { name: 'Cartucho de Impressão E2E', exact: true }).click();
  await expect(
    page.getByText('Orientação revisada: confirme a logística reversa com o fabricante.', {
      exact: true,
    }),
  ).toBeVisible();
  const publicUrl = page.url();
  await page.goto('/admin/residuos');
  await revisedRow
    .getByRole('button', { name: 'Desativar Cartucho de Impressão E2E', exact: true })
    .click();
  await page
    .locator('.admin-confirm')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(revisedRow.getByText('Ativo', { exact: true })).toBeVisible();
  await revisedRow
    .getByRole('button', { name: 'Desativar Cartucho de Impressão E2E', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirmar desativação' }).click();
  await expect(revisedRow.getByText('Inativo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(revisedRow.getByText('Inativo', { exact: true })).toBeVisible();
  await page.goto(publicUrl);
  await expect(
    page.getByRole('heading', { name: 'Resíduo não encontrado', exact: true }),
  ).toBeVisible();
  await page.goto('/descartar?q=refil%20teste');
  await expect(page.getByRole('heading', { name: 'Não encontramos esse material' })).toBeVisible();

  await page.goto('/admin/residuos');
  await page.getByLabel('Status', { exact: true }).selectOption('inativos');
  await revisedRow
    .getByRole('button', { name: 'Reativar Cartucho de Impressão E2E', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirmar reativação' }).click();
  await expect(revisedRow).toHaveCount(0);
  await page.goto(publicUrl);
  await expect(
    page.getByRole('heading', { name: 'Cartucho de Impressão E2E', exact: true }),
  ).toBeVisible();
});

test('editar um ponto atualiza materiais, horário e destino da rota pública', async ({ page }) => {
  await loginDemo(page, 'admin');
  await page.goto('/admin/pontos');
  const row = page.getByRole('row').filter({ hasText: 'Ecoponto Centro · demonstração' });
  await row
    .getByRole('button', { name: 'Editar Ecoponto Centro · demonstração', exact: true })
    .click();
  const editor = page.locator('.admin-editor');
  await editor
    .getByLabel(/^Horário de funcionamento/)
    .fill('Sábados, das 9h às 12h — horário de teste');
  await editor.getByLabel('Latitude', { exact: false }).fill('-23.55');
  await editor.getByLabel('Longitude', { exact: false }).fill('-46.63');
  await editor.getByRole('checkbox', { name: 'Pilha', exact: true }).check();
  await editor.getByRole('button', { name: 'Salvar ponto', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Ponto de coleta salvo com sucesso' }),
  ).toBeVisible();
  await page.goto('/pontos/demo-centro');
  await expect(
    page.getByRole('heading', { name: 'Ecoponto Centro · demonstração', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.point-information')).toContainText(
    'Sábados, das 9h às 12h — horário de teste',
  );
  await expect(page.getByRole('link', { name: 'Pilha', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Como chegar', exact: true })).toHaveAttribute(
    'href',
    /destination=-23\.55,-46\.63(?:&|$)/,
  );
  await expect(page.getByText('Local fictício · demonstração', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Pilha', exact: true })).toBeVisible();
});

test('sugestão só se torna pública depois da aprovação e soma 30 EcoPontos ao autor', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const name = 'Ponto colaborativo de teste';
  await loginDemo(page, 'user');
  await expect(ecoPoints(page)).toHaveText('0');
  await submitSuggestion(page, name);
  await page.goto('/perfil');
  await expect(ecoPoints(page)).toHaveText('0');
  const contribution = page.locator('.history-item').filter({ hasText: name });
  await expect(contribution.getByText('Em análise', { exact: true })).toBeVisible();
  await page.goto('/pontos');
  await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  await logout(page);
  await loginDemo(page, 'admin');
  await page.goto('/admin/sugestoes');
  const suggestion = page.locator('.admin-suggestion').filter({ hasText: name });
  await suggestion.getByRole('button', { name: 'Analisar sugestão', exact: true }).click();
  await suggestion.getByRole('button', { name: 'Aprovar e publicar', exact: true }).click();
  await expect(suggestion.getByText('Pendente', { exact: true })).toBeVisible();
  await expect(suggestion.getByLabel('Latitude confirmada', { exact: false })).toBeFocused();
  await suggestion.getByLabel('Latitude confirmada', { exact: false }).fill('-23.551');
  await suggestion.getByLabel('Longitude confirmada', { exact: false }).fill('-46.634');
  await suggestion.getByRole('button', { name: 'Aprovar e publicar', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Sugestão aprovada. O ponto já pode aparecer' }),
  ).toBeVisible();
  await expect(suggestion).toHaveCount(0);
  await page.getByLabel('Status da análise').selectOption('APROVADO');
  await expect(suggestion.getByText('Aprovado', { exact: true })).toBeVisible();
  await expect(
    suggestion.getByRole('button', { name: 'Aprovar e publicar', exact: true }),
  ).toHaveCount(0);
  await suggestion.getByRole('link', { name: 'Ver ponto publicado' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Como chegar', exact: true })).toHaveAttribute(
    'href',
    /destination=-23\.551,-46\.634(?:&|$)/,
  );
  await logout(page);
  await loginDemo(page, 'user');
  await expect(ecoPoints(page)).toHaveText('30');
  await expect(contribution.getByText('Aprovada', { exact: true })).toBeVisible();
  await page.reload();
  await expect(ecoPoints(page)).toHaveText('30');
});

test('rejeição registra o motivo, mantém o ponto privado e não concede EcoPontos', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const name = 'Sugestão sem confirmação';
  const reason = 'O horário e o recebimento de pilhas não puderam ser confirmados.';
  await loginDemo(page, 'user');
  await submitSuggestion(page, name);
  await logout(page);
  await loginDemo(page, 'admin');
  await page.goto('/admin/sugestoes');
  const suggestion = page.locator('.admin-suggestion').filter({ hasText: name });
  await suggestion.getByRole('button', { name: 'Analisar sugestão', exact: true }).click();
  await suggestion.getByRole('button', { name: 'Rejeitar sugestão', exact: true }).click();
  await suggestion.getByLabel('Motivo da rejeição', { exact: false }).fill(reason);
  await suggestion.getByRole('button', { name: 'Confirmar rejeição', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Sugestão rejeitada. O motivo fica disponível' }),
  ).toBeVisible();
  await logout(page);
  await loginDemo(page, 'user');
  await expect(ecoPoints(page)).toHaveText('0');
  const contribution = page.locator('.history-item').filter({ hasText: name });
  await expect(contribution.getByText('Não aprovada', { exact: true })).toBeVisible();
  await expect(contribution).toContainText(reason);
  await page.goto('/pontos');
  await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
});
