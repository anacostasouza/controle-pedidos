# Plano de criação do CRM comercial

## 1. Objetivo

Criar um sistema web para cadastrar clientes e empresas, distribuir oportunidades comerciais, acompanhar a elaboração de propostas e organizar as tarefas diárias de cada vendedor.

O CRM registrará informações comerciais. A elaboração de orçamentos e propostas continuará no ERP já utilizado, sem integração prevista nesta primeira versão.

Este documento é um plano de implementação. As sugestões apresentadas na versão anterior foram incorporadas ao escopo. Somente os itens explicitamente listados como pendentes ao final ainda precisam de definição.

## 2. Escopo da primeira versão

- Login com conta Google.
- Cadastro de clientes e empresas, com vínculo opcional entre eles.
- Criação de oportunidades pela recepção e transferência ao vendedor.
- Funil comercial em Kanban e consulta em lista.
- Registro de valor, anotações e informações da oportunidade.
- Controle de orçamento simples ou complexo.
- Status de aprovação para propostas complexas, sem bloquear a oportunidade.
- Registro da data de envio da proposta.
- Geração automática de tarefas de acompanhamento.
- Reagendamento manual de follow-up pelo vendedor, com histórico.
- Avaliação de fechamento de 0 a 5, apresentada por estrelas.
- Indicadores visuais de carteira e progresso na tela Meu Dia.
- Tela diária do vendedor, com filtros e consulta às oportunidades de outros vendedores.
- Registro de objeções e solicitação de apoio da coordenação.
- Conclusão com resultado comercial e motivo de perda.
- Arquivamento de oportunidades sem resposta e tarefa de retomada.
- Histórico das principais alterações.

### Fora do escopo

- Armazenamento ou envio de arquivos.
- Elaboração de orçamentos.
- Geração de propostas ou PDFs.
- Integrações com ERP, WhatsApp ou e-mail.
- Envio automático de mensagens ao cliente.
- Importação de dados existentes, pois não há base inicial a migrar.

## 3. Cadastros

### 3.1. Clientes

Campos:

| Campo | Regra |
| --- | --- |
| Nome | Obrigatório |
| Empresa | Opcional; vínculo com o cadastro de empresas |
| Telefone | Campo de contato |
| E-mail | Campo de contato |
| Data de criação | Automática |
| Criado por | Usuário responsável pelo cadastro |

Exigir pelo menos um contato, telefone ou e-mail, permitindo à recepção cadastrar inicialmente apenas nome e contato. Não será necessário preencher ambos.

Uma empresa poderá estar vinculada a vários clientes. Na primeira versão, cada cliente terá vínculo opcional com uma empresa.

### 3.2. Empresas

Cadastro independente, acessível também durante o cadastro do cliente.

Campos da primeira versão: nome obrigatório e data de criação automática. CNPJ, razão social e outros dados ficam fora do cadastro inicial.

A página da empresa deverá permitir consultar clientes vinculados e suas oportunidades.

### 3.3. Usuários

- Identificador da conta autenticada.
- Nome, e-mail e foto disponibilizados pelo login Google.
- Perfil de acesso e situação ativo/inativo.
- Quantidade de usuários ainda não definida.

Perfis previstos: recepção, vendedor, orçamentista, coordenação e administrador. Confirmar se orçamentistas operarão diretamente o CRM ou se o vendedor atualizará esse acompanhamento.

Login Google identifica o usuário; a autorização para acessar os dados dependerá de sua habilitação no sistema. A forma de habilitação será definida antes da disponibilização para a equipe.

## 4. Oportunidades

### Campos

