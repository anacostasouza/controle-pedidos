# Plano de melhoria do CRM

## Objetivo

Evoluir o CRM sem misturar refatoração estrutural, alteração visual e otimização de dados na mesma entrega. O comportamento comercial validado deve permanecer coberto pelos testes existentes.

## Fase 1 — Organização do frontend

**Status: iniciada nesta entrega**

- [x] Extrair a tela de login para `crm/src/components/auth/LoginScreen.tsx`.
- [x] Extrair a casca autenticada para `crm/src/components/layout/CrmShell.tsx`.
- [x] Extrair o estado de autenticação para `crm/src/hooks/useCrmSession.ts`.
- [x] Separar a navegação em configuração própria, com rótulos, ícones e permissões.
- [ ] Dividir `Workspace.tsx` em `MeuDiaView`, `OportunidadesView`, `OpportunityToolbar` e `OpportunityBoard`.
- [x] Criar organização de entrada por `pages/`, `components/`, `styles/` e `assets/`, preservando a migração incremental dos módulos existentes.
- [x] Tornar `src/styles/crm.css` o stylesheet canônico, removendo o arquivo solto `src/styles.css`.
- [x] Migrar os componentes compartilhados para `src/components/index.tsx`, removendo o módulo solto na raiz de `src`.
- [x] Permitir arrastar oportunidades entre colunas do Kanban usando a ação de etapa existente.
- [x] Extrair o formulário `Nova oportunidade` para `crm/src/components/workspace/NewOpportunity.tsx` como etapa intermediária da divisão.
- [x] Extrair o cabeçalho para `crm/src/components/workspace/WorkspaceHeader.tsx`.
- [x] Extrair a toolbar principal para `crm/src/components/workspace/WorkspaceToolbar.tsx`.
- [ ] Dividir `OpportunityDetail.tsx` em abas e formulários de ação.
- [x] Extrair os formulários de etapa e conclusão para `crm/src/components/opportunity/OpportunityActions.tsx`.
- [x] Manter a administração de perfis e habilitação de outras contas disponível na tela Configurações para administradores.
- [x] Criar fronteira de serviço em `crm/src/services/crmApi.ts`, mantendo componentes sem montagem de URL ou tratamento HTTP.
- [x] Criar contratos próprios do frontend em `crm/src/contracts.ts`, evitando acoplamento direto ao domínio interno das Functions.
- [x] Adicionar CNPJ obrigatório e normalizado ao cadastro de empresas.
- [x] Permitir exclusão administrativa de clientes e empresas sem vínculos, inativando automaticamente registros que possuem vínculos.
- [x] Criar página de relatórios para Administrador com filtros, indicadores e exportação CSV.
- [x] Corrigir globalmente o tamanho dos checkboxes em cadastros, acessos e seletores múltiplos.
- [x] Formatar `Workspace.tsx`, `OpportunityDetail.tsx`, `Settings.tsx` e `Catalogs.tsx` para facilitar a divisão em componentes.

**Critério de conclusão:** build do CRM aprovado e testes de navegador sem regressão nos fluxos existentes.

## Fase 2 — Identidade visual compartilhada

**Status: concluída nesta entrega**

- [x] Usar Comfortaa, já adotada por Atendimento e Controle de Pedidos.
- [x] Restaurar a paleta azul original do CRM mantendo o padrão conceitual compartilhado.
- [x] Padronizar foco, bordas, superfícies e sombra com os sistemas existentes.
- [x] Manter o caráter comercial do CRM sem transformar o layout em uma cópia do dashboard operacional.
- [x] Melhorar a navegação horizontal em telas pequenas.
- [x] Revalidar screenshots desktop/mobile após instalação das dependências do CRM.

## Fase 3 — Segurança e sessão

- [x] Centralizar tratamento de `401` e `403` no cliente de API.
- [x] Encerrar sessão e redirecionar para login quando o Firebase ID token expirar.
- [x] Exibir mensagem específica para conta não habilitada no CRM.
- [x] Cobrir sessão expirada e troca de conta com teste de navegador.
- [x] Cobrir administração de outro acesso e bloquear autoalteração administrativa no teste da API.
- [x] Cancelar follow-ups pendentes anteriores ao agendar um novo follow-up manual.
- [x] Permitir excluir agendamentos manuais pendentes com confirmação.
- [x] Exibir feedback específico de agendamento concluído.
- [x] Manter o cabeçalho da oportunidade visível e permitir fechamento pelo backdrop.

