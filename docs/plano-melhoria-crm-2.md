# Plano de melhoria do CRM 2

## Objetivo

Registrar no CRM o número da proposta gerado manualmente pelo ERP, mantendo o
valor editável enquanto a oportunidade puder ser alterada. O CRM não deve gerar,
validar ou substituir o número do ERP automaticamente.

## Escopo funcional

- Adicionar o campo **Número da proposta** à oportunidade.
- Permitir informar o número ao salvar os dados da oportunidade e no fluxo de
	registro da proposta enviada, quando aplicável.
- Permitir corrigir ou atualizar o número posteriormente por usuários que já
	podem editar a oportunidade.
- Exibir o número salvo na tela de detalhes da oportunidade.
- Preservar oportunidades existentes sem número preenchido.
- Atualizar o guia de uso com o procedimento e as regras de edição.

## Plano de implementação

### Fase 1 — Modelo e contrato

- [x] Adicionar `proposalNumber: string` ao tipo `Opportunity`, aceitando string
	vazia para registros legados.
- [x] Inicializar o campo vazio em `newOpportunity`.
- [x] Validar o campo no backend com `text`, removendo espaços nas extremidades
	e limitando o tamanho a 100 caracteres.
- [x] Não converter o valor para número, pois o ERP pode usar zeros à esquerda,
	prefixos ou outros caracteres do identificador.
- [x] Não exigir unicidade nesta etapa; a fonte oficial do número é o ERP e a
	necessidade de impedir duplicidades deve ser confirmada antes de criar índice.

### Fase 2 — Formulários e visualização

- [x] Adicionar **Número da proposta** à aba **Dados** de
	`crm/src/OpportunityDetail.tsx`.
- [x] Enviar o valor junto da ação `edit`, respeitando o controle de versão
	existente.
- [x] Adicionar o campo ao formulário de envio da proposta, caso o número seja
	informado nesse momento; o campo deve continuar editável depois.
- [x] Exibir o número no resumo/detalhes da oportunidade, com indicação clara
	quando ainda não estiver informado.
- [x] Manter o campo bloqueado para perfis sem permissão de edição e para
	oportunidades em estado não editável, seguindo o comportamento atual.

### Fase 3 — Testes e compatibilidade

- [x] Testar criação de oportunidade com o campo vazio.
- [x] Testar gravação de um número manual, incluindo zeros à esquerda.
- [x] Testar alteração posterior do número por usuário autorizado.
- [x] Testar rejeição de valor que exceda o limite definido.
- [x] Testar que espaços externos são removidos e que o histórico registra a
	mudança como edição de dados.
- [x] Testar que usuários sem permissão continuam impedidos de alterar o campo.
- [x] Testar leitura de documentos antigos sem `proposalNumber` sem erro.
- [ ] Executar testes de domínio/API e build do CRM; depois executar os testes
	de navegador dos fluxos de criação, edição e registro de proposta.

### Fase 4 — Documentação e entrega

- [x] Atualizar `docs/GUIA-USO-CRM.md` com o preenchimento inicial, alteração
	posterior e origem do número no ERP.
- [x] Registrar a mudança no histórico da oportunidade por meio da ação de
	edição já existente.
- [ ] Validar a interface em desktop e mobile para evitar que o novo campo
	comprima o formulário.

## Critérios de aceite

1. Um usuário autorizado consegue salvar uma oportunidade sem número de
	 proposta.
2. Um usuário autorizado consegue informar o número manual do ERP e visualizá-lo
	 na oportunidade.
3. O mesmo usuário ou outro perfil autorizado consegue corrigir o número depois,
	 sem criar uma nova oportunidade ou proposta.
4. O valor é tratado como texto e mantém zeros à esquerda e caracteres válidos.
5. Registros antigos continuam carregando normalmente.
6. Usuários sem permissão não conseguem alterar o número pelo frontend nem pela
	 API.
7. O guia de uso descreve a regra de origem e atualização do número.

## Fora do escopo

- Geração automática ou sequencial de números.
- Consulta automática ao ERP.
- Sincronização bidirecional com o ERP.
- Bloqueio de números duplicados sem validação da regra de negócio.
