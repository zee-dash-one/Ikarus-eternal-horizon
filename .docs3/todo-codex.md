# TODO Codex — POC3 até o jogo final

Atualizado em **2026-10-19**. Este é o backlog ativo do Codex. O [todo anterior](./todo.md) fica como histórico de implementação; seus checks não comprovam os requisitos revisados abaixo.

## Direção e autoridade

- Desenvolver o produto em `poc3/`; `demo-host/` é o serviço local de apoio.
- POC2 serve **somente** para estudar movimento de inimigos e lógica de grupos. Não portar sua arquitetura, câmera, armas, parallax, login ou persistência.
- Ordem de leitura: este backlog → [hub](./plans/planning.spec.MD) → [fluxo de partida](./plans/run-flow.spec.MD) → specs de domínio. Decisões D47–D50 substituem regras antigas conflitantes nos temas revisados.
- **Sprint é um ciclo do jogo:** 50 waves, índices **0 a 49**, miniboss na **49**. Sprint inicial = 1. Não confundir waves com quantidade de kills nem com etapas de desenvolvimento.
- Este documento acompanha implementação e planejamento. A parte A está implementada (2026-10-19); os demais itens continuam pendentes, salvo anotação explícita.

## Diagnóstico do código lido

| Área | Estado observado | Trabalho necessário |
| --- | --- | --- |
| `poc3/src/core/game-loop.ts` | Tick fixo de 60 Hz e sidecar de render já existem; acumulador sem limite | Limitar catch-up, separar relógios e preservar input de pausa fora do tick |
| `poc3/src/game-app.ts` | Compõe dependências; Title chama `goToRun()` automaticamente; managers vivem na aplicação | Menu explícito, preparação antes de Run, escopo por partida, descarte de listeners e cancelamento |
| `poc3/src/scenes/run-scene.ts` | Mistura sim, parallax/View, snapshot e score; kills = 0; score = tempo × 120 | Extrair `RunSimulation`; score por eventos; cena apenas apresenta |
| `poc3/src/core/balancer.ts` | Guest stub removido na parte A | Login depende da sessão do servidor |
| Login / `DemoAuthAdapter` | Email DEV via API; capabilities; sessão persistida e logout | Provedores reais ficam na etapa de produção |
| `demo-host/src/index.ts` | SQLite, migrações, repositórios, email mock, sessões e settings | APIs de recordes ficam na parte B; Google real na produção |
| Persistência | Controles em SQLite por conta; ports para os outros domínios; fonte localStorage removida | Integrar recordes reais/HUD na parte B; demais domínios conforme forem implementados |
| `EnemyManager` / `MeteorManager` | Stubs sem implementação de entidades | Spawn points, pools, comportamento e consumo dos planos |
| `ParallaxField` | Três camadas configuradas já existem | Integrar preparação e separar evolução lógica da aplicação visual |
| Recordes | Há specs e tabela de espelho Dexie | Implementar serviço local, resultado e tela com quatro períodos |

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

- [ ] **B01** — `RankingManager` + adapter local HTTP; persistir runs por `runId` único, usuário da sessão, modo, score, kills, duração, conclusão UTC, seed e versões de conteúdo/build.
- [ ] **B02** — `RunResultManager` finaliza uma única vez ao receber player `DEAD`; `DRIFTING` não encerra. Envio com retry idempotente; quit/cancelamento não gera recorde válido. Fixtures de UI ficam separadas das runs reais.
- [ ] **B03** — Consultar **semanal, mensal, anual e eterno** em SQLite. Semana inicia segunda-feira 00:00 UTC; mês/ano civis; intervalos `[início, próximo início)`. Servidor calcula os buckets e mantém histórico, sem apagar runs na virada.
- [ ] **B04** — Uma melhor run por usuário/modo/período. Ordenar score decrescente, kills decrescentes, duração crescente e runId como desempate estável. Retry não duplica; mesma run pode valer para quatro períodos.
- [ ] **B05** — Tela React de recordes acessível pelo Title e Result: quatro abas, posição, nome público, score e destaque do jogador; loading, vazio, erro e retry. Não expor email como nome público.
- [ ] **B06** — Manter contrato de modos Normal/Survivor separado. Entregar Normal primeiro; Survivor indisponível até jogável, sem preencher placar com resultados Normal.
- [ ] **B07** — Remover score provisório baseado só em tempo e kills fixos; atualizar por eventos de gameplay. HUD recebe best score do cache do Manager carregado fora do frame; remover leitura de localStorage por render.
- [ ] **B08** — Validar payloads e vínculo à sessão; marcar runs alteradas pelo debugger como inelegíveis ao placar normal. DEV local não é anticheat de produção; validação de produção fica em etapa posterior.

