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

Controles são carregados **depois** da sessão e salvos no servidor por usuário. Alterações são serializadas; falhas ficam visíveis com retry. O header de conta esperada bloqueia gravações atrasadas depois de trocar a sessão. Dados legados de Dexie/localStorage não são importados automaticamente. O antigo best score compartilhado por localStorage foi retirado; recordes reais entram na parte B.

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

`npm start --prefix demo-host` inicia com mocks desabilitados por padrão; provedores reais de produção ainda serão implementados. Sessões mock existentes também são rejeitadas no perfil production. Não há callback Google fake. Este serviço implementa a parte A, não os endpoints de placar da parte B.

## API atual

| Método / rota | Comportamento |
| --- | --- |
| `GET /api/health` | Saúde/perfil do host |
| `POST /api/auth/dev-email` | `{ email }`; rota somente DEV; cria/reutiliza identidade e emite sessão |
| `GET /api/me` | Sessão pública ou 401 |
| `POST /api/auth/logout` | Revogação idempotente e remoção do cookie |
| `GET /api/profile/settings/:key` | Registro `{ schemaVersion, payload }` ou 404; exige sessão |
| `PUT /api/profile/settings/:key` | Mesmo envelope; salva no usuário da sessão; exige origem válida |

Chaves permitidas: `controls`, `audio`, `graphics`, `progress`, `achievements`, `dev-content`. Controles estão conectados à UI; demais chaves são o port de persistência para os respectivos domínios quando implementados, sem simular conquistas/progresso inexistentes. Payload é objeto JSON de até 64 KiB; versão inteira positiva. Requests mutáveis exigem Origin configurada. O schema de `runs` já existe para a parte B, sem publicar resultados ainda.

## Verificação

```powershell
npm run verify --prefix demo-host
npm run verify --prefix poc3
npm run build --prefix poc3
```

Os testes do host usam bancos temporários isolados e testam reinício, expiração, logout, origem, contas, migrações e perfil production. Os testes do cliente verificam auth/HTTP, gate de sessão, controle de erros, retry e formulário React. Nenhum teste deve usar o banco local do jogador.
