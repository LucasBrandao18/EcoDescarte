# Relatório de verificação — EcoDescarte

## Feature de verificação de e-mail — 04/11/2026

Validação local na branch `feature/email-verification`. Baseline de `main` (`33e0ea9`) reconstruído em diretório temporário: build aprovado e 74 testes unitários aprovados. O aviso de bundle Firestore acima de 500 kB já existia no baseline.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Build TypeScript/Vite | Aprovado | Tipagem de aplicação, configurações e testes; bundle gerado |
| Unitários | 87 aprovados | Inclui falhas parciais de cadastro, perfil idempotente, token antigo, mudança de sessão, retorno seguro, configuração do link e demo antigo |
| Regras Firestore | 12 aprovados | Token ausente/falso/verdadeiro, perfil inicial pendente, administração confirmada e agregados atômicos |
| Integração Auth/Firestore | 1 aprovado | Cadastro pendente, reenvio, consumo de código, renovação do token, recuperação de senha por tipo de ação e contribuição/admin após confirmação |
| Navegador público/demo | 24 aprovados | Fluxos existentes, acessibilidade e retorno ao descarte após login direto |
| Navegador Firebase emulado | 3 aprovados | Cadastro pendente e retorno com parâmetros; falha de envio/reenvio e consulta ao voltar à aba; falha Firestore preservando a sessão e acessibilidade móvel |
| Falhas de configuração/Maps | 2 aprovados | Configuração incompleta recuperável e mapa indisponível com lista preservada |

Total: **129 testes aprovados**, em execuções próprias de cada suíte. A integração é ignorada por `npm test` quando os emuladores não estão ativos e foi executada separadamente; não contar esse skip como aprovação adicional. Não houve seed remoto ou teste contra dados de produção.

Ambiente efetivamente utilizado: Windows, Node 20.19.6, pnpm 9.15.4 com `--ignore-workspace`, dependências do lockfile, OpenJDK 25.0.1 para emuladores e Chrome instalado com `PLAYWRIGHT_CHANNEL=chrome`. A instalação utilizou o espelho Yarn do registro npm com as versões e integridades originais, devido a timeout de rede em registry.npmjs.org. Isso registra o ambiente desta execução; não altera os pré-requisitos gerais do projeto.

O teste de navegador detectou uma leitura de perfil ausente em cache após criação por transação. A leitura passou a usar `getDocFromServer`; os cenários de reenvio e confirmação passaram depois da correção. A tela continua disponível quando essa leitura falha.

Comando adicional: `npm run test:e2e:firebase`, com emuladores locais e Vite na porta 5178. Nenhuma regra nova foi publicada durante esta validação. A entrega real de mensagens não é comprovada pelos emuladores.

### Prévia remota — 04/11/2026

