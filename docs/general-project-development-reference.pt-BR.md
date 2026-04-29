# Referência Geral de Arquitetura, Pipeline e Artefatos de Projeto

> Nota de uso
>
> Este arquivo é uma referência geral e não um runbook ativo do METREV.
> Para a operação deste repositório, use `README.md` para bootstrap e validação e `docs/repository-authority-map.md` para a classificação ativa versus referência.

Documento consolidado e generalista para organizar, sem redundância, os principais conceitos de arquitetura, execução, operação e orientação de repositório para qualquer projeto digital.

## 1. Visão Geral

Um projeto maduro não é apenas:

`UI -> API -> lógica -> banco`

Ele combina:

- direção clara
- domínio bem definido
- contratos e validação
- lógica reproduzível
- interface utilizável
- automação e IA quando fizer sentido
- rastreabilidade, testes e operação
- evolução controlada

### 1.1 Hierarquia prática de verdade

Quando houver camada formal de domínio e contratos, a leitura correta é:

- o domínio define significado, vocabulário, entidades e relações
- os contratos definem a forma oficial de troca, validação e integração
- tudo que executa, persiste, expõe ou narra deve conformar a essa base formal

Regra operacional:

- se existe contrato formal, ele é a fonte operacional de verdade para formatos e fronteiras
- se existe ontologia ou modelo de domínio formal, ele é a fonte semântica de verdade
- documentação, API, banco, UI, testes, prompts e automações não devem divergir dessas fontes

## 2. Regras de Ouro do Sistema

1. Contracts are the source of truth for exchangeable data.
2. No logic without validation.
3. No output without traceability.
4. No decision without explainability.
5. LLM never replaces deterministic logic.
6. Defaults must be explicit.
7. Uncertainty must be visible.
8. Everything important must be versioned.
9. Exploration is separate from production.
10. Documentation must reflect reality.

## 3. Prioridade Operacional

Nem tudo tem a mesma prioridade. Sem isso, humanos e LLMs tendem a fazer tudo ao mesmo tempo ou a ignorar o que é mais crítico.

| Prioridade | Quando entra                | Significado                                                        |
| ---------- | --------------------------- | ------------------------------------------------------------------ |
| Core       | antes de codar              | precisa existir minimamente antes de começar implementação real    |
| Early      | primeira implementação      | deve ser construído na primeira versão funcional                   |
| Later      | depois do sistema funcionar | melhora robustez, escala e ergonomia após o core estar estável     |
| Mature     | depois de uso real          | entra quando já existe operação, feedback e necessidade comprovada |

Regra prática:

1. Não implemente `Later` ou `Mature` antes de fechar o mínimo de `Core`.
2. Não comece código estrutural sem domínio, contratos e critérios de validação minimamente definidos.
3. Não trate observabilidade, versionamento e confiabilidade como decoração tardia se o sistema já faz decisões ou integrações críticas.

## 4. Camadas Estruturais do Sistema

| Camada          | Prioridade      | Definition layer: o que decidir                                                | Implementation layer: o que construir                                           | Exemplos típicos                                       | Resultado esperado                           |
| --------------- | --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| Interface       | Early           | jornadas, telas, inputs, outputs, feedbacks, exportações                       | páginas, componentes, formulários, dashboards, estados de loading/erro          | React, Next.js, Flutter, Electron                      | uso humano claro e eficiente                 |
| API             | Early           | operações, contratos, autenticação, autorização, códigos de erro, idempotência | rotas, handlers, middleware, rate limiting, integração entre frontend e backend | REST, GraphQL, gRPC, Fastify, Express                  | integração previsível entre sistemas         |
| Domínio         | Core            | ontologia, vocabulário, regras, scoring, defaults, incerteza, explicabilidade  | modelos, validadores, motor de regras, score, ranking, análise de sensibilidade | JSON Schema, Zod, OpenAPI, YAML, classes, rule engines | comportamento consistente e justificável     |
| Persistência    | Early           | o que persiste, versionamento, histórico, lineage, retenção                    | banco, migrações, repositórios, índices, cache, trilha histórica                | PostgreSQL, MySQL, MongoDB, Redis, Prisma              | continuidade, histórico e consulta confiável |
| Observabilidade | Early -> Mature | o que medir, o que auditar, onde alertar, como rastrear custo                  | logs, métricas, tracing, alertas, dashboards operacionais                       | OpenTelemetry, Prometheus, Grafana                     | operação confiável e depuração mais rápida   |

