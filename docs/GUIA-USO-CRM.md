# Guia de Uso do CRM

## 1. Acesso

Abra o CRM pelo endereço publicado pela empresa.

Entre com sua conta Google autorizada. O acesso depende de:

- conta cadastrada no Firebase Authentication;
- usuário ativo na coleção `usuarios`;
- acesso habilitado no CRM;
- perfil atribuído por um administrador.

Se a sessão expirar, entre novamente. O CRM encerra automaticamente sessões inválidas.

## 2. Perfis de acesso e permissões

O CRM possui 5 perfis de acesso ativos. O antigo perfil de *Orçamentista* foi descontinuado e completamente removido do fluxo.

### Matriz de Permissões por Perfil

| Funcionalidade / Ação | Consulta (`leitura`) | Recepção (`recepcao`) | Vendedor (`vendedor`) | Coordenação (`coordenacao`) | Administrador (`admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Consultar clientes, empresas e carteira** | Sim | Sim | Sim | Sim | Sim |
| **Cadastrar clientes e empresas** | Não | Sim | Sim | Sim | Sim |
| **Editar clientes e empresas** | Não | Sim | Sim | Sim | Sim |
| **Excluir clientes e empresas (sem vínculos)** | Não | Não | Não | Não | Sim |
| **Criar novas oportunidades** | Não | Sim | Sim | Sim | Sim |
| **Editar qualquer oportunidade da equipe** | Não | Não | Não | Sim | Sim |
| **Editar oportunidades próprias / sem vendedor** | Não | Sim | Sim | Sim | Sim |
| **Distribuir / atribuir vendedor responsável** | Não | Sim | Não | Sim | Sim |
| **Registrar envio de proposta e follow-ups** | Não | Não | Sim | Sim | Sim |
| **Solicitar apoio à negociação** | Não | Não | Sim | Sim | Sim |
| **Receber tarefa de apoio na agenda ("Meu Dia")** | Não | Não | Sim | Sim | Sim |
| **Concluir oportunidade (ganha/perdida)** | Não | Não | Sim | Sim | Sim |
| **Excluir oportunidades** | Não | **Sim** | **Sim** | **Sim** | **Sim** |
| **Acessar relatórios de conversão e CSV** | Não | Não | Não | Não | Sim |
| **Acessar configurações e gerenciar acessos** | Não | Não | Não | Não | Sim |

---

### Detalhamento dos Perfis

### Consulta (`leitura`)
Perfil de visualização somente leitura. Pode pesquisar e consultar clientes, empresas, oportunidades e histórico de ações, sem permissão para criar, alterar, mover etapas ou excluir qualquer informação.

### Recepção (`recepcao`)
Perfil voltado à triagem inicial e cadastro de entrada de leads.
- Pode cadastrar clientes e empresas (padronizados automaticamente em caixa alta).
- Pode criar oportunidades e mantê-las em *Lead qualificado* aguardando distribuição, ou já atribuir a um vendedor.
- Pode editar dados cadastrais de oportunidades que criou enquanto não houver vendedor responsável.
- **Pode excluir oportunidades** quando necessário.
- Não conduz acompanhamentos comerciais nem encerramento de propostas enviadas.

### Vendedor (`vendedor`)
Perfil operacional de vendas e condução comercial.
- Pode cadastrar clientes, empresas e novas oportunidades.
- Pode editar todos os dados, valores e notas das oportunidades sob sua titularidade.
- Conduz o ciclo de propostas enviadas e acompanhamentos automáticos (D+1, D+2, D+3 e D+7 úteis).
- Agenda próximos follow-ups manuais e registra retornos de contatos.
- Na aba **Negociação**, pode registrar objeções e solicitar apoio de coordenadores, administradores ou colegas vendedores.
- Pode ser designado para prestar apoio à negociação, recebendo a tarefa destacada em seu "Meu Dia".
- Registra o fechamento comercial (Conquistado, Perdido com motivo ou Desistência).
- **Pode excluir oportunidades**.

### Coordenação (`coordenacao`)
Perfil de supervisão e apoio à equipe comercial.
- Possui visão ampla e pode editar qualquer oportunidade da equipe.
- Pode redistribuir vendedores responsáveis a qualquer momento.
- Atua diretamente nas solicitações de **Apoio à Negociação** encaminhadas pelos vendedores, visualizando o histórico e objeções em sua agenda.
- Pode reabrir oportunidades concluídas ou arquivadas.
- **Pode excluir oportunidades**.
- Não tem acesso às telas restritas de parametrização geral do sistema nem ao módulo de relatórios executivos.

### Administrador (`admin`)
Acesso irrestrito a todas as rotinas e parametrizações do CRM:
- Opera e edita qualquer oportunidade, cliente e empresa da base.
- **Pode excluir oportunidades** de qualquer usuário.
- Pode excluir clientes e empresas que não possuam vínculos comerciais (cadastros com vínculos são inativados com segurança).
- Acesso exclusivo à página de **Relatórios** e exportação consolidada em CSV.
- Acesso exclusivo à página de **Configurações Administrativas**:
  - gerenciamento de perfis e habilitação/desabilitação de contas;
  - canais de entrada e grupos de serviços;
  - cadastro de feriados para o cálculo de dias úteis.
- Um administrador não altera o próprio perfil para evitar perda acidental de acesso gestor.

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
2. Informe o nome (o CRM padroniza e salva o nome automaticamente em **CAIXA ALTA**).
3. Informe telefone ou e-mail. Pelo menos um contato é obrigatório.
4. Opcionalmente, vincule uma empresa.
5. Salve o cadastro.

Administradores podem excluir clientes sem oportunidades vinculadas. Clientes
com oportunidades são inativados automaticamente para preservar o histórico comercial.

## 5. Cadastrar empresa

1. Acesse **Empresas**.
2. Clique em **Nova empresa**.
3. Informe a razão social ou nome fantasia (padronizado e salvo automaticamente em **CAIXA ALTA**).
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

## 6.1 Número da proposta

Quando uma proposta for criada no ERP, informe no CRM o identificador exibido
no ERP no campo **Número da proposta** da oportunidade. Esse número é preenchido
manualmente e pode conter zeros à esquerda, prefixos ou outros caracteres.

O número pode ser incluído ao registrar o envio da proposta ou posteriormente na
aba **Dados** da oportunidade. Para corrigir o valor, abra a oportunidade, altere
o campo e clique em **Salvar dados**. A alteração fica registrada no histórico.

O CRM não gera esse número nem o consulta automaticamente no ERP. Usuários sem
permissão de edição podem visualizar o número, mas não podem alterá-lo.

## 7. Trabalhar no Kanban

Os cartões podem ser arrastados entre as colunas permitidas.

### Elaboração de proposta

Use quando a demanda estiver sendo preparada.

### Proposta enviada

Registre o envio pelo formulário da oportunidade. Informe a data de envio e, opcionalmente, o número da proposta gerado no ERP. O CRM criará automaticamente 4 follow-ups:

- **D+1 útil**;
- **D+2 úteis**;
- **D+3 úteis**;
- **D+7 úteis** (marcado como follow-up final do ciclo).

### Em negociação e Solicitação de Apoio

Mover para negociação:

- cancela os acompanhamentos automáticos pendentes da proposta;
- marca que houve resposta do cliente;
- não exige uma próxima data automática (o vendedor pode agendar manualmente).

**Solicitar Apoio na Negociação:**
Na aba **Negociação**, o vendedor pode registrar a objeção do cliente e selecionar um profissional para auxiliá-lo (administrador, coordenador ou colega vendedor), definindo a data do retorno.
- Uma tarefa de acompanhamento com a tag visual **Apoio à Negociação** é gerada na agenda ("Meu Dia") do usuário solicitado.
- O usuário solicitado vê a objeção, o vendedor responsável e a oportunidade diretamente em suas pendências do dia, sendo contabilizada nas suas metas diárias.

### Conclusão

Arrastar para **Conclusão** abre a oportunidade para preenchimento do resultado. Use o formulário **Concluir oportunidade**.

Resultados disponíveis:

- Conquistado;
- Perdido;
- Desistência.

Ao marcar como perdido, informe o motivo. Para o motivo **Outro**, a observação é obrigatória.

### Exclusão de Oportunidades

Todas as roles operacionais e administrativas (**Administrador**, **Coordenação**, **Vendedor** e **Recepção**) têm permissão para excluir oportunidades.
- A exclusão pode ser realizada clicando no botão **Excluir oportunidade** dentro da janela de detalhes.
- O sistema exibe um aviso de confirmação antes de remover definitivamente a oportunidade, suas tarefas e seu histórico de auditoria.

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

### Arquivamento e retomada

Quando os acompanhamentos automáticos da proposta forem concluídos sem resposta,
a oportunidade fica com arquivamento previsto para **3 dias corridos após o
último follow-up final**. Se nenhuma resposta for registrada até essa data, o
CRM altera a situação para **Em espera** e cria uma tarefa de **Retomada**.

A retomada é agendada para **15 dias corridos após a data do último follow-up
realizado**, e não a partir do dia em que o arquivamento automático foi executado.
Por exemplo: se o último follow-up ocorreu em 10/09, a retomada será marcada para
25/09; o arquivamento ocorre a partir de 13/09.

Oportunidades **Em espera** não aparecem no Kanban, para não misturar o fluxo
ativo com a carteira parada. Elas continuam disponíveis na visualização **Lista**
e podem ser abertas para consultar o histórico ou tratar a retomada.

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
- perfil de cada usuário;
- habilitação de acesso ao CRM.

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
