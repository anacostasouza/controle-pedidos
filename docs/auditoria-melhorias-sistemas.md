# Auditoria de Melhorias: Otimização, Usabilidade e Segurança (Demais Sistemas)

Este documento reúne os pontos de melhoria identificados nos sistemas **Atendimento**, **CRM**, **Financeiro** e nos módulos compartilhados (**TagPlus**, **Usuários** e middlewares HTTP/Auth), tomando como referência o padrão de segurança em duas camadas e controle de leituras adotado recentemente no Controle de Pedidos.

---

## Resumo Prioritário

| Prioridade | Sistema | Categoria | Achado Principal |
| :--- | :--- | :--- | :--- |
| **Crítica** | TagPlus (`apiTagPlus`) | Segurança | Rotas OAuth sem autenticação (`authMiddleware`), sem validação de `state` CSRF e retorno dos tokens (`access_token` / `refresh_token`) na resposta HTTP do callback. |
| **Crítica** | Financeiro (`financialApi`) | Segurança | Ausência de restrição por setor/perfil: qualquer usuário autenticado pode consultar o caixa, criar lançamentos, dar baixa e disparar sincronizações. |
| **Crítica** | Atendimento | Otimização / Custo | Verificação de sessão (`AuthContext`) chama `/filaAtendimento` e o `DashboardPage` chama `/todosAtendimentos` para estado não utilizado; ambos varrem **toda** a coleção `atendimentos`. |
| **Alta** | Financeiro | Otimização / Custo | `GET /resumo` e `GET /lancamentos` leem toda a coleção `financeiro_cache` por requisição, combinados com polling automático a cada 60s e busca textual sem debounce. |
| **Alta** | Compartilhado | Segurança / Estabilidade | `atendimentoApi`, `crmApi`, `financialApi`, `usuariosApi` e `apiTagPlus` não configuram `trust proxy` nem rate limiter por UID, sujeitando usuários atrás do mesmo IP/NAT a erro `429`. |
| **Alta** | Atendimento | Segurança | `POST /criarAtendimentoFila` sem limites de tamanho/tipo, `POST /registrarAtendimento` grava `req.body` direto no Firestore e `DELETE /deletarAtendimento/:id` não valida permissão/setor. |
| **Média** | CRM | Otimização / Custo | Leitura de `crmAcessos/{uid}` em toda requisição, `scan` completo de coleções em `/bootstrap`, `/opportunities` e `/reports`, e busca duplicada em `Catalogs.tsx`. |
| **Média** | Atendimento / CRM / Financeiro | Usabilidade | Logout forçado em erros `403`/`429`/`5xx`, re-render de 1s na fila inteira, filtro de atendentes incompleto no histórico, drag-and-drop acoplado ao DOM e falta de sincronização imediata pós-baixa. |

---

## 1. Infraestrutura Compartilhada, TagPlus e Usuários

### 1.1 Segurança

