# DemoHost local — POC3

Requer **Node >=24.12.0** (inclui `node:sqlite`) e npm. O SQLite nativo ainda emite aviso experimental nessa versão do Node; não há driver compilado à parte.

Na raiz do repositório, instalar dependências uma vez:

```powershell
npm ci --prefix demo-host
npm ci --prefix poc3
```

Iniciar os dois serviços:

```powershell
npm run dev:all --prefix poc3
```

Abrir [http://127.0.0.1:5173](http://127.0.0.1:5173). O Vite fica na porta fixa 5173 e encaminha `/api` para o DemoHost em `127.0.0.1:8787`. O comando conjunto reinicia o frontend por HMR; alterações no servidor exigem reiniciar o comando. Ctrl+C encerra ambos.

Alternativa com dois terminais e watch no servidor:

```powershell
npm run dev --prefix demo-host
```

```powershell
npm run dev --prefix poc3
```

## Login e dados

Em DEV, informar um email de teste válido; não há senha, envio de email ou verificação de posse. Google fica indisponível. Email normalizado reutiliza o usuário local. A sessão dura sete dias, sobrevive ao reload e ao reinício do host; **Sair da conta** revoga a sessão e limpa o estado do jogo. Não usar credenciais reais para testar.

O banco nasce em `demo-host/data/ikarus-dev.sqlite`. Migrações são aplicadas antes de aceitar requests, com chaves estrangeiras e WAL. Banco/WAL/SHM e `.env` são ignorados pelo Git. Tokens aleatórios ficam no cookie HttpOnly; o banco guarda seu hash. O nome público é independente do email.

Controles são carregados **depois** da sessão e salvos no servidor por usuário. Alterações são serializadas; falhas ficam visíveis com retry. O header de conta esperada bloqueia gravações atrasadas depois de trocar a sessão. Dados legados de Dexie/localStorage não são importados automaticamente. O melhor resultado do HUD vem do cache por conta do RankingManager, carregado pela API fora do frame. O menu oferece Jogar e Recordes; Result permite nova tentativa de envio sem duplicar a partida.

## Configuração

| Opção | Padrão / comportamento |
| --- | --- |
| `IKARUS_PROFILE=dev` ou `--dev` | Habilita mock no host; ausência mantém perfil production sem mocks |
| `NODE_ENV=production` | Prevalece sobre qualquer solicitação de DEV |
| `--allow-local-http` | Somente com perfil DEV: permite cookie sem Secure no HTTP local; `npm run dev` passa explicitamente essa opção |
| `PORT` | 8787; bind sempre em loopback `127.0.0.1` |
| `IKARUS_DB_PATH` | Caminho alternativo do banco; caminho relativo é resolvido no diretório do processo |
| `IKARUS_ALLOWED_ORIGINS` | Origens exatas, separadas por vírgula; padrão `http://localhost:5173,http://127.0.0.1:5173` |
| `IKARUS_API_TARGET` | Configuração do Vite; padrão `http://127.0.0.1:8787`; ajustar se mudar PORT |

Variáveis são lidas do ambiente do processo. Por exemplo, no PowerShell: `$env:IKARUS_DB_PATH = 'C:\caminho\ikarus.sqlite'`. Arquivos `.env` do servidor não são carregados implicitamente. O Vite lê suas próprias configurações; o perfil de auth do cliente é DEV apenas no modo development e fica desabilitado no build de produção.

`npm start --prefix demo-host` inicia com mocks desabilitados por padrão; provedores reais de produção ainda serão implementados. Sessões mock existentes também são rejeitadas no perfil production. Não há callback Google fake. Este serviço implementa as partes A e B no perfil DEV. A versão pública ainda depende de provedores reais de produção.

## API atual

| Método / rota | Comportamento |
| --- | --- |
| `GET /api/health` | Saúde/perfil do host |
| `POST /api/auth/dev-email` | `{ email }`; rota somente DEV; cria/reutiliza identidade e emite sessão |
| `GET /api/me` | Sessão pública ou 401 |
| `POST /api/auth/logout` | Revogação idempotente e remoção do cookie |
| `GET /api/profile/settings/:key` | Registro `{ schemaVersion, payload }` ou 404; exige sessão |
| `PUT /api/profile/settings/:key` | Mesmo envelope; salva no usuário da sessão; exige origem válida |

Chaves permitidas: `controls`, `audio`, `graphics`, `progress`, `achievements`, `dev-content`. Controles estão conectados à UI; demais chaves são o port de persistência para os respectivos domínios quando implementados, sem simular conquistas/progresso inexistentes. Payload é objeto JSON de até 64 KiB; versão inteira positiva. Requests mutáveis exigem Origin configurada. A migração 2 preserva os dados da parte A e adiciona tickets de partida e fingerprints de submissão.

## Verificação

```powershell
npm run verify --prefix demo-host
npm run verify --prefix poc3
npm run build --prefix poc3
```

Os testes do host usam bancos temporários isolados e testam reinício, expiração, logout, origem, contas, migrações e perfil production. Os testes do cliente verificam auth/HTTP, gate de sessão, controle de erros, retry e formulário React. Nenhum teste deve usar o banco local do jogador.

## Resultados e recordes (parte B)

| Método / rota | Contrato |
| --- | --- |
| `POST /api/rankings/start` | `{ mode: "normal", buildVersion, contentVersion }` → runId, seed, versões e token opaco por conta; válido por 24 horas |
| `POST /api/rankings/submit` | Ticket + score, kills, durationMs, endedAt, outcome `dead` e debugModified; devolve recibo com horário UTC do servidor e elegibilidade |
| `GET /api/rankings/board?mode=normal&period=weekly` | Períodos weekly/monthly/annual/eternal; top 50 e melhor/posição do usuário, inclusive fora do top |
| `GET /api/rankings/bests` | Melhores por período da conta, para cache do HUD |

Todas exigem sessão; requests mutáveis também exigem Origin. A conta esperada pode ser vinculada pelo header X-Ikarus-User, e o ticket é validado contra o usuário autenticado. Survivor possui contrato de consulta separado, mas a criação de partidas fica indisponível até o modo ser implementado.

O servidor valida limites/tipos/metadados e registra a primeira conclusão aceita com seu próprio relógio UTC; client endedAt é diagnóstico. Repetir a mesma submissão retorna o recibo original; mudar seus dados no mesmo runId retorna 409. O ticket DEV é validação básica, não anticheat de produção. Um melhor por jogador/período: score decrescente, kills decrescentes, duração crescente e runId crescente. Nenhum email é exposto no placar.

Quit/cancelamento não envia resultado. DEAD com zero pontos ou alterações do debugger fica no histórico sem entrar nos recordes. Pendências de envio mantêm a tela de resultado com retry; navegação/logout ficam bloqueados até confirmar ou descartar explicitamente. Não há outbox durável para recuperar resultado ainda não confirmado após crash do navegador.

Pontuação vem de eventos confirmados `enemy_destroyed` / `meteor_destroyed` e BALANCE.scoring. DamageManager pode publicar mortes de inimigos com crédito; entidades futuras devem usar eventId único por destruição, distinto do slot reutilizável do pool. Spawns/inimigos/meteoros de D/E ainda são necessários para combate ativo; voo parado não gera score.

Para validar o ciclo de resultado antes do combate completo, usar Pause → Dev → **Testar fim de partida**. Esse caminho marca a run como teste e nunca a qualifica para o placar. Fixtures de pontuação devem ficar apenas em bancos temporários/de QA, separadas do gameplay normal.

## Ciclo de partida (parte C)

Depois de entrar, pressionar Enter ou clicar na tela Start para liberar áudio e abrir o menu. Jogar prepara o ticket/contexto fora do tick; Cancelar preparação volta ao menu e impede que uma resposta atrasada monte Run. Cada tentativa possui seu próprio estado de combate, pool e eventos; Abandonar partida descarta esses recursos sem registrar score.

Pausa continua sendo a tecla/botão configurado nos controles. Ela é lida fora da simulação, inclusive quando nenhum tick executa. Ocultar a aba pausa a partida; voltar exige retomar. A simulação permanece a 60 Hz, com no máximo 5 ticks por frame, sem recuperar atraso excedente. O debugger mostra tick e tempo para verificar o congelamento. O contrato de coordenadas e os limites de D/E estão em [run-flow.spec.MD](../.docs3/plans/run-flow.spec.MD).

## Preparação do mundo (parte D)

Jogar prepara registries separados de inimigos/asteroides, três camadas de parallax, catálogo do setor e Sprint 1 com 50 waves (0–49, miniboss na 49). O plano é determinístico por seed/config/versão; inimigos e asteroides têm cooldowns/RNG independentes. A agenda de asteroides tem segmentos de 30 s, extensíveis sem alterar os anteriores. Tudo fica pronto antes de abrir Run; progresso/cancelamento aparecem no menu.

Somente wave 0 e o primeiro lote de asteroides são reservados no pool, inativos e sem colisão. Pause → Dev → Ship → Live mostra setor, waves, camadas, reservas e ativos. O perfil atual ainda é voo do jogador: entrada animada, emissão das waves/asteroides e combate serão ligados na parte E. A versão de conteúdo dos novos tickets é poc3-2; os resultados antigos permanecem no SQLite.

## Parte F: modos e autenticação de produção
Normal e Survivor têm tickets/bests/recordes separados; migração 3 adiciona identidades externas preservando dados locais. DEV continua email mock + SQLite e nunca envia confirmação.
Produção usa Supabase Auth (email/senha + confirmação e Google); a API valida Bearer com getUser e não aceita cookie DEV. Copie .env.example para um arquivo não versionado, configure projeto/provedores/SMTP/HTTPS e execute com Node >=24.12:
`node --env-file=.env.production src/index.ts`.
Use volume durável para SQLite, backup consistente com WAL e origens exatas. Nenhuma service_role/secret key é necessária no servidor ou cliente. Configuração/contas reais e deploy não foram feitos nesta tarefa.
Guias: [Auth](../.docs3/plans/production-auth.spec.MD), [gate de release](../.docs3/plans/release-validation.spec.MD).