> O smoke test de navegador foi executado com configuração sintética e Auth Emulator explícito: 11 cenários aprovados, zero erros de console e nenhum overflow horizontal global no mobile. O modo dev normal continua usando Auth real.

> A validação de navegador usa `functions/lib/crm/domain`; o build das Functions deve ser executado antes do smoke test para gerar esse artefato.

## Fase 4 — Busca e leitura do backend

**Pré-requisito:** concluir as fases 1 e 3 para reduzir risco de regressão visual e de sessão.

1. Medir volume atual das coleções `crmOportunidades`, `crmClientes`, `crmEmpresas` e `crmTarefas`.
2. Identificar combinações de filtros usadas no CRM e definir consultas prioritárias.
3. Substituir `scan` amplo por consultas Firestore indexadas para:
   - responsável;
   - situação;
   - etapa;
   - canal;
   - grupo de serviço;
   - intervalo de criação.
4. [x] Evitar carregar todos os clientes e empresas para cada página de oportunidades.
5. Definir estratégia de busca textual:
   - campos normalizados para prefixo, ou
   - serviço de busca dedicado quando a busca parcial crescer.
6. Paginar no banco, preservando `total`, `nextOffset` e ordenação estável.
7. Criar índices compostos somente após medir as consultas reais.
8. Adicionar testes de contrato para combinações de filtros e paginação.
9. Medir latência e leituras antes/depois em homologação.

**Critério de conclusão:** nenhuma rota de listagem carrega a coleção inteira para responder uma página filtrada, salvo justificativa documentada.

> Implementado nesta etapa: `/opportunities` e `/day` carregam somente clientes e empresas relacionados às oportunidades encontradas. A consulta principal de oportunidades ainda será migrada para filtros/indexes Firestore após medir as combinações reais.

> Implementado nesta etapa: `/opportunities` aplica filtros de igualdade no Firestore para responsável, situação, etapa, canal e grupo de serviço; se um índice ainda não estiver disponível, registra `[CRM_QUERY_INDEX_FALLBACK]` e preserva a resposta anterior. Os índices prioritários estão em `firestore.crm.indexes.json`.

## Fase 5 — Operação e observabilidade

- [x] Alinhar a configuração pública do Firebase ao projeto usado por Atendimento e Controle de Pedidos.
- [x] Configurar `.env.development.local` do CRM e manter o arquivo fora do versionamento.
- [x] Separar o modo de desenvolvimento: somente Functions usa o emulador; login, Auth e ferramentas Firebase usam produção.
- [x] Executar o CRM em `localhost` no modo dev para compatibilidade com domínios autorizados do Firebase Authentication.
- [x] Criar `npm run serve:crm` para iniciar somente o emulador Functions com acesso administrativo ao Firestore real.
- [x] Registrar latência, quantidade de documentos lidos e filtros usados sem registrar dados sensíveis.
- [x] Alertar quando uma consulta ultrapassar limite de latência ou leitura.
- [x] Verificar índices, CORS, autenticação, regras Firestore e agendamento no projeto real.
- [x] Atualizar `docs/VALIDACAO-CRM.md` com evidências de homologação.

> Índices Firestore publicados com segurança em `firestore.crm.indexes.combined.json`, combinando a lista autoritativa de produção com os índices CRM. Nenhum índice dos sistemas existentes foi removido.

## Ordem de execução

1. Finalizar divisão do frontend e cliente de API.
2. Revalidar build, testes e screenshots.
3. Centralizar sessão e tratar expiração.
4. Medir as consultas atuais em homologação.
5. Otimizar filtros e paginação do backend por evidência.
6. Revalidar custo, latência, testes e publicação.

## Decisões

- Não integrar Omie, TagPlus, WhatsApp ou e-mail nesta etapa.
- Não alterar as coleções dos sistemas Atendimento e Controle de Pedidos.
- Não trocar o layout comercial do CRM por um dashboard genérico.
- Não criar índices ou agregações sem confirmar as combinações de filtros usadas.
