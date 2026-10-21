# Consolidação jogável — parte F
Atualizado em 2026-10-21. Código em POC3; POC2 continua restrita ao estudo já registrado.

## Economia por run (F01)
`RunContext` agora possui inventário, drops e CraftManager. `BALANCE.economy` reúne caps, loot, perfis de armas, nove receitas e dois equipamentos iniciais. Não há estoque, armas ou equipamentos herdados entre runs.
- Drops são entidades lógicas em pool fixo, com deriva, magnetismo, coleta parcial e descarte por lifetime/off-field. Overflow não elimina a parte não aceita. Eventos de destruição alimentam uma seed de loot separada de inimigos/asteroides/cosméticos.
- Laboratório aparece apenas no Normal durante a pausa. Um projeto por vez, custo de materiais/ENE no início, timer avançando só com pausa aberta e página visível. Cancelar não reembolsa. Retomar combate suspende o timer. Upgrade mantém a arma escolhida no início do projeto.
- Reparos/recharge preservam o resto do CHAR; reparo pode recuperar DRIFTING, nunca DEAD. Equipamentos ocupam slots genéricos e publicam grants em Summary, sem recuperar HP/SHD/ENE ao equipar. Corrigida a aplicação duplicada da penalidade de SPD no movimento do jogador.
- Laser e Plasma usam o pool de projéteis; Plasma explode no impacto/expiração. Beam aplica DPS em faixa; Mjolnir aplica pulso em cone; Nova gasta carga/ENE e resolve área. Danos passam pelos mesmos managers, com Summary S_D/S_R, nível da arma e degradação. Meshes de projéteis/drop/feedback são preparados e reutilizados.
- O catálogo é inicial e explícito: painéis reativos, motor auxiliar e receitas de reparo, escudo, armas, upgrade e Nova. Demais itens/skills/raridades do GDD não são anunciados como implementados.

## Resultado recuperável (F02)
O fechamento de uma run salva uma mensagem pendente em IndexedDB antes do envio. É uma outbox por conta/run, não um segundo placar; SQLite continua autoritativo após ACK. Reload recupera a mesma submissão/token e mostra o resultado, sem expor o token na UI. Falha de storage impede upload e preserva memória/aviso de unload; falha de rede permite retry. Navegação/logout ficam bloqueados enquanto pendente; descartar exige ação explícita e remoção durável. Reautenticação só é liberada depois de existir cópia durável. Ticket expira em 24 horas; prazo vencido é erro explícito, não perda silenciosa nem upload com identidade diferente. Limpar dados do navegador remove a outbox: não existe garantia de recuperação após esse descarte externo.

Resultado oferece repetir partida, menu e recordes. Voltar dos recordes ao resultado restaura o modo da partida; novas runs recebem contexto/inventário/input limpos.

## Apresentação e modos (F03/F04)
HUD mostra entrada, wave, miniboss, nível real da arma, cargas e crafting. WebAudio sintetiza música/cues após gesto de Start, com mute e volumes separados. Logs/filas de áudio são limitados e nós são descartados. Pause tem dialog/foco e laboratório; formulários têm labels/autocomplete/erros e cadastro separado.
Survivor usa o mesmo ciclo de sprints/setores, com Laser nível 1, zero bombas, sem loot, crafting ou equipamentos. Não existe continue. UI, tickets, submissão, bests e quatro períodos ficam separados por modo. O catálogo de dois setores se repete com as curvas/caps de progressão existentes. Tuning inicial foi exercitado no smoke e nos testes; equilíbrio de sessões longas ainda exige playtests.

## Verificação
- Frontend: 269 testes passaram em 80 arquivos; 60 TODOs históricos não foram removidos. Typecheck/lint aprovados.
- API: 18 testes passaram, incluindo persistência/restart, migração 3, modos e Auth de produção.
- Empacotador: três testes passaram (credenciais, ZIP, assets/rota mock).
- Chrome headless com WebGL: Survivor sem Lab/bombas → Normal/Lab → erro de materiais → áudio → falha de envio → reload → resultado recuperado → retry → Recordes/modos → menu → nova run → teclado. Nenhum pageerror.
- Benchmark headless, pools cheios e 1080 amostras: p50 ~0,19 ms, p95 ~0,80 ms, máximo ~6,34 ms, dois planos. O relatório reproduzível está em `poc3/benchmark-results/run.json`; não mede GPU/FPS, áudio, warmup nem prova ausência de vazamento em sessão longa.
- Build genérico passou. JS da aplicação ~305 kB; React, Supabase e Three em chunks separados. Permanece aviso do chunk Three (~524 kB). Auditorias npm sem vulnerabilidades após atualizações compatíveis.

F05/ativação e o gate final F06 continuam abertos nos itens externos descritos em [production-auth](./production-auth.spec.MD) e [release-validation](./release-validation.spec.MD). Deploy/upload não foi executado.