### 4.1 Subcomponentes da Camada de Domínio

| Subcomponente      | Prioridade | Definition layer: o que decidir                                          | Implementation layer: o que construir                    | Função principal                          |
| ------------------ | ---------- | ------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------- |
| Ontologia          | Core       | entidades, atributos, relações, vocabulário canônico                     | arquivos formais, modelos de domínio, dicionários        | padronizar o conhecimento do sistema      |
| Contratos de dados | Core       | formato de input, output, fronteiras e invariantes                       | schemas, validadores, serialização, adapters             | garantir interoperabilidade e validação   |
| Regras e decisão   | Early      | critérios determinísticos, scoring, compatibilidade, defaults, incerteza | código de domínio, fórmulas, rule engine, explainability | transformar dados em decisão reproduzível |

## 5. Capacidades Transversais

Essas capacidades atravessam várias camadas e não pertencem a um único ponto da arquitetura.

| Capacidade                          | Prioridade      | Definition layer: o que decidir                        | Implementation layer: o que construir                           |
| ----------------------------------- | --------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| Normalização de dados               | Core            | unidades, nomes, formatos, escalas, dicionários        | pipelines de normalização, mapeamentos, conversores             |
| Validação por schema                | Core            | regras estruturais, tipos, limites, obrigatoriedade    | validadores em input, API, domínio e persistência               |
| Audit trail                         | Early           | eventos, decisões, defaults usados, regras disparadas  | logs estruturados, tabelas de auditoria, event records          |
| Data lineage                        | Early           | o que cada output deve rastrear                        | rastreamento de input, transformações, regras, versões e output |
| Sensitivity analysis                | Later -> Mature | quais variáveis mais alteram o resultado               | comparações de cenário, impacto marginal, análise what-if       |
| Idempotência                        | Early           | quais operações precisam ser seguras ao repetir        | chaves idempotentes, deduplicação, proteção de escrita          |
| Retry, fallback e timeout           | Early           | política por integração, fila ou operação              | retries controlados, timeouts, fallback para cache ou mock      |
| Anti-corruption layer               | Early           | onde o modelo externo diverge do interno               | adapters, mappers, tradutores de payload, proteção de domínio   |
| Feature flags                       | Later           | critérios de rollout, perfis e desligamento            | toggles, rollout progressivo, kill switches                     |
| Contexto persistente no repositório | Core            | quais decisões e regras devem permanecer explícitas    | `docs/`, `specs/`, ADRs, prompts, instruções                    |
| Documentação viva                   | Early           | quais artefatos precisam acompanhar a realidade        | docs, specs, quickstarts, runbooks, changelog                   |
| Integrações externas                | Early           | responsabilidades, limites, falhas, contratos externos | APIs, SDKs, webhooks, adapters, mocks                           |
| Prompts reutilizáveis               | Later           | tarefas de IA, contexto, limites, formato de output    | catálogos de prompt, templates, versionamento                   |
| Agents e skills                     | Later           | papéis, ownership, limites, entradas e saídas          | orquestração, tool calling, capacidades reutilizáveis           |
| MCPs e protocolos de contexto       | Later           | que contexto estrutural a IA precisa                   | conectores, middlewares, adapters                               |

### 5.1 Papel restrito do LLM

LLM é útil para:

- narrativa
- explicação
- síntese
- classificação assistida
- interfaces conversacionais
- automação supervisionada

LLM não deve:

- decidir regras determinísticas
- substituir validação formal
- alterar lógica de domínio por conta própria
- substituir contratos
- esconder defaults, falta de dados ou incerteza

Regra operacional:

- deterministic logic decides
- contracts validate
- LLM narrates or assists

### 5.2 Camada exploratória vs. camada formal