1. **Exposição e falta de autenticação na API do TagPlus**
   - **Onde:** [funcTagPlus.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/tagplus/funcTagPlus.ts#L23-L100)
   - **Problema:** O app `appTagPlus` (`apiTagPlus`) não aplica `authMiddleware` em nenhum endpoint (`/auth/status`, `/auth/start`, `/oauth/tagplus/callback`), aceita parâmetro `state` arbitrário sem verificação CSRF no callback e retorna `{ ok: true, tokenData }` diretamente no JSON do callback (L95), expondo `access_token` e `refresh_token` publicamente se a rota for acionada.
   - **Melhoria:** Exigir autenticação administrativa (`authMiddleware` + validação de setor Gestão/Suporte) em `/auth/status` e `/auth/start`, validar `state` assinado/temporário (nonce salvo com TTL no Firestore) no callback e retornar apenas confirmação amigável sem expor os tokens no corpo da resposta.

2. **Ausência de `trust proxy` e Rate Limiter em duas camadas (IP + UID)**
   - **Onde:** [httpMiddleware.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/utils/httpMiddleware.ts#L75-L189), [funcAtendimento.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/atendimento/funcAtendimento.ts), [api.ts (CRM)](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/crm/api.ts), [funcFinanceiro.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/funcFinanceiro.ts), [funcUsuarios.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/usuarios/funcUsuarios.ts)
   - **Problema:** Apenas o módulo `controle-pedidos` define `app.set("trust proxy", 1)` e aplica `createAuthenticatedRateLimiter` após a autenticação. Nos demais serviços, o limite de 200 requisições em 5 minutos é compartilhado pelo IP externo (ou proxy) de toda a loja/escritório.
   - **Melhoria:** Replicar `app.set("trust proxy", 1)`, ajustar o limiter de IP como barreira anti-abuso e aplicar `createAuthenticatedRateLimiter` por `uid` nas rotas autenticadas.

3. **Validação de campos na administração de Usuários**
   - **Onde:** [funcUsuarios.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/usuarios/funcUsuarios.ts#L194-L233)
   - **Problema:** `PATCH /usuarios/:uid` aceita qualquer valor em `setor` (usando `setorLabels[setor] ?? setor`) e `displayName` sem validação de lista permitida, tipo ou comprimento máximo.
   - **Melhoria:** Validar `setor` contra as chaves de `setorLabels` e aplicar sanitização/limites explícitos para `displayName` e `statusConta`.

### 1.2 Otimização (Custos e Performance)

1. **Leituras repetidas de `usuarios/{uid}` no `authMiddleware` e no `isAdminMiddleware`**
   - **Onde:** [authMiddleware.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/utils/authMiddleware.ts), [funcUsuarios.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/usuarios/funcUsuarios.ts#L44-L71)
   - **Problema:** Toda requisição autenticada lê `usuarios/{uid}` no `authMiddleware`. Em `funcUsuarios.ts`, o `isAdminMiddleware` lê **novamente** o mesmo documento `usuarios/{uid}` na mesma requisição. Além disso, `GET /usuarios/listar` lê toda a coleção sem paginação.
   - **Melhoria:** Anexar os dados já carregados do perfil em `req.user` (ou cache em memória com TTL curto, ex.: 30–60s por instância) para eliminar a segunda leitura no `isAdminMiddleware` e reduzir custos contínuos de leitura.

---

## 2. Sistema de Atendimento

### 2.1 Otimização (Custos de Firestore e Tráfego)

1. **Verificação de sessão faz varredura completa da coleção `atendimentos`**
   - **Onde:** [AuthContext.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/context/AuthContext.tsx#L101), [protectedAtendimentoRoutes.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/atendimento/routes/protected/protectedAtendimentoRoutes.ts#L170-L182)
   - **Problema:** Para confirmar se o usuário logado tem acesso, `verifyAuthorization()` chama `GET /filaAtendimento`. No backend, essa rota executa `admin.firestore().collection("atendimentos").get()` sem filtro de status — lendo todo o histórico da empresa em cada login ou recarregamento de página.
   - **Melhoria:** Criar um endpoint leve `GET /auth/verify` (sem leitura da coleção `atendimentos`) para validação de sessão e restringir `/filaAtendimento` no backend com `.where("status", "in", ["Aguardando", "Em Atendimento"])`.

2. **Dashboard executa `GET /todosAtendimentos` sem utilizar o resultado**
   - **Onde:** [Dashboard.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/pages/Dashboard/Dashboard.tsx#L9-L14), [protectedAtendimentoRoutes.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/atendimento/routes/protected/protectedAtendimentoRoutes.ts#L198-L200)
   - **Problema:** Ao abrir o Dashboard, o `useEffect` chama `buscarTodosAtendimentos()` (`GET /todosAtendimentos`), que lê **todos** os documentos da coleção `atendimentos` e salva em `_atendimentos`, variável que não é utilizada em nenhum lugar da página.
   - **Melhoria:** Remover a chamada `buscarTodosAtendimentos()` do `Dashboard.tsx` (e revisar se a rota `/todosAtendimentos` ainda é necessária ou deve exigir filtros de data obrigatórios e paginação).

3. **Histórico dispara até 8 consultas e usa `.offset()` no Firestore**
   - **Onde:** [filtrosUtils.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/atendimento/utils/filtrosUtils.ts#L1-L175)
   - **Problema:** `buscarAtendimentosComFiltros` executa múltiplas consultas de contagem e dados por requisição (total, snapshot paginado, finalizados, cancelados, controle de pedidos, atendimento direto, etc.) e utiliza `.offset(paginaOffset)`, que no Firestore cobra leitura de todos os documentos pulados.
   - **Melhoria:** Substituir `.offset()` por paginação baseada em cursor (`startAfter`) ou cache curto por combinação de filtros no histórico fechado, e consolidar/cachear estatísticas agregadas em uma única passagem ou `count()` apenas quando o período mudar.

4. **Leitura direta de todos os usuários no cliente e exportação refazendo consulta irrestrita**
   - **Onde:** [HistoricoAtendimentos.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/pages/Dashboard/components/HistoricoAtendimentos.tsx#L74-L90), [HistoricoAtendimentos.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/pages/Dashboard/components/HistoricoAtendimentos.tsx#L126-L137)
   - **Problema:** O componente lê toda a coleção `usuarios` via `getDocs` no cliente para montar `atendentesMap`. Além disso, exportar relatório chama `buscarHistoricoComFiltros` sem `limit`/`offset`, podendo baixar volumes grandes em períodos longos.
   - **Melhoria:** Disponibilizar um endpoint autenticado leve e cacheado para lista básica de atendentes (`uid` + `displayName`) e impor limite máximo ou geração por lote na exportação.

### 2.2 Segurança

1. **Rota pública `/criarAtendimentoFila` sem validação estrita de payload**
   - **Onde:** [publicAtendimentoRoutes.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/atendimento/routes/public/publicAtendimentoRoutes.ts#L9-L47)
   - **Problema:** Não há limite de caracteres para `nomeCliente`/`tipoAtendimento`, nem validação estrita para `prioridade` (`convencional` | `preferencial`), além da ausência de proteção adicional contra envio automatizado em massa.
   - **Melhoria:** Validar tipos, comprimento máximo de strings, enum fechado para `prioridade` e aplicar rate limit mais restritivo especificamente nas rotas públicas.

2. **Injeção de campos arbitrários e exclusão sem validação de papel**
   - **Onde:** [protectedAtendimentoRoutes.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/atendimento/routes/protected/protectedAtendimentoRoutes.ts#L184-L196), [protectedAtendimentoRoutes.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/atendimento/routes/protected/protectedAtendimentoRoutes.ts#L244-L263)
   - **Problema:**
     - `POST /registrarAtendimento` faz spread direto de `...atendimentoData` (`req.body`) no `.add(...)`, permitindo gravar quaisquer chaves extras (inclusive sobrescrevendo campos internos caso o cliente envie).
     - `DELETE /deletarAtendimento/:id` permite que qualquer usuário autenticado exclua qualquer registro sem verificação de setor/perfil nem criação atômica do log de auditoria no backend.
   - **Melhoria:** Montar uma whitelist explícita dos campos aceitos em `POST /registrarAtendimento`, restringir `DELETE /deletarAtendimento/:id` a perfis autorizados e registrar o log de exclusão diretamente no servidor (hoje feito pelo cliente em `logDeleteAtendimento`).

### 2.3 Usabilidade

1. **Logout automático agressivo em falhas transitórias ou `403`**
   - **Onde:** [AuthContext.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/context/AuthContext.tsx#L147), [FetchWithAuth.ts](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/utils/FetchWithAuth.ts#L17-L20)
   - **Problema:** O `AuthContext` encerra a sessão (`signOut`) em qualquer erro não-200 na verificação inicial (inclusive `429` ou erro temporário `5xx`). O `FetchWithAuth` também desloga e redireciona o usuário em `403` (falta de permissão em uma ação específica), confundindo bloqueio de permissão com sessão expirada.
   - **Melhoria:** Deslogar automaticamente apenas em `401` (ou usuário explicitamente bloqueado/desativado) e exibir mensagem clara ou botão de tentar novamente em `403`, `429` e `5xx`.

2. **Re-renderização global a cada segundo na tela da Fila**
   - **Onde:** [FilaAtendimento.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/pages/Atendimento/FilaAtendimento.tsx#L25-L28)
   - **Problema:** Um `setInterval` executa `setFila((f) => [...f])` a cada 1.000 ms para atualizar o tempo de espera, forçando toda a página, listas e modais a re-renderizarem a cada segundo.
   - **Melhoria:** Mover o `setInterval` para um subcomponente isolado responsável apenas pelo badge/texto do cronômetro de espera.

3. **Filtro de atendentes no Histórico limitado à página atual e uso de `alert()`**
   - **Onde:** [HistoricoAtendimentos.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/pages/Dashboard/components/HistoricoAtendimentos.tsx#L113), [HistoricoAtendimentos.tsx](file:///c:/Users/PLOTAGEM01/desenhar/atendimento/src/pages/Dashboard/components/HistoricoAtendimentos.tsx#L153-L155)
   - **Problema:** `atendentesUnicosUid` é derivado apenas dos `atendimentos` da página atual; se um atendente só aparecer na página 2, ele não aparece no seletor da página 1. Além disso, erros e confirmações usam `alert()` nativo bloqueante em vez de banners/toasts.
   - **Melhoria:** Popular o filtro de atendentes usando os atendentes conhecidos no sistema (`atendentesMap`) ou retornando a lista distinta nas estatísticas do período no backend, e substituir `alert()` por feedback visual inline.

---

## 3. Sistema CRM

### 3.1 Otimização (Custos de Firestore e Rede)

1. **Leitura extra de `crmAcessos/{uid}` em toda requisição e ausência de cache em `/bootstrap`**
   - **Onde:** [api.ts (CRM)](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/crm/api.ts#L97-L115)
   - **Problema:** Além da consulta de `usuarios/{uid}` no `authMiddleware`, cada requisição ao CRM lê `crmAcessos/{uid}` diretamente no Firestore. Na inicialização (`GET /bootstrap`), o servidor ainda faz `scan` completo das coleções `usuarios` e `crmAcessos`.
   - **Melhoria:** Adicionar cache em memória de curta duração (ex.: 30–60s) para permissões/catálogos auxiliares (`crmAcessos`, `usuarios`, `settings`) com invalidação nas rotas `PUT /access/:id` e `PUT /settings`.

2. **Varredura completa (`scan`) em `/opportunities` e fallback sem filtros**
   - **Onde:** [api.ts (CRM)](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/crm/api.ts#L175-L194)
   - **Problema:** `GET /opportunities` lê os registros da coleção inteira para memória via `scan` (além dos catálogos via `loadRelatedCatalogs`), aplica filtros de texto, data e paginação apenas em JavaScript e, se faltar índice composto no Firestore para `equalityFilters`, captura o erro e repete o `scan` sem filtros. Conforme a base cresce, a latência e o custo de leitura crescem linearmente.
   - **Melhoria:** Garantir índices compostos no Firestore para as combinações principais (`state` + `ownerId` + `createdAt`), aplicar ordenação/paginação no banco quando não houver busca textual `q`, e otimizar `GET /reports` (ou endpoint dedicado de relatório) no backend em vez de múltiplas páginas sequenciais pelo frontend.

3. **Chamadas duplicadas e em cascata no Frontend (`Catalogs`, `Workspace` e `ReportsPage`)**
   - **Onde:** [Catalogs.tsx](file:///c:/Users/PLOTAGEM01/desenhar/crm/src/Catalogs.tsx#L29-L65), [Workspace.tsx](file:///c:/Users/PLOTAGEM01/desenhar/crm/src/Workspace.tsx#L58-L73), [ReportsPage.tsx](file:///c:/Users/PLOTAGEM01/desenhar/crm/src/pages/ReportsPage.tsx#L51-L56)
   - **Problema:**
     - Em `Catalogs.tsx` (`load()`), o `Promise.all` executa `all('/${kind}')`, `all('/companies')` e `all('/clients')`, buscando `/clients` ou `/companies` **em duplicidade** na mesma carga.
     - Ao abrir os detalhes de uma empresa em `Catalogs.tsx`, dispara em paralelo `Promise.all` de consultas paginadas `/opportunities?clientId=...` para cada cliente vinculado — provocando N varreduras completas no backend simultaneamente.
     - Em `Workspace.tsx`, `revision` está nas dependências do efeito que carrega **todos** os `/clients` e `/companies`, recarregando ambos os catálogos completos toda vez que uma oportunidade é movida ou editada.
     - `ReportsPage.tsx` usa `all('/opportunities?state=')`, que pagina de 100 em 100 (`limit` travado a 100 no backend), gerando várias chamadas repetidas que executam `scan` completo a cada página.
   - **Melhoria:** Remover a requisição duplicada em `Catalogs.tsx`, adicionar suporte a `?companyId=...` em `/opportunities`, desacoplar o reload de catálogos do `revision` de oportunidades no `Workspace.tsx` (recarregando apenas quando clientes/empresas mudam) e criar endpoint próprio (ou cache de resposta) para o relatório.

### 3.2 Segurança e Usabilidade

1. **Acoplamento do Drag-and-Drop do Kanban ao texto do DOM**
   - **Onde:** [Workspace.tsx](file:///c:/Users/PLOTAGEM01/desenhar/crm/src/Workspace.tsx#L130-L155), [Workspace.tsx](file:///c:/Users/PLOTAGEM01/desenhar/crm/src/Workspace.tsx#L217-L229)
   - **Problema:** Os cards do Kanban recebem `opportunity.id` via `useEffect` procurando o texto do `<h4>` (`item.client?.name === cardName`), e o `onDrop` descobre a etapa removendo dígitos do texto do `<h3>` (`replace(/\d+$/, "")`). Se houver duas oportunidades para o mesmo cliente na tela, o drag-and-drop pode associar o ID da primeira ocorrência em vez do card arrastado.
   - **Melhoria:** Passar `draggable`, `onDragStart` e `data-stage` diretamente via props React nos componentes de Card e Coluna usando `opportunity.id` e a chave exata da etapa.

2. **Rate limit compartilhado por IP no CRM**
   - **Onde:** [api.ts (CRM)](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/crm/api.ts)
   - **Problema:** Sem `trust proxy` e limite por UID, o uso intenso em `ReportsPage` ou `Catalogs` no escritório pode atingir rapidamente o teto de 200 req/5 min por IP.

---

## 4. Sistema Financeiro

### 4.1 Segurança

1. **Falta de controle de autorização por setor/perfil (`financialApi`)**
   - **Onde:** [funcFinanceiro.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/funcFinanceiro.ts#L15-L28)
   - **Problema:** `createFinanceiroApp` aplica somente `authMiddleware` (que valida login Google no domínio permitido e `statusConta !== false`), sem verificar se o usuário pertence ao setor `FINANCEIRO`, `GESTAO`, `SUPORTE` ou `CAIXA`. Assim, qualquer colaborador ativo (inclusive de outros setores operacionais) que obtiver o token consegue ler todo o fluxo financeiro, criar lançamentos, baixar títulos na TagPlus e disparar sincronizações.
   - **Melhoria:** Adicionar um middleware de permissão financeira (whitelist de setores autorizados ou coleção/campo de acesso específico) logo após `authMiddleware`, diferenciando eventualmente perfil somente leitura de perfis que podem criar/baixar lançamentos.

2. **Disparo de operação pesada via `GET /financeiro/sync/now`**
   - **Onde:** [sync.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/routes/sync.ts#L23-L36)
   - **Problema:** A rota `GET /financeiro/sync/now` inicia a sincronização completa com a TagPlus (`syncFinanceiro`), violando semântica HTTP de leitura segura (sujeito a prefetch de navegador ou acesso acidental por URL).
   - **Melhoria:** Manter apenas `POST /financeiro/sync` para disparo manual e remover ou restringir `GET /financeiro/sync/now`.

3. **Ausência de `trust proxy` e rate limiter por UID**
   - **Onde:** [funcFinanceiro.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/funcFinanceiro.ts#L18-L23)
   - **Melhoria:** Aplicar `app.set("trust proxy", 1)` e rate limiting em duas camadas (IP + UID).

### 4.2 Otimização (Custos de Firestore e TagPlus)

1. **Leitura integral de `financeiro_cache` em todas as chamadas de resumo e listagem**
   - **Onde:** [lancamentos.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/routes/lancamentos.ts#L40-L47), [lancamentos.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/routes/lancamentos.ts#L221-L229)
   - **Problema:** Tanto `GET /financeiro/resumo` quanto `GET /financeiro/lancamentos` executam `db.collection("financeiro_cache").get()` — lendo até ~1.500 documentos do Firestore a cada consulta, troca de filtro, mudança de página ou atualização.
   - **Melhoria:**
     - **Para `/resumo`:** Pré-calcular ou cachear os totais em memória (com TTL de 1–5 minutos, invalidado após `syncFinanceiro` ou criação/baixa) ou manter documento agregado atualizado pelo `syncFinanceiro`.
     - **Para `/lancamentos`:** Fazer consultas indexadas no Firestore por `tipo` + `status` + intervalo de `data_vencimento` + `limit`, ou manter um cache curto em memória no backend (invalidado no sync/mutação) enquanto a base tiver ~1.500 registros.

2. **Polling contínuo de 60s no frontend + busca textual `q` sem debounce**
   - **Onde:** [useLancamentos.ts](file:///c:/Users/PLOTAGEM01/desenhar/financeiro/src/hooks/useLancamentos.ts#L53-L60), [ContasPagarPage.tsx](file:///c:/Users/PLOTAGEM01/desenhar/financeiro/src/pages/ContasPagarPage.tsx#L126-L134), [ContasReceberPage.tsx](file:///c:/Users/PLOTAGEM01/desenhar/financeiro/src/pages/ContasReceberPage.tsx)
   - **Problema:**
     - `useLancamentos` mantém `setInterval(..., 60_000)` disparando `GET /financeiro/lancamentos` a cada minuto em toda aba aberta, mesmo quando o usuário não está vendo a aba e embora o sync em si só rode a cada 15 minutos.
     - O campo de busca `q` altera `filtros` a cada caractere digitado sem debounce, provocando uma leitura completa de `financeiro_cache` por tecla digitada.
   - **Melhoria:** Aplicar debounce (300–400ms) no campo `q`, pausar o polling quando `document.hidden === true` e aumentar o intervalo (ou revalidar apenas quando `lastSyncAt` mudar / ao focar a janela).

3. **Cache não atualizado após criação ou baixa de lançamento e refresh forçado em qualquer erro**
   - **Onde:** [lancamentos.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/routes/lancamentos.ts#L315-L401), [financeiroSync.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/financeiro/financeiroSync.ts#L180-L182)
   - **Problema:**
     - `POST /financeiro/lancamentos` e `PUT /financeiro/lancamentos/:id` gravam na TagPlus mas não atualizam nem invalidam o item correspondente em `financeiro_cache` (embora exista `invalidarCacheItem` em `financeiroSync.ts`), fazendo a tela exibir valores desatualizados até o próximo sync de 15 minutos.
     - Nas rotas que chamam a TagPlus (`GET /:id`, `POST /`, `PUT /:id`, `GET /auxiliares`), o bloco `catch` força refresh do token OAuth em **qualquer** erro (inclusive erros `400`/`422`/`500` de validação ou rede), gerando chamadas extras desnecessárias de renovação de token.
   - **Melhoria:** Atualizar (upsert) ou invalidar o documento em `financeiro_cache` e limpar eventual cache em memória logo após `POST`/`PUT` bem-sucedido, e acionar `forceRefresh` somente quando o erro da TagPlus for HTTP `401`.

### 4.3 Usabilidade

1. **Feedback visual durante recarregamento parcial e erro no Dashboard**
   - **Onde:** [DashboardPage.tsx](file:///c:/Users/PLOTAGEM01/desenhar/financeiro/src/pages/DashboardPage.tsx#L12-L43)
   - **Problema:** Se ocorrer erro em uma atualização ou alteração de período quando já havia um `resumo` na tela, `if (error)` substitui toda a visualização dos cards pela tela de erro; além disso, durante recarregamentos em segundo plano (`loading && resumo`), não há indicação discreta de atualização em andamento.
   - **Melhoria:** Manter os dados anteriores visíveis com um banner de erro/tentativa e indicador discreto de carregamento no cabeçalho ou no botão de atualizar.

---

## 5. Plano Sugerido de Execução (Por Impacto)

1. **Fase 1 — Segurança Crítica (Baixo esforço, altíssimo risco mitigado):**
   - Proteger rotas OAuth do TagPlus (`funcTagPlus.ts`) e remover retorno de tokens no callback.
   - Restringir acesso por setor em `funcFinanceiro.ts` e remover disparo via `GET /sync/now`.
   - Aplicar `trust proxy = 1` + rate limiting por UID nos 4 serviços restantes (`atendimento`, `crm`, `financeiro`, `usuarios`) e sanitizar payloads/permissões em `atendimento`.
2. **Fase 2 — Redução Imediata de Leituras no Firestore (Custos e 429):**
   - Trocar verificação de auth do `atendimento` (`/filaAtendimento` -> `/auth/verify`) e remover chamada morta `/todosAtendimentos` do `Dashboard.tsx`.
   - Adicionar debounce na busca e cache em memória de resumo/listagem no `financeiro`, além de atualizar o cache local pós-criação/baixa.
   - Eliminar chamada duplicada e cascata em `Catalogs.tsx` e `Workspace.tsx`, e cachear `crmAcessos`/`usuarios` no backend do CRM e no `authMiddleware`.
3. **Fase 3 — Refino de Usabilidade e Escalabilidade:**
   - Corrigir tratamento de `403`/`429`/`5xx` no login de `atendimento`, isolar timer da fila, ajustar `atendentesUnicosUid` no histórico e tornar o Kanban do CRM baseado em props React em vez de seletores DOM.