**Aceite B:** score encerrado persiste após restart; filtros UTC corretos inclusive virada de ano/semana e ano bissexto; usuário/modo separados; submissão repetida sem duplicação; tela funciona sem partidas cadastradas.

## C — Separação do loop e ciclo de vida (P0)

Referências: `FLOW-09`, `ARCH-16`–`20`, `SCENE-*`.

- [ ] **C01** — Extrair `RunSimulation` de `RunScene.update`: input/comandos → simulação → eventos/snapshot. Tirar acesso Three.js/câmera visual da sim e renderizar a partir do snapshot.
- [ ] **C02** — Manter sim fixa a 60 Hz; limitar delta e passos por frame, descartar atraso excedente conforme política documentada. Resetar acumulador ao iniciar/reiniciar/retomar; input de pausa/resume continua fora do gate da sim.
- [ ] **C03** — Criar `RunFlowManager` com PREPARING/READY/ENTERING/ACTIVE/TRANSITION/FINISHED/CANCELLED; preparação é assíncrona e não acontece dentro do tick.
- [ ] **C04** — Criar contexto novo por run (sheet, pools, timers, score, seed); manter somente serviços de sessão/assets compartilhados. `dispose` cancela async, remove listeners e devolve recursos. Evitar manter dependências de Run anteriores em `GameApp`.
- [ ] **C05** — Remover navegação automática Title → Run; oferecer Jogar e Recordes. Ação repetida de Jogar não cria duas preparações. Manter o Start/audio unlock antes do Title.
- [ ] **C06** — Alinhar contrato de dois eixos: código usa `x/z`, docs dizem `X/Y`. Definir conversão explícita no limite sim/View antes dos spawn points, sem alterar controles por acidente.

**Aceite C:** pausa sem avanço de clocks; retorno após aba inativa sem avalanche de ticks; duas runs consecutivas com estado limpo; cancelar preparação não monta uma cena atrasada.

## D — Preparar o mundo e a primeira sprint (P0)

Referências: `FLOW-01`–`06`; seguir esta ordem no `RunPreparationManager`.

- [ ] **D01 / passo 1** — Criar registry de spawn points de inimigos, com IDs, posições/volumes, direções, capacidades e área segura de entrada.
- [ ] **D02 / passo 2** — Criar registry independente para asteroides; manter o nome técnico `MeteorManager` já existente.
- [ ] **D03 / passo 3** — Instanciar exatamente três camadas de parallax (distante/intermediária/próxima) a partir de `BALANCE`; preparar assets sem ativar combate.
- [ ] **D04 / passo 4** — Catálogo de setores e facções: arquétipos, classes, formações, miniboss e mix de asteroides. Validar IDs; facção não é classe de combate. Catálogo inicial mínimo, sem inventar obrigação de preencher toda a lore agora.
- [ ] **D05 / passo 5** — Gerar `SprintPlan` 1 determinístico com seed e versão; **50 WavePlans, índices 0–49**.
- [ ] **D06 / passo 5.1** — Calcular cooldown de inimigos por wave/sprint, limites e orçamento de unidades ativas em `BALANCE`.
- [ ] **D07 / passo 5.2** — Calcular cooldown dos asteroides separadamente, com orçamento próprio.
- [ ] **D08 / passo 5.3** — Definir inimigos de cada wave, facção, squad, formação, spawn point e espaçamento de entrada.
- [ ] **D09 / passo 5.4** — Definir sequência ordenada de asteroides: tipo/tamanho, ponto, velocidade e tick de emissão; extensão determinística se a sprint durar além do segmento preparado.
- [ ] **D10 / passo 5.5** — Wave 49 contém miniboss; vitória depende de derrotá-lo. Remover gatilho antigo de miniboss a cada 50 kills deste fluxo.
- [ ] **D11 / passo 6** — Reservar em memória wave 0 e primeiro lote de asteroides, inativos e fora da colisão. Pré-aquecer pools/assets necessários; não instanciar as 50 waves simultaneamente.