| Campo | Finalidade |
| --- | --- |
| Cliente | Vínculo com o cadastro do cliente |
| Empresa | Obtida pelo vínculo do cliente para exibição e filtros |
| Nome e contatos | Exibidos a partir do cadastro do cliente |
| Vendedor responsável | Destinatário da transferência feita pela recepção |
| Canal de entrada | Origem do contato |
| Data de criação | Registrada automaticamente pelo servidor |
| Criado por | Identificação de quem registrou a oportunidade |
| Data de envio da proposta | Referência dos marcos automáticos D+1, D+3, D+7 e D+30 |
| Grupo de serviços | Classificação da demanda |
| Anotações | Registro textual da demanda e da negociação |
| Valor | Valor comercial da oportunidade |
| Probabilidade de fechamento | Avaliação inteira de 0 a 5, exibida em cinco estrelas; 0 significa sem avaliação |
| Complexidade do orçamento | Simples ou complexo |
| Orçamentista responsável | Quando aplicável |
| Situação do orçamento | Controle de elaboração e recebimento |
| Status de aprovação | Controle da proposta complexa |
| Etapa do funil | Posição no Kanban |
| Situação da oportunidade | Ativa, arquivada ou concluída |
| Resultado comercial | Conquistado, perdido ou desistência |
| Motivo de perda | Obrigatório quando o resultado for perdido |
| Observações da conclusão | Detalhes do desfecho |
| Próxima ação | Resumo da tarefa pendente mais próxima |

A criação inicial deverá ser rápida: nome do cliente, pelo menos um contato e data automática. Os demais dados poderão ser complementados. Haverá uma fila de oportunidades ainda sem vendedor até a transferência.

Valor será armazenado em centavos para evitar erros de arredondamento. A moeda será o real brasileiro (BRL).

A avaliação de fechamento permitirá selecionar de 1 a 5 estrelas e limpar a seleção, retornando a 0. Referências: 1 = muito baixa, 2 = baixa, 3 = moderada, 4 = alta e 5 = muito alta. Cinco estrelas não concluem a oportunidade automaticamente. A avaliação não será convertida em percentual ou usada para ponderar o valor da carteira.

## 5. Fluxo operacional

### 5.1. Recepção

1. Receber o contato do cliente.
2. Localizar o cadastro ou cadastrar nome e contato.
3. Vincular uma empresa, quando houver.
4. Criar a oportunidade em Lead qualificado, com data automática.
5. Registrar a demanda e transferir a oportunidade ao vendedor responsável.

A transferência deve preservar o histórico e a identificação da recepção que criou o registro.

### 5.2. Elaboração da proposta

1. O vendedor analisa e complementa a oportunidade.
2. Move a oportunidade para Elaboração de proposta.
3. Classifica o orçamento como simples ou complexo.
4. Para orçamento simples, elabora o documento no ERP e registra as informações no CRM.
5. Para orçamento complexo, registra o encaminhamento ao orçamentista e acompanha a entrega.
6. Registra o recebimento do orçamento e o status de aprovação da proposta complexa.

Situações do orçamento: a elaborar, em elaboração e recebido/concluído.

### 5.3. Aprovação da proposta complexa

Status de aprovação: pendente, aprovada e não aprovada. Para orçamento simples, usar não se aplica.

- A pessoa ou perfil responsável pela validação será definido posteriormente.
- A aprovação é informativa e não bloqueia movimentação, registro de envio ou continuidade da oportunidade.
- Registrar quem alterou o status, quando alterou e eventuais observações.
- A permissão para alterar a aprovação deverá ser configurável quando o responsável for definido.

### 5.4. Envio da proposta

O envio ocorre fora do CRM. O vendedor registra a data de envio, o valor e as anotações pertinentes. Esse registro coloca a oportunidade em Proposta enviada e inicia a agenda de acompanhamento.

Mover o cartão para Proposta enviada deverá solicitar a data, caso ainda não exista. A simples movimentação de cartões não pode criar tarefas duplicadas.

### 5.5. Negociação e objeções

Quando houver negociação, o vendedor move a oportunidade para Em negociação e registra as interações.