| Camada       | Característica                 | Exemplos                                  |
| ------------ | ------------------------------ | ----------------------------------------- |
| Exploratória | flexível, rápida, experimental | notebooks, scripts, protótipos            |
| Formal       | estável, validada, versionada  | contratos, APIs, testes, regras canônicas |

Boa prática:

- explorar rápido na camada exploratória
- promover apenas o que foi validado
- nunca tratar artefato exploratório como fonte de verdade de produção

## 6. Core Loop Operacional

Esse é o loop mental do dia a dia. Ele transforma a referência em execução contínua.

`Define -> Spec -> Implement -> Validate -> Review -> Update docs/contracts -> Repeat`

| Etapa                 | O que acontece                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ |
| Define                | delimitar problema, hipótese, escopo, domínio e contratos afetados                   |
| Spec                  | registrar comportamento, limites, riscos, validação e impacto entre camadas          |
| Implement             | construir a menor mudança correta                                                    |
| Validate              | testar, inspecionar, comparar contratos e verificar fluxo real                       |
| Review                | procurar regressão, inconsistência, ambiguidade, drift e lacunas                     |
| Update docs/contracts | atualizar fontes formais, runbooks, specs e prompts se a mudança alterou a realidade |
| Repeat                | seguir para o próximo incremento com contexto atualizado                             |

Regra prática:

- não pule de `Define` direto para `Implement`
- não encerre em `Implement` sem `Validate`
- não aceite mudança persistente sem refletir a realidade em docs e contratos

## 7. Pipeline Universal de Desenvolvimento

| Fase                 | Prioridade      | Objetivo                                      | Definition layer: o que decidir                                                                                          | Implementation layer: o que construir                                                         | Resultado esperado                             |
| -------------------- | --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 0. Estratégia        | Core            | definir problema, valor e restrições          | dor real, usuário, escopo, anti-escopo, métricas, constraints                                                            | visão do produto, critérios de sucesso, mapa de stakeholders                                  | direção clara e priorização objetiva           |
| 1. Definição         | Core            | estruturar o conhecimento do projeto          | domínio, glossário, ontologia, contratos, defaults, failure modes, use cases                                             | modelos de entidade, schemas, catálogo de defaults, matriz de casos de uso                    | base conceitual consistente                    |
| 2. Base técnica      | Early           | criar fundação operacional previsível         | endpoints, persistência, auth, config, error model, idempotência, política de timeout e retry, fronteira com integrações | rotas, migrações, validadores, login, RBAC, middleware, adapters, anti-corruption layer       | sistema funcional e previsível                 |
| 3. Inteligência      | Early           | transformar dados em análise e decisão        | normalização, features, scoring, ranking, compatibilidade, explicabilidade, incerteza, sensibilidade                     | pipelines de transformação, motor de regras, score, ranking, explainability, analysis what-if | resultados comparáveis e justificáveis         |
| 4. Interface         | Early           | permitir uso humano eficiente                 | telas, campos, navegação, estados, mensagens, relatórios, exportações                                                    | páginas, componentes, formulários, gráficos, feedback visual, export de PDF/CSV               | sistema utilizável por pessoas                 |
| 5. IA e automação    | Later           | ampliar síntese, assistência e execução       | tarefas da IA, fontes permitidas, guardrails, métricas de qualidade, o que é proibido delegar ao LLM                     | prompts, agents, function calling, RAG, evals, automações supervisionadas                     | automação útil e controlada                    |
| 6. Controle          | Early -> Mature | garantir rastreabilidade e operação           | eventos auditáveis, métricas, lineage, alertas, custo, retenção, ownership operacional                                   | logs estruturados, dashboards, tracing, alertas, relatórios de custo, trilha de decisão       | sistema auditável e operável                   |
| 7. Qualidade         | Early           | reduzir falhas e regressões                   | fluxos críticos, cobertura mínima, critérios de aceite, quality gates                                                    | testes unitários, integração, contrato, E2E, lint, checks, revisão técnica                    | maior confiabilidade                           |
| 8. Deploy e operação | Early -> Later  | publicar e sustentar o sistema                | ambientes, release strategy, rollback, feature flags, secrets, backup, runbooks                                          | CI/CD, containers, deploy automatizado, toggles, backups, health checks                       | sistema disponível com menor risco operacional |
| 9. Evolução          | Later -> Mature | permitir mudança controlada ao longo do tempo | versionamento, roadmap, backlog técnico, depreciação, migrações, dívida técnica                                          | changelog, ADRs, migrações, refactors, documentação atualizada                                | sistema sustentável e evolutivo                |

