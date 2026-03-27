# Sistema Integrado Desenhar

Plataforma interna para operar o ciclo completo de atendimento e produção de pedidos da Desenhar, com dois frontends especializados e backend serverless centralizado.

## Objetivo do Sistema

O sistema foi pensado para resolver 4 necessidades operacionais principais:

1. Organizar o atendimento presencial e reduzir tempo de espera percebido.
2. Transformar atendimentos em pedidos rastreáveis com status e responsável.
3. Dar visibilidade de produção e entrega para equipes diferentes (balcão, arte, galpão, gestão).
4. Garantir controle de acesso e auditoria das ações sensíveis.

## Módulos e Papel de Cada Um

1. atendimento
   1. Operação de fila e atendimento.
   2. Histórico, indicadores e relatórios de atendimento.
   3. Gestão de usuários no contexto de atendimento.

2. controle-pedidos
   1. Cadastro, edição e acompanhamento do pedido.
   2. Gestão de prazos, responsáveis e etapas de produção.
   3. Relatórios operacionais e gerenciais.

3. functions
   1. API de domínio (atendimento, pedidos, usuários).
   2. Middleware de autenticação/autorização.
   3. Segurança HTTP, rate limiting e logs de segurança.

## Estrutura do Repositório

```text
desenhar/
├── atendimento/
├── controle-pedidos/
├── functions/
└── README.md
```

## Como as Funcionalidades Foram Pensadas

### 1) Atendimento como entrada do fluxo

Racional:

1. O ponto de contato inicial é o atendimento presencial.
2. A equipe precisava separar fila convencional e preferencial sem perder histórico.
3. O resultado do atendimento precisava ter desfechos claros (finaliza, cancela, vira pedido).

Decisões de produto:

1. Fila com prioridade e mudança de status por etapa.
2. Registro de histórico por atendimento para análise posterior.
3. Ação explícita de conversão para controle de pedidos.

### 2) Pedido como objeto central de operação

Racional:

1. Produção exige rastreabilidade por etapas e responsáveis.
2. A gestão precisa saber gargalos por status, prazo e tipo de serviço.

Decisões de produto:

1. Pedido com histórico de status e datas de atualização.
2. Filtros fortes no dashboard para operação diária.
3. Relatórios com exportação para uso externo (Excel).

### 3) Permissões por contexto de usuário

Racional:

1. Nem todo usuário deve alterar qualquer dado.
2. A desativação de conta precisa refletir imediatamente no acesso.

Decisões de produto:

1. Validação de token em backend para toda rota protegida.
2. Verificação de usuário cadastrado e status da conta no Firestore.
3. Bloqueio com mensagens claras de motivo para o login.

### 4) Segurança e observabilidade embutidas

Racional:

1. O sistema opera dados de cliente e operação interna.
2. Erros de autenticação/autorização precisam ser auditáveis.

Decisões de produto:

1. CORS restritivo por origem conhecida.
2. Rate limiting padrão para mitigar abuso.
3. Eventos de segurança com mascaramento de dados sensíveis.

## Funcionalidades por Módulo

### Atendimento

1. Registro de atendimento direto ou por fila.
2. Priorização convencional/preferencial.
3. Atualização de histórico de atendimento por status.
4. Finalização com desfechos operacionais.
5. Dashboard com filtros de período, tipo e status.
6. Exportação de dados para Excel.
7. Gestão de usuários e ações administrativas.
8. Log de ações relevantes para auditoria interna.

### Controle de Pedidos

1. Criação de pedido com dados de cliente e serviço.
2. Edição de pedido com validação de permissão.
3. Exclusão de pedido com controles administrativos.
4. Busca paginada e filtrada para operação diária.
5. Fluxo de marcação de pedido entregue.
6. Relatórios com filtros avançados e visualização de desempenho.
7. Gestão de usuários com ativação/desativação/exclusão conforme regra.

### Backend Functions

1. Rotas públicas e protegidas separadas por domínio.
2. Middleware de autenticação JWT Firebase.
3. Autorização por cadastro e status da conta.
4. Middleware HTTP com CORS, security headers e rate limiter.
5. Logging estruturado para erros e eventos de segurança.

## Arquitetura Técnica

### Frontend

1. React + TypeScript + Vite.
2. Context API para estado de autenticação e sessão.
3. Services para comunicação com APIs.
4. CSS por página/componente, mantendo padrão visual comum.