Em caso de objeção, registrar seu conteúdo, a ação de tratamento e a necessidade de apoio da coordenação. Gerar uma tarefa interna para a coordenação quando esse apoio for solicitado.

Negociações ativas permanecem abertas e não entram no arquivamento automático por falta de resposta.

## 6. Funil e conclusão

Colunas do Kanban:

1. Lead qualificado.
2. Elaboração de proposta.
3. Proposta enviada.
4. Em negociação.
5. Conclusão.

Ao concluir, exigir um dos resultados:

- Conquistado.
- Perdido.
- Desistência.

Para resultado Perdido, exigir um motivo:

- Especificação.
- Preço.
- Prazo.
- Atraso no envio da proposta.
- Outro, com descrição obrigatória.

Disponibilizar observações complementares na conclusão. A distinção operacional entre perda e desistência deverá ser documentada com a equipe para padronizar os registros.

Arquivamento é uma situação separada da conclusão: não representa automaticamente perda ou desistência. O registro mantém sua etapa e seu histórico, sai da visualização padrão de oportunidades ativas e permanece acessível por filtro.

## 7. Tarefas e prazos automáticos

### 7.1. Referência das datas

D é a data de envio da proposta. Os marcos automáticos abaixo são calculados a partir dela. O vendedor poderá definir uma nova data manualmente para o follow-up. O prazo de arquivamento terá como referência a realização registrada do acompanhamento final, conforme a seção 7.3.

| Marco | Contagem | Ação |
| --- | --- | --- |
| D+1 | 1 dia útil após o envio | Primeiro acompanhamento |
| D+3 | 3 dias úteis após o envio | Segundo acompanhamento |
| D+7 | 7 dias úteis após o envio | Terceiro acompanhamento |
| D+30 | 30 dias corridos após o envio | Retomada, se a oportunidade tiver sido arquivada |

O dia do envio não entra na contagem. Fuso operacional: America/Sao_Paulo. Excluir finais de semana e feriados cadastrados do cálculo de dias úteis. A lista de feriados aplicável ainda precisa ser fornecida.

### 7.2. Registro das tarefas

Cada tarefa terá oportunidade, cliente, responsável, tipo, vencimento, situação e registro do resultado do contato.

Situações: pendente, concluída e cancelada. A indicação de atraso será calculada a partir do vencimento.

Resultados de contato: sem resposta, respondeu, em negociação e encerrado. Anotações complementam o registro. Uma tentativa realizada e registrada sem retorno do cliente conta como acompanhamento realizado; ausência de registro não conta.

O vendedor poderá reagendar uma tarefa pendente ou definir o próximo follow-up após registrar um contato. Registrar data anterior, nova data, autor, momento da alteração e justificativa. A nova data prevalece para aquela tarefa, sem mudar a data de envio nem deslocar silenciosamente os demais marcos. O reagendamento não conclui a tarefa e não cria uma cópia dela.

Sem registro de contato, a tarefa vencida permanece pendente e em atraso. O sistema não poderá concluí-la ou arquivar a oportunidade pela simples passagem do tempo. Se houver reagendamento explícito, preservar o vencimento original e o histórico de atraso, usando a nova data na agenda.

Durante negociação ativa, o vendedor define a próxima ação e sua data. Os marcos automáticos pendentes substituídos por essa ação serão cancelados com registro do motivo, evitando cobranças duplicadas.

### 7.3. Arquivamento e retomada