## 8. Fluxo Técnico Interno

### 8.1 Pontos de entrada reais

O fluxo técnico não começa no abstrato. Ele começa em um ponto de entrada concreto no código.

| Origem do input | Onde o fluxo começa no código             | Exemplos                                     |
| --------------- | ----------------------------------------- | -------------------------------------------- |
| UI              | página, formulário, action, event handler | submit de formulário, clique em ação, upload |
| API             | rota, controller, handler, middleware     | `POST /resource`, webhook, endpoint interno  |
| Batch           | job, worker, scheduler, pipeline step     | processamento noturno, importação, recálculo |
| Evento externo  | consumer, subscriber, queue handler       | fila, stream, pub/sub, webhook assíncrono    |

### 8.2 Fluxo interno canônico

`Input source -> Validation estrutural -> Validation semântica -> Normalization -> Feature processing -> Rule engine -> Scoring/decisão -> Persistence -> LLM opcional -> Output -> Audit + Observability`

Versão expandida:

1. Entrada de dados por UI, API, batch ou evento
2. Validação estrutural
3. Validação semântica
4. Normalização
5. Derivação de features
6. Aplicação de regras
7. Score, ranking ou decisão
8. Persistência do estado e do histórico relevante
9. Narrativa opcional por LLM
10. Entrega via UI, API, relatório ou exportação
11. Auditoria, logs, métricas e tracing

### 8.3 Regra de rastreabilidade mínima

Todo output importante deve conseguir apontar para:

- input recebido
- transformações aplicadas
- regras executadas
- defaults utilizados
- nível de incerteza
- versão dos contratos, regras, prompts e ontologia quando aplicável
- output final produzido

## 9. Disciplinas e Controles de Maturidade

Esses itens costumam diferenciar um projeto apenas funcional de um projeto profissional.

| Disciplina               | O que adiciona                                | Exemplos práticos                                               |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------- |
| Qualidade                | reduz regressão e quebra silenciosa           | testes unitários, integração, contrato, E2E                     |
| Confiabilidade           | torna o sistema previsível diante de falhas   | idempotência, retry, fallback, timeout, circuit breaker         |
| Performance              | melhora tempo de resposta e custo             | cache, lazy execution, batch processing                         |
| Controle de complexidade | evita crescimento caótico                     | modularização, bounded contexts, DDD, anti-corruption layer     |
| Versionamento            | permite evolução sem ruptura                  | versionamento de API, contratos, regras, prompts, ontologia     |
| Automação                | reduz trabalho repetitivo                     | CI/CD, code generation, linters, formatters                     |
| Segurança                | protege dados e acesso                        | autenticação, autorização, rate limiting, mitigação de XSS/SQLi |
| Governança de dados      | melhora rastreabilidade e confiança           | data pipelines, data quality checks, lineage                    |
| IA madura                | melhora utilidade e segurança da camada de IA | prompt versioning, RAG, evals, guardrails                       |
| Operação                 | permite manter o sistema saudável             | monitoring, alerting, cost tracking, logs estruturados          |
| Processo                 | melhora consistência de execução              | spec-first workflow, ADRs, review sistemático                   |
| Produto                  | conecta engenharia a valor real               | feedback loop, métricas de valor, priorização por impacto       |

## 10. Versionamento Obrigatório

Se muda comportamento, integração, explicação ou formato, precisa existir alguma forma de versionamento.

