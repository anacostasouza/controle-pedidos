# Desenhar CRM — aplicação independente

O CRM é o terceiro frontend do repositório. **Não é uma página do Atendimento ou do Controle de Pedidos.** Possui login, navegação, endereço de publicação e API próprios. Reutiliza o projeto Firebase, as contas Google, a coleção `usuarios`, os padrões React/TypeScript, Node/Express e os middlewares do sistema fornecido.

## Entrega

- `crm/`: aplicação React + TypeScript + Vite independente.
- `functions/src/crm/`: regras comerciais, API HTTP e rotina agendada de arquivamento.
- `functions/src/index.ts`: exportação adicional de `crmApi` e `crmArchiveDaily`.
- `firebase.crm.json`: configuração de publicação e emuladores do CRM.
- `firestore.crm.rules`: regras locais para testar o CRM, preservando as coleções declaradas no arquivo de regras fornecido.
- `docs/plano-criacao-crm.md`: plano funcional alinhado e ajustes de integração.
- `docs/VALIDACAO-CRM.md`: resultados e limites da verificação.

Os dois frontends existentes foram preservados. Não é necessário publicá-los para usar o CRM. O backend continua na pasta compartilhada `functions`, com publicação seletiva das duas funções novas.

## Bases compartilhadas e novas

| Base | Uso |
| --- | --- |
| Firebase Authentication | Contas Google já existentes |
| `usuarios` | Nome, UID, setor e situação da conta; consulta sem criar outro cadastro de pessoas da equipe |
| `servicosStatus` | Importação opcional dos grupos existentes, pela tela Configurações; sem alterar a base original |
| `crmAcessos` | Perfil específico no CRM e habilitação; somente backend/operador alteram |
| `crmClientes`, `crmEmpresas` | Cadastros comerciais do CRM e vínculo opcional |
| `crmOportunidades` | Funil, valor em centavos, estrelas e resultado |
| `crmOportunidades/{id}/history` | Histórico de ações e alterações |
| `crmTarefas` | Follow-ups, retomadas, apoio e histórico de reagendamento |
| `crmConfiguracoes/general` | Canais, serviços, feriados e validadores |

O código original consulta clientes por APIs externas do ERP; não contém um cadastro local completo de clientes e empresas a reutilizar. Por isso o CRM mantém seus próprios cadastros, no mesmo Firestore, sem chamadas a Omie/TagPlus. Não há upload, PDF ou integração de envio.

## Requisitos

- Node.js 22 e npm.
- Acesso ao projeto Firebase existente para configuração/publicação.
- Para emuladores de Firestore, Java compatível com a versão do Firebase CLI fixada em `functions/package.json`.
- Nenhuma credencial privada está incluída. Os arquivos de ambiente, conta de serviço e tokens do ZIP original foram excluídos da entrega.

## Instalar e executar

Na raiz `desenhar`:

```sh
cd functions
npm ci
npm run build
cd ../crm
npm install
```

Copie `crm/.env.example` para `crm/.env.local` e preencha a configuração web do mesmo projeto Firebase do sistema existente. O frontend do CRM precisa apenas da configuração pública da aplicação web, nunca de uma conta de serviço.

Para desenvolvimento, mantenha `VITE_FUNCTIONS_TARGET=emulator` e `VITE_USE_FIREBASE_EMULATORS=false`. Assim, somente a API Functions do CRM usa `127.0.0.1:9000`; o login, Firebase Authentication e demais ferramentas continuam usando o projeto real `gestaopedidos-desenhar`.

Use o projeto `demo-crm` apenas para o emulador de Functions, se necessário:

```sh
# Na raiz, em um terminal:
cd functions
npm run serve:crm

# Em outro terminal, dentro de crm:
npm run dev
```

O CRM fica em `http://localhost:5175`. O login continua sendo feito pelo Firebase Authentication real; adicione `localhost` aos domínios autorizados do Firebase Authentication. O comando `serve:crm` inicia somente o emulador de Functions, com credencial local para o Admin SDK acessar o Firestore real.