- Arquivar automaticamente somente 3 dias corridos após o acompanhamento final do ciclo D+7 ter sido realizado e registrado como sem resposta, desde que a oportunidade continue sem resposta e sem negociação ativa.
- Se o acompanhamento D+7 for reagendado, contar os 3 dias da data efetiva de realização registrada, nunca do vencimento original. A data prevista será exibida na oportunidade.
- Se não houver registro do acompanhamento, manter a tarefa em atraso e não iniciar a contagem para arquivamento. Pendências de contato anteriores também devem ser resolvidas antes de arquivar.
- Um novo follow-up manual pendente suspende o arquivamento. Se ele substituir ou estender o acompanhamento final e for concluído sem resposta, reiniciar a contagem de 3 dias a partir desse contato.
- Resposta do cliente, negociação ativa ou conclusão cancelam o arquivamento agendado.
- Manter os dados e o histórico completos.
- Criar uma tarefa de retomada com vencimento em D+30, contado desde o envio da proposta.
- Exibir a tarefa de retomada na agenda do vendedor mesmo com a oportunidade arquivada.
- Permitir reativação manual, preservando o histórico.

Exemplo: acompanhamento final realizado e registrado em uma sexta-feira, sem resposta, torna a oportunidade elegível para arquivamento na segunda-feira seguinte, 3 dias corridos depois. Se o vendedor não registrar o acompanhamento, a tarefa continua atrasada e não há arquivamento automático.

Se o arquivamento ocorrer após D+30 devido a atraso ou reagendamento, a retomada conservará a referência original e aparecerá imediatamente como vencida. Não gerar outra retomada se já existir uma para o mesmo ciclo.

### 7.4. Regras de consistência

- Ao concluir como conquistado, perdido ou desistência, cancelar tarefas comerciais futuras ainda pendentes.
- Ao trocar o vendedor, transferir as tarefas pendentes ao novo responsável e preservar a autoria dos registros anteriores.
- Mudanças de data de envio recalculam apenas os marcos automáticos pendentes, preservando datas manuais e o histórico das tarefas concluídas.
- Reprocessar uma automação não pode duplicar tarefas ou registros de arquivamento.
- Registrar falhas de processamento para permitir nova tentativa.
- Definir antes da implementação como tratar reenvio de proposta, nova versão comercial e datas de envio retroativas.
- Antes de arquivar, verificar novamente os contatos, as tarefas pendentes e a situação atual, evitando arquivamento simultâneo a uma resposta ou reagendamento.

## 8. Telas

### Login

Entrada por conta Google e mensagem de acesso pendente para usuários ainda não habilitados.

### Meu dia

Tela inicial com filtro padrão no vendedor conectado. O topo terá uma saudação e cartões com indicadores que valorizem a carteira e tornem o progresso visível:

| Indicador | Conteúdo e regra |
| --- | --- |
| Minha carteira ativa | Destaque principal com a soma do valor de todas as oportunidades ativas atribuídas ao vendedor e sua quantidade; exclui arquivadas e concluídas |
| Conquistado no mês | Soma do valor das oportunidades conquistadas no mês, conforme data de conclusão |
| Em negociação | Valor e quantidade de oportunidades ativas nessa etapa |
| Contatos realizados hoje | Quantidade de tarefas de contato concluídas com registro no dia; reagendamentos não contam como contato |

O total da carteira inclui cada oportunidade uma única vez, independentemente de quantas tarefas possua. Valores não preenchidos não entram na soma; exibir a quantidade de oportunidades sem valor. O total da carteira é potencial comercial, não receita realizada.

Apresentação visual prevista, com números apenas ilustrativos:

```text
Bom dia, Ana!                          Vendedor: Ana ▾

MINHA CARTEIRA ATIVA       CONQUISTADO NO MÊS       EM NEGOCIAÇÃO
R$ 128.500                R$ 24.000                R$ 46.000
18 oportunidades         4 conquistas             6 oportunidades
2 ainda sem valor

Seu progresso hoje: 6 de 10 acompanhamentos previstos concluídos
[████████████░░░░░░░░] 60%        8 contatos realizados hoje

Atrasadas (3)      Hoje (4)      Retomadas (1)      Concluídas
Cliente / Empresa | Valor | Estrelas | Próxima ação | Registrar contato
                                                   Reagendar
```

