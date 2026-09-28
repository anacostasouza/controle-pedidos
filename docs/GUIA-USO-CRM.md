# Guia de Uso do CRM

## 1. Acesso

Abra o CRM pelo endereço publicado pela empresa.

Entre com sua conta Google autorizada. O acesso depende de:

- conta cadastrada no Firebase Authentication;
- usuário ativo na coleção `usuarios`;
- acesso habilitado no CRM;
- perfil atribuído por um administrador.

Se a sessão expirar, entre novamente. O CRM encerra automaticamente sessões inválidas.

## 2. Perfis de acesso

### Consulta

Pode consultar clientes, empresas e oportunidades. Não pode criar ou editar registros.

### Recepção

Pode:

- cadastrar clientes;
- cadastrar empresas;
- criar oportunidades;
- distribuir oportunidades para vendedores;
- editar cadastros e oportunidades sob sua responsabilidade.

### Vendedor

Pode:

- criar oportunidades;
- editar oportunidades sob sua responsabilidade;
- acompanhar tarefas;
- registrar contatos;
- reagendar follow-ups;
- conduzir negociações e conclusões.

### Orçamentista

Pode atualizar o andamento de orçamentos atribuídos a ele.

### Coordenação

Pode acompanhar e alterar oportunidades da equipe, além de atuar em solicitações de apoio.

### Administrador

Pode operar o CRM e administrar:

- perfis de usuários;
- habilitação de contas;
- canais de entrada;
- grupos de serviços;
- feriados;
- validadores de propostas complexas;
- relatórios da carteira.

Um administrador não altera o próprio perfil pela tela de configurações.

Administradores também podem excluir clientes e empresas sem vínculos. Cadastros
com vínculos são inativados automaticamente para preservar o histórico comercial.

## 3. Menu principal

### Meu Dia

Mostra:

- valor da carteira ativa;
- oportunidades em negociação;
- conquistas do mês;
- contatos do dia;
- tarefas atrasadas, de hoje, próximas, retomadas, reagendadas e concluídas.

Use a carteira do vendedor e o campo de busca para localizar atividades específicas.

### Oportunidades

Exibe a carteira em:

- Kanban;
- Lista.

É possível filtrar por:

- vendedor responsável;
- oportunidades sem responsável;
- situação;
- etapa;
- canal;
- grupo de serviços;
- data de criação;
- nome do cliente, empresa ou contato.

## 4. Cadastrar cliente

1. Acesse **Clientes** ou clique em **Nova oportunidade**.
2. Informe o nome.
3. Informe telefone ou e-mail. Pelo menos um contato é obrigatório.
4. Opcionalmente, vincule uma empresa.
5. Salve o cadastro.

Administradores podem excluir clientes sem oportunidades vinculadas. Clientes
com oportunidades são inativados automaticamente para preservar o histórico comercial.

## 5. Cadastrar empresa

1. Acesse **Empresas**.
2. Clique em **Nova empresa**.
3. Informe o nome.
4. Informe o CNPJ com 14 dígitos. A máscara é aceita, por exemplo:

   `12.345.678/0001-90`

5. Marque ou desmarque **Ativo**.
6. Clique em **Salvar cadastro**.

O CNPJ é armazenado normalizado, apenas com números. Uma empresa pode ter vários clientes vinculados.
Administradores podem excluir empresas sem clientes vinculados. Empresas com
clientes são inativadas automaticamente para preservar os vínculos existentes.

## 6. Criar oportunidade

1. Acesse **Meu Dia** ou **Oportunidades**.
2. Clique em **Nova oportunidade**.
3. Selecione um cliente existente ou cadastre um novo.
4. Vincule uma empresa, quando aplicável.
5. Informe telefone ou e-mail quando cadastrar um novo cliente.
6. Escolha o vendedor responsável ou deixe aguardando distribuição.
7. Informe o canal de entrada e anotações.
8. Salve.

