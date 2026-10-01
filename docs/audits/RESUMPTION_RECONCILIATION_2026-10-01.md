# Retomada reconciliada — 2026-10-01

Os seis passos solicitados foram executados: estado Git/checks; plano e governança; autoridade/consumidores; decisões históricas; caminho de produto; checkpoint e próximo trabalho. Este registro é datado. Requisitos continuam no plano mestre, estados na matriz e comportamento no código. Conversas excluídas não foram recuperadas integralmente.

## Estado Git observado

| Superfície               | Fato anterior às alterações desta retomada                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório              | `igorbolognani/METREV`                                                                                                                                         |
| Main remoto              | `e00d5936dd5cc6d8884640d83d1d01a42e5653d4`, PR #112 integrado em 2026-09-30                                                                                    |
| Trabalho em revisão      | PR #113, rascunho aberto, branch `codex/coupled-spatial-cell-batch`, base main; sem merge                                                                      |
| Head publicado inicial   | `d1bc76e5e2c203a4358888a69f65cd681235c517`                                                                                                                     |
| Checkpoint local inicial | `3f4a275cc1b9f24bc153287d7080c69d347eabf0`; mesmo conteúdo do head publicado, árvore `5b037acdb7d0b46e12b098c1465b77fcd850e95e`, apesar de dois commits locais |
| CI inicial do PR         | Run `36842439374`: falhou no lint por import de tipo não utilizado em `spatial-simulation-schema.ts`; jobs dependentes pulados                                 |
| CodeQL inicial           | Run `36842439465`: passou                                                                                                                                      |

O import foi removido nesta retomada. Checks do novo head devem ser consultados no PR; resultados antigos não validam o novo commit. O baseline original do PR #43 permanece imutável, separado do snapshot atual.

## Separação temporal do desenvolvimento

| Período                 | Decisão ou entrega                                                                                                                         | Interpretação atual                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Abril–maio de 2026      | Workspace Next.js/Fastify, autenticação, PostgreSQL/Prisma, regras, evidência e research worker; ADRs históricos 0002/0003/0005 e spec 037 | Antecedentes de infraestrutura. Relatórios PASS são limitados à sua data e escopo; metas antigas de corpus não viram prioridade científica atual                     |
| 2026-09-23              | Commit `f753bc0`, spec 038: MFC/MEC, águas residuais, biossensores, parâmetros rastreáveis e baseline acoplado 0D                          | Escopo vigente. O não objetivo espacial dessa primeira entrega foi ampliado pelo programa posterior                                                                  |
| 2026-09-23              | Commit `4c8a237` retirou 324 Markdown                                                                                                      | Remoção documental não prova abandono do comportamento. Arquivos retirados são contexto, sem autoridade operacional atual                                            |
| 2026-09-27              | Commit `5e56c3e`: plano mestre, governança e 1D restrito no case runner; ADR-003/007                                                       | Direção vigente: um runtime comum configurado pelo stack, módulos composáveis, sem downgrade silencioso e com maturidade explícita                                   |
| 2026-09-27 a 2026-09-30 | Incrementos integrados até PR #112: contratos, malha, fila, artefatos, worker, Stokes/Darcy e espécie neutra com fonte/perda               | Código em main, desenvolvimento parcial; sem célula espacial geral ou P2/P3 funcional                                                                                |
| 2026-10-01              | PR #113: célula estruturada restrita 2D/3D, espécies, reações, potenciais, circuito e caminho de desenvolvimento                           | Código em revisão, substitui um patch interrompido não recuperado. SciPy Newton com eletrólito suporte; não é PETSc SNES nem DAE Nernst–Planck eletroneutro completo |
| Depois desta retomada   | Verificação representativa, correção, integração de produto, revisão independente, gates e eventual merge                                  | Etapas futuras separadas da implementação; não há merge nesta etapa                                                                                                  |

A cronologia programática está em `governance/DEVELOPMENT_TIMELINE.yaml`. Datas de commits e estado observado prevalecem sobre resumos. A recuperação de contexto foi parcial e incluiu trechos alheios/timestamps inconsistentes; esses trechos não fundamentaram decisões.

O plano permite adaptar agrupamentos de PRs, preservando dependências. Compartilhar a montagem 2D/3D e verificar uma extrusão é uma escolha arquitetural; não abre a fase 3 antes dos gates da fase 2. Os 40 estados continuam referidos ao escopo completo. Avanços restritos ficam na matriz e nos blockers, sem marcar itens completos.

## Autoridade e consumidores reais

