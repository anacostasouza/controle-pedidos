# Auditoria de Requisições, Rate Limit e Otimização — Controle de Pedidos

Este documento registra a análise técnica das causas de **excesso de requisições HTTP**, bloqueios pelo **limite por IP (HTTP 429)** e **alto volume de leituras no Firestore** no sistema de Controle de Pedidos, juntamente com o plano recomendado para otimização de performance e redução de custos.

> **Histórico**: As correções anteriores de filtros, ocultamento de entregues e paginação já foram implementadas e validadas em dev.

---

## 1. Diagnóstico: Por que ocorrem requisições acima do necessário e bloqueio por IP?

Após inspecionar [Dashboard.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/Dashboard.tsx), [AuthContext.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/context/AuthContext.tsx), [DashboardHeader.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/components/DashboardHeader.tsx), [funcControlePedidos.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/controle-pedidos/funcControlePedidos.ts), [protectedDashboardRoutes.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/controle-pedidos/routes/protected/protectedDashboardRoutes.ts) e [httpMiddleware.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/utils/httpMiddleware.ts), foram encontrados **6 gargalos críticos**:

### 1.1 Rate Limit por IP compartilhado + Ausência de `trust proxy` (`httpMiddleware.ts` / `funcControlePedidos.ts`)
- **Configuração atual**: `createDefaultRateLimiter()` limita a **200 requisições a cada 5 minutos por IP**.
- **Falta de `app.set("trust proxy", 1)`**: No `appControlePedidos` (rodando atrás do load balancer do Google Cloud Run / Firebase Functions v2), não há configuração de `trust proxy`. Sem ela, `req.ip` pode identificar o IP do proxy interno em vez do cliente real em `x-forwarded-for`, fazendo vários usuários compartilharem o mesmo balde de limite.
- **Rede corporativa (NAT único)**: Mesmo com `trust proxy`, todos os colaboradores no mesmo escritório saem para a internet pelo **mesmo IP público**. Com 5 a 10 pessoas pesquisando no Dashboard ao mesmo tempo, 200 requisições / 5 min equivalem a apenas ~4 a 8 ações por minuto por colaborador, esgotando o limite rapidamente.

### 1.2 Bug de Disparo Duplo e Cancelamento de Debounce ao digitar estando na Página 2+ (`Dashboard.tsx`)
- Em [Dashboard.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/Dashboard.tsx), existe um `useEffect` de fetch e outro `useEffect` separado que reseta `setCurrentPage(1)` sempre que um filtro muda.
- Se o usuário estiver na **página 2 ou superior** e digitar 1 letra no campo de cliente ou responsável:
  1. **Render 1**: `buscaCliente` muda, `prevSearchRef.current` é atualizado para o novo texto e agenda o debounce (300ms). Logo após, o outro `useEffect` dispara `setCurrentPage(1)`.
  2. **Render 2** (causado por `currentPage: 2 → 1`): `prevSearchRef.current` já contém o texto digitado no Render 1, fazendo `searchChanged` retornar **`false`**.
  3. Como resultado, o sistema interpreta como uma troca simples de página, **cancela o debounce e envia uma requisição HTTP imediata a cada tecla digitada**!

### 1.3 Debounce curto (300ms) e busca disparada com apenas 1 caractere
- O atraso de `300ms` é curto para digitação pausada, gerando requisições intermediárias (`"p"`, `"pa"`, `"pad"`, `"pada"`).
- Além disso, dispara busca no servidor mesmo com 1 único caractere alfabético, retornando conjuntos amplos e consumindo cota desnecessariamente.

### 1.4 Re-leitura completa de todos os pedidos ativos a cada requisição (`protectedDashboardRoutes.ts`)
- Toda chamada em `/dashboard/buscarPedidos` (cada letra digitada, cada troca de dropdown, cada clique em Próximo/Anterior) executa:
  ```ts
  col.where("statusAtual", "!=", "Entregue").get()
  ```
- Isso lê **todos os pedidos ativos do Firestore** repetidamente em cada interação.
- **Impacto de custo**: Se houver 300 pedidos ativos e um usuário digitar um nome em 3 pausas + navegar 3 páginas, são **1.800 leituras de documentos no Firestore** para visualizar apenas 10 linhas por página.

