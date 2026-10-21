# Estudo permitido da POC2 — movimentos e grupos
Registro da entrega E em 2026-10-20; arquivo versionável consolidado em 2026-10-21.

Consultados apenas steering, reach-path, formation-slots, enemy-movement-manager, enemy-squad-manager, enemy-strategy, enemy-group e testes de grupos da POC2. Comportamentos úteis: entrada A→B suave, heading limitado, seek/arrive/separação, slots estáveis, intenção coletiva independente da estratégia individual, standoff e mergulho com retirada sem recompensa. Reescritos nos contratos POC3 CHAR/Summary, X/Z, BALANCE e planos versionados, sem imports ou alterações na POC2.

SquadManager usa as receitas iniciais V/Circle/LineDivers, líder por LVL/ID e estados coletivos independentes de EnterGate/FindGroup/LoopBack/Flee/Fury. Não foram portados afinidade/migração entre waves, arquitetura, câmera, renderer, armas, parallax, auth ou persistência da POC2.
