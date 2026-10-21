# TODO Codex — POC3 até o jogo final

Atualizado em **2026-10-21**. Este é o backlog ativo do Codex. O [todo anterior](./todo.md) fica como histórico de implementação; seus checks não comprovam os requisitos revisados abaixo.

## Direção e autoridade

- Desenvolver o produto em `poc3/`; `demo-host/` é o serviço local de apoio.
- POC2 serve **somente** para estudar movimento de inimigos e lógica de grupos. Não portar sua arquitetura, câmera, armas, parallax, login ou persistência.
- Ordem de leitura: este backlog → [hub](./plans/planning.spec.MD) → [fluxo de partida](./plans/run-flow.spec.MD) → specs de domínio. Decisões D47–D50 substituem regras antigas conflitantes nos temas revisados.
- **Sprint é um ciclo do jogo:** 50 waves, índices **0 a 49**, miniboss na **49**. Sprint inicial = 1. Não confundir waves com quantidade de kills nem com etapas de desenvolvimento.
- Este documento acompanha implementação e planejamento. As partes A–E e F01–F04 estão implementadas. F05/F06 têm código/ferramentas entregues, com ativação e QA de produção ainda pendentes; G continua pendente.

## Diagnóstico anterior à parte E (histórico C/D)

Estado atual: entrada protegida, 50 waves/sprint, inimigos/grupos, asteroides, combate/score e preparação limitada da próxima sprint implementados. A tabela abaixo registra a base C/D; detalhes atuais em [run-flow](./plans/run-flow.spec.MD#implemented-execution-part-e).

| Área | Estado observado | Trabalho necessário |
| --- | --- | --- |
| `poc3/src/core/game-loop.ts` | Tick fixo de 60 Hz; delta máximo 250 ms / 5 passos; input de pausa fora do gate; relógio reiniciado no resume | Integrar os clocks de conteúdo de D/E ao tick |
| `poc3/src/game-app.ts` | Compõe serviços; preparação assíncrona de mundo/planos/assets; contexto cancelável; listeners com descarte | Ligar entrada, waves e combate de E |
| `poc3/src/scenes/run-scene.ts` | View lê snapshots imutáveis de `RunSimulation`; câmera/parallax só de apresentação | Apresentar entidades e entrada de D/E |
| `poc3/src/core/balancer.ts` | Preparo, catálogo, spawn points, curvas/orçamentos e assets em `BALANCE.preparation` | Afinar valores por playtest; novos comportamentos em E |
| Login / `DemoAuthAdapter` | Email DEV via API; capabilities; sessão persistida e logout | Provedores reais ficam na etapa de produção |
| `demo-host/src/index.ts` | SQLite, migrações, repositórios, email mock, sessões, settings e recordes | Google real na produção |
| Persistência | Controles e resultados em SQLite por conta; HUD usa cache de recordes; fonte localStorage removida | Demais domínios conforme forem implementados; outbox durável em RNK-07 |
| `EnemyManager` / `MeteorManager` | Pools aquecidos e primeira wave/lote reservados inativos | Ativação, comportamento, colisão e consumo dos planos em E |
| `ParallaxField` | Três camadas instanciadas antes de READY; seed cosmética por camada; grafo reutilizado em Run | Integrar mudanças de apresentação por setor quando necessário |
| Recordes | API local, fechamento idempotente, tela de resultado e quatro períodos em React | Combate real em E; Survivor e adapters de produção depois |

## A — Login e persistência local (P0)

Referências: `AUTH-*`, `ARCH-*`, D47 e specs [login](./plans/login.spec.MD) / [arquitetura](./plans/architecture.spec.MD).

- [x] **A01** — Configurar perfil DEV explícito (cliente + servidor) e proxy Vite `/api` → DemoHost local. Documentar os dois processos e um comando conjunto opcional; o host deve escutar somente em loopback por padrão.
- [x] **A02** — Adicionar SQLite no servidor, caminho configurável com padrão `demo-host/data/ikarus-dev.sqlite`; ignorar banco, WAL/SHM e sessões no Git. Escolher driver compatível com o runtime suportado ao implementar.
- [x] **A03** — Criar migrações versionadas e repositórios para `users`, `sessions`, `profile_settings`, `runs` e dados de perfil/conteúdo DEV quando implementados. Chaves estrangeiras, índices e transações; sem SQL no browser.
- [x] **A04** — Tela inicial DEV com **apenas email**, validação de formato, aviso discreto de ambiente de desenvolvimento e botão Entrar. Sem senha, Google ou login guest automático. Google/email reais pertencem ao fluxo de produção futuro.
- [x] **A05** — `POST /api/auth/dev-email`: normalizar email, criar/reutilizar usuário local, persistir sessão opaca com expiração. Mock não envia emails nem verifica posse da conta. Rota habilitada somente em DEV; Google indisponível nesse perfil.
- [x] **A06** — `GET /api/me` e logout com revogação da sessão no banco. Cookie HttpOnly/SameSite; Secure em HTTPS, configuração explícita para HTTP local. Sessão válida sobrevive a reload/restart do host até expirar.
- [x] **A07** — Adapters assíncronos para settings, progresso, conquistas e conteúdo DEV conforme cada domínio entrar. DEV usa API → SQLite; Dexie/localStorage deixam de ser fontes paralelas. Importação legada, se necessária, deve ser explícita, versionada e vinculada ao usuário.
- [x] **A08** — Carregar preferências depois da resolução de usuário; limpar cache em logout/troca de conta. Falha de API mostra erro/retry, sem criar usuário guest silencioso. `try/finally` libera estado busy.
- [x] **A09** — Preparar interface de provedores por capacidade. Produção futura: Google OAuth real e email real (método de autenticação a definir antes da implementação), sem liberar mocks em build de produção.

**Entrega A — 2026-10-19:** Node >=24.12 com SQLite nativo; `npm run dev:all --prefix poc3` inicia ambos os serviços. [Instruções de execução e API](../demo-host/README.md). Controles estão conectados à UI; progresso/conquistas/conteúdo DEV têm port HTTP versionado para implementação futura. O repositório de runs é infraestrutura; placares e submissão de resultados continuam em B.

**Validação:** `demo-host`: typecheck + 6 testes de integração; `poc3`: typecheck + lint + 170 testes passando (60 TODOs históricos ainda registrados); build de produção concluído. Smoke HTTP pelo proxy real. No navegador: email → jogo, alteração de esquema → reload preservando sessão/preferência, logout → segunda conta com controles padrão. Bancos de teste isolados; nenhum dado real de usuário foi importado.

**Aceite A:** banco vazio → login por email → Start/Title; reload e reinício do host preservam usuário/settings; logout invalida sessão; duas contas não compartilham dados; nenhuma dependência de Google para desenvolver.

## B — Recordes e fechamento de partida (P0)

Referências: `RNK-01/02/04/05/12`, D50 e [rankings](./plans/rankings.spec.MD).

- [x] **B01** — `RankingManager` + adapter local HTTP; persistir runs por `runId` único, usuário da sessão, modo, score, kills, duração, conclusão UTC, seed e versões de conteúdo/build.
- [x] **B02** — `RunResultManager` finaliza uma única vez ao receber player `DEAD`; `DRIFTING` não encerra. Envio com retry idempotente; quit/cancelamento não gera recorde válido. Fixtures de UI ficam separadas das runs reais.
- [x] **B03** — Consultar **semanal, mensal, anual e eterno** em SQLite. Semana inicia segunda-feira 00:00 UTC; mês/ano civis; intervalos `[início, próximo início)`. Servidor calcula os buckets e mantém histórico, sem apagar runs na virada.
- [x] **B04** — Uma melhor run por usuário/modo/período. Ordenar score decrescente, kills decrescentes, duração crescente e runId como desempate estável. Retry não duplica; mesma run pode valer para quatro períodos.
- [x] **B05** — Tela React de recordes acessível pelo Title e Result: quatro abas, posição, nome público, score e destaque do jogador; loading, vazio, erro e retry. Não expor email como nome público.
- [x] **B06** — Manter contrato de modos Normal/Survivor separado. Entregar Normal primeiro; Survivor indisponível até jogável, sem preencher placar com resultados Normal.
- [x] **B07** — Remover score provisório baseado só em tempo e kills fixos; atualizar por eventos de gameplay. HUD recebe best score do cache do Manager carregado fora do frame; remover leitura de localStorage por render.
- [x] **B08** — Validar payloads e vínculo à sessão; marcar runs alteradas pelo debugger como inelegíveis ao placar normal. DEV local não é anticheat de produção; validação de produção fica em etapa posterior.

**Aceite B:** score encerrado persiste após restart; filtros UTC corretos inclusive virada de ano/semana e ano bissexto; usuário/modo separados; submissão repetida sem duplicação; tela funciona sem partidas cadastradas.

**Entrega B — 2026-10-19:** `RankingManager`, adapter HTTP e `RunResultManager`; migração 2 preserva os dados de A e acrescenta tickets de partida por conta. O servidor fixa o horário UTC da primeira submissão e retorna o mesmo recibo no retry. Menu Jogar/Recordes, resultado com retry e descarte explícito, quatro períodos, melhor pessoal e destaque da conta estão conectados. Survivor continua indisponível. Quit não envia resultado; zero pontos e partidas alteradas pelo debugger ficam no histórico sem qualificação.

**Validação B:** `demo-host`: typecheck + 15 testes; `poc3`: typecheck + lint + 191 testes passando, em 65 arquivos (60 TODOs históricos); build concluído. Cobertura inclui migração de A, contas/modos, viradas UTC/ano bissexto, desempates, top 50 e posição pessoal externa, retry/conflito, expiração, respostas assíncronas antigas e estados React. Smoke HTTP pelo proxy e navegador com banco de QA separado: vazio, placar preenchido, HUD com melhor pessoal, resultado DEV inelegível e recordes preservados após reiniciar os serviços.

**Limite B:** score por tempo foi removido; eventos confirmados de destruição alimentam score/kills. E conectou combate real e créditos limitados por entidade; voo sem destruição não rende pontos. Pause → Dev → Testar fim de partida permite conferir o resultado, sempre fora dos recordes. Retry preserva o payload na tela; recuperar uma submissão pendente após crash exige a outbox durável futura (RNK-07). Menu e reset mínimo foram antecipados de C para integrar B; a separação da simulação foi concluída na entrega C abaixo.

## C — Separação do loop e ciclo de vida (P0)

Referências: `FLOW-09`, `ARCH-16`–`20`, `SCENE-*`.

- [x] **C01** — Extrair `RunSimulation` de `RunScene.update`: input/comandos → simulação → eventos/snapshot. Tirar acesso Three.js/câmera visual da sim e renderizar a partir do snapshot.
- [x] **C02** — Manter sim fixa a 60 Hz; limitar delta e passos por frame, descartar atraso excedente conforme política documentada. Resetar acumulador ao iniciar/reiniciar/retomar; input de pausa/resume continua fora do gate da sim.
- [x] **C03** — Criar `RunFlowManager` com PREPARING/READY/ENTERING/ACTIVE/TRANSITION/FINISHED/CANCELLED; preparação é assíncrona e não acontece dentro do tick.
- [x] **C04** — Criar contexto novo por run (sheet, pools, timers, score, seed); manter somente serviços de sessão/assets compartilhados. `dispose` cancela async, remove listeners e devolve recursos. Evitar manter dependências de Run anteriores em `GameApp`.
- [x] **C05** — Remover navegação automática Title → Run; oferecer Jogar e Recordes. Ação repetida de Jogar não cria duas preparações. Manter o Start/audio unlock antes do Title.
- [x] **C06** — Alinhar contrato de dois eixos: código usa `x/z`, docs dizem `X/Y`. Definir conversão explícita no limite sim/View antes dos spawn points, sem alterar controles por acidente.

**Aceite C:** pausa sem avanço de clocks; retorno após aba inativa sem avalanche de ticks; duas runs consecutivas com estado limpo; cancelar preparação não monta uma cena atrasada.

**Entrega C — 2026-10-19:** `RunSimulation` recebe input virtual sem DOM e publica snapshots de player/stats/projéteis/arma/score; `RunScene` apenas apresenta. `RunContext` possui sheet, energia, movimento/disparos, pool, eventos e resultados/seed de cada tentativa. `RunFlowManager` implementa todos os estados de C03, AbortSignal e proteção por geração; somente o início de um frame adota READY. Cancelar no menu/quit/logout descarta a preparação e seus recursos; resposta antiga não monta uma Run.

**Política do loop:** delta limitado a 250 ms, no máximo 5 ticks de 1/60 s por frame; ticks atrasados excedentes são descartados, mantendo apenas a fração menor que um tick. Start/stop/resume/nova run zeram o acumulador. Input de pausa continua a cada frame, inclusive pausado e sem tick; edges de gameplay aguardam o próximo tick e não repetem no catch-up. Ocultar a aba pausa uma Run; voltar exige retomar. Start aguarda gesto para liberar áudio e abrir Title. Plano lógico documentado como X/Z, com conversão explícita para o mundo X/Y/Z e controles preservados.

**Validação C:** `poc3`: typecheck + lint + 206 testes passando, em 69 arquivos (60 TODOs históricos); build concluído. Testes Node cobrem sim sem DOM/WebGL, snapshots imutáveis, input, pausa, DEAD/DRIFTING, estado limpo e descarte de pools/callbacks; relógio falso cobre gap de 60 s sem avalanche, resume e restart. Testes de fluxo cobrem READY, transições, cancelamento, falha e respostas atrasadas. No navegador com banco isolado: Start → menu → Run → pausa mantendo tick/tempo → resume sem recuperar atraso → quit → nova tentativa.

**Limite C:** C entregou ticket/contexto; D completou registries, planos de 50 waves e pré-aquecimento. E substituiu a passagem imediata de ENTERING pela entrada lógica/evento e implementou TRANSITION e a agenda de sprints.

## D — Preparar o mundo e a primeira sprint (P0)

Referências: `FLOW-01`–`06`; seguir esta ordem no `RunPreparationManager`.

- [x] **D01 / passo 1** — Criar registry de spawn points de inimigos, com IDs, posições/volumes, direções, capacidades e área segura de entrada.
- [x] **D02 / passo 2** — Criar registry independente para asteroides; manter o nome técnico `MeteorManager` já existente.
- [x] **D03 / passo 3** — Instanciar exatamente três camadas de parallax (distante/intermediária/próxima) a partir de `BALANCE`; preparar assets sem ativar combate.
- [x] **D04 / passo 4** — Catálogo de setores e facções: arquétipos, classes, formações, miniboss e mix de asteroides. Validar IDs; facção não é classe de combate. Catálogo inicial mínimo, sem inventar obrigação de preencher toda a lore agora.
- [x] **D05 / passo 5** — Gerar `SprintPlan` 1 determinístico com seed e versão; **50 WavePlans, índices 0–49**.
- [x] **D06 / passo 5.1** — Calcular cooldown de inimigos por wave/sprint, limites e orçamento de unidades ativas em `BALANCE`.
- [x] **D07 / passo 5.2** — Calcular cooldown dos asteroides separadamente, com orçamento próprio.
- [x] **D08 / passo 5.3** — Definir inimigos de cada wave, facção, squad, formação, spawn point e espaçamento de entrada.
- [x] **D09 / passo 5.4** — Definir sequência ordenada de asteroides: tipo/tamanho, ponto, velocidade e tick de emissão; extensão determinística se a sprint durar além do segmento preparado.
- [x] **D10 / passo 5.5** — Wave 49 contém miniboss; vitória depende de derrotá-lo. Remover gatilho antigo de miniboss a cada 50 kills deste fluxo.
- [x] **D11 / passo 6** — Reservar em memória wave 0 e primeiro lote de asteroides, inativos e fora da colisão. Pré-aquecer pools/assets necessários; não instanciar as 50 waves simultaneamente.

**Aceite D:** mesmo seed/config produz mesmo plano; nenhum tipo fora da facção/setor; preparação sem ticks de combate; quantidades e capacidade validadas antes de abrir Run.

**Entrega D — 2026-10-19:** `RunPreparationManager` executa os seis passos com snapshot de configuração, progresso e cancelamento no Title. `SpawnPointManager` mantém registries independentes e valida volumes/direções/capacidade/entrada segura. `SectorManager` valida catálogo mínimo de dois setores/facções e referências de classes/formações/miniboss/mix de asteroides. `SprintPlanManager` gera plano imutável de 50 waves (0–49), cooldowns limitados, squads e entradas; wave 49 tem um miniboss e regra de conclusão por derrota/limpeza. Seeds de inimigos, asteroides e parallax são independentes; camadas cosméticas também não consomem o RNG umas das outras.

**Memória/assets:** somente wave 0 e primeiro lote são reservados, sem atividade/colisão. E pré-aloca os pools completos: 24 inimigos, 16 asteroides e tiros limitados; reserva inicial de 3 inimigos/3 asteroides. As três camadas e assets são compilados antes de READY; Run adota o mesmo grafo. Cancelar/falhar/quit libera recursos e reservas. Agenda de asteroides usa segmentos de 1800 ticks (30 s), com extensão determinística e retenção limitada. Tickets atuais usam `poc3-4` e balance `sprint-2`; recordes antigos permanecem preservados.

**Validação D:** `poc3`: typecheck + lint + 245 testes passando, em 74 arquivos (60 TODOs históricos); build concluído. Cobertura inclui repetibilidade/versões, isolamento de facção e RNG, wave 49, limites/capacidades, continuidade entre segmentos, ordem de preparação sem ticks, snapshot de configuração, cancelamento em cada passo, warmup pendente, rollback de pools e progresso/Cancel React. No navegador com banco de QA separado: login/Start → Jogar → mundo preparado; Pause → Dev → Ship → Live confirma 50 waves, miniboss 49, três camadas, reservas 3/3 e ativos 0/0.

**Limite D:** D entregou planos e recursos inativos; E abaixo implementou ativação/execução, entrada, IA/grupos, colisões e antecipação. Não há combate sintético nem score de fixtures no código de produção. Valores e contratos em [run-flow.spec.MD](./plans/run-flow.spec.MD) são tuning ajustável, não exigências de lore.

## E — Executar e antecipar sprints (P0)

Referências: `FLOW-05`–`08`, [enemy](./plans/enemy.spec.MD), [squad](./plans/squad.spec.MD), [meteors](./plans/meteors.spec.MD).

- [x] **E01 / passo 7** — Montar tela de jogo somente com contexto preparado; HUD e mundo prontos antes da entrada.
- [x] **E02 / passo 7.1** — Entrada da nave Ikarus; evento `PlayerEntryCompleted` libera combate. Sem dano, disparos, score ou clocks de wave durante a entrada; pausa congela a animação lógica.
- [x] **E03 / passo 7.2** — Iniciar Sprint 1 uma única vez; ativar wave 0 e timeline de asteroides independente. Avanço padrão: emitir todos → resolver todos → cooldown → próxima wave.
- [x] **E04** — Implementar EnemyManager/SquadManager e estudar **somente** `poc2/src/systems/{steering,reach-path,formation-slots,enemy-movement-manager,enemy-squad-manager,enemy-strategy,enemy-group}.ts` e testes relevantes. Registrar comportamentos úteis e reescrever no contrato de sim POC3, sem importar POC2.
- [x] **E05** — Implementar MeteorManager, pools, movimento, colisão/dano/despawn e eventos de drop; recebe eventos planejados, sem outro gerador aleatório concorrente.
- [x] **E06 / passo 7.3** — Preparar Sprint N+1 durante N, em lotes limitados; retenção máxima = plano atual + próximo. Trabalho antecipado não ativa entidades nem modifica estado da sprint em execução.
- [x] **E07** — Ao derrotar miniboss e resolver wave final, transicionar atomicamente; parar agenda anterior, retirar asteroides remanescentes sem recompensa e iniciar próxima sprint. Plano atrasado → transição segura e responsiva.
- [x] **E08** — Tratar pool cheio: inimigo obrigatório aguarda, miniboss nunca é descartado; asteroide opcional pode ser omitido com diagnóstico. Nada de rajada de eventos atrasados.
- [x] **E09** — Seed separada por domínio; progressão por sprint/wave e setor em `BALANCE`. Expor sprint/wave/setor e contagens na ferramenta DEV; alterações que influenciem resultado invalidam ranking da run.

**Aceite E:** percorrer duas sprints completas (modo de teste pode acelerar o tempo), 0–49 sem duplicações/pulos, miniboss na última, pausa e cancelamento corretos, memória limitada e nenhum carregamento pesado no tick.

**Entrega E (2026-10-20):** fluxo e limites em [run-flow](./plans/run-flow.spec.MD#implemented-execution-part-e); estudo em [poc2-enemy-study](./plans/poc2-enemy-study.spec.MD). Testes percorrem duas sprints com destruição acelerada pelo harness, sem atalho no código de produção. QA no navegador: entrada protegida → wave 0; teclado → 2 kills/200 pontos; tiros hostis → escudo reduzido; pausa e DEV com próxima pronta/2 planos. Pools e créditos de score limitados. Split/VFX, materialização de loot, receitas adicionais e ajuste de dificuldade continuam em F.

**Validação E:** `npm run verify` — 256 testes passaram em 76 arquivos; 60 TODOs históricos permanecem. Typecheck e lint aprovados. `npm run build` aprovado; permanece o aviso de chunk principal acima de 500 kB, a tratar no trabalho de desempenho/release.

## F — Consolidação para produto final (P1, depois do fluxo jogável)

- [x] **F01** — Integrar armas, equipamentos, crafting, drops e degradação CHAR existentes/planejados ao novo fluxo, com escopo por run.
- [x] **F02** — Completar Result → Recordes → Title → nova run e UX de falha de persistência, sem perder silenciosamente o resultado.
- [x] **F03** — Polir controles, áudio, HUD, feedback de entrada/wave/miniboss e acessibilidade dos formulários.
- [x] **F04** — Implementar Survivor e validar separação de placares; progressão de conteúdo/setores e balanceamento por playtest.
- [ ] **F05** — Trocar auth mock por Google/email reais no ambiente de produção; revisar contratos de plataformas e validar SDKs atuais antes de implementar, sem presumir APIs de ranking disponíveis.
- [ ] **F06** — Empacotar builds finais, medir desempenho e validar persistência/segurança de produção. Deploy só entra quando solicitado; documentação de VPS não bloqueia DEV local.

**Entrega F (2026-10-21):** economia por run, Laser/Plasma/Beam/Mjolnir/Nova, laboratório pausado, equipamentos/degradação, outbox durável por conta, repetição de partida, Survivor e 8 placares, áudio/HUD/foco acessível. Ver [consolidation](./plans/consolidation.spec.MD). Código Supabase email/senha + confirmação + Google implementado com SDK oficial; falta criar/configurar projeto, SMTP, Google e domínios e testar contas reais ([production-auth](./plans/production-auth.spec.MD)). F05 fica aberto para esse gate externo.

**Validação F:** 269 testes frontend em 80 arquivos (60 TODOs históricos), 18 testes API e três do empacotador; typecheck/lint/build e smoke Chrome passaram. Smoke inclui falha de envio → reload → recuperação → retry → recordes/menu/nova run. Benchmark headless: p95 ~0,80 ms/tick com limites 24 inimigos/16 asteroides/128 tiros e dois planos; não é medição de GPU/FPS. Auditorias npm sem vulnerabilidades após correções compatíveis. Permanece aviso do chunk Three (~524 kB), aplicação separada ~305 kB.

**F06 entregue parcialmente:** comandos de benchmark/release, ZIP/manifesto/checksum e auditoria estática com configuração obrigatória. Faltam pacote com ambiente real, QA de auth/headers/backup e medição longa no host alvo. Score ainda é calculado no cliente, sem promessa de anticheat autoritativo. Ver [release-validation](./plans/release-validation.spec.MD). Não houve deploy/publicação.

## G — Publicar a POC3 no Itch.io (gate de release)

Spec e roteiro: [itch-release.spec.MD](./plans/itch-release.spec.MD), `ITCH-01`–`10`. Planejamento baseado nas orientações oficiais consultadas em 2026-10-19; upload/publicação ainda pendentes.

- [ ] **G01 / ITCH-01** — Implementar `build:itch`, seleção de kit no bootstrap, produção, `dist-itch/` e versão. O script atual é genérico e o bootstrap usa fallback Demo; só criar um nome de script não resolve essa dependência.
- [ ] **G02 / ITCH-02** — Empacotar conteúdo de `dist-itch` com `index.html` na raiz; validar paths relativos/case, todos os assets e limites de arquivos/tamanho da plataforma.
- [ ] **G03 / ITCH-03** — Auditar bundle: sem localhost, mock DEV, banco SQLite, chaves, dependência de DemoHost local ou `/dev`. Guardar artefato com checksum e versão.
- [ ] **G04 / ITCH-04** — Para o escopo completo, hospedar API própria HTTPS e implementar Google/email reais com sessão validada no iframe do Itch, incluindo callbacks e CORS. O Itch recebe o frontend; SQLite/Node ficam no serviço externo. Uma demo local sem login real exige decisão explícita de escopo antes do código.
- [ ] **G05 / ITCH-05** — Implementar adapters de persistência para o perfil Itch: serviço autoritativo por conta, cache/preferências em Dexie, falhas e recuperação sem perder dados silenciosamente. Não prometer cloud save apenas com IndexedDB.
- [ ] **G06 / ITCH-06** — Conectar os quatro recordes ao serviço próprio; testar idempotência, períodos UTC, isolamento de contas/modos e API fora do ar. Não assumir API nativa de leaderboard/conquistas do Itch.
- [ ] **G07 / ITCH-07** — Validar ciclo completo jogável, áudio por gesto, WebGL, FPS/memória, HUD 16:9, fullscreen, foco/pausa, teclado/gamepad e reload no embed real. Mobile Friendly só após teste Android/iOS; não anunciar suporte ainda não validado.
- [ ] **G08 / ITCH-08** — Preparar página: conta/slug, título/resumo, capa e screenshots reais, controles, estágio/conteúdo disponível, idiomas, requisitos, créditos/licenças, contato de bugs e informações sobre dados de contas.
- [ ] **G09 / ITCH-09** — Publicar build de teste em página Draft/restrita: tipo HTML Game, arquivo jogável no navegador, Click to Play e embed/fullscreen configurados. Upload manual ZIP ou butler; registrar QA antes da etapa de tornar público.
- [ ] **G10 / ITCH-10** — Guardar release anterior, changelog e roteiro de rollback/reenvio; testar smoke test após upload e compatibilidade de saves/API entre versões. Automação por CI fica opcional para depois.

**Aceite G:** release anunciada funciona em uma máquina sem servidor DEV; pacote validado, login/saves/recordes conforme escopo, QA no iframe hospedado, página revisada e artefato recuperável. Uma demo pode ser menor que o produto final, mas precisa declarar suas limitações e ter o escopo aprovado.

## Como executar e concluir tarefas

1. Executar **A → C → D → E** para a partida; **B** pode avançar após A com fixtures, mas score real depende de E. Integrar B antes de declarar o ciclo completo. F vem depois.
   Preparar G em paralelo ao fechamento do ciclo; o gate público depende dos recursos anunciados e, para o produto completo, do auth real de F05. Não exige terminar outros ports ou toda a loja/lore para testar uma demo funcional.
2. Atualizar a spec do domínio e os testes afetados antes de marcar o item; cards SDD antigos podem estar desatualizados. Não considerar `.docs3/specs` automaticamente cobertas pelo Vitest do runtime.
3. Para código: testes de comportamento apropriados + `npm run verify` em `poc3/`; adicionar scripts de verificação do servidor ao implementar A. SQLite de teste usa arquivo temporário, nunca o banco local do jogador.
4. Para esta revisão documental: verificar links, tags e diff; não marcar como implementados os itens apenas especificados.
5. Cada entrega registra o que mudou, evidência de validação e pendências reais. Preservar alterações locais do usuário e não reintroduzir POC1/POC2 como base de desenvolvimento.

Valores ainda ajustáveis: cooldowns, composição das facções, ordem dos setores, duração da entrada e número de asteroides. Defaults de pacing estão explícitos na spec de fluxo; **50 waves (0–49)** foi confirmado pelo usuário.