A barra mede tarefas previstas para hoje que foram concluídas com contato, divididas pelo total previsto para o dia. Tarefas transferidas para outra data continuam identificadas como reagendadas na contagem diária, sem serem tratadas como concluídas. Contatos de tarefas atrasadas ou antecipadas entram no cartão de contatos realizados hoje, mas não inflam a barra. Se não houver tarefas previstas, mostrar “Nenhum acompanhamento previsto para hoje”, sem percentual.

Usar verde para conquistas e conclusões, azul para carteira e ações, e destaque moderado para atrasos. Ícones e textos acompanharão as cores. Ao concluir um contato, atualizar os indicadores e mostrar uma confirmação curta. Ao concluir a agenda, mostrar “Acompanhamentos de hoje concluídos”. Não haverá ranking de vendedores nesta versão.

Abaixo dos indicadores, organizar:

- Tarefas atrasadas.
- Acompanhamentos que vencem hoje.
- Retomadas previstas para hoje.
- Acesso rápido à oportunidade e ao registro do contato.
- Indicação de cliente, empresa, valor, etapa e próxima ação.
- Avaliação por estrelas e botões Registrar contato e Reagendar.

O usuário poderá selecionar outros vendedores para consultar suas oportunidades e acompanhamentos. Todos os indicadores acompanharão o vendedor selecionado, identificado claramente no título. Filtros da lista de tarefas não alteram silenciosamente o total da carteira. Permissão de consulta não implica automaticamente permissão de edição.

### Oportunidades

Alternância entre Kanban e lista. Filtros por nome do cliente, empresa, vendedor, etapa, situação, canal de entrada, grupo de serviços e datas. Outros filtros poderão ser acrescentados conforme necessidade confirmada.

### Detalhe da oportunidade

Dados do cliente, valor, anotações, orçamento, aprovação, histórico, tarefas, objeções, envio de proposta e conclusão.

### Clientes e empresas

Listagem, busca, cadastro, edição e consulta de oportunidades vinculadas.

### Administração

Habilitação de usuários, perfis, canais de entrada, grupos de serviços e parâmetros de calendário. O responsável por aprovações será configurado quando definido.

## 9. Arquitetura definida

### Frontend

- React com TypeScript.
- Aplicação web responsiva para computador e celular.
- Componentes para formulários, listas, Kanban e agenda diária.
- Validação de formulários e apresentação de erros em português.
- Firebase Authentication para login Google.

### Backend

- Node.js com TypeScript.
- API para operações comerciais e aplicação centralizada das regras.
- Implantação em Cloud Functions for Firebase, com rotinas agendadas para acompanhamento e arquivamento.
- Verificação da identidade autenticada e das permissões a cada operação.
- Uso do Firebase Admin SDK para acesso ao banco pelo backend.

### Persistência e hospedagem

- Cloud Firestore para dados de cadastros, oportunidades, tarefas e histórico.
- Firebase Hosting para hospedar o frontend.
- Nenhum armazenamento de anexos previsto.
- Ambientes separados de desenvolvimento/homologação e produção.

As versões de Node.js, bibliotecas e serviços compatíveis serão verificadas no início da implementação. Custos e configuração do projeto Firebase serão apresentados antes da implantação.

### Fronteira de acesso aos dados

Todas as operações sobre dados comerciais passam pela API. O navegador utiliza diretamente o serviço de autenticação e envia sua credencial para a API.

O banco deve impedir acesso direto não autorizado. Como o backend usa credenciais administrativas, a API é responsável por validar permissões, campos e regras comerciais em cada requisição.

## 10. Modelo de dados

| Coleção | Conteúdo |
| --- | --- |
| users | Usuários habilitados, perfis e situação de acesso |
| companies | Empresas |
| clients | Clientes e vínculo opcional com empresa |
| opportunities | Dados comerciais, responsáveis, etapa, situação e resultado |
| tasks | Acompanhamentos, retomadas e solicitações internas |
| activities | Histórico de alterações e interações por oportunidade |
| settings | Canais, grupos de serviços, calendário e parâmetros |

