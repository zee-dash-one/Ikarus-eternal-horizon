# Ikarus Eternal Horizon — Publicação no Itch.io

tag_g_builds tag_s_builds_itch tag_s_builds_artifacts
RESUME: Requisitos de publicação HTML5 da POC3, adaptação de auth/persistência, empacotamento e aceite no embed real do Itch.io.

**Revisão:** 2026-10-19 · **Estado:** planejamento; implementação e upload pendentes.
**Referências internas:** [builds](./builds.spec.MD) · [arquitetura](./architecture.spec.MD) · [login](./login.spec.MD) · [recordes](./rankings.spec.MD) · [todo-codex](../todo-codex.md), etapa G.

## Escopo da primeira publicação

Alvo: POC3 como jogo **HTML5 para navegador**, inicialmente desktop, em página Itch.io. Publicar uma versão de teste pode preceder o produto completo, mas a página deve identificar claramente seu estágio e recursos disponíveis. Mobile só será anunciado depois de validado em aparelhos reais.

Preservar os requisitos do produto: login Google/email reais fora de DEV e recordes semanal/mensal/anual/eterno. O email mock + SQLite local continua sendo o ambiente de desenvolvimento. O ZIP público contém somente o frontend; o serviço de login/recordes precisa de hospedagem própria para a versão completa.

**Decisão ainda necessária antes da implementação de uma demo autônoma:** permitir um perfil local sem login real, sem backend e com recordes apenas neste navegador. Essa seria uma redução explícita de escopo; não está aprovada por esta documentação. Não contornar a ausência do servidor publicando o mock DEV como autenticação real.

## Regras da plataforma verificadas