Para criar a conta de teste no emulador, defina `CRM_PROJECT_ID=demo-crm`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` e `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, depois execute `node functions/scripts/seed-crm-emulator.cjs` a partir da raiz. O script recusa projetos reais.

## Primeiro administrador e perfis

Contas precisam estar cadastradas e ativas em `usuarios`, seguindo as regras de domínio de e-mail do backend existente. Sem um perfil específico, o acesso ao CRM é somente de consulta. O setor legado não concede administração automática porque o frontend original permite ao usuário editar seu setor.

Para habilitar o primeiro administrador, um operador com credencial administrativa do projeto define `CRM_PROJECT_ID` e `CRM_ADMIN_UID` e executa:

```sh
node functions/scripts/grant-crm-admin.cjs
```

O script usa Application Default Credentials e exige que o UID já exista na base compartilhada. Depois, a tela **Configurações** permite atribuir os perfis:

- **Recepção:** cria e distribui oportunidades; altera as que criou e as ainda sem vendedor.
- **Vendedor:** cria oportunidades e edita as que estão sob sua responsabilidade.
- **Orçamentista:** registra a situação de orçamentos atribuídos a ele.
- **Coordenação:** acompanha e altera oportunidades da equipe.
- **Administrador:** configura cadastros auxiliares, acessos e validadores, além de operar oportunidades.
- **Consulta:** consulta a carteira compartilhada.

Todos os perfis habilitados podem consultar oportunidades de outros vendedores. Validadores são selecionados nominalmente nas configurações. A aprovação é informativa e não bloqueia envio, etapas ou tarefas.

## Regras implementadas

- Recepção cadastra cliente e oportunidade com nome, telefone ou e-mail; data de criação vem do servidor.
- Cliente pode estar vinculado a uma empresa. Cadastros podem ser editados e inativados; não há exclusão destrutiva.
- É possível cadastrar uma empresa dentro do formulário do cliente ou da nova oportunidade, sem perder o preenchimento.
- Kanban e lista paginados, busca por trecho de nome/empresa/contato e filtros por vendedor, etapa, situação, canal, serviço e período de criação.
- Valor em reais e avaliação de 1 a 5 estrelas; clicar novamente na estrela selecionada limpa para zero/sem avaliação.
- Proposta registrada como enviada gera D+1, D+3 e D+7 úteis; o calendário exclui finais de semana e feriados configurados.
- Reagendamento manual preserva a tarefa e seu vencimento original. Não é contado como contato.
- Tarefa sem contato registrado permanece atrasada. Não arquiva apenas pelo tempo transcorrido.
- Arquivamento ocorre na execução das 06h do dia que completa 3 dias corridos após o contato final sem resposta, desde que não haja pendências de contato, resposta ou negociação ativa.
- Novo follow-up manual suspende o arquivamento. Sua conclusão sem resposta reinicia os 3 dias.
- Retomada usa D+30 corridos desde o envio. Se a oportunidade arquivar depois, a retomada aparece vencida.
- Negociação exige próxima ação manual e substitui tarefas automáticas pendentes, com histórico.
- Reenvio explícito cria novo ciclo; correção de data altera apenas tarefas automáticas pendentes.
- Perda exige motivo; motivo Outro exige descrição. Conclusão cancela tarefas pendentes.
- Reabertura exige motivo e próximo contato quando já existe proposta enviada.
- “Meu Dia” mostra valor da carteira ativa, conquistas no mês, valor em negociação, contatos realizados e progresso diário.
- Transações, IDs determinísticos e controle de versão evitam duplicações e sobrescrita concorrente.

## Configurar para produção