### Backend

1. Firebase Functions + Express.
2. Firebase Admin SDK para Auth/Firestore.
3. Organização por domínios (atendimento, controle-pedidos, usuarios).
4. Testes unitários para utilitários e middlewares críticos.

## Configuração de API Centralizada

Cada frontend possui um resolvedor único de endpoint:

1. atendimento/src/config/functionsApi.ts
2. controle-pedidos/src/config/functionsApi.ts

Regra de resolução:

1. Se VITE_FUNCTIONS_TARGET estiver definido:
   1. emulator -> usa Firebase Emulator.
   2. production -> usa Cloud Functions.
2. Se não estiver definido:
   1. em desenvolvimento (DEV) -> emulator.
   2. em build/produção -> cloud.

Variáveis de ambiente recomendadas:

1. VITE_FUNCTIONS_TARGET=emulator ou production
2. VITE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:9000
3. VITE_FIREBASE_PROJECT_ID=gestaopedidos-desenhar

## Segurança (Consolidada)

### Controles implementados

1. Autenticação obrigatória nas rotas protegidas.
2. Validação de token e email permitido.
3. Verificação de usuário cadastrado e conta ativa.
4. CORS com allowlist controlada por ambiente.
5. Security headers padrão.
6. Rate limiting por janela de tempo.

### Logging de segurança

1. Uso de logSecurityEvent para eventos de negação e falha.
2. Mascaramento automático de campos sensíveis:
   1. email
   2. uid/userId
   3. token/authorization/secret/password/apiKey

### Retenção e operação recomendadas

1. Produção: retenção de 180 dias para logs de segurança.
2. Desenvolvimento: retenção de 30 dias.
3. Alertas para picos de:
   1. auth.denied.invalid_token
   2. auth.denied.user_not_registered
   3. auth.denied.authorization_service_unavailable

## Fluxos Críticos de Negócio

### Fluxo A: Atendimento para Pedido

1. Usuário registra/chama atendimento.
2. Atendimento evolui por status.
3. Atendimento pode ser convertido em pedido.
4. Pedido segue ciclo de produção até entrega.

### Fluxo B: Controle de Acesso

1. Usuário autentica via Firebase.
2. Backend valida token e cadastro no Firestore.
3. Se conta desativada, acesso bloqueado e logout.
4. Motivo de bloqueio é exibido na tela de login.

### Fluxo C: Gestão de Usuários

1. Admin lista usuários.
2. Admin cria/edita/ativa/desativa/deleta usuário.
3. Alterações refletem no controle de acesso em tempo real.

## Como Rodar Localmente

Pré-requisitos:

1. Node.js 18+.
2. Firebase CLI.

Instalação:

1. cd atendimento && npm install
2. cd ../controle-pedidos && npm install
3. cd ../functions && npm install

Execução local sugerida:

1. Backend (functions):
   1. cd functions
   2. npm run serve
   3. manter este terminal aberto durante os testes locais
2. Frontend atendimento:
   1. cd atendimento
   2. npm run dev
3. Frontend controle-pedidos:
   1. cd controle-pedidos
   2. npm run dev

## Deploy

Backend:

1. cd functions
2. npm run build
3. npm run deploy

Padronização de CLI para Firebase Functions 7.x:

1. O projeto usa `firebase-tools` local em `functions/package.json`.
2. Execute sempre via scripts npm dentro de `functions` (ex.: `npm run serve`, `npm run deploy`, `npm run logs`).
3. Os scripts de `functions` usam `--config ../firebase.json` para manter o mesmo `source` e portas do emulador em todos os ambientes.
4. Evite usar `firebase` global para não ter diferença de comportamento entre máquinas.

Frontends:

1. Atendimento:
   1. cd atendimento
   2. npm run deploy
2. Controle-pedidos:
   1. cd controle-pedidos
   2. npm run deploy
3. Os scripts de frontend usam `npx firebase-tools@15.11.0 deploy --only hosting` para publicar apenas hosting.

## Diretrizes de Evolução

1. Toda regra de negócio nova deve ser validada no backend.
2. Mudanças de autenticação/autorização exigem teste de regressão.
3. Endpoints de frontend devem continuar consumindo apenas functionsApi centralizado.
4. Eventos críticos devem ter log de segurança e mensagem amigável para usuário.