Segundo o [guia oficial HTML5](https://itch.io/docs/creators/html5), o jogo roda em iframe. Enviar ZIP com `index.html` na raiz e assets necessários; referências devem ser relativas, com capitalização exata e nomes UTF-8. Limites padrão: até **1.000 arquivos**, **500 MB extraídos**, **200 MB por arquivo** e **240 caracteres por caminho**. APIs externas devem usar HTTPS. Revalidar os limites na data de cada release.

No painel, escolher **HTML Game**, selecionar o arquivo para execução no navegador e configurar embed/fullscreen. Manter **Click to Play**; habilitar **Mobile Friendly** somente após QA. O viewport deve se adaptar ao tamanho disponível. Fonte: [upload e embed](https://itch.io/docs/creators/html5).

Upload por [butler](https://itch.io/docs/butler/pushing.html) é opcional: aceita pasta ou ZIP, canal e `--userversion`. No primeiro envio, marcar o canal como jogável no navegador no editor e salvar; o nome do canal sozinho não configura HTML5.

## O que falta no repositório

Observado em 2026-10-19; esta tabela é diagnóstico, não execução das tarefas.

| Arquivo/área | Estado observado | Alteração necessária |
| --- | --- | --- |
| `poc3/package.json` | Apenas `build` genérico; sem `build:itch` | Script de produção Itch e validação do artefato |
| `poc3/vite.config.ts` | `base: './'` adequado; saída genérica `dist` | Seleção do target, saída isolada `dist-itch`, versão de build |
| `poc3/src/main.tsx` / `game-app.ts` | Bootstrap não injeta kit Itch; fallback é Demo | Selecionar kit no build e injetar no bootstrap |
| `poc3/src/platform/kit-itch.ts` | Kit parcial, somente auth | Conectar capabilities, persistência e recordes necessários |
| `poc3/src/platform/itch-auth-adapter.ts` | Stub sem sessão/login | Auth real com backend externo ou revisão explícita do escopo da demo |
| Perfil DEV | Serviço local e SQLite planejados | Separar configuração DEV de release; retirar dependência de localhost e mocks do artefato |
| Gameplay e Result | Backlog A–F ainda contém entregas pendentes | Entregar e verificar o ciclo anunciado na página antes de publicar |

## Build e pacote (`ITCH-01`–`03`)

- Implementar `npm run build:itch`: typecheck, seleção do kit Itch, modo produção e saída `poc3/dist-itch/`. Variável de plataforma deve ser lida explicitamente pelo Vite/build; só definir `IKARUS_PLATFORM` no ambiente não implementa a seleção.
- Versionar build/conteúdo/schema e mostrar versão no Result ou painel de informações. O mesmo artefato testado deve ser enviado.
- Auditar assets: carregar via URLs relativas/base do bundle, inclusive carregamentos dinâmicos, áudio e fontes. Não depender do servidor de desenvolvimento ou de arquivos fora da saída.
- ZIP deve conter **o conteúdo** de `dist-itch`, sem pasta intermediária:

```text
ikarus-<versao>-itch.zip
  index.html
  assets/
  ...outros arquivos públicos usados pelo jogo
```

- Excluir `.env`, chaves, cookies, banco SQLite, código do DemoHost, node_modules, fontes de desenvolvimento e ferramentas `/dev`. Configuração pública pode conter URL HTTPS da API, nunca segredos OAuth ou credenciais do servidor.
- Criar verificação automática do ZIP: entrada, arquivos referenciados, limites da plataforma, nomes/case, ausência de conteúdo DEV e checksum do release. Metas internas de download, memória e FPS devem ser medidas em hardware de referência e registradas, sem inventar números como requisito do Itch.

## Login, saves e recordes (`ITCH-04`–`06`)

Proposta para atender o escopo completo existente:

```text
Página Itch → iframe → frontend HTML5 + kit Itch
                           ├─ IndexedDB/Dexie: cache e preferências locais
                           └─ API própria HTTPS
                                 ├─ Google/email reais e sessões
                                 ├─ perfis e persistência
                                 └─ SQLite do serviço + recordes UTC
```

- Implantar o serviço de produção separadamente do upload HTML5; arquivo SQLite permanece no servidor, com migrações e backup/restauração testados. Nenhum processo Node local do desenvolvedor pode ser necessário para jogar.
- Usar endpoint HTTPS configurável no kit Itch. Implementar e testar CORS/origem e a estratégia de sessão no **iframe real**, inclusive restrições de cookies e popup. Não presumir que o cookie same-origin usado no DemoHost funcionará nesse contexto.
- Especificar o método de email real e configurar callback Google para o serviço de produção. Fluxo deve voltar ao jogo sem expor tokens a origens arbitrárias; cancelamento/expiração/retry precisam de feedback.
- Dados autoritativos por conta e placares compartilhados vivem no serviço; Dexie é cache local neste perfil conectado. Sem prometer sincronização entre dispositivos usando somente IndexedDB.
- Reaproveitar janelas UTC, separação de modos e idempotência por runId. API indisponível: mostrar erro/retry e status de envio; não apresentar score ainda não confirmado como recorde global.
- Não assumir um SDK nativo de login, conquistas ou leaderboard Itch. Os [documentos de API](https://itch.io/docs/api/overview) consultados não estabelecem essas integrações; a [API JavaScript documentada](https://itch.io/docs/api/javascript) descreve compra e metadados. `ItchRankingAdapter`/`ItchAchievementAdapter` são interfaces do nosso projeto, não prova de serviço da plataforma.
- Tratar falha de armazenamento no navegador; oferecer aviso e continuidade controlada. A troca de conta limpa caches de perfil. Não importar silenciosamente dados DEV ou publicar emails no ranking.

Uma demo autônoma aprovada no futuro pode usar Dexie como fonte local e indicar “recordes neste navegador”; isso precisa de decisão explícita e atualização de login/rankings antes do código. Assim, uma falha de API não vira um modo guest implícito.

## Aceite jogável e QA (`ITCH-07`)

- Ciclo publicado funciona: iniciar → autenticar → Start/audio unlock → Title → preparar mundo → entrada do Ikarus → combate → DEAD → Result → recordes → nova partida. Nada de bloqueio por botão stub.
- Validar waves 0–49, miniboss final e próxima sprint, com modo de teste acelerado separado do artefato público. Só anunciar modos, equipamentos e conteúdo realmente jogáveis.
- Testar em Chrome/Edge e Firefox desktop; incluir Safari se for anunciado suporte. Registrar navegador, hardware, versão, resultado e falhas conhecidas.
- No embed real: canvas 16:9 com letterbox, resize e fullscreen sem cortar HUD; entrada por teclado/gamepad conforme anunciado; foco e captura/liberação do mouse, quando usada; pausa ao perder foco/visibilidade e retorno sem avanço acumulado.
- Áudio deve liberar por gesto do jogador, com volume/mute funcionais. Detectar indisponibilidade de WebGL com mensagem útil. Controlar resolução/pixel ratio, pools e descarte entre partidas; medir primeira carga e estabilidade em partidas repetidas.
- Testar sessão/saves após reload, logout/troca de conta, rede lenta/offline, API fora do ar e armazenamento negado. Verificar console/rede: sem erros fatais, asset 403/404, mixed content ou chamadas a localhost.
- Touch e landscape em Android/iOS entram na matriz somente para release que anunciar mobile. Suporte a gamepad, mobile ou navegadores não testados não deve ser marcado só porque há código de adapter.

## Página e publicação (`ITCH-08`–`10`)

Preparar conta/autoria, slug, título, resumo, capa e screenshots do jogo real, instruções de controle e objetivo, idiomas, estágio (demo/alpha/final), requisitos de navegador, créditos/licenças dos assets e contato para bugs. Se houver contas/dados remotos, explicar dados coletados, finalidade e contato para solicitações. Estes são itens do checklist do projeto; consultar também as [diretrizes de qualidade](https://itch.io/docs/creators/quality-guidelines).

Roteiro de release:

1. Implementar as tarefas G do backlog e resolver bloqueadores do escopo escolhido. Executar `npm run verify` e, quando existir, `npm run build:itch` em `poc3/`.
2. Gerar ZIP, validar, registrar versão/checksum/changelog e guardar o último artefato estável.
3. Criar/usar página em **Draft/restrita para testes**. Enviar ZIP ou usar butler. Configurar HTML5, arquivo jogável, viewport e controles descritos na seção de regras.
4. Validar o artefato no embed hospedado e colher evidências de QA. Preview local não substitui este passo.
5. Revisar texto/scope da página e só então tornar público. Este pedido autoriza documentação; não executa upload/publicação.
6. Após release, fazer smoke test público, acompanhar bugs, manter versão e changelog. Rollback: reenviar o artefato estável e validar novamente. Backend deve preservar compatibilidade de payload/save; rollback do ZIP não reverte migração de banco.

Exemplo **futuro**, a partir da pasta `poc3/`, substituindo os placeholders:

```powershell
butler login
butler push dist-itch USUARIO/SLUG:html5 --userversion VERSAO
```

Ainda é necessário configurar HTML5 no editor após o primeiro envio. Credenciais do butler ficam fora do repositório. Upload manual por ZIP é suficiente para a primeira release; automação de CI pode vir depois.

## Gate de publicação

| ID | Evidência para concluir |
| --- | --- |
| `ITCH-01` | Build de produção seleciona kit Itch, saída e versão corretos |
| `ITCH-02` | ZIP validado; index na raiz, paths corretos e limites respeitados |
| `ITCH-03` | Artefato sem dependências locais, segredos ou ferramentas DEV |
| `ITCH-04` | Login real e sessão funcionam no iframe com API HTTPS |
| `ITCH-05` | Save por usuário e recuperação de falha testados |
| `ITCH-06` | Quatro períodos de recordes funcionam com serviço real e modos separados |
| `ITCH-07` | Ciclo jogável e matriz de browsers/input executados no embed |
| `ITCH-08` | Página, mídia, controles, créditos e informações de dados revisados |
| `ITCH-09` | Upload restrito e QA documentados; publicação pública tratada como etapa distinta |
| `ITCH-10` | Artefato estável anterior, changelog e procedimento de recuperação disponíveis |

Gate incompleto significa **ainda não pronto para a release descrita**. Tarefas podem ser reduzidas para uma demo somente com escopo aprovado e identificado na página. A publicação no Itch não exige concluir toda a loja, todas as plataformas ou toda a lore para uma demo honesta e funcional.