1. Configure `crm/.env.local` com o projeto real, `VITE_FUNCTIONS_TARGET=production` e `VITE_USE_FIREBASE_EMULATORS=false`.
2. Cadastre o domínio próprio do CRM entre os domínios autorizados do Firebase Authentication.
3. Na configuração do backend, acrescente os endereços do CRM a `ALLOWED_ORIGINS_PRODUCTION`, **preservando os endereços dos sistemas existentes**. A lista configurada substitui a lista padrão. Exemplo de valores: `https://gestaopedidos-desenhar.web.app,https://gestaopedidos-desenhar.firebaseapp.com,https://atendimento-desenhardigital.web.app,https://atendimento-desenhardigital.firebaseapp.com,https://SEU-SITE-CRM.web.app,https://SEU-SITE-CRM.firebaseapp.com`.
4. Crie um site Firebase Hosting específico para o CRM e associe o target `crm`:

```sh
npx firebase-tools@15.11.0 target:apply hosting crm SEU-SITE-CRM --project SEU-PROJETO
```

5. Confirme que as coleções `crm*` não permitem acesso direto pelo navegador nas regras Firestore publicadas. A API usa Admin SDK e faz toda autorização. O arquivo original fornecido já usa negação por ausência de regra para coleções novas. Se o projeto real possuir uma regra global permissiva, ela precisa ser restringida; um bloco `allow ...: if false` não sobrepõe outra permissão.
6. O arquivo `firestore.crm.rules` serve ao ambiente local e à revisão das regras. **Não substitua regras de produção sem compará-las com as regras efetivamente publicadas**, pois o ZIP pode não refletir alterações feitas no console.
7. Configure o primeiro administrador, perfis, canais, serviços, feriados e, quando definido, o responsável pela validação.
8. Compile e publique somente o CRM:

```sh
cd crm
npm run build
cd ..
npx firebase-tools@15.11.0 deploy --only functions:crmApi,functions:crmArchiveDaily,hosting:crm --config firebase.crm.json --project SEU-PROJETO
```

O agendamento requer os serviços e o faturamento correspondentes habilitados no projeto. A execução diária verifica novamente as condições dentro de transação e tenta novamente em caso de falha.

## Testes

```sh
cd functions
npm run build
npm test -- src/crm --runInBand
cd ../crm
npm run build
```

Os testes da API usam um adaptador transacional em memória e não acessam produção. Para validar o serviço real, execute também o fluxo no Emulator Suite e depois em homologação. O relatório de validação distingue esses níveis.

O teste de navegador está em `crm/tests/browser-smoke.cjs`. Execute `npm run test:browser` com o frontend compilado e servido em `http://127.0.0.1:5175`, usando configuração local `demo-crm` e emuladores habilitados no build. O teste intercepta autenticação e API com dados sintéticos, sem exigir serviços reais. Instale o navegador com `npx playwright install chromium`; alternativamente, defina `CRM_BROWSER_CHANNEL=chrome` para usar uma instalação local do Chrome. As imagens de exemplo são geradas em `docs/screenshots`.

## Limites e decisões operacionais

- A quantidade de usuários continua livre. Os perfis CRM são configurados após o primeiro acesso administrativo.
- O calendário inicial não presume feriados nacionais/estaduais/municipais. Cadastre os aplicáveis antes de operar.
- Busca e indicadores fazem leitura paginada no servidor e filtragem em memória, sem corte silencioso de resultados. Isso prioriza correção na primeira versão, mas o custo de leitura cresce com a base. Antes de grande volume, substituir por índices de busca e agregações persistidas.
- O Kanban exibe a página selecionada (até 30 oportunidades), com a contagem total e paginação explícitas.
- Cada oportunidade suporta até 350 tarefas no histórico transacional; ao atingir o limite, a API informa a necessidade de suporte. Antes de operação de longo prazo com centenas de reenvios por oportunidade, migrar o histórico de tarefas encerradas para consulta separada.
- Os valores de conquistas por vendedor seguem o responsável atual da oportunidade. Transferências de oportunidades concluídas exigem reabertura.
- A revisão visual e os testes não substituem uma homologação com as credenciais, regras e dados reais, que não foram acessados durante esta entrega.
