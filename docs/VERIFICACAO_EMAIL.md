# Verificação de e-mail — configuração e implantação

Esta feature exige e-mail confirmado para sugestões, descartes, avaliações, edição do perfil e administração. Contas antigas e novas seguem a mesma política. Perfil/histórico próprios, catálogo, mapa e recuperação de senha permanecem disponíveis conforme a autenticação. O modo demo continua local e não envia e-mail.

## Configuração

1. Habilitar Email/Password em Firebase Authentication.
2. Conferir o template de verificação e o remetente. A aplicação solicita idioma `pt-BR`.
3. Manter o handler padrão de ações do Firebase. `/verificar-email` é a página de retorno e espera; ela não aplica `oobCode`.
4. Autorizar o domínio do site e, durante homologação, o domínio da prévia nas configurações de Auth.
5. Definir `VITE_AUTH_CONTINUE_URL` com a URL completa terminada em `/verificar-email`. HTTPS é obrigatório fora de localhost/127.0.0.1. Não incluir query, fragmento ou credenciais.
6. Gerar um novo build para cada ambiente. A prévia retorna à sua própria URL; a versão principal retorna à URL principal. Manter o `VITE_FIREBASE_AUTH_DOMAIN` do projeto.

Exemplo com emuladores locais:

```dotenv
VITE_DATA_MODE=firebase
VITE_USE_EMULATORS=true
VITE_FIREBASE_API_KEY=demo-key-only
VITE_FIREBASE_AUTH_DOMAIN=demo-ecodescarte.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-ecodescarte
VITE_FIREBASE_APP_ID=1:123:web:demo
VITE_AUTH_CONTINUE_URL=http://127.0.0.1:5173/verificar-email
```

Não colocar credenciais administrativas ou tokens no frontend. As variáveis de configuração web são públicas no bundle.

## Estados e recuperação

- Conta criada e envio aceito: mostrar a tela pendente com informação de envio solicitado, endereço mascarado e cooldown visual. Aceitação pelo SDK não comprova entrega na caixa postal.
- Envio falhou: preservar conta/perfil e disponibilizar reenvio; não repetir a criação da conta.
- Perfil falhou: o envio ainda pode acontecer. “Tentar preparar perfil” cria apenas o documento ausente; o login também tenta essa recuperação. O nome de fallback é “Participante”.
- Sessão restaurada sem resultado de envio: usar texto neutro, sem afirmar envio recente. O cooldown é uma conveniência de interface, não um controle de abuso.
- Confirmação manual ou retorno à aba: recarregar usuário, renovar ID token e atualizar sessão. Falha na renovação mantém as contribuições bloqueadas.
- Falha do Firestore: preservar identidade Auth para reenvio, consulta e logout; limpar dados privados indisponíveis e manter somente o catálogo público já carregado.
- Outro dispositivo/origem: a confirmação não conecta uma conta automaticamente. O usuário pode precisar entrar novamente. O destino salvo no navegador é vinculado ao UID e validado como rota interna.
- Links expirados, inválidos ou consumidos: o handler padrão apresenta o erro; a aplicação oferece um novo envio.

O campo `emailVerified` existe somente na sessão. O Firestore autoriza por `request.auth.token.email_verified`; campos enviados pelo cliente não substituem essa informação. `admin=true` continua obrigatório para administração.

## Testes locais

Instalar as dependências usando o lockfile. Para pnpm com validação de workspace, usar `pnpm --ignore-workspace install --frozen-lockfile`. Não é necessário alterar o lockfile.

```text
npm run build
npm test
npm run test:rules
npm run test:firebase
npm run test:e2e
npm run test:e2e:firebase
npm run test:failures
```

Os emuladores exigem Java compatível e portas 8080/9099 livres. A suíte Firebase de navegador usa Vite em 5178 e recusa execução sem os emuladores locais. Não executar simultaneamente suítes que recriam a mesma base emulada. O projeto de teste é sempre `demo-ecodescarte`.

Playwright pode usar Chromium instalado pela ferramenta ou Chrome local com `PLAYWRIGHT_CHANNEL=chrome`. O timer da tela atualiza somente o cooldown visual; não consulta Auth periodicamente.

## Homologação no projeto atual

