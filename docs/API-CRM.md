# API CRM

Base: função `crmApi`, região `southamerica-east1`. Todas as chamadas exigem `Authorization: Bearer <Firebase ID token>` e usuário cadastrado/ativo. As permissões CRM são verificadas no servidor.

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/bootstrap` | Usuário atual, equipe e configurações |
| GET | `/clients`, `/companies` | Cadastros paginados; `q`, `active`, `offset`, `limit` |
| PUT | `/clients/:id`, `/companies/:id` | Criar/editar/inativar cadastro; edição exige `updatedAt` recebido anteriormente |
| GET | `/opportunities` | Lista paginada e filtros |
| POST | `/opportunities` | Criar oportunidade com `id` estável da requisição e `clientId` |
| GET | `/opportunities/:id` | Dados, tarefas e últimos 40 registros de histórico |
| GET | `/opportunities/:id/history` | Histórico com paginação por `cursor` |
| POST | `/opportunities/:id/actions` | Executar regra comercial com `action` e `version` |
| GET | `/day?ownerId=UID` | Indicadores e tarefas da carteira selecionada |
| PUT | `/settings` | Configurar canais, grupos, feriados e validadores |
| POST | `/settings/import-services` | Acrescentar grupos de `servicosStatus` |
| PUT | `/access/:uid` | Definir perfil específico e habilitação no CRM |

## Comandos de oportunidade

Todos exigem `version` correspondente ao registro consultado. A versão desatualizada retorna 409 e nenhuma alteração é gravada. Datas são strings `YYYY-MM-DD`, tratadas no calendário de São Paulo; instantes de auditoria são ISO UTC.

| action | Campos específicos |
| --- | --- |
| `edit` | `ownerId`, `channel`, `serviceGroup`, `notes`, `valueCents`, `rating`, `complexity`, `estimatorId`, `budgetStatus` |
| `budget` | `budgetStatus` |
| `approve` | `approval`, `notes` opcionais; usuário precisa ser validador configurado |
| `stage` | `stage`; `nextDate` obrigatório para Em negociação |
| `send` | `sentDate`; `newCycle: true` obrigatório para reenvio |
| `correctSentDate` | `sentDate` |
| `reschedule` | `taskId`, `dueDate`, `reason` |
| `next` | `dueDate`, `notes` opcionais |
| `contact` | `taskId`, `result`, `contactDate`, `notes`; `nextDate` para Em negociação |
| `objection` | `objection`; `coordinatorId` e `dueDate` para solicitar apoio |
| `close` | `outcome`, `lossReason` para perda, `closingNotes` obrigatório se motivo Outro |
| `reopen` | `reason`, `dueDate` se já houve envio de proposta |

Respostas de erro usam `{ "message": "Descrição em português" }`. O frontend não toma decisões de autorização com base apenas no estado visual: todas as escritas são validadas novamente pela API.

## Concorrência e repetição

- IDs de oportunidades são gerados antes do envio, permitindo repetir a criação após perda de resposta sem duplicar o registro.
- IDs das tarefas automáticas combinam oportunidade, ciclo e marco.
- Alterações de oportunidade, tarefas e histórico são gravadas na mesma transação.
- A rotina agendada relê tarefas e oportunidade dentro da transação antes de arquivar.
- Repetir `send` sem indicar novo ciclo é recusado. Repetir comando de tarefa com versão antiga retorna conflito.

## Índices e escala

As consultas usam filtros de igualdade e ordenação por ID; não dependem de novos índices compostos para iniciar. Os filtros textuais/combinações são aplicados no servidor depois de percorrer os registros em páginas. A resposta ao navegador é paginada. Essa implementação evita resultados incompletos, mas requer evolução para agregações/índice de busca se o volume de dados crescer significativamente.
