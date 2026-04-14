# <a name="header"></a><a name="content"></a><a name="resumo-executivo"></a>Resumo Executivo
Este documento apresenta o design completo do *stack* tecnológico para a versão 2.2 do projeto após correções, combinando visão executiva e técnica. Adotamos uma **arquitetura monorepo** moderna, integrando front-end e back-end em um único repositório com pastas apps/ (aplicações) e packages/ (bibliotecas internas), conforme prática recomendada para maior consistência e compartilhamento de código[\[1\]](https://repositorio.ufc.br/ri/bitstream/riufc/82631/1/2025_tcc_flpcastro.pdf#:~:text=de%20monoreposit%C3%B3rio%20,que%20facilita%20a%20padroniza%C3%A7%C3%A3o%2C%20a)[\[2\]](https://www.robinwieruch.de/javascript-monorepos/#:~:text=First%2C%20shared%20packages%20can%20be,streamlining%20development%20and%20reducing%20overhead). Usamos **Next.js** no front-end (React com TypeScript), devido à sua flexibilidade full-stack e suporte nativo a rotas e otimizações[\[3\]](https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs#:~:text=Next,stack%20web%20applications)[\[4\]](https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs#:~:text=Next,blocks%20to%20create%20web%20applications). No back-end, escolhemos **Fastify** por ser um framework Node.js de alta performance e baixo overhead, com arquitetura de plugins extensível e pronta para TypeScript[\[5\]](https://fastify.dev/#:~:text=Enter%20Fastify,fastest%20web%20frameworks%20in%20town)[\[6\]](https://fastify.dev/#:~:text=,support%20the%20growing%20TypeScript%20community). Para banco de dados, empregamos **PostgreSQL**, acessado via **Prisma ORM** – renomada ferramenta TypeScript-first que fornece migrações automáticas e alta segurança de tipos[\[7\]](https://www.prisma.io/orm#:~:text=Prisma%20ORM%20elevates%20developer%20experience,safety)[\[8\]](https://www.prisma.io/orm#:~:text=Prisma%20Client%20is%20a%20query,without%20the%20need%20for%20documentation). A validação de dados utilizará **Zod**, que permite definir *schemas* TypeScript primeiro e gerar validações em tempo de execução[\[9\]](https://github.com/colinhacks/zod#:~:text=What%20is%20Zod%3F). Para gerenciamento do estado de servidor no front-end, usaremos **TanStack Query** (React Query) – biblioteca líder para *data fetching*, que facilita cache, sincronização e atualização de dados de servidor[\[10\]](https://tanstack.com/query/v5/docs/framework/react/overview#:~:text=Overview)[\[11\]](https://tanstack.com/query/v5/docs/framework/react/overview#:~:text=TanStack%20Query%20is%20hands%20down,liking%20as%20your%20application%20grows). A autenticação será tratada com **Auth.js (NextAuth.js)**, solução livre e open-source para login/roles[\[12\]](https://authjs.dev/#:~:text=Authentication%20for%20the%20Web). Implementaremos uma **camada de normalização/adaptador** para adaptar o *YAML* de domínio aos modelos de runtime, garantindo compatibilidade entre contratos (zona de *domain-contracts*) e código de execução. Haverá um **motor de regras** deduzindo resultados (compatibilidade, defaults, falhas), cálculo de *scoring* de confiança e registro em trilha de auditoria. Uma interface de IA (via LLM local como Ollama ou API do OpenAI) proverá narrativa resumida dos resultados. Todo o sistema será instrumentado com **OpenTelemetry** para observabilidade (logs, métricas e traces)[\[13\]](https://opentelemetry.io/docs/concepts/observability-primer/#:~:text=To%20ask%20those%20questions%20about,of%20the%20information%20they%20need). A estrutura de RBAC será incorporada ao nível do middleware/API usando callbacks de sessão do Auth.js[\[14\]](https://authjs.dev/guides/role-based-access-control#:~:text=Persisting%20the%20role). Esta proposta foca em ferramentas *open-source* quando possível (por exemplo, Ollama para LLM local) e estrutura clara para desenvolvedores juniores, suportada por AI (Copilot).
## <a name="arquitetura-lógica"></a>1. Arquitetura Lógica
A arquitetura lógica separa claramente apresentação, aplicação e domínio. As \*\* principais componentes\*\* são:

- **Front-end (Next.js/React):** Single Page App e páginas server-side. Consome APIs REST do back-end, gerencia formulários e exibição de relatórios de casos. Usa **React Query** para requisições e cache[\[10\]](https://tanstack.com/query/v5/docs/framework/react/overview#:~:text=Overview). Implementa UI responsiva baseada em componentes (p.ex. Biblioteca *shadcn/ui* para design consistente). Autenticação e autorização (RBAC) ocorrem via middleware do Auth.js, que injeta a sessão de usuário nas requisições[\[12\]](https://authjs.dev/#:~:text=Authentication%20for%20the%20Web).
- **API Back-end (Fastify):** Servidor Node.js que expõe rotas REST tipadas. Cada rota valida entrada com Zod usando os *schemas* gerados dos contratos (camada *domain-contracts*). Fastify, com baixo overhead e motor interno de validação JSON-Schema, é rápido e extensível[\[5\]](https://fastify.dev/#:~:text=Enter%20Fastify,fastest%20web%20frameworks%20in%20town)[\[15\]](https://fastify.dev/#:~:text=decorators.%20%2A%20Schema,costly%3B%20we%20chose%20the%20best). Plugins gerenciam funcionalidades transversais (autenticação, CORS, etc).
- **Pacotes de Domínio (packages/):** Bibliotecas internas compartilhadas (ex.: *domain-contracts* com schemas e adaptadores; *rule-engine* com lógica de negócio; *scoring*; *audit*). Essas lib fornecem o núcleo calculador de cada caso. A pasta contracts/ contém YAMLs (*contratos*) que definem entidades e fluxos de dados, sendo fonte canônica das interfaces.
- **Banco de Dados (PostgreSQL):** Armazena casos, evidências, e registros de auditoria. Usamos Prisma para mapear entidades e migrações. Um esquema de evidências flexível (ex.: JSONB para dados experimentais) dá versatilidade.
- **Motor de Regras e Scoring:** Processo que, dado um caso (inputs do usuário e contexto), aplica as regras definidas (compatibilidade, casos extremos, defaults) e calcula um *score* de compatibilidade e confiança. Resultados são armazenados e eventualmente exibidos.
- **Auditoria/Logs:** Cada execução de caso é registrada (inputs, saída, tempo, usuário, erros). Esse audit trail ajuda em acompanhamento e compliance.
- **Adaptador LLM (IA):** Interage com modelo de linguagem (local via Ollama ou API do OpenAI) para gerar narrativas ou resumos explicativos dos resultados. Por exemplo, dado o *score* e dados chaves, o LLM cria um texto resumindo o cenário para o usuário.
- **Observabilidade (OpenTelemetry):** Toda requisição e operação importante emite spans/métricas. Isso permite rastrear desempenho e diagnosticar erros[\[13\]](https://opentelemetry.io/docs/concepts/observability-primer/#:~:text=To%20ask%20those%20questions%20about,of%20the%20information%20they%20need).
- **Autenticação/RBAC:** Roles de usuário (ex.: admin, analyst, viewer) definem acesso. Auth.js/NextAuth insere user.role no token/session[\[14\]](https://authjs.dev/guides/role-based-access-control#:~:text=Persisting%20the%20role). Middleware do Fastify verifica essa role em rotas seguras (ex.: apenas admin pode aprovar casos).
- **Normalização de Contratos:** Uma camada converte os dados brutos (JSON) segundo os contratos YAML. Garante que mudanças no contrato sejam propagadas ao código via adaptador, evitando que o código presuma shape não documentado.

A seguir, diagrama de componentes ilustrando as relações:

graph LR\
`  `subgraph UI\
`    `NextApp[Next.js Web App]\
`  `end\
`  `subgraph API\
`    `FastifyAPI[Fastify API]\
`    `Auth[Auth.js Middleware]\
`  `end\
`  `subgraph Domain\
`    `Contracts[domain-contracts (YAML \u2192 Zod)]\
`    `RuleEngine[Motor de Regras & Scoring]\
`    `Audit[Audi\u00eancia / Logs]\
`    `LLMAI[Adapter IA (Ollama/OpenAI)]\
`  `end\
`  `subgraph DB\
`    `Postgres[(PostgreSQL)] \
`  `end\
`  `subgraph Observ\
`    `OTel[OpenTelemetry]\
`  `end\
\
`  `NextApp -->|HTTP/GraphQL| FastifyAPI\
`  `NextApp -->|Session Cookie/JWT| Auth\
`  `FastifyAPI --> Auth\
`  `FastifyAPI --> RuleEngine\
`  `RuleEngine --> Contracts\
`  `RuleEngine --> Postgres\
`  `RuleEngine --> Audit\
`  `RuleEngine --> LLMAI\
`  `LLMAI -.-> RuleEngine\
`  `FastifyAPI --> OTel\
`  `RuleEngine --> OTel\
`  `NextApp --> OTel

**Fluxo de Decisão (Exemplo):** Quando o usuário submete um caso, os dados são primeiro normalizados conforme os *schemas* de domain-contracts (aplicando defaults, preenchendo valores faltantes). Em seguida, passa por validação de contract (Zod) para garantir conformidade. O RuleEngine então processa regras de compatibilidade, gera *score* e insights. As decisões (resultados, erros) são armazenadas (Audit) e uma solicitação ao LLM cria um resumo textual. O fluxo do *decision run* pode ser modelado pelo seguinte fluxograma:

flowchart TD\
`  `Start["<b>Início:</b> Recebe caso (JSON)"] --> Norm["<b>Normalização:</b> aplica adaptações iniciais"]\
`  `Norm --> Val["<b>Validação:</b> checa schemas Zod/contratos"]\
`  `Val --> Engine["<b>Motor de Regras:</b> Aplica lógica (compatibilidade, defaults, er\u0143os)"]\
`  `Engine --> Score["<b>Scoring:</b> C\u00e1lculo de pontua\u00e7\u00e3o e confian\u00e7a"]\
`  `Score --> Database["<b>Persist\u00eancia:</b> Armazena resultado no BD"]\
`  `Score --> LLM["<b>Narrativa IA:</b> Gera texto com LLM (via Adapter)"]\
`  `LLM --> End["<b>Fim:</b> Retorna relatorio final ao usu\u00e1rio"]\
`  `Score --> Audit["<b>Auditoria:</b> Registra detalhes e logs"]
## <a name="arquitetura-física"></a>2. Arquitetura Física
Na camada de infraestrutura, todos os serviços rodam em **containers Docker**. A aplicação é empacotada em 3 imagens principais: Front-end (Next.js), API (Fastify) e Banco de Dados (Postgres). Opcionalmente, um container separado executa o servidor LLM local (Ollama) se usado. Para gestão de containers, escolhemos **Coolify** (open source) sobre Docker Compose ou Kubernetes, conforme orientação de auto-hospedagem. Coolify simplifica deploy via Docker Stack/git pushes e não requer configuração manual de cada serviço[\[16\]](https://www.bunnyshell.com/comparisons/coolify-alternatives/#:~:text=Coolify%20is%20great%20for%20self,the%20best%20options%2C%20compared%20honestly). Caso se opte por nuvem gerenciada, possivelmente usaríamos DigitalOcean App Platform (ou alternativa semelhante) para deploy automático via git.

**Topologia de Deploy:** Cada componente roda como serviço isolado:

- **Front-end (Next.js):** container separado, expõe porta 3000 (ou 80). Pode servir páginas estáticas via CDN (usando ISR) conforme Next.js.
- **API (Fastify):** container back-end escutando em porta (p.ex. 4000), internamente conectado ao DB.
- **Banco de Dados:** pode ser serviço gerenciado (Postgres no próprio server) ou container dedicado. Recomendado **BD gerenciado** para facilidade de backups e escalabilidade (ex.: DigitalOcean Managed DB).
- **LLM (Ollama):** container com a imagem ollama/ollama, porta local 11434, expõe API compatível com OpenAI[\[17\]](https://ollama.com/blog/openai-compatibility#:~:text=Ollama%20now%20has%20built,and%20applications%20with%20Ollama%20locally).
- **Observabilidade:** Serviços de coleta (Prometheus/Jaeger) podem rodar em container ou instância separada. OpenTelemetry envia dados a eles.
- **Serviços Auxiliares:** Load Balancer (NGINX ou recurso gerenciado) distribui tráfego de entrada ao front-end e API.

**Ambiente de Execução:** Como o foco é MVP e devs juniores, recomendamos inicialmente um *VPS* acessível (por exemplo, DigitalOcean Droplet) para auto-hospedagem com Coolify. Isso mantém custo baixo e total controle, evitando dependências de serviços pagos. Em produção, avaliar uma migração para serviço gerenciado (ver opções adiante).

**CI/CD (GitHub Actions):** Usaremos GitHub Actions para CI/CD. Workflows automáticos executarão testes em PRs e farão build & deploy. Por exemplo:

- npm run lint && npm run test em cada commit.
- No push para main, roda build Docker (docker build), atualiza imagens no registry (Docker Hub ou DOR), e executa deploy no host (via SSH/git auto-deploy no Coolify). GitHub Actions facilita integração com containers[\[18\]](https://docs.github.com/en/actions/get-started/quickstart#:~:text=Introduction).

**Backups:** Para o banco de dados, configurar snapshots automáticos (p.ex. DigitalOcean Backup ou Volumes replicados). Código-fonte está no Git; nenhuma outra forma de backup é requerida.

**Escalabilidade:**

- *VPS + Coolify:* Limita-se ao hardware do servidor. Escalar exige provisionar maior VPS ou múltiplos nós. Complexidade: média (gerência própria). Custo: **DigitalOcean Droplet 1 GB ≈ US$6/mês[\[19\]](https://www.digitalocean.com/pricing/droplets#:~:text=DigitalOcean%20Droplets%20are%20available%20at,bandwidth%20included%20in%20your%20plan)**.
- *Nuvem Gerenciada:* Ex.: DigitalOcean App Platform. Fornece auto-scaling automático, atualização de OS, mas custo maior. Por exemplo, container compartilhado 1 GB por **US$10/mês[\[20\]](https://www.digitalocean.com/pricing/app-platform#:~:text=Shared)**, fora dados adicionais.
- *Kubernetes Gerenciado (ex.: DOKS, EKS):* Altíssima escalabilidade e resiliência, controle detalhado de recursos e clusters. Porém, alta complexidade operacional. DigitalOcean Kubernetes cobra apenas pelos nós (*workers* **US$12/node-mês[\[21\]](https://www.digitalocean.com/pricing/kubernetes#:~:text=We%20charge%20only%20for%20underlying,resources%20like)**; plano de controle é gratuito). Custo inicial maior, mas útil para cargas muito variáveis.

A tabela abaixo resume as opções **(exemplos)**:

|Opção|Descrição|Custo Aproximado|Escalabilidade|Complexidade|
| :- | :- | :- | :- | :- |
|**VPS + Coolify**|Droplet Linux + Coolify (OSS)|~$6–10/mês (1–2 GB)[\[19\]](https://www.digitalocean.com/pricing/droplets#:~:text=DigitalOcean%20Droplets%20are%20available%20at,bandwidth%20included%20in%20your%20plan)|Escalável manual (upsize do VPS)|Média (admin próprio)|
|**Nuvem Gerenciada**|Ex.: DigitalOcean App Platform|~$10–25/mês por container[\[20\]](https://www.digitalocean.com/pricing/app-platform#:~:text=Shared)|Escalonamento automático|Baixa (operação terceirizada)|
|**Kubernetes (DOKS)**|Cluster K8s gerenciado|~$12+/node (1 CPU/2 GB)[\[21\]](https://www.digitalocean.com/pricing/kubernetes#:~:text=We%20charge%20only%20for%20underlying,resources%20like)|Alto (auto-scaling nativo)|Alta (complexo K8s)|

**Fontes:** preçários das plataformas em Abril/2026[\[19\]](https://www.digitalocean.com/pricing/droplets#:~:text=DigitalOcean%20Droplets%20are%20available%20at,bandwidth%20included%20in%20your%20plan)[\[20\]](https://www.digitalocean.com/pricing/app-platform#:~:text=Shared)[\[21\]](https://www.digitalocean.com/pricing/kubernetes#:~:text=We%20charge%20only%20for%20underlying,resources%20like). *Coolify* é gratuito e self-hosted[\[16\]](https://www.bunnyshell.com/comparisons/coolify-alternatives/#:~:text=Coolify%20is%20great%20for%20self,the%20best%20options%2C%20compared%20honestly), mas requer manutenção de servidor.

**Segurança de Rede:** Isolar portas internas (por exemplo, Postgres só acessível por container). Usar HTTPS no front-end/API. Isolar API via JWT/HTTPS e limitar CORS. Deploy em sub-redes privadas quando possível.
## <a name="estrutura-de-pastas-final"></a>3. Estrutura de Pastas Final
Adotamos monorepo com estrutura cristalizada para separação clara de responsabilidades:

/repositorio\
├── apps/\
│   ├── web-ui/             # Front-end Next.js (React + TS)\
│   │   ├── public/         # Assets estáticos, CSS/JS\
│   │   ├── src/\
│   │   ├── package.json\
│   │   └── ...             # Configs Next.js, etc.\
│   └── api-server/         # Back-end Fastify (Node + TS)\
│       ├── src/\
│       ├── package.json\
│       └── ...             # Configs Fastify, rotas, etc.\
├── packages/               # Bibliotecas compartilhadas\
│   ├── domain-contracts/   # Definições de esquema (YAML) e adaptadores Zod\
│   ├── rule-engine/        # Lógica de regras e scoring\
│   ├── auth/               # Lógica de autorização (opcional)\
│   ├── utils/              # Funções utilitárias (helpers, data transformers)\
│   └── ...                 \
├── contracts/              # (Opcional) arquivos YAML originais com contratos\
├── tests/                  # Testes de integração/unitários\
│   ├── fixtures/          # Dados de exemplo\
│   └── ...\
├── .eslintrc.js            # ESLint config compartilhada\
├── tsconfig.json           # TSconfig base (extends nos apps)\
├── lerna.json or pnpm-workspace.yaml or turbo.json  # Monorepo setup\
└── README.md

**Descrição resumida de algumas pastas-chave:**

- apps/web-ui: Aplicação Next.js. Componentes React, páginas, ganchos de hooks, telas (UI) e lógica de apresentação. Exemplo: src/pages/cases/new.tsx para criar um novo caso.
- apps/api-server: Servidor Fastify. Contém definição de rotas (em src/routes/), plugins (autenticação, validação), inicialização do servidor. Exemplo: rota POST /api/cases que chama rule-engine.
- packages/domain-contracts: Contém os contratos de domínio YAML *originais* (semantics) e scripts de conversão para Zod. Por exemplo, schema.yaml e schema.zod.ts. Ao construir, esses contratos são transformados em arquivos .ts para validação.
- packages/rule-engine: Implementação do motor de regras. Funções que, dado o input normalizado, aplicam regras e retornam output e *score*.
- tests/: Testes Vitest. Incluem testes unitários dos pacotes (rule-engine, adaptadores) e testes de contrato (comparando respostas da API com contratos). Fixtures de casos de teste (JSON exemplo) em fixtures/.

Cada package.json e tsconfig.json são configurados para apontar corretamente para pastas compartilhadas. O monorepo usa **pnpm workspaces** ou **Lerna** para instalar dependências únicas no root e linkar pacotes locais.

*Nota:* A pasta contracts/ armazena as definições contratuais originais YAML; estas alimentam a pasta packages/domain-contracts no build. Os testes consideram packages/domain-contracts como fonte canônica de validação.
## <a name="padrões-de-código"></a>4. Padrões de Código
**TypeScript:** Usamos TS estrito ("strict": true). Seguir convenções comuns (camelCase para variáveis, PascalCase para classes e componentes React). Usar módulos ES6 (import/export) em todo o código. Arquivos .ts e .tsx apropriados. Configurar tsconfig.json base e estender nos apps. Usar OOP/Classes apenas quando fizer sentido; preferir funções e composição.

**Lint/Style:** ESLint com plugin TypeScript (ex.: @typescript-eslint) e Prettier para formatação consistente. Regras básicas: sem any, evitar código não utilizado, usar aspas simples, ponto e vírgula conforme padrão Prettier. Configurar ESLint para rodar na CI antes de testes.

**Formatação:** Prettier (2KB bundle) formata tudo automaticamente. Exemplo de configuração: "semi": true, "singleQuote": true. Arquivo de configuração compartilhado (root .prettierrc).

**Testes:** Vitest é preferido pela boa integração com TS e rapidez[\[22\]](https://www.speakeasy.com/blog/vitest-vs-jest#:~:text=Which%20JavaScript%20testing%20framework%20is,right%20for%20you). Ele suporta ES Modules nativamente e reporta cobertura. Use testes unitários para pacotes (rule-engine, adaptadores) e testes de integração para rotas REST. Estruturar testes em paralelo à estrutura src.

**Validação de Schema:** Adotar **schema-first validation**. Zod definirá schemas que servem de contrato de tipos *e* validação em runtime[\[9\]](https://github.com/colinhacks/zod#:~:text=What%20is%20Zod%3F). Por exemplo:

// Exemplo: pacote domain-contracts/schema.zod.ts\
import { z } from "zod";\
export const CaseSchema = z.object({\
`  `id: z.string().uuid(),\
`  `perguntas: z.array(z.string()),\
`  `/\* ... \*/\
});

Essa definição é usada tanto como TS type (Case) quanto para validar requisições.

**Commit Messages/PR:** Usar *Conventional Commits* (ex.: feat:, fix:, test:) para padronização. Cada PR deve passar em CI (lint + testes) e incluir descrição clara do que foi feito. Check-list do PR: confirmar que códigos foram revisados, todos testes passaram, documentação necessária atualizada, e mudanças em contratos foram consideradas.
## <a name="estratégia-de-validação"></a>5. Estratégia de Validação
**Testes de Contrato:** Implementar **contract tests** que leem os schemas Zod auto-gerados e verificam se as rotas da API retornam estruturas compatíveis. Por exemplo, um teste pode executar a API com dados fictícios e validar o JSON de resposta com CaseSchema.parse(response). Isso assegura que qualquer mudança nos YAMLs contratuais seja detectada.

**Testes Unitários/Integração:**

- *Unitários:* Funções isoladas do rule-engine, adaptadores e hooks. Simule casos diversos, incluindo fronteiras (compatibilidade mínima, máxima).
- *Integração:* Inicialize a API (Fastify) em memória ou com banco em memória (ex.: SQLite ou Docker Postgres), e faça chamadas reais via HTTP (ex.: usando supertest ou node-fetch no Vitest) para validar o fluxo completo.

**Fixtures de Teste:** Definir arquivos JSON em tests/fixtures/ com cenários de caso típicos (ex.: entrada válida, casos extremos, falhas). Usar esses arquivos nos testes para alimentar a API e o motor.

**Processo de Freeze de Contrato:** Uma vez aprovados, os contratos (packages/domain-contracts) ficam congelados (versão tagueada). Qualquer alteração futura nesses contratos exige aumento de versão ou migração. Isso evita breaking changes não coordenadas. O time deve atualizar versões das APIs se os contratos forem alterados.

**Migrações de Banco:** Como usamos Prisma, cada alteração de modelo gera migration script (prisma migrate dev). No CI, um workflow pode aplicar migrations em ambiente de teste antes de rodar testes.

**Execução de Testes:**

- *Local:* Rodar npm install no root e em apps/web-ui e apps/api-server. Em seguida, npm run dev iniciará ambos. Use npm test (no root) para executar Vitest em todos os pacotes.
- *CI:* GitHub Actions configura Node 18, instala deps (pnpm install ou npm ci), e executa linters e vitest --run --coverage. Códigos com falhas bloqueiam merge. Exemplos de comandos:

  # Instalação e testes\
  pnpm install\
  pnpm run lint      # ESLint\
  pnpm test          # Vitest em todos os pacotes

  Semelhantemente, usar workflow Node.js padrão das docs do GitHub Actions[\[18\]](https://docs.github.com/en/actions/get-started/quickstart#:~:text=Introduction).
## <a name="xa78bce69e2afbeadba22207ad6f2901fc66b489"></a>6. Método e Implementação do MVP (AI-Assisted Development)
**Roadmap Fases (exemplo):**

1. **Fase 1 – Infraestrutura e Scaffold (1 semana):** Criar monorepo vazio com configurações de package.json, tsconfig.json, ESLint, setup básico de CI. Scaffold dos apps Next.js e Fastify via *create-next-app* e Fastify CLI. Critério de aceite: projeto compila sem erros, front-end e back-end iniciam (npm run dev). (*Junior tasks:* configurar workspaces, instalar dependências, commit inicial).
1. **Fase 2 – Modelagem e Contratos (2 semanas):** Definir entidades principais nos contratos YAML (ex.: Case, Question, Profile), gerar schemas Zod. Criar esquema Prisma e testar conexão ao Postgres. Critério: pode-se criar entradas simples no BD via Prisma Client. (*Tarefas:* escrever YAML, rodar prisma migrate, criar modelos TS, revisar contratos).
1. **Fase 3 – API e Regras Básicas (2 semanas):** Implementar rotas REST (por ex. POST /cases, GET /cases/:id). Em cada rota, normalizar input e passar ao rule-engine. Desenvolver motor de regras mínimo (ex.: verificação de compatibilidade). Critério: APIs retornam JSON válidos (testados contra contrato). (*Tarefas:* endpoints, validações Zod, funções de regras).
1. **Fase 4 – Front-end e Interação (2 semanas):** Criar UI para submeter casos e ver resultados. Usar React Query para chamadas a /api/cases. Critério: usuário pode preencher formulário e ver resultado salvo. (*Tarefas:* telas, chamadas de API, feedback de loading/erros).
1. **Fase 5 – LLM e Polimentos (1 semana):** Integrar adaptador de IA: configurar Ollama/ChatGPT e criar função que, dado resultado, gera texto explicativo. Critério: texto gerado aparece no front. Também adicionar observabilidade (inicializar OpenTelemetry). (*Tarefas:* instalar Ollama, escrever prompt, coletar logs).
1. **Fase 6 – Testes e Deployment (1 semana):** Completar testes (automatizar cobertura mínima), configurar CI/CD (GitHub Actions), documentar comandos de deploy (Docker ou Coolify). Critério: todos testes verdes em CI e deploy automático no repo. (*Tarefas:* escrever workflows, criar scripts de deploy, fazer revisão final).

**Estimativa de Esforço:** ~7 semanas, divididas em sprints de 1-2 semanas. Tarefas específicas devem ser pequenas e autônomas para desenvolvedores juniores, com revisões regulares.

**Critérios de Aceitação:** Para cada fase, deve-se ter ao menos um *build* verde passando em CI, funcionalidades testáveis e documentação atualizada (README).

**Exemplos de API Contracts (OpenAPI/REST):**

*Exemplo de rota para criar um caso (OpenAPI 3.0 snippet):*

paths:\
`  `/api/cases:\
`    `post:\
`      `summary: Criar novo caso\
`      `requestBody:\
`        `required: true\
`        `content:\
`          `application/json:\
`            `schema:\
`              `$ref: '#/components/schemas/NewCase'\
`      `responses:\
`        `'201':\
`          `description: Caso criado com sucesso\
`          `content:\
`            `application/json:\
`              `schema:\
`                `$ref: '#/components/schemas/CaseResult'\
components:\
`  `schemas:\
`    `NewCase:\
`      `type: object\
`      `properties:\
`        `perguntas:\
`          `type: array\
`          `items: { type: string }\
`        `perfil:\
`          `type: string\
`      `required: [perguntas, perfil]\
`    `CaseResult:\
`      `type: object\
`      `properties:\
`        `caseId: { type: string }\
`        `score: { type: number }\
`        `narrative: { type: string }

*Exemplo de payload de entrada (NewCase):*

{\
`  `"perguntas": ["Como alimentar a célula?", "Qual fator de temperatura?"],\
`  `"perfil": "industrial"\
}

Resposta esperada (CaseResult):

{\
`  `"caseId": "123e4567-e89b-12d3-a456-426614174000",\
`  `"score": 0.87,\
`  `"narrative": "O sistema mostra alta compatibilidade devido aos parâmetros informados..."\
}

**Fluxo de Trabalho com Copilot/LLMs:**

- Desenvolvedores podem usar *GitHub Copilot* ou ChatGPT no VSCode para acelerar criação de boilerplate. Por exemplo:

  *Prompt:* “Crie um endpoint Fastify em TypeScript para POST /api/cases que valide a requisição usando Zod e chama uma função runCaseEngine com os dados.”
- Guardrails: Sempre revisar código gerado pela IA, garantir que *types* estão corretos e que regras de negócio fazem sentido. Usar comentários explicativos para treinar o Copilot (ex.: JSDoc).
- Em revisões de PR, confirmar manualmente fluxos críticos (autenticação, validações).
- Para escrita de testes, também é possível solicitar sugestões (“Como testar GET /api/cases com Vitest?”) e depois adaptar.

**Fluxo de Trabalho Diário (exemplo):**\
1\. Criar branch com nome semântico (feature/cases-endpoint).\
2\. Escrever código incremental, alternando entre dev manual e prompts (Copilot).\
3\. Rodar localmente (npm run dev) e ajustar em tempo real.\
4\. Escrever testes unitários correspondentes e executar (npm test).\
5\. Commitar mensagens claras (ex.: feat(api): implementar POST /cases).\
6\. Abrir PR no GitHub; CI executa lint/tests. Revisar comentários do Copilot, adicionar documentação de uso.\
7\. Após aprovação, merge e execução de workflow de deploy (testes + build + deploy).

**Ferramentas Recomendada:** Principais bibliotecas são open-source (Next.js, Fastify, Prisma, Zod, React Query, Auth.js). Como modelo de linguagem local, **Ollama** permite hospedar internamente modelos de IA compatíveis com a API da OpenAI[\[17\]](https://ollama.com/blog/openai-compatibility#:~:text=Ollama%20now%20has%20built,and%20applications%20with%20Ollama%20locally). Alternativamente, OpenAI GPT-4 via API é pago. Para CI/CD, GitHub Actions (gratuito para repositórios públicos) é suficiente[\[18\]](https://docs.github.com/en/actions/get-started/quickstart#:~:text=Introduction).\
**Assunções:** Consideramos que a pasta packages/domain-contracts (contratos) está estável e não modificada, sendo fonte principal das definições. Quaisquer campos não especificados nos contratos serão assumidos genéricos (por exemplo, strings adicionais no payload).

**Conclusão:** Esta arquitetura e plano fornecem uma visão clara e incremental para construir o MVP de forma estruturada, permitindo automação por IA e foco na qualidade. As decisões técnicas são baseadas em ferramentas consolidadas para garantir produtividade (TS, frameworks populares) e escalabilidade futura, com custos controlados e mínimo lock-in.

**Fontes:** Documentações oficiais (Next.js[\[3\]](https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs#:~:text=Next,stack%20web%20applications)[\[4\]](https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs#:~:text=Next,blocks%20to%20create%20web%20applications), Fastify[\[5\]](https://fastify.dev/#:~:text=Enter%20Fastify,fastest%20web%20frameworks%20in%20town)[\[6\]](https://fastify.dev/#:~:text=,support%20the%20growing%20TypeScript%20community), Prisma[\[7\]](https://www.prisma.io/orm#:~:text=Prisma%20ORM%20elevates%20developer%20experience,safety), Zod[\[9\]](https://github.com/colinhacks/zod#:~:text=What%20is%20Zod%3F), TanStack Query[\[10\]](https://tanstack.com/query/v5/docs/framework/react/overview#:~:text=Overview), OpenTelemetry[\[13\]](https://opentelemetry.io/docs/concepts/observability-primer/#:~:text=To%20ask%20those%20questions%20about,of%20the%20information%20they%20need), Auth.js[\[12\]](https://authjs.dev/#:~:text=Authentication%20for%20the%20Web)), exemplos de mercado (monorepo *case study* brasileiro[\[1\]](https://repositorio.ufc.br/ri/bitstream/riufc/82631/1/2025_tcc_flpcastro.pdf#:~:text=de%20monoreposit%C3%B3rio%20,que%20facilita%20a%20padroniza%C3%A7%C3%A3o%2C%20a)[\[23\]](https://repositorio.ufc.br/ri/bitstream/riufc/82631/1/2025_tcc_flpcastro.pdf#:~:text=Neste%20trabalho%2C%20a%20aplica%C3%A7%C3%A3o%20foi,end)), e comparativos de infra[\[19\]](https://www.digitalocean.com/pricing/droplets#:~:text=DigitalOcean%20Droplets%20are%20available%20at,bandwidth%20included%20in%20your%20plan)[\[20\]](https://www.digitalocean.com/pricing/app-platform#:~:text=Shared)[\[21\]](https://www.digitalocean.com/pricing/kubernetes#:~:text=We%20charge%20only%20for%20underlying,resources%20like). Esses embasam as escolhas de arquitetura e stack apresentados.

-----
<a name="citations"></a>[\[1\]](https://repositorio.ufc.br/ri/bitstream/riufc/82631/1/2025_tcc_flpcastro.pdf#:~:text=de%20monoreposit%C3%B3rio%20,que%20facilita%20a%20padroniza%C3%A7%C3%A3o%2C%20a) [\[23\]](https://repositorio.ufc.br/ri/bitstream/riufc/82631/1/2025_tcc_flpcastro.pdf#:~:text=Neste%20trabalho%2C%20a%20aplica%C3%A7%C3%A3o%20foi,end) Desenvolvimento de uma Aplicação Web Acadêmica utilizando Ferramentas e Práticas DevOps na Universidade Federal do Ceará, Campus Quixadá-ce 

<https://repositorio.ufc.br/ri/bitstream/riufc/82631/1/2025_tcc_flpcastro.pdf>

[\[2\]](https://www.robinwieruch.de/javascript-monorepos/#:~:text=First%2C%20shared%20packages%20can%20be,streamlining%20development%20and%20reducing%20overhead) Monorepos in JavaScript & TypeScript - Robin Wieruch

<https://www.robinwieruch.de/javascript-monorepos/>

[\[3\]](https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs#:~:text=Next,stack%20web%20applications) [\[4\]](https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs#:~:text=Next,blocks%20to%20create%20web%20applications) React Foundations: About React and Next.js | Next.js

<https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs>

[\[5\]](https://fastify.dev/#:~:text=Enter%20Fastify,fastest%20web%20frameworks%20in%20town) [\[6\]](https://fastify.dev/#:~:text=,support%20the%20growing%20TypeScript%20community) [\[15\]](https://fastify.dev/#:~:text=decorators.%20%2A%20Schema,costly%3B%20we%20chose%20the%20best) Fast and low overhead web framework, for Node.js | Fastify

<https://fastify.dev/>

[\[7\]](https://www.prisma.io/orm#:~:text=Prisma%20ORM%20elevates%20developer%20experience,safety) [\[8\]](https://www.prisma.io/orm#:~:text=Prisma%20Client%20is%20a%20query,without%20the%20need%20for%20documentation) Prisma ORM | Next-generation database toolkit for TypeScript

<https://www.prisma.io/orm>

[\[9\]](https://github.com/colinhacks/zod#:~:text=What%20is%20Zod%3F) GitHub - colinhacks/zod: TypeScript-first schema validation with static type inference · GitHub

<https://github.com/colinhacks/zod>

[\[10\]](https://tanstack.com/query/v5/docs/framework/react/overview#:~:text=Overview) [\[11\]](https://tanstack.com/query/v5/docs/framework/react/overview#:~:text=TanStack%20Query%20is%20hands%20down,liking%20as%20your%20application%20grows) Overview | TanStack Query React Docs

<https://tanstack.com/query/v5/docs/framework/react/overview>

[\[12\]](https://authjs.dev/#:~:text=Authentication%20for%20the%20Web) Auth.js | Authentication for the Web

<https://authjs.dev/>

[\[13\]](https://opentelemetry.io/docs/concepts/observability-primer/#:~:text=To%20ask%20those%20questions%20about,of%20the%20information%20they%20need) Observability primer | OpenTelemetry

<https://opentelemetry.io/docs/concepts/observability-primer/>

[\[14\]](https://authjs.dev/guides/role-based-access-control#:~:text=Persisting%20the%20role) Auth.js | Role Based Access Control

<https://authjs.dev/guides/role-based-access-control>

[\[16\]](https://www.bunnyshell.com/comparisons/coolify-alternatives/#:~:text=Coolify%20is%20great%20for%20self,the%20best%20options%2C%20compared%20honestly) Top 14 Coolify Alternatives (2026) | Bunnyshell

<https://www.bunnyshell.com/comparisons/coolify-alternatives/>

[\[17\]](https://ollama.com/blog/openai-compatibility#:~:text=Ollama%20now%20has%20built,and%20applications%20with%20Ollama%20locally) OpenAI compatibility · Ollama Blog

<https://ollama.com/blog/openai-compatibility>

[\[18\]](https://docs.github.com/en/actions/get-started/quickstart#:~:text=Introduction) Quickstart for GitHub Actions - GitHub Docs

<https://docs.github.com/en/actions/get-started/quickstart>

[\[19\]](https://www.digitalocean.com/pricing/droplets#:~:text=DigitalOcean%20Droplets%20are%20available%20at,bandwidth%20included%20in%20your%20plan) Droplet Pricing | DigitalOcean

<https://www.digitalocean.com/pricing/droplets>

[\[20\]](https://www.digitalocean.com/pricing/app-platform#:~:text=Shared) App Platform Pricing | DigitalOcean

<https://www.digitalocean.com/pricing/app-platform>

[\[21\]](https://www.digitalocean.com/pricing/kubernetes#:~:text=We%20charge%20only%20for%20underlying,resources%20like) Kubernetes Pricing | DigitalOcean

<https://www.digitalocean.com/pricing/kubernetes>

[\[22\]](https://www.speakeasy.com/blog/vitest-vs-jest#:~:text=Which%20JavaScript%20testing%20framework%20is,right%20for%20you) Vitest vs Jest | Speakeasy

<https://www.speakeasy.com/blog/vitest-vs-jest>