A decisão aprovada é usar uma prévia de Firebase Hosting e contas de teste no Firebase atual. O Hosting de prévia compartilha Auth, Firestore, regras e templates com o site principal. Publicar regras para testar a prévia também afeta o site principal.

1. Confirmar acesso ao projeto, suas regras atuais e as contas administrativas antes de qualquer ativação.
2. Escolher um canal temporário de Hosting, obter sua URL e configurar o build da prévia com essa URL de retorno. Autorizar o domínio no Auth. Se necessário, atualizar o mesmo canal após gerar o build definitivo da prévia.
3. Publicar somente o Hosting da prévia. Não publicar regras, seeds ou rotinas de limpeza nesta etapa.
4. Com contas de teste identificáveis e caixa postal controlada, conferir cadastro, recebimento real, confirmação, retorno, login, reenvio e consulta pública. Registrar os UIDs de teste para limpeza pontual posterior.
5. Validar contribuições, agregados e moderação nos emuladores. Evitar conteúdo artificial no catálogo e nas avaliações reais.

Não alterar o handler ou template global apenas para personalizar a prévia. A sessão pode não ser compartilhada entre a URL principal e a prévia.

## Ativação em duas fases

Antes de publicar a interface que bloqueia administradores pendentes, confirmar o e-mail das contas administrativas existentes e conferir sua claim. Usar o processo administrativo existente para recuperação; não promover usuários pelo navegador nem marcar todos os e-mails como confirmados.

**Fase A — disponibilizar recuperação:** publicar a interface, envio e caminho de confirmação no site principal, mantendo as regras anteriores temporariamente. Interface e serviços cliente já bloqueiam ações pendentes, mas nessa fase a exigência ainda não está garantida contra chamadas diretas ao Firestore. Orientar contas antigas sobre a confirmação e testar o caminho de recuperação no site principal.

**Fase B — autorização no servidor:** após homologação, preparação dos administradores e validação do fluxo principal, publicar `firestore.rules` desta branch. A publicação deve ser específica de regras, com projeto de destino conferido. Confirmar a negação para conta pendente e o acesso para conta confirmada. Clientes antigos podem precisar recarregar o site.

Não usar um deploy genérico que publique Hosting e regras juntos antes de concluir a Fase A.

## Rollback e limites

Registrar versão de Hosting e regras antes de publicar. Um rollback apenas do Hosting pode remover o caminho de verificação enquanto as regras continuam restritivas. Avaliar as duas camadas em conjunto. Reverter as regras à versão anterior suspende a exigência nova; nunca abrir o banco para resolver o problema.

Observar erros de envio, renovação e permissões sem registrar códigos, links de ação, tokens ou e-mails de usuários. O Firebase aplica seus limites de envio; o cooldown local não protege contra abuso por chamadas diretas.

Build e emuladores não comprovam entrega real de mensagens. A homologação e ativação remotas devem ter seu próprio registro de execução.

## Registro da prévia — 04/11/2026

- [Abrir cadastro na prévia](https://ecodescarte-af76d--email-verification-xumh52kg.web.app/cadastro).
- Projeto: `ecodescarte-af76d`; canal: `email-verification`; expiração: 11/11/2026 às 20h52, horário de São Paulo.
- Código da implementação: commit `c3b08ee`, branch `feature/email-verification`.
- Versão Hosting da prévia: `d290c7256802908c`. A versão principal continuou sendo `6d6a8fda264e560d`.
- O build usa `.env.preview.local`, ignorado pelo Git, com a configuração web pública do projeto e `VITE_AUTH_CONTINUE_URL` apontando a `/verificar-email` na própria prévia. Emuladores estão desativados.
- A CLI autorizou o domínio da prévia no Auth. O handler padrão foi preservado. Nenhuma regra Firestore foi publicada.
- A leitura da configuração Auth confirmou Email/Password ativo, domínio da prévia autorizado e handler `https://ecodescarte-af76d.firebaseapp.com/__/auth/action`.
- Cadastro e página de verificação foram conferidos no navegador anônimo sem gravações remotas. Recebimento e consumo de e-mail real ainda dependem do teste com caixa postal controlada pelo responsável.

A prévia pode ser usada para esse teste manual antes das Fases A/B. Não ativar as regras nem fazer merge/deploy principal como consequência automática do teste da prévia.