- Build Firebase gerado a partir da implementação do commit `c3b08ee`, com emuladores desativados e retorno de e-mail para a própria prévia.
- [Prévia de Hosting](https://ecodescarte-af76d--email-verification-xumh52kg.web.app/cadastro), canal `email-verification`, disponível até 11/11/2026 às 20h52 (America/Sao_Paulo).
- Projeto compartilhado `ecodescarte-af76d`; versão da prévia `d290c7256802908c`. Domínio autorizado pelo fluxo oficial da CLI.
- Configuração Auth conferida por leitura: Email/Password ativo, domínio da prévia autorizado e handler padrão `https://ecodescarte-af76d.firebaseapp.com/__/auth/action` preservado.
- Smoke test no Chrome anônimo: cadastro e rota `/verificar-email` acessíveis, sem erros JavaScript e sem criar contas ou gravar documentos de teste.
- Canal principal permaneceu na versão `6d6a8fda264e560d`, conferida antes e depois da publicação. Somente o Hosting da prévia foi publicado; regras restritivas e Fases A/B não foram ativadas no site principal.
- Recebimento de e-mail real e confirmação por caixa postal: pendentes do teste manual do responsável. Não declarar esses itens aprovados com base no smoke test.

## Relatório histórico — 02/10/2026

Validação local realizada em **2 de outubro de 2026**. Os dados utilizados são artificiais. Nenhum projeto Firebase de produção ou serviço de e-mail real foi usado.

## Resultado

| Camada                    | Resultado                      | Cobertura                                                                                                                      |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript e Vite         | Aprovado                       | Verificação de tipos e geração de `dist`                                                                                       |
| Lógica de domínio         | 7 testes aprovados             | Sinônimos, acentos, erros de digitação, resíduos inativos, níveis, distâncias e URLs                                           |
| Serviço de demonstração   | 8 testes aprovados             | Persistência, hash de senha, autorização, compatibilidade, moderação, pontuação única e isolamento                             |
| Firestore Security Rules  | 9 testes aprovados no emulador | Acesso público filtrado, propriedade, custom claims, campos protegidos, datas, transações, avaliações únicas e métricas        |
| Serviço Firebase          | 1 cenário integrado aprovado   | Cadastro, login, perfil, descarte, avaliação, recuperação e troca de senha, administração, aprovação e isolamento entre contas |
| Interface                 | 17 testes aprovados no Chrome  | Fluxos públicos, contas, administração, descarte, avaliação, sugestões, geolocalização e responsividade                        |
| Acessibilidade automática | 1 teste aprovado em 17 páginas | Verificações axe-core WCAG 2 A/AA e 2.1 AA; áreas públicas, usuário e administração                                            |
| Falhas controladas        | 2 testes aprovados             | Falha de rede do Maps e configuração Firebase incompleta                                                                       |
| Seed                      | Execução repetida aprovada     | Os 28 documentos existentes foram preservados sem sobrescrita                                                                  |

Total: **25 testes de lógica/serviços/regras e 20 testes de navegador**. A acessibilidade automática complementa a revisão visual; não substitui uma auditoria manual completa com tecnologias assistivas.

## Checklist solicitado

- [x] Página inicial e menu funcionam.
- [x] Busca por nome/sinônimo e mensagem de resíduo inexistente.
- [x] Cadastro, login, logout e edição de nome.
- [x] Recuperação e troca de senha usando Authentication emulado.
- [x] Demonstração informa corretamente que não envia e-mails.
- [x] Pontos aparecem e são filtrados por material, cidade e bairro.
- [x] Links de rota contêm as coordenadas de destino e a origem quando autorizada.
- [x] Ausência de chave e falha de rede Maps preservam lista e rotas.
- [x] Geolocalização negada não interrompe a aplicação.
- [x] Geolocalização permitida ordena por distância sem gravar coordenadas pessoais.
- [x] Sugestão fica pendente; aprovação publica o ponto e concede 30 EcoPontos uma única vez.
- [x] Rejeição guarda motivo e não publica nem pontua.
- [x] Descarte compatível gera histórico e 10 EcoPontos.
- [x] Avaliação com confirmação gera 5 EcoPontos uma única vez por ponto/usuário.
- [x] Perfil, níveis, histórico e dashboard.
- [x] Administração cadastra, edita, desativa e reativa dados.
- [x] Rotas verificadas em 375, 768, 1024 e 1440 pixels, sem rolagem horizontal involuntária.
- [x] Regras de segurança executadas no emulador, sem promoção de administrador pelo cliente.
- [x] `.env` e arquivos gerados ignorados pelo Git; nenhuma credencial real fornecida.
- [x] README, arquitetura e roteiro acadêmico entregues.

## Limites da validação externa

- **Google Maps real:** implementação pronta, mas carregamento autenticado, marcadores e geocodificação precisam de uma chave Google Cloud válida. Sem essa chave, foram testados os estados alternativos e as URLs de rotas.
- **Firebase remoto:** a integração foi exercitada com os SDKs reais contra emuladores. Ainda exige configuração, publicação das regras e teste no projeto de destino.
- **E-mail:** a emissão e a aplicação do código de recuperação foram verificadas no emulador; entrega de mensagens em uma caixa postal real não foi testada.
- **Publicação:** configuração de Firebase Hosting entregue; nenhum deploy remoto realizado.
- **Dados reais:** os seis pontos iniciais são fictícios. Validação de estabelecimentos e condições de recebimento depende de curadoria local.

## Reproduzir

```bash
npm install
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm run test:failures
# Exigem Java 21 e portas 8080/9099 livres:
npm run test:rules
npm run test:firebase
```

As suítes de emulador usam apenas `demo-ecodescarte` em `127.0.0.1`. Elas recriam dados e contas de teste desse projeto emulado. Não execute testes contra uma base que precise preservar.

Neste ambiente Windows, foi utilizado o Chrome instalado (`PLAYWRIGHT_CHANNEL=chrome`) e Java 21 portátil na pasta ignorada `tmp`. Nenhuma instalação global de Java foi necessária. Em outra máquina, instale Chromium com o comando acima e tenha Java 21 disponível no `PATH`.

As capturas reais da aplicação estão em [screenshots](screenshots/). Não contêm métricas de impacto inventadas.