### 1.5 Verificação de Auth chamando o endpoint pesado de Pedidos (`AuthContext.tsx`)
- Em [AuthContext.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/context/AuthContext.tsx#L101), a função `verifyAuthorization()` chama:
  ```ts
  const url = `${API_URL}/dashboard/buscarPedidos?itensPorPagina=1`;
  ```
- A cada abertura ou recarregamento de página, o sistema consome uma requisição no limitador da API de pedidos e força o Firestore a ler **até 1.000 documentos** apenas para saber se o endpoint responde `200` ou `403`.
- **Risco crítico**: Se a API retornar HTTP `429` (rate limit), `response.status === 200` falha e o `AuthContext` **executa `signOut(auth)`, deslogando o usuário**.

### 1.6 Leituras repetidas de catálogos (`servicosStatus` e `usuarios`) no Frontend
- `DashboardHeader.tsx` e `Dashboard.tsx` chamam `fetchAllServicosStatus()` separadamente sem cache compartilhado em memória/sessão.
- `Dashboard.tsx` lê toda a coleção `usuarios` (`getDocs(collection(db, "usuarios"))`) a cada montagem da página.

---

## 2. Plano de Otimização (Performance, Limite de API e Redução de Custos)

| Prioridade | Melhoria | Impacto em Requisições e Custos |
| :---: | :--- | :--- |
| **1** | **Cache em memória no Backend (TTL 30–60s) ou Carregamento Único no Dashboard** | Reduz em **80% a 95%** as leituras no Firestore durante paginação e pesquisas seguidas. |
| **2** | **Corrigir `trust proxy` e chave de Rate Limit por usuário autenticado (`uid`)** | Elimina falsos positivos de HTTP 429 quando vários colaboradores usam a mesma rede (NAT). |
| **3** | **Endpoint leve `/auth/status` e proteção contra logout em erro 429** | Reduz leituras de auth de centenas/1.000 docs para **0 leituras na coleção `pedidos`** e impede logout acidental. |
| **4** | **Resetar página diretamente no `onChange` (remover bug de disparo duplo) + Debounce 500ms + Mínimo 2 chars** | Corta em **50% a 75%** o número de requisições HTTP geradas durante a digitação. |
| **5** | **Cache compartilhado (Singleton + TTL) para `servicosStatus` e `usuarios`** | Reduz leituras diretas do Firestore no cliente para no máximo 1 vez por sessão/TTL. |

---

### Detalhamento Técnico das Soluções

#### A. Otimização de Leituras e Requisições do Dashboard (Duas estratégias complementares)
1. **Cache em memória no Backend (`protectedDashboardRoutes.ts`)**:
   - Armazenar em cache na instância da Cloud Function a lista de pedidos ativos (`statusAtual != "Entregue"`) com TTL curto (ex.: **30 a 60 segundos**).
   - Invalidar o cache imediatamente sempre que ocorrer qualquer mutação nas rotas `/dashboard/criarPedido`, `/dashboard/editarPedido`, `/dashboard/deletarPedido` e `/dashboard/marcarComoEntregue` (ou adicionar query `?refresh=true` se o usuário clicar em atualizar).
   - Dessa forma, trocar de página (`1 → 2 → 3`) ou filtrar vários campos em sequência consome **0 leituras adicionais no Firestore**.
2. **Paginação & Filtros instantâneos no Frontend (Opcional — máxima economia)**:
   - Como o backend já lê o conjunto de pedidos ativos de uma só vez, alternativamente pode-se retornar todos os pedidos ativos em **1 única chamada** na entrada do Dashboard (com revalidação a cada 2 minutos ou após edições) e aplicar paginação/filtros instantaneamente em memória no navegador (**0 requisições HTTP** ao digitar ou trocar de página).

#### B. Correção do Rate Limiter em Duas Camadas (`httpMiddleware.ts` + `funcControlePedidos.ts`)
- Configurar `appControlePedidos.set("trust proxy", 1);` logo na criação do Express (confiando exatamente em 1 salto do Load Balancer do Cloud Run — nunca usar `true`, evitando spoofing de `X-Forwarded-For`).
- **Camada 1 (Pré-Auth — Proteção contra DDoS / força bruta por IP)**: Manter `createDefaultRateLimiter()` **antes** do `authMiddleware` com teto comportando escritórios em NAT (ex.: `600` req / 5 min por IP real).
- **Camada 2 (Pós-Auth — Limite justo por Usuário `uid`)**: Adicionar rate limiter após `authMiddleware` usando `req.user?.uid` como chave (ex.: `150`–`200` req / 5 min por usuário autenticado), impedindo abuso individual sem afetar outros colegas na mesma rede.

#### C. Endpoint dedicado de Autorização (`AuthContext.tsx` + `protectedDashboardRoutes.ts`)
- Criar rota leve `GET /auth/verify` protegida pelo `authMiddleware` completo, retornando `{ authorized: true }` sem tocar na coleção `pedidos`.
- Em `AuthContext.tsx`, atualizar `verifyAuthorization()` para consumir `/auth/verify`, mantendo bloqueio/logout imediato em `401` e `403`, e tratando apenas `429`/`503` como indisponibilidade temporária sem deslogar o usuário.

#### D. Correção do Debounce e Reset de Página (`Dashboard.tsx`)
- Remover o `useEffect` secundário que zera `currentPage` após a renderização. Em vez disso, resetar `setCurrentPage(1)` diretamente nos callbacks passados para `DashboardHeader` (ou criar um helper `atualizarFiltro(setter, valor)` que atualiza o filtro e seta `currentPage(1)` no mesmo lote de renderização do React).
- Aumentar o debounce da busca textual para **500ms–600ms** e exigir ao menos **2 caracteres** para busca por nome de cliente/responsável (permitindo 1+ caractere apenas quando for busca numérica de `numeroPedido`).

#### E. Cache em Memória no Cliente (`FirestoreUtils.ts` / `Dashboard.tsx`)
- Transformar `fetchAllServicosStatus()` e a listagem de `usuarios` (`uid` e `displayName` apenas) em cache singleton **em memória JavaScript** com TTL (ex.: 5 minutos), evitando re-leituras repetidas sem gravar dados em `localStorage`/`sessionStorage`.

---

## 3. Garantias e Cuidados de Segurança do Planejamento

Todas as otimizações acima preservam integralmente os controles de segurança do sistema:

1. **Autenticação e Autorização Estritas no Servidor ([authMiddleware.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/utils/authMiddleware.ts))**:
   - Tanto `/dashboard/buscarPedidos` quanto `/auth/verify` passam obrigatoriamente pelo `authMiddleware`, que valida assinatura do token JWT Firebase (`verifyIdToken`), verifica domínio corporativo permitido e checa em tempo real no Firestore se o usuário existe e possui `statusConta !== false`.
2. **Proteção contra Spoofing e DDoS**:
   - Usar `trust proxy = 1` (em vez de `true`) confia apenas no proxy do Google Cloud Run, impedindo que um atacante forje o header `X-Forwarded-For` para burlar o limite por IP.
   - Manter o limitador por IP **antes** da autenticação protege o Firebase Auth e o Firestore contra rajadas não autenticadas; o limitador por `uid` **após** o auth impede abuso por contas autenticadas.
3. **Integridade do Cache e Permissões de Escrita**:
   - Todas as mutações (`criarPedido`, `editarPedido`, `deletarPedido`, `marcarComoEntregue`) continuam validando permissões de setor/responsável (`permissaoUtils.ts`) diretamente sobre o documento real do Firestore no servidor — nunca confiando em cache para autorizar alterações.
   - O cache em memória de pedidos ativos só é servido após passar pelo `authMiddleware`, pois a visibilidade da fila do Dashboard é compartilhada entre todos os colaboradores autorizados.
4. **Zero Exposição Desnecessária no Navegador**:
   - Caches no frontend ficam apenas na memória da aba (descartados ao fechar) e armazenam apenas o estritamente necessário (`uid` e `displayName` para o filtro de responsáveis, e sequências de status), sem salvar dados sensíveis ou tokens em `sessionStorage`/`localStorage`.
