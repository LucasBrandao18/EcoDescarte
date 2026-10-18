# EcoDescarte — roteiro para apresentação acadêmica

**Slogan:** Descubra onde descartar. Contribua para um futuro sustentável.

**Formato sugerido:** 10 a 12 minutos de apresentação, seguidos de uma demonstração de 4 minutos. O texto pode ser adaptado para slides; os tempos são uma sugestão de organização.

## 1. Problema — 45 segundos

Uma pessoa quer descartar uma pilha, um celular ou uma embalagem. Ela nem sempre sabe a categoria do material, como prepará-lo ou onde encontrar um local que o receba. A falta de informação dificulta a tomada de decisão e pode contribuir para o descarte inadequado.

**Mensagem para a apresentação:** “A dificuldade não está apenas em querer reciclar: está também em saber qual é o próximo passo.”

## 2. ODS escolhida e justificativa — 1 minuto

O projeto se relaciona à **ODS 12 — Consumo e Produção Responsáveis**, dos Objetivos de Desenvolvimento Sustentável da ONU. O foco é orientar o cidadão sobre descarte, reutilização e reciclagem, além de facilitar o acesso a pontos de coleta.

A relação com a ODS 12 é uma proposta de contribuição. O software não comprova, por si só, redução de resíduos, cumprimento de metas internacionais ou melhoria ambiental. Esses resultados dependeriam de adoção real, parceiros e acompanhamento.

## 3. Solução e público-alvo — 1 minuto

O EcoDescarte reúne, em uma aplicação web, um guia de resíduos e um catálogo de pontos de coleta. O usuário pesquisa um material, recebe orientações e encontra locais compatíveis. Depois de realizar um descarte, pode registrar a ação e acompanhar seu histórico.

O público inicial são cidadãos que precisam de orientação simples. Escolas, universidades, cooperativas, estabelecimentos com logística reversa e administrações públicas são possíveis parceiros para uma implantação futura.

## 4. Funcionalidades — 1 minuto

- Pesquisa por nome e sinônimos, tolerando acentos e pequenas variações.
- Orientações de descarte, preparação, riscos e reciclabilidade.
- Catálogo de pontos, filtros e detalhes dos materiais recebidos.
- Mapa Google quando configurado, localização opcional e links de rotas.
- Cadastro, login, recuperação de senha com Firebase e perfil.
- Registro de descartes, sugestões de pontos e confirmação de informações.
- Histórico pessoal e EcoPontos calculados pelas contribuições.
- Administração de resíduos e pontos, análise de sugestões e indicadores.

## 5. Tecnologias e arquitetura — 1 minuto

O frontend utiliza React, TypeScript, React Router e CSS. O Vite executa o ambiente de desenvolvimento e gera a versão de produção. O Firebase oferece Authentication e Cloud Firestore. O Google Maps fornece a experiência de mapa e rotas externas.

A aplicação tem camadas de apresentação, estado, regras de negócio e persistência. As páginas não precisam conhecer detalhes de autenticação ou consultas ao banco: utilizam operações disponibilizadas pelo contexto da aplicação.

Existem dois modos de execução:

| Modo         | Finalidade                                     | Persistência e autenticação                                             |
| ------------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| Demonstração | Executar e apresentar sem credenciais externas | Dados neste navegador e contas de teste; não envia e-mails              |
| Firebase     | Integrar serviços externos configurados        | Firebase Authentication e Cloud Firestore, sujeitos às regras de acesso |

Os pontos fictícios são identificados como demonstração. A demonstração local não representa um ambiente seguro para operação pública: quem controla o navegador pode modificar os dados locais.

## 6. Banco de dados e segurança — 1 minuto

As coleções principais são `users`, `wastes`, `collectionPoints`, `suggestions`, `disposals`, `reviews` e `searchLogs`.

Um descarte relaciona usuário, material e ponto de coleta. Uma sugestão começa como `PENDENTE`; o administrador pode aprová-la ou rejeitá-la. Uma aprovação publica um ponto com localização definida. As avaliações relacionam uma pessoa a um ponto e evitam múltiplas confirmações da mesma pessoa no mesmo local.

No Firebase, regras verificam autenticação, proprietário do registro e permissão administrativa. A criação de conta não oferece escolha de perfil administrativo. O acesso administrativo deve ser concedido fora da interface pública, com credenciais privilegiadas. A geolocalização é opcional e não é salva no perfil.