As oportunidades armazenarão a avaliação inteira de 0 a 5, a data de conclusão e a previsão de arquivamento. As tarefas armazenarão marco de origem, vencimento original, vencimento vigente, origem automática/manual da data, data de realização do contato, data do registro, resultado e histórico de reagendamentos. Esses dados também permitirão calcular os indicadores diários sem contar reagendamento como contato realizado.

Usar identificadores para os vínculos. Campos auxiliares para filtros por cliente e empresa deverão ser atualizados de forma consistente se houver alteração cadastral.

Consultas serão paginadas, com índices compatíveis com os filtros definidos. O comportamento da busca textual — por início do nome ou por trecho — será definido antes de implementar, pois afeta a estratégia de consulta.

Exclusões de clientes ou empresas vinculados a oportunidades devem ser impedidas ou substituídas por inativação, preservando o histórico comercial.

## 11. Acesso, histórico e operação

- Vendedores podem consultar suas oportunidades e as de outros vendedores.
- Definir a matriz de edição: quem pode alterar, transferir, concluir e reabrir oportunidades de terceiros.
- Restringir administração de usuários a responsáveis autorizados.
- Registrar autor, data e alterações relevantes de responsável, etapa, valor, aprovação e conclusão.
- Gerar datas de criação e auditoria no servidor.
- Manter segredos e credenciais fora do código do frontend.
- Prever cópia de segurança, recuperação e monitoramento de falhas antes do uso em produção.

## 12. Etapas de implementação

### Etapa 1 — Fechamento das regras e desenho das telas

Resolver as pendências deste plano, definir permissões e aprovar a organização das telas de Meu dia, Kanban e oportunidade.

### Etapa 2 — Estrutura técnica e autenticação

Preparar React, API Node.js, ambientes Firebase, login Google e controle de usuários habilitados.

### Etapa 3 — Cadastros e entrada comercial

Implementar empresas, clientes, criação pela recepção e transferência de oportunidades.

### Etapa 4 — Funil e processo de proposta

Implementar Kanban, lista, filtros, valor, anotações, orçamento simples/complexo, aprovação informativa e registro de envio.

### Etapa 5 — Agenda e automações

Implementar cálculo dos prazos, geração de tarefas, reagendamento manual, tela Meu Dia com indicadores de carteira e progresso, registro de contatos, arquivamento 3 dias corridos após o acompanhamento final registrado e retomada.

### Etapa 6 — Negociação e desfechos

Implementar objeções, apoio da coordenação, resultados comerciais, motivo obrigatório de perda e histórico completo.

### Etapa 7 — Validação e disponibilização

Validar cenários com a equipe em homologação, revisar permissões, verificar a operação das rotinas e disponibilizar em produção após aprovação do resultado.

## 13. Critérios de aceite

- A recepção cria uma oportunidade com nome e contato, com data automática, e a transfere ao vendedor.
- O cliente pode existir sem empresa ou ser vinculado a uma empresa cadastrada.
- O vendedor consulta e filtra oportunidades próprias e de outros vendedores.
- A oportunidade registra valor e anotações sem exigir arquivos.
- A avaliação usa de 1 a 5 estrelas, permite limpar para 0 e não apresenta percentual.
- A aprovação de proposta complexa é registrada sem bloquear a continuidade.
- O envio da proposta gera tarefas únicas para D+1, D+3 e D+7 em dias úteis.
- A agenda apresenta tarefas de hoje, atrasadas e retomadas do responsável selecionado.
- O vendedor pode definir uma nova data de follow-up, preservando o histórico e sem duplicar tarefas.
- Ausência de registro mantém a tarefa vencida em atraso e impede arquivamento automático.
- O arquivamento ocorre somente 3 dias corridos após o acompanhamento final registrado sem resposta, sem negociação ativa ou follow-up manual pendente.
- A tela Meu Dia mostra o valor da carteira ativa do vendedor selecionado, suas conquistas no mês, negociações e progresso dos contatos.
- Os totais não duplicam oportunidades por tarefa e não tratam valores ausentes como valores comerciais conhecidos.
- A retomada ocorre em D+30 corridos desde o envio, inclusive para oportunidades arquivadas.
- A conclusão como perdido exige motivo, incluindo descrição quando selecionado Outro.
- A conclusão cancela tarefas futuras pendentes e preserva o histórico.
- Reexecuções de automações não geram duplicidade.
- Usuários não habilitados não acessam dados comerciais.