A oportunidade começa na etapa **Lead qualificado**.

## 7. Trabalhar no Kanban

Os cartões podem ser arrastados entre as colunas permitidas.

### Elaboração de proposta

Use quando a demanda estiver sendo preparada.

### Proposta enviada

Registre o envio pelo formulário da oportunidade. Informe a data de envio. O CRM criará automaticamente:

- D+1 útil;
- D+3 úteis;
- D+7 úteis.

### Em negociação

Mover para negociação:

- cancela os acompanhamentos automáticos pendentes;
- marca que houve resposta do cliente;
- não exige uma próxima data automática.

Se necessário, o vendedor pode agendar manualmente um próximo follow-up.

### Conclusão

Arrastar para **Conclusão** abre a oportunidade para preenchimento do resultado. Use o formulário **Concluir oportunidade**.

Resultados disponíveis:

- Conquistado;
- Perdido;
- Desistência.

Ao marcar como perdido, informe o motivo. Para o motivo **Outro**, a observação é obrigatória.

## 8. Follow-ups

### Agendar próximo follow-up

1. Abra a oportunidade.
2. Acesse **Acompanhamentos**.
3. Clique em **Agendar próximo follow-up**.
4. Informe a data e a próxima ação.
5. Salve uma única vez e aguarde a confirmação **Agendamento concluído**.

Ao criar um novo follow-up manual, os follow-ups comerciais pendentes anteriores são cancelados para evitar duplicidade.

### Excluir agendamento

Agendamentos manuais pendentes podem ser excluídos pelo botão **Excluir agendamento**. O sistema pede confirmação e preserva o histórico como cancelado.

### Registrar contato

Informe:

- resultado do contato;
- data em que o contato ocorreu;
- anotações;
- próxima data, quando o resultado for negociação.

Registrar um contato sem resposta mantém o histórico e pode iniciar as regras de arquivamento.

## 9. Reagendar

Use **Reagendar** em uma tarefa pendente.

Informe:

- nova data;
- justificativa.

O vencimento original é preservado no histórico. Reagendar não cria uma segunda tarefa.

## 10. Relatórios

A página **Relatórios** é exclusiva para Administradores.

Filtros disponíveis:

- período de criação;
- responsável;
- situação;
- etapa.

O relatório apresenta:

- quantidade de oportunidades;
- valor total da carteira;
- valor conquistado;
- tabela detalhada.

Use **Baixar CSV** para exportar os resultados filtrados.

## 11. Configurações administrativas

Administradores podem configurar:

- canais de entrada;
- grupos de serviços;
- feriados no formato `AAAA-MM-DD`;
- validadores de propostas complexas;
- perfil de cada usuário;
- habilitação de acesso ao CRM.

A aprovação de propostas complexas é informativa e não bloqueia o avanço da oportunidade.

## 12. Boas práticas

- Salve uma ação apenas uma vez e aguarde a mensagem de confirmação.
- Evite abrir várias abas da mesma oportunidade para editar simultaneamente.
- Registre contatos na data em que realmente ocorreram.
- Use justificativas claras ao reagendar.
- Não deixe tarefas vencidas sem registro.
- Atualize a página se aparecer uma mensagem de conflito de versão.
- Para problemas de acesso, procure um Administrador do CRM.

## 13. Situações comuns

### Não consigo criar clientes ou oportunidades

Seu perfil provavelmente é **Consulta**. Solicite a um Administrador o perfil de Recepção ou Vendedor.

### Aparece “Cadastro alterado por outro usuário”

Outro usuário atualizou o registro. Feche a janela, abra novamente e repita a alteração.

### O login não carrega

Confirme se:

- sua conta Google está autorizada;
- `localhost` está autorizado durante o desenvolvimento;
- sua conta está cadastrada e ativa;
- o CRM está habilitado para seu usuário.

### Não vejo Relatórios ou Configurações

Essas páginas são disponibilizadas somente para Administradores.