| Item              | Por que versionar                      | Exemplo                                  |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| API               | evitar quebra entre clientes e backend | `/v1`, `/v2`, changelog de rota          |
| Contracts         | manter compatibilidade estrutural      | schema version, migrations de contrato   |
| Rules             | rastrear mudanças de decisão           | `ruleset_version`, changelog de scoring  |
| Prompts           | controlar deriva de IA                 | `prompt_v3`, catálogo versionado         |
| Ontology          | preservar semântica do domínio         | `ontology_version`, glossário versionado |
| Migrations        | rastrear evolução persistente          | migrations numeradas e reversíveis       |
| Reports e exports | manter consistência de consumo externo | template version, export format version  |

## 11. Artefatos de Repositório para Orientar Desenvolvimento

### 11.1 Camadas de artefatos

| Grupo                    | Prioridade     | Objetivo                                  | Exemplos                                                          |
| ------------------------ | -------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| Direção do projeto       | Core           | registrar problema, escopo e contexto     | `README.md`, `docs/product.md`, `docs/context.md`                 |
| Domínio formal           | Core           | organizar vocabulário, contratos e regras | `contracts/ontology/`, `contracts/schemas/`, `contracts/rules/`   |
| Planejamento de features | Core -> Early  | conduzir mudanças de forma rastreável     | `specs/<feature>/spec.md`, `plan.md`, `tasks.md`, `quickstart.md` |
| Implementação            | Early          | separar apps, pacotes e infraestrutura    | `apps/`, `packages/`, `infra/`                                    |
| Qualidade e validação    | Early          | explicitar critérios e checks             | `tests/`, `evals/`, `docs/testing-strategy.md`                    |
| Decisão arquitetural     | Early -> Later | registrar trade-offs importantes          | `adr/`                                                            |
| Orientação para agentes  | Core -> Early  | apoiar desenvolvimento assistido por IA   | `.github/instructions/`, `.github/prompts/`, `.github/agents/`    |

### 11.2 Conjunto essencial

```text
README.md
.env.example
docs/
  product.md
  context.md
  architecture.md
  domain.md
  api.md
  testing-strategy.md
  deployment.md
  project_state.md
specs/
  _templates/
  000-initial-foundation/
adr/
evals/
tests/
.github/
  copilot-instructions.md
  instructions/
  prompts/
  agents/
```

### 11.3 Conjunto completo com camada formal forte de domínio

```text
README.md
.env.example
docs/
  product.md
  context.md
  project_state.md
  memory.md
  reasoning.md
  execution.md
  validation.md
  operation.md
  architecture.md
  system-design.md
  api.md
  data-model.md
  domain.md
  glossary.md
  defaults.md
  failure-modes.md
  assumptions.md
  constraints.md
  decision-engine.md
  normalization.md
  scoring.md
  explainability.md
  uncertainty.md
  frontend.md
  ux-flow.md
  design-system.md
  forms.md
  states.md
  reporting.md
  ai-layer.md
  prompts.md
  agents.md
  evals.md
  guardrails.md
  observability.md
  audit.md
  lineage.md
  monitoring.md
  costs.md
  testing-strategy.md
  done-criteria.md
  deployment.md
  environments.md
  runbook.md
  backup-recovery.md
  feature-flags.md
  roadmap.md
  changelog.md
  technical-debt.md
  migration-strategy.md
  deprecation-policy.md
specs/
  _templates/
  000-initial-foundation/
contracts/
  README.md
  ontology/
  schemas/
  rules/
  dictionaries/
  mappings/
apps/
packages/
infra/
evals/
tests/
adr/
.github/
scripts/
skills/
```

## 12. Como Pedir Isso a um LLM

### 12.1 Restrições que valem para qualquer pedido

Se o objetivo é desenvolvimento disciplinado e controlado, o prompt deve forçar comportamento, não apenas listar desejos.

Inclua restrições como:

- Do NOT start coding before defining domain and contracts.
- Separate definition work from implementation work.
- Treat contracts as the operational source of truth when they exist.
- Ensure consistency between docs, contracts, API, domain logic, tests, prompts, and outputs.
- Avoid placeholders when real logic is possible.
- Make assumptions explicit and conservative.
- Keep deterministic logic outside the LLM.
- State what is fully functional and what depends on external credentials.

### 12.2 Pedido para fundação estruturada