## 7. Fluxo de demonstração — 4 minutos

1. Abra a página inicial e destaque a identificação do modo de demonstração.
2. Pesquise **pilha**; teste também **pilhas** para ilustrar sinônimos.
3. Abra o resíduo e apresente a orientação e o alerta sobre lixo comum.
4. Consulte os pontos compatíveis. Explique que os pontos iniciais são fictícios e não devem orientar deslocamentos reais.
5. Abra o mapa. Se não houver chave, mostre a mensagem de configuração e a alternativa em lista. Não apresente a alternativa como teste da API do Google.
6. Entre com a conta de usuário demo ou cadastre uma conta com dados de teste.
7. Registre um descarte em um ponto de demonstração; mostre o histórico e o acréscimo de **10 EcoPontos**.
8. Envie uma sugestão de ponto. Mostre o status **Em análise** e destaque que ela ainda não gera pontos.
9. Saia e entre com **Admin demo**. Analise a sugestão, informe coordenadas de demonstração e aprove.
10. Retorne à conta que enviou a sugestão. Mostre o novo status e os **30 EcoPontos** da aprovação.

Prepare a demonstração no mesmo navegador para manter os registros locais. Caso a apresentação use Firebase, valide antecipadamente login, regras, permissões, domínio autorizado e conectividade. Não divulgue credenciais administrativas nos slides.

## 8. EcoPontos e indicadores — 1 minuto

O saldo é derivado dos registros, sem um campo que o usuário possa editar:

`EcoPontos = descartes × 10 + sugestões aprovadas × 30 + confirmações × 5`

Uma quantidade maior no mesmo descarte não multiplica a recompensa. Sugestões pendentes e rejeitadas não pontuam. Uma confirmação corresponde a uma avaliação por usuário e por ponto.

| Faixa       | Nível                 |
| ----------- | --------------------- |
| 0–49        | Iniciante Sustentável |
| 50–149      | Reciclador Consciente |
| 150–299     | Guardião Verde        |
| 300–499     | Defensor do Planeta   |
| 500 ou mais | Embaixador Eco        |

Os indicadores do sistema incluem registros de descartes, materiais consultados, pesquisas, pontos cadastrados, sugestões e usuários. Eles medem atividade na plataforma. Os descartes são autorrelatados; não equivalem a pesagem, certificado de destinação, emissões evitadas ou impacto ambiental verificado.

## 9. Benefícios e limites — 45 segundos

O benefício imediato é reduzir a dificuldade de encontrar informação e reunir orientações em um percurso simples. A contribuição colaborativa permite ampliar o catálogo com revisão administrativa.

Para gerar impacto real, é necessário validar os pontos com os responsáveis, manter horários e materiais atualizados, adaptar as orientações às regras locais e estabelecer parcerias. A plataforma aproxima o usuário de uma ação; a destinação efetiva depende da rede de coleta e da participação do cidadão.

## 10. Possíveis melhorias — 45 segundos

Evoluções possíveis incluem parceria com cooperativas e prefeituras, confirmação de recebimento, campanhas educativas, acessibilidade avaliada com usuários e uma versão mobile. Reconhecimento por câmera, ranking, QR Code e notificações ficam como possibilidades futuras, sem ampliar o MVP atual.

Antes de uma implantação pública também devem ser avaliados prevenção de abuso, retenção dos dados, política de privacidade, monitoramento, custos e escala das consultas.

## 11. Conclusão — 30 segundos

O EcoDescarte aplica tecnologia a uma dificuldade cotidiana: descobrir como e onde descartar. Seu valor está em ligar informação, ponto de coleta e participação em um percurso acessível. O protótipo demonstra esse percurso e fornece uma base para parcerias e validação em campo relacionadas à ODS 12.

## Preparação e autoria

- Preencher nome dos integrantes, curso, instituição, disciplina e orientação antes da entrega.
- Usar capturas da aplicação executada, com a identificação de demonstração visível.
- Apresentar resultados de testes efetivamente executados; configuração pronta não significa integração externa validada.
- Não afirmar que houve envio real de e-mail, carregamento real do Google Maps, implantação pública ou teste em produção se essas ações não tiverem sido realizadas.

Para detalhes técnicos e limitações, consulte [ARQUITETURA.md](./ARQUITETURA.md) e o [README](../README.md).
