# Diagnóstico e Solução — Paginação do Dashboard (Controle de Pedidos)

Este documento registra a análise e o plano de solução recomendado para o problema remanescente na paginação do Dashboard de Controle de Pedidos (item **5.2** do diagnóstico anterior).

> **Histórico**: Todos os problemas anteriores (duplicação de cláusula de status, falhas de índice no Firestore, busca de cliente/responsável, ocultação de pedidos entregues ao filtrar por usuário e persistência do dropdown de status) já foram corrigidos e validados em produção.

---

## 1. Descrição do Problema

Ao navegar pela paginação do Dashboard:
- A barra de paginação indica uma página a mais do que o conjunto real de pedidos (ex.: exibe **Página X de 4**, quando a **página 3** já representa o último lote efetivo).
- Ao clicar em **Próximo** para ir até a última página (ex.: página 4), a tabela mantém exibidas **as mesmas informações da página anterior** em vez de apresentar novos registros ou encerrar na página 3.

---

## 2. Por que isso acontece?

Foram identificadas três causas combinadas entre o frontend (`Dashboard.tsx` / `PedidosTable.tsx`) e o backend (`protectedDashboardRoutes.ts` / `filtrosUtils.ts`):

### 2.1 Descompasso entre a contagem no Backend e a renderização na Tabela
- No backend ([protectedDashboardRoutes.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/controle-pedidos/routes/protected/protectedDashboardRoutes.ts)), `executarBuscaPedidos` calcula `total = filtered.length` sobre todos os documentos retornados do Firestore, sem validar se o documento possui os campos obrigatórios para renderização.
- No frontend ([PedidosTable.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/components/PedidosTable.tsx#L44-L45)), a tabela aplica um filtro antes de exibir:
  ```tsx
  .filter(p => p && p.servico && p.statusAtual && p.prazos)
  ```
- Como [`ordenarPedidosPorEntrega`](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/controle-pedidos/utils/filtrosUtils.ts) empurra pedidos sem `prazos.entrega` para o **final absoluto** da fila, esses registros incompletos inflam o `total` em 1 página extra (ex.: 30 pedidos válidos + 2 incompletos = 32 -> `Math.ceil(32 / 10) = 4 páginas`).

### 2.2 Persistência dos dados anteriores + Debounce + Ausência de indicador de `loading`
- Em [Dashboard.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/Dashboard.tsx), o estado `loading` é atualizado (`_loading`), mas **não é utilizado na interface** e os botões de paginação não são bloqueados durante a busca.
- Além disso, a mudança de página passa pelo mesmo `debounce(..., 300)` da digitação. Ao clicar em **Próximo**, o texto muda imediatamente para `Página 4 de 4`, mas a lista da página 3 continua visível na tela enquanto aguarda ou se a requisição for cancelada/falhar mantendo o estado `pedidos` anterior.

### 2.3 Ciclo redundante de cursores legados (`lastEntregas`, `lastIds`, `lastResponsaveis`)
- Em [Dashboard.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/Dashboard.tsx#L133-L147), os arrays de cursor (`lastEntregas`, `lastIds`, `lastResponsaveis`) ainda fazem parte das dependências do `useCallback` de `buildFetchParams`.
- Toda vez que uma página termina de carregar e grava `setLastEntregas(...)`, a referência de `buildFetchParams` muda e dispara o `useEffect` novamente, criando requisições repetidas e potencial cancelamento/sobreposição de estado no `debouncedFetchPedidos`.

---

## 3. Melhor Solução Recomendada

A solução definitiva consiste em tornar a paginação **determinística, síncrona com o estado da tabela e livre de cursores legados**:

### Passo 1: Validar estrutura mínima do pedido já no Backend ([filtrosUtils.ts](file:///c:/Users/PLOTAGEM01/desenhar/functions/src/controle-pedidos/utils/filtrosUtils.ts))
- Exigir na função `filtrarPedidosEmMemoria` (quando usada para listagem do Dashboard) que o pedido possua os campos mínimos renderizáveis:
  ```ts
  if (!p || !p.servico || !p.statusAtual || !p.prazos) {
    return false;
  }
  ```
- **Resultado**: O valor `total` retornado pelo backend será **100% idêntico** à quantidade de pedidos renderizados na tabela, eliminando qualquer página fantasma gerada por registros incompletos no banco.

### Passo 2: Remover cursores legados (`lastEntregas`, `lastIds`, `lastResponsaveis`) no Frontend ([Dashboard.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/Dashboard.tsx))
- Como o backend já realiza paginação exata por `pagina` e `itensPorPagina`, remover completamente os estados `lastEntregas`, `lastIds` e `lastResponsaveis` do `Dashboard.tsx`.
- **Resultado**: Elimina re-renderizações em cascata e requisições duplicadas disparadas pelo `useEffect`.

### Passo 3: Separar paginação imediata vs debounce de busca e proteger contra corrida de requisições
- Aplicar `debounce` apenas quando filtros digitados (`buscaCliente`, `filtroResponsavel`) mudam; ao clicar em **Anterior** ou **Próximo**, buscar a página imediatamente.
- Adicionar controle de sequência (`requestIdRef`) para garantir que somente a resposta da última requisição solicitada atualize `pedidos` e `totalPedidosFiltrados`.
- Caso a página retornada venha vazia com `total > 0` (por exemplo, se pedidos acabaram de ser entregues por outro usuário), ajustar automaticamente `currentPage` para a última página válida (`Math.max(1, Math.ceil(total / itemsPerPage))`).

### Passo 4: Exibir estado de carregamento (`loading`) e desabilitar paginação durante a busca
- Usar o estado `loading` (antes ignorado como `_loading`) para:
  - Desabilitar os botões `Anterior` e `Próximo` enquanto a página carrega;
  - Exibir feedback visual discreto de carregamento na área da tabela (ex.: indicador *"Carregando pedidos..."* ou redução de opacidade durante a transição), garantindo que os registros da página anterior nunca sejam confundidos com os da nova página.

### Passo 5: Consistência na camada de renderização ([PedidosTable.tsx](file:///c:/Users/PLOTAGEM01/desenhar/controle-pedidos/src/pages/Dashboard/components/PedidosTable.tsx))
- Calcular `pedidosValidos` antes da verificação de lista vazia, evitando que uma página sem registros renderizáveis exiba apenas o cabeçalho vazio sem a mensagem *"Nenhum pedido encontrado."*.

---

## 4. Resumo das Alterações Planejadas

| Arquivo | Mudança | Benefício Direto |
| :--- | :--- | :--- |
| `functions/src/controle-pedidos/utils/filtrosUtils.ts` | Filtrar registros sem `servico`, `statusAtual` ou `prazos` em `filtrarPedidosEmMemoria` (ou via opção do Dashboard) | Garante `totalPages` exato sem páginas extras vazias |
| `controle-pedidos/src/pages/Dashboard/Dashboard.tsx` | Remover `lastEntregas`/`lastIds`/`lastResponsaveis`; paginação imediata com `requestIdRef` e exibição de `loading` | Evita buscas duplicadas e garante que a troca de página mostre exatamente os dados da nova página |
| `controle-pedidos/src/pages/Dashboard/components/PedidosTable.tsx` | Validar `pedidosValidos.length` antes de renderizar a tabela | Evita cabeçalho vazio sem mensagem ao usuário |
