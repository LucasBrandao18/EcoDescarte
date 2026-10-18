import { expect, test, type Page } from '@playwright/test';

async function loginDemo(page: Page) {
  await page.goto('/entrar');
  await page.getByRole('button', { name: /^Entrar como (?:usuário|visitante) demo$/ }).click();
  await expect(page).toHaveURL(/\/perfil$/);
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toHaveCount(0);
}

const stat = (page: Page, label: string) =>
  page.locator('.stat-card').filter({ hasText: label }).locator('strong');

test('cadastro valida confirmação de senha e permite login, edição de perfil e logout', async ({
  page,
}) => {
  const email = 'pessoa.e2e@example.com';
  const password = 'SenhaSomenteTeste123!';
  await page.goto('/cadastro');
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa de Teste');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Senha/).fill(password);
  await page.getByLabel('Confirmar senha', { exact: true }).fill('ConfirmacaoDiferente123!');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('As senhas não coincidem');
  await expect(page).toHaveURL(/\/cadastro$/);
  await page.getByLabel('Confirmar senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Olá, Pessoa.', exact: true })).toBeVisible();
  await expect(stat(page, 'EcoPontos conquistados')).toHaveText('0');
  await expect(page.getByRole('link', { name: 'Administração', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar nome', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Marina de Teste');
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Olá, Marina.', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Olá, Marina.', exact: true })).toBeVisible();
  await logout(page);
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Senha/).fill('SenhaIncorreta123!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos');
  await page.getByLabel(/^Senha/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Olá, Marina.', exact: true })).toBeVisible();
  await logout(page);
  await page.goto('/perfil');
  await expect(
    page.getByRole('link', { name: 'Entrar na minha conta', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
});

test('recuperação de senha explica que a demonstração não envia e-mails', async ({ page }) => {
  await page.goto('/recuperar-senha');
  await expect(
    page.getByText(/O modo de demonstração não envia e-mails nem altera senhas/),
  ).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill('pessoa.e2e@example.com');
  await page.getByRole('button', { name: 'Demonstrar recuperação', exact: true }).click();
  await expect(
    page.locator('.notice').filter({
      hasText:
        /No modo demonstração não há envio de e-mail|Fluxo demonstrado\. Nenhum e-mail foi enviado/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Demonstrar recuperação', exact: true }),
  ).toBeEnabled();
  await page.getByRole('link', { name: 'Voltar para entrar' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test('descarte aceita apenas pontos compatíveis e persiste histórico com 10 EcoPontos', async ({
  page,
}) => {
  await loginDemo(page);
  await expect(stat(page, 'EcoPontos conquistados')).toHaveText('0');
  await page.goto('/registrar-descarte');
  const points = page.getByLabel('Ponto de coleta', { exact: false });
  await expect(points).toBeDisabled();
  await page.getByLabel(/^Qual material você descartou/).selectOption('pilha');
  await expect(points).toBeEnabled();
  await expect(points.locator('option[value="demo-centro"]')).toHaveCount(0);
  await points.selectOption('demo-pinheiros');
  await page.getByLabel('Quantidade (unidades)', { exact: true }).fill('4');
  await expect(page.getByLabel('Data do descarte', { exact: true })).toHaveValue(
    /^\d{4}-\d{2}-\d{2}$/,
  );
  await page.getByRole('button', { name: 'Confirmar descarte', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Descarte registrado com sucesso' }),
  ).toBeVisible();
  await page.goto('/perfil');
  await expect(stat(page, 'EcoPontos conquistados')).toHaveText('10');
  await expect(stat(page, 'Descartes registrados')).toHaveText('1');
  await expect(stat(page, 'Tipos de materiais')).toHaveText('1');
  await page.goto('/historico');
  const disposal = page.getByRole('row').filter({ hasText: 'Estação Circular · demonstração' });
  await expect(disposal).toHaveCount(1);
  await expect(disposal.getByRole('cell', { name: 'Pilha', exact: true })).toBeVisible();
  await expect(disposal.getByRole('cell', { name: '4 un.', exact: true })).toBeVisible();
  await expect(disposal.getByRole('cell', { name: '+10', exact: true })).toBeVisible();
  await page.reload();
  await expect(disposal).toHaveCount(1);
  await page.goto('/perfil');
  await expect(stat(page, 'EcoPontos conquistados')).toHaveText('10');
});

test('avaliação exige confirmação e concede somente 5 EcoPontos por ponto', async ({ page }) => {
  await loginDemo(page);
  await expect(stat(page, 'EcoPontos conquistados')).toHaveText('0');
  await page.goto('/pontos/demo-pinheiros');
  const submit = page.getByRole('button', { name: 'Confirmar e avaliar', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByRole('combobox', { name: 'Sua avaliação', exact: true }).selectOption('4');
  await page
    .getByLabel('Comentário (opcional)', { exact: true })
    .fill('Informações fictícias conferidas durante o teste acadêmico.');
  await page
    .getByRole('checkbox', {
      name: 'Confirmo que as informações de recebimento estão corretas.',
      exact: true,
    })
    .check();
  await submit.click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Você já contribuiu com este ponto' }),
  ).toBeVisible();
  await expect(page.locator('.point-information')).toContainText('4.0 de 5 · 1 avaliações');
  await page.goto('/perfil');
  await expect(stat(page, 'EcoPontos conquistados')).toHaveText('5');
  await expect(stat(page, 'Descartes registrados')).toHaveText('0');
  await page.goto('/pontos/demo-pinheiros');
  await page.reload();
  await expect(submit).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: 'Você já contribuiu com este ponto' }),
  ).toBeVisible();
  await expect(page.locator('.point-information')).toContainText('4.0 de 5 · 1 avaliações');
  await page.goto('/ecopontos');
  await expect(page.getByText('1 confirmação(ões) = 5 pontos', { exact: true })).toBeVisible();
  await expect(page.locator('.eco-score')).toHaveText('5 EcoPontos');
});
