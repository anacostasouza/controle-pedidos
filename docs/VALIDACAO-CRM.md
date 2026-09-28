# Validação da entrega

## Resultado

- Compilação TypeScript do backend completo: aprovada.
- Verificação TypeScript do frontend CRM: aprovada.
- Build de produção do frontend CRM: aprovado.
- Testes novos de regras comerciais e API CRM: **58 aprovados, 0 falhas**.
- Verificação no navegador com dados sintéticos: **10 cenários aprovados**, sem erros de JavaScript na página.
- Inspeção visual das telas Meu Dia (desktop e celular) e Kanban: realizada.
- Revalidação após a reorganização do frontend: **10 cenários aprovados**, sem erros de console e sem rolagem horizontal global no mobile.
- Smoke test atualizado: **11 cenários aprovados**, incluindo CNPJ no cadastro de empresa e encerramento após `401` de sessão, sem erros de console.
- Verificação de produção: CORS do `crmApi` aceitou `https://crm-desenhar.web.app` com status 200 e headers `Authorization, Content-Type`.
- Verificação de produção: `crmApi` e `crmArchiveDaily` publicados em `southamerica-east1`, runtime Node.js 22, 2nd gen.
- Verificação de produção: índices combinados publicados sem remoção dos índices existentes dos outros sistemas.

## Cenários do navegador

1. Login e carregamento do dashboard.
2. Kanban de oportunidades.
3. Cadastro de empresa dentro do formulário de cliente.
4. Criação de cliente e oportunidade.
5. Edição de valor e estrelas.
6. Envio da proposta e criação das tarefas D+1/D+3/D+7.
7. Registro de contato.
8. Reagendamento com justificativa.
9. Conclusão como perda com motivo obrigatório.
10. Layout de celular sem rolagem horizontal da página; tabelas e abas têm rolagem própria.

As capturas em `screenshots/` usam nomes, valores e atividades fictícios para demonstrar a interface. Não são dados reais da empresa.

## Regras verificadas no backend

Calendário útil, feriados, virada de ano, ano bissexto, fuso horário, estrelas, valores inválidos, concorrência por versão, permissões de edição, aprovação não bloqueante, transferência de tarefas, reenvio explícito, perda com motivo, cancelamento ao concluir, tarefas sem registro, reagendamento, arquivamento três dias após contato final, suspensão por nova tarefa, resposta/negociação ativa, preservação de datas manuais e retomada D+30.

A rotina agendada foi exercitada contra o adaptador transacional em memória, inclusive repetição sem duplicar retomadas. A API foi testada por HTTP com Supertest. A implementação de produção utiliza transações Firestore reais, mas elas não foram executadas contra o projeto da empresa nesta entrega.

## Código recebido: testes antigos

A suíte preexistente do backend apresentou **64 testes aprovados e 3 falhas**, anteriores às funcionalidades do CRM. As três falhas pertencem a `functions/src/__tests__/controle-pedidos/utils/filtrosUtils.test.ts`:

- Não aplicar filtro de status duplicado.
- Prioridade de filtro de atrasados sobre outros status.
- Combinação de múltiplos filtros sem duplicatas.

O utilitário de filtros de pedidos e os testes correspondentes não foram modificados. Isso está separado do resultado dos 58 testes novos do CRM.

## Ambiente e limites

- Validação local em Windows, usando dependências presentes no ZIP e o runtime disponível.
- Runtime local de validação: Node.js 24.19.0; o projeto Functions mantém o alvo Node.js 22 do sistema original. Validar também nesse runtime antes de publicar.
- Frontend validado com React 19.1.1, Firebase 11.10.0, TypeScript 5.8.3 e Vite 7.3.3.
- O build local usou o carregador nativo de configuração do Vite (`--configLoader native`) para contornar a limitação de leitura de diretórios do ambiente de execução. O comando de build convencional foi mantido para a instalação normal.
- O navegador utilizou interceptação de HTTP e autenticação sintética. Os testes não comprovam configuração de CORS, domínios Google, permissões Firestore, faturamento ou agendamento no projeto real.
- Não foi feito deploy, acesso ao banco real, importação de clientes externos ou alteração dos sistemas existentes em produção.
- A aprovação para uso operacional deve incluir o Emulator Suite completo e a homologação no projeto de destino, após configurar credenciais, acessos, regras, origens e feriados.
- As coleções CRM permanecem bloqueadas para acesso direto pelo cliente; a API usa Admin SDK para autorização.

## Entrega de código

O pacote contém fontes e documentação. Não inclui `node_modules`, builds locais, histórico Git, credenciais privadas, tokens ou arquivos de ambiente do ZIP original. Preserve as configurações privadas do ambiente existente ao incorporar o código.