Use quando quiser um repositório bem orientado antes da implementação pesada.

```text
Create the initial project foundation for a new repository.

Execution order:
1. Define the problem, users, scope, and constraints.
2. Define the domain, glossary, ontology, contracts, defaults, and failure modes.
3. Design the repository structure and spec-first workflow.
4. Create AI development guidance, testing guidance, and architecture decisions.
5. Review the result for consistency.

Generate:
- core documentation under /docs
- a formal domain layer under /contracts when the project has nontrivial domain logic
- spec-first workflow files under /specs
- architecture decisions under /adr
- testing and evaluation guidance under /tests and /evals
- persistent AI development guidance under /.github/instructions, /.github/prompts, and /.github/agents

Requirements:
- keep everything generic but useful
- do not create empty files
- do not start code scaffolding before domain and contracts are defined
- make assumptions explicit
- separate exploratory assets from formal assets
- include validation, defaults, failure modes, versioning, and next steps
- keep naming consistent across docs, contracts, code, and prompts
- ensure consistency between docs, contracts, API expectations, and agent guidance
```

### 12.3 Pedido para primeira versão completa e funcional

Use quando quiser que o modelo gere uma primeira implementação ampla, já conectando documentação, contratos, código, testes e auto-revisão.

```text
You are acting as architect, domain modeler, tech lead, implementer, reviewer, and QA lead.

Create a complete, functional first version of the repository from the project idea below.
Do not generate a stub-only scaffold.

Project idea:
[describe problem, users, inputs, outputs, constraints, workflows, what must be deterministic, what must be explainable, and where AI is allowed]

Mandatory execution order:
1. Interpret the idea.
2. Define domain, glossary, ontology, contracts, defaults, uncertainty, and failure modes.
3. Define API and persistence boundaries.
4. Design the repository structure.
5. Implement code.
6. Validate with tests and consistency checks.
7. Perform a refinement pass before returning the result.

You must:
- interpret the idea
- define domain, glossary, ontology, contracts, defaults, and failure modes before coding
- create the repository structure
- implement API, persistence, validation, domain logic, UI, tests, and docs where relevant
- add AI support only where it is useful
- include auditability, observability, CI basics, and local run instructions
- keep code, docs, contracts, API, tests, and prompts aligned
- avoid placeholders when real logic is possible

Before returning the result, perform a refinement pass that:
- removes redundancy
- fixes inconsistencies
- aligns terminology across all layers
- replaces avoidable stubs with real initial logic
- states what is fully functional vs. what depends on external credentials
```

## 13. Leitura Prática

Perguntas úteis em cada fase:

| Fase              | Pergunta central                                                               |
| ----------------- | ------------------------------------------------------------------------------ |
| Estratégia        | que problema estamos resolvendo e como saberemos que deu certo?                |
| Definição         | quais são os objetos, regras, formatos, defaults e limites?                    |
| Base técnica      | como isso roda com segurança, consistência, idempotência e persistência?       |
| Inteligência      | como o sistema transforma dado em decisão, com explicação e incerteza visível? |
| Interface         | como alguém usa isso sem fricção e sem ambiguidade?                            |
| IA e automação    | onde a IA realmente agrega valor e o que ela não pode decidir?                 |
| Controle          | como saber o que aconteceu, por que aconteceu, de onde veio e quanto custou?   |
| Qualidade         | como impedir regressão, inconsistência e drift entre camadas?                  |
| Deploy e operação | como publicar, monitorar, desligar, recuperar e liberar com segurança?         |
| Evolução          | como mudar sem virar caos e sem quebrar compatibilidade?                       |

## 14. Síntese Final

Times maduros não se destacam apenas por escrever mais código. Eles se destacam por:

- reduzir incerteza com contratos, validação e testes
- controlar complexidade com domínio claro e separação de camadas
- garantir previsibilidade com versionamento, rastreabilidade e operação
- proteger o núcleo do sistema de dependências externas ruins
- separar exploração de produção
- usar IA como assistência, não como substituta da lógica determinística
- documentar o suficiente para que humanos e agentes continuem o trabalho com consistência
