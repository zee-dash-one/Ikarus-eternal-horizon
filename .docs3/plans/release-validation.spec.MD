# Empacotamento e gate de produção — F06
Atualizado em 2026-10-21. Ferramentas implementadas; pacote final com ambiente real e QA público ainda pendentes.

## Comandos
No frontend:
- `npm run verify`: typecheck, lint e testes.
- `npm run benchmark`: workload da simulação, relatório local ignorado pelo Git.
- `npm run test:release`: valida configuração pública, formato ZIP e auditoria dos arquivos.
- `npm run release:check`: exige versão explícita, Supabase público e API HTTPS configurados.
- `npm run build:release`: gera `dist-release/`, audita assets relativos/rota mock/arquivos privados, cria ZIP com index.html na raiz, manifesto SHA-256 por arquivo e checksum do ZIP em `releases/`.
- `node scripts/smoke-browser.mjs`: requer Playwright instalado como ferramenta de QA (ou `IKARUS_PLAYWRIGHT_MODULE` apontando para o módulo), Chrome e DEV/API iniciados. `IKARUS_QA_OUTPUT` escolhe onde guardar screenshots/relatório.

O build normal serve para compilar o código; não significa que Supabase/domínios estejam configurados. O empacotador de release recusa configurações ausentes, HTTP/local e chaves privadas. Não foi gerado um pacote anunciado como final usando credenciais fictícias. Não é o fluxo Itch G01–G10 nem instala adapters Steam/Poki.

## Segurança e persistência verificadas
API de produção não registra mock e não aceita cookie DEV como identidade. Bearer é verificado com Supabase; email não confirmado é recusado. CORS usa origens exatas, payloads são limitados, settings/resultados são vinculados à conta e a submissão é idempotente. Chaves públicas apenas; Google/SMTP secrets ficam no provedor. SQLite precisa de volume durável e backup consistente com WAL (API backup do SQLite ou serviço parado); não copiar apenas o arquivo principal durante escrita.

A API valida conta/ticket/versões/limites/tempo, mas ainda recebe score calculado no cliente. Não é replay autoritativo nem sistema anticheat de produção. Antes de ranking competitivo público, implementar validação autoritativa ou assumir explicitamente o escopo de piloto; não declarar o placar inviolável.

## Gate que falta concluir
Criar/configurar Supabase, Google, SMTP e domínio/API HTTPS; gerar pacote com esses valores reais; validar cadastro/confirmação/login/logout, persistência após reinício, recuperação de outbox, CORS, header/CSP do host e restore de backup no ambiente alvo. Medir FPS/WebGL/memória/áudio/controles no navegador real de distribuição e em sessão longa. Mobile/iframe Itch exigem QA específico. Aprovação para deploy/publicação é uma etapa futura, quando solicitada.

Validação local: 269 testes frontend, 18 API, três empacotador, smoke Chrome e build passaram. SDK Supabase 2.118.0; Vite atualizado a 8.3.5; auditorias atuais sem vulnerabilidades. Chunks máximos: aplicação ~305 kB e Three ~524 kB (aviso existente, agora isolado).