Testes devem cobrir especialmente cálculo de dias úteis e feriados, finais de semana, virada de mês/ano, troca de responsável, alteração de data, conclusão antes do próximo acompanhamento e repetição de automações. Incluir reagendamento do D+7, tarefa sem registro por mais de 3 dias, resposta durante a espera para arquivamento, retomada já vencida, limites da avaliação por estrelas e cálculo dos indicadores. A validação de acesso deve incluir tentativas de alteração sem permissão.

## 14. Decisões pendentes

1. Forma de habilitar usuários que entrarem com Google.
2. Permissões de edição sobre oportunidades de outros vendedores.
3. Participação direta do orçamentista no sistema.
4. Pessoa ou perfil que altera a aprovação de propostas complexas.
5. Lista de feriados aplicável ao calendário de dias úteis.
6. Regras de reenvio da proposta, nova versão comercial, datas retroativas e reabertura.
7. Listas iniciais de canais de entrada e grupos de serviços.
8. Comportamento da busca por nomes e empresas.

Essas definições complementam o escopo já alinhado; não alteram a escolha de React e TypeScript no frontend, Node.js no backend e Firebase para autenticação e persistência.

## 15. Implementação sobre a estrutura Desenhar

Atualização após o recebimento do projeto existente: o CRM é uma **aplicação independente**, na pasta `crm/`, e não uma tela dos sistemas Atendimento ou Controle de Pedidos. Compartilha o projeto Firebase, a autenticação Google, o cadastro `usuarios` e a estrutura Node.js/Express do backend. Tem função de API, rotina agendada, navegação e endereço de hospedagem próprios.

As referências anteriores à ausência de estrutura existente foram superadas pelo fornecimento do projeto Desenhar. As regras comerciais das seções anteriores foram mantidas.

- Clientes do código original são consultados no ERP, sem cadastro local completo. Os cadastros comerciais do CRM são criados em coleções próprias no mesmo banco, sem integração com o ERP.
- Grupos de serviços usam os tipos já presentes no código; a configuração permite acrescentar os registros da coleção `servicosStatus`, sem modificá-la.
- Usuários continuam na base existente. Os perfis específicos do CRM são configurados separadamente, preservando a identidade compartilhada e evitando que alterações de setor concedam acesso administrativo automático.
- A primeira habilitação administrativa é feita pelo operador do projeto. Os demais perfis são definidos pela tela Configurações. Usuários sem perfil específico ficam em consulta.
- A escolha do validador continua configurável. Nenhum validador é presumido e a aprovação não bloqueia o fluxo.
- Feriados, canais e grupos podem ser configurados na interface.
- Busca usa trechos de nome, empresa ou contato. O funil oferece Kanban e lista paginados.
- Reenvio explícito cria novo ciclo de acompanhamento; correção de data preserva tarefas manuais e contatos realizados. Reabertura exige motivo e próxima ação quando houver proposta enviada.
- A rotina verifica arquivamentos diariamente às 06h de São Paulo, quando a data completa os três dias corridos e as condições permanecem válidas.

Detalhes de instalação, decisões de acesso, limites operacionais e validação estão em `README-CRM.md` e `docs/VALIDACAO-CRM.md`.