| Material                                                              | Papel atual                         | Consumidor ou limite                                                                                                                  |
| --------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/ontology/stack-taxonomy.yml`                                  | Vocabulário semântico               | Normalização/reconciliação; não monta PDE                                                                                             |
| `domain/cases/templates/client-case-template.yml`                     | Template carregado                  | `loadDomainCaseTemplate` → normalização                                                                                               |
| `domain/rules/mechanistic-model.yml`                                  | Unidades/limites do baseline        | `loadMechanisticModelDefinition`                                                                                                      |
| `contracts/rules/*.yaml`, `output_contract.yaml`                      | Regras executadas e seções de saída | Loaders → defaults, compatibilidade, diagnóstico, melhorias, scoring, sensibilidade e políticas de evidência; execução contract-first |
| `spatial-parameter-authority.json`, `spatial-variable-authority.json` | Autoridade importada diretamente    | Validadores TypeScript v1/v2 conferem materiais, domínios, unidades e contornos                                                       |
| `spatial_cell_input_v1.yaml`                                          | Especificação da fronteira restrita | `structured-cell-schema.ts` e Python validam; o YAML não é executado como validador da requisição                                     |
| `structured-cell-equations.yaml`                                      | Formulação semântica restrita       | Python `structured_cell.py` implementa as equações; ainda não há montagem automática a partir desse YAML                              |
| Catálogo `model-fidelity.yml`                                         | Identidade/elegibilidade geral      | Resolver e dispatcher 0D/1D; perfis gerais 2D/3D research-only                                                                        |
| Grafo de componentes, relações e dois templates de relatório          | Referência futura                   | Sem consumidor validado; arquivo existente não entrega a funcionalidade                                                               |

Os caminhos completos estão em `packages/domain-contracts/src/reconciliation.ts`. A matriz delimita a cobertura dos perfis do catálogo e registra separadamente `structured-cell-supporting-electrolyte-v1`. O validador de governança confere identidade, dimensões, arquivos, contrato, equações, testes, inelegibilidade e cronologia.

Cada valor científico precisa de unidade, tipo e referência de origem; nada é preenchido silenciosamente. Candidatos rastreáveis podem orientar implementação/comparação provisória antes de revisão humana. Aceitação, calibração, validação independente e elegibilidade decisória são gates distintos; review pendente não paralisa o desenvolvimento matemático.

## Recuperação e inventário de leitura

O inventário documental anterior classificou 54 Markdown atuais e 335 retirados recuperáveis, em 713 arquivos rastreados, além de três TXT e um PDF. Esses números correspondem ao head anterior a esta reconciliação. Foram examinados 71 refs de arquivo e 369 commits alcançáveis. O inventário entregue contém cada caminho, categoria, estado e revisão, distinguindo instrução, decisão, referência, plano, relatório, rascunho, exportação e material científico.

| Material                                  | Leitura feita ou limite                                                                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plano mestre                              | Integral: 3.632 linhas; texto original preservado                                                                                                                                                                |
| Governança                                | Estado, 40 itens, dependências, capacidades, gates, maturidade e riscos cruzados e validados                                                                                                                     |
| Regras operacionais                       | AGENTS, README e instruções aplicáveis a domínio, contratos, runtime e testes                                                                                                                                    |
| ADRs atuais                               | Decisões de composição, artefatos, jobs, multiescala e verificação cruzadas; ADR-002/003/007/008 lidos nesta reconciliação                                                                                       |
| Runtime                                   | Loaders/reconciliação, seleção, serviço de avaliação/trecho decisório, API espacial, configuração, executor/worker, armazenamento e workbench; consumidores críticos, sem alegar leitura integral de todo código |
| Históricos selecionados                   | ADRs 0002/0003/0005, WORKFLOW, spec/plan 038, research relevante e relatório 037 recuperados pelo Git antes da remoção                                                                                           |
| Mapa histórico de autoridade              | Tabela/regras cruzadas; saída longa teve truncamento. Não foi usado como autoridade atual nem declarado integralmente lido                                                                                       |
| Demais retirados                          | Bytes recuperados e títulos/seções/trechos indexados; não houve releitura semântica integral de todos os 335 corpos                                                                                              |
| Exportação funcional histórica de 1,69 MB | Indexada; código incorporado não foi revalidado integralmente                                                                                                                                                    |
| PDF/ODS científicos                       | Inventariados, registros/metadados conferidos; não reinterpretados como novos benchmarks                                                                                                                         |
| Conversas excluídas                       | Completas inacessíveis; resumos parciais não restauram os chats originais                                                                                                                                        |
| Patch interrompido                        | Não recuperado dos refs/worktrees acessíveis; PR #113 é um novo checkpoint verificável                                                                                                                           |

Material retirado pode ser consultado sem recolocá-lo como arquivo ativo:

```bash
git show 4c8a2377062cdfe65c313bb8c5d63d81f9cea872^:specs/038-coupled-mfc-mec-wastewater-biosensors/spec.md
git show 4c8a2377062cdfe65c313bb8c5d63d81f9cea872^:adr/0003-runtime-authority-and-tooling-invariants.md
```

Um checkout raso precisa dos refs históricos antes desses comandos. Não se devem reativar automaticamente WORKFLOW, starter packs, ADRs Proposed, metas 30k/500k ou checklists antigos.

## Caminho de produto comprovado

| Etapa             | Fluxo de casos existente                                                | Célula espacial restrita do PR #113                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI/entrada        | Case form → API; stack/parâmetros normalizados                          | `/modeling/spatial`: JSON completo, caminho separado de desenvolvimento                                                                                |
| Física            | Resolver/dispatcher 0D ou 1D completo, sem fallback                     | Identidade dedicada, 2D com profundidade física ou 3D com comprimento z; ainda sem montagem de equações pelo grafo geral do stack                      |
| Execução          | Serviço de avaliação → simulation enrichment                            | API admite/persiste/enfileira; worker roda processos prepare/solve com timeout e cancelamento                                                          |
| Equações          | Baselines restritos 0D/1D                                               | Volumes finitos, Scharfetter–Gummel, massa-ação/Monod, Butler–Volmer, potenciais/circuito; Newton esparso SciPy com backtracking                       |
| Evidência/regras  | Benchmark → contexto → regras → validação de saída → narrativa opcional | Sem promoção de resultados para evidência/recomendação; ensaios sintéticos                                                                             |
| Persistência      | Prisma, sensibilidade e histórico                                       | Reutiliza interface de lifecycle PostgreSQL e manifesto. Testes atuais da célula usam repositório em memória; roundtrip PostgreSQL específico pendente |
| Artefatos/API     | Saída estruturada/exports de caso                                       | JSON externo com hashes/owner/run; API verifica bytes antes de servir mesh/fields, inclusive resultados falhos retidos                                 |
| Visualização      | Workbench e saídas 0D/1D                                                | Células reais XY e escolha de fatia z; gate de browser pendente                                                                                        |
| Relatório/decisão | Narrativa downstream e resultado validado                               | Export JSON com limites e `decision_eligible: false`; relatório científico espacial integrado pendente                                                 |

Eletrólito suporte com condutividade fixa, espécies traço, interfaces contínuas sem carga fixa, estado estacionário/isotérmico e convecção zero são restrições explícitas. Não há hidráulica acoplada de célula, Donnan, dupla camada, crescimento de biofilme, gás, calor ou inventários transientes. Uma reação Monod testada não entrega um modelo microbiano validado.

## Alterações e próxima dependência executável

- **IMPLEMENTADO:** lint corrigido; perfis separados; cronologia; papéis reais de autoridade; documentação de API/resultados falhos/bootstrap reconciliada e controles de drift ampliados.
- **INTEGRADO:** main permanece no PR #112; retomada no PR #113, sem merge.
- **BLOQUEADO PARA PROMOÇÃO:** refinamento acoplado representativo, PostgreSQL específico, browser do workbench, stack/case runner/relatórios, provider durável/deployment, comparação experimental e holdout independente.
- **ADIADO POR DEPENDÊNCIA:** célula geral 3D, MPI/performance, hidráulica/biologia/gás/calor e multiescala ampla.

Próximo incremento: verificar/corrigir o perfil **2D restrito** com benchmark não uniforme, observáveis/tolerâncias e três malhas; conservação local/global de espécies/cargas, positividade, circuito MFC/MEC e matriz de falhas. Usar fixtures ou fontes rastreadas explicitamente. Depois conferir reload PostgreSQL e browser/API/worker/artefatos, antes de integrar stack/case runner e relatórios. Review humano não é pré-requisito para essas verificações; nenhuma delas concede validação independente.

### Verificação deste checkpoint

PASS `pnpm run validate:fast`: lint dos 20 pacotes, 525 testes JavaScript aprovados (cinco nativos DOLFINx pulados), smoke Node ESM, checks Python de contratos, 37 testes espaciais Python (34 aprovados e três Gmsh pulados), governança e build dos 20 pacotes. Inclui sete testes matemáticos Python da célula e três testes TypeScript com subprocessos Python reais para 2D/3D convergente e 2D falho. PASS formatação completa, diff sem whitespace e três probes negativos do validador: falsa elegibilidade, dimensão divergente e base de revisão incoerente foram rejeitadas.

BLOCKED localmente: `pnpm run lint:workflow-semantics` exige Docker/actionlint, indisponível neste ambiente. A instalação offline inicial falhou por metadados ausentes; a instalação normal com lockfile congelado restaurou dependências. Links de dependências/cliente Prisma de um workspace anterior estavam quebrados; foram recriados sem alterar o lockfile nem rodar migrações, seeds ou ingestão.

Checks remotos pertencem ao novo head do PR. Docker/deployment, PostgreSQL e browser específicos da célula permanecem pendentes; não são inferidos de testes em memória ou de CI anterior.

### Interrupção anterior: fatos e lacunas

As capturas mostram Pensamento interrompido e caminhos de imagens ausentes. Estes últimos comprovam falha de leitura de anexos, sem identificar a causa do travamento do serviço. O lint do PR #113 ocorreu depois da execução original e não explica a interrupção do chat. Sem telemetria interna do ChatGPT, timeout, conexão, reinício do ambiente e falha da plataforma continuam hipóteses; não há causa raiz estabelecida.