**Aceite D:** mesmo seed/config produz mesmo plano; nenhum tipo fora da facção/setor; preparação sem ticks de combate; quantidades e capacidade validadas antes de abrir Run.

## E — Executar e antecipar sprints (P0)

Referências: `FLOW-05`–`08`, [enemy](./plans/enemy.spec.MD), [squad](./plans/squad.spec.MD), [meteors](./plans/meteors.spec.MD).

- [ ] **E01 / passo 7** — Montar tela de jogo somente com contexto preparado; HUD e mundo prontos antes da entrada.
- [ ] **E02 / passo 7.1** — Entrada da nave Ikarus; evento `PlayerEntryCompleted` libera combate. Sem dano, disparos, score ou clocks de wave durante a entrada; pausa congela a animação lógica.
- [ ] **E03 / passo 7.2** — Iniciar Sprint 1 uma única vez; ativar wave 0 e timeline de asteroides independente. Avanço padrão: emitir todos → resolver todos → cooldown → próxima wave.
- [ ] **E04** — Implementar EnemyManager/SquadManager e estudar **somente** `poc2/src/systems/{steering,reach-path,formation-slots,enemy-movement-manager,enemy-squad-manager,enemy-strategy,enemy-group}.ts` e testes relevantes. Registrar comportamentos úteis e reescrever no contrato de sim POC3, sem importar POC2.
- [ ] **E05** — Implementar MeteorManager, pools, movimento, colisão/dano/despawn e eventos de drop; recebe eventos planejados, sem outro gerador aleatório concorrente.
- [ ] **E06 / passo 7.3** — Preparar Sprint N+1 durante N, em lotes limitados; retenção máxima = plano atual + próximo. Trabalho antecipado não ativa entidades nem modifica estado da sprint em execução.
- [ ] **E07** — Ao derrotar miniboss e resolver wave final, transicionar atomicamente; parar agenda anterior, retirar asteroides remanescentes sem recompensa e iniciar próxima sprint. Plano atrasado → transição segura e responsiva.
- [ ] **E08** — Tratar pool cheio: inimigo obrigatório aguarda, miniboss nunca é descartado; asteroide opcional pode ser omitido com diagnóstico. Nada de rajada de eventos atrasados.
- [ ] **E09** — Seed separada por domínio; progressão por sprint/wave e setor em `BALANCE`. Expor sprint/wave/setor e contagens na ferramenta DEV; alterações que influenciem resultado invalidam ranking da run.

**Aceite E:** percorrer duas sprints completas (modo de teste pode acelerar o tempo), 0–49 sem duplicações/pulos, miniboss na última, pausa e cancelamento corretos, memória limitada e nenhum carregamento pesado no tick.

## F — Consolidação para produto final (P1, depois do fluxo jogável)

- [ ] **F01** — Integrar armas, equipamentos, crafting, drops e degradação CHAR existentes/planejados ao novo fluxo, com escopo por run.
- [ ] **F02** — Completar Result → Recordes → Title → nova run e UX de falha de persistência, sem perder silenciosamente o resultado.
- [ ] **F03** — Polir controles, áudio, HUD, feedback de entrada/wave/miniboss e acessibilidade dos formulários.
- [ ] **F04** — Implementar Survivor e validar separação de placares; progressão de conteúdo/setores e balanceamento por playtest.
- [ ] **F05** — Trocar auth mock por Google/email reais no ambiente de produção; revisar contratos de plataformas e validar SDKs atuais antes de implementar, sem presumir APIs de ranking disponíveis.
- [ ] **F06** — Empacotar builds finais, medir desempenho e validar persistência/segurança de produção. Deploy só entra quando solicitado; documentação de VPS não bloqueia DEV local.

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
