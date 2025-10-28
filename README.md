# Sistema de Gestão Integrada — Desenhar

Sistema completo de gestão de atendimentos e controle de pedidos, desenvolvido com React, TypeScript e Firebase.

---

## Visão Geral

O projeto é composto por 3 módulos principais:

- Atendimento: sistema de fila de atendimento presencial com controle de tempo, prioridades e histórico.
- Controle de Pedidos: gestão de pedidos gráficos com acompanhamento de status, prazos e relatórios.
- Firebase Functions: backend serverless com autenticação, autorização e regras de negócio.

---

## Arquitetura do repositório

Estrutura do repositório (diretórios principais):

```bash
desenhar/
├── atendimento/          # Sistema de Fila de Atendimento
├── controle-pedidos/     # Sistema de Controle de Pedidos
└── functions/            # Firebase Cloud Functions (Backend)
```

---

## Módulo: Sistema de Atendimento

### Funcionalidades principais

- Registro de atendimentos (diretos ou por fila)
  - Sistema de prioridades (normal / preferencial)
  - Controle de tempo de espera e atendimento em tempo real
  - Identificação do consumidor final
  - Múltiplos tipos de atendimento (Impressão, Criação, Edição, etc.)
- Gerenciamento
  - Chamar próximo da fila
  - Finalizar atendimentos com opções:
    - Adicionar ao controle de pedidos
    - Finalizar pedido realizado no momento
    - Cancelar pedido
    - Deletar atendimentos (com justificativa obrigatória)
- Dashboard e relatórios
  - Histórico completo de atendimentos
  - Filtros avançados (data, atendente, status, tipo)
  - Estatísticas em tempo real
  - Exportação para Excel
- Gestão de usuários
  - Log de ações (auditoria)

### Tecnologias

- React 18 + TypeScript
- Firebase (Firestore, Authentication, Functions)
- Vite
- React Router
- Context API

### Estrutura sugerida (atendimento)

```text
atendimento/
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── headerPage.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Atendimento/
│   │   │   ├── FilaAtendimento.tsx
│   │   │   └── components/
│   │   │       ├── FilaAtendimentoItem.tsx
│   │   │       ├── FinalizarOpcoes.tsx
│   │   │       ├── ModalSelecionarCliente.tsx
│   │   │       └── RegistroAtendimento.tsx
│   │   ├── Dashboard/
│   │   ├── Profile/
│   │   ├── Welcome/
│   │   └── Login/
│   ├── services/
│   ├── styles/
│   ├── types/
│   └── utils/
├── .env
└── package.json
```

---

## Módulo: Controle de Pedidos

### Funcionalidades principais

- Cadastro completo de pedidos
- Acompanhamento de status (Em produção, Aguardando, Pronto, Entregue)
- Controle de prazos e entregas
- Upload de arquivos
- Suporte a múltiplos tipos de serviço (Impressão, Banner, Adesivo, etc.)
- Dashboard com tabela paginada, filtros, ordenação e busca
- Relatórios e gráficos interativos (Recharts)
- Exportação para Excel (XLSX)
- Histórico de alterações e edição de pedidos (com justificativa para retrabalho)

### Tecnologias

- React 18 + TypeScript
- Firebase (Firestore, Storage, Functions)
- Recharts
- XLSX
- Vite

### Estrutura sugerida (controle-pedidos)

```text
controle-pedidos/
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── headerPage.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── NovoPedido.tsx
│   │   ├── EditarPedidos/
│   │   └── Relatorios/
│   ├── services/
│   ├── styles/
│   ├── types/
│   └── utils/
├── firestore.rules
└── package.json
```

---

## Firebase Functions (Backend)

### Funcionalidades

- Atendimento
  - buscarAtendimentos
  - buscarHistoricoAtendimentos
  - conversão de Timestamps
  - validação de permissões
- Controle de Pedidos
  - buscarPedidos
  - buscarRelatorios
  - validação de permissões por função
- Autenticação e autorização
  - Middleware JWT / validação de token Firebase
  - controle de permissões por função (admin / atendente / operador)
  - rate limiting e CORS
- Logs de auditoria

### Tecnologias

- Node.js + TypeScript
- Firebase Functions (2nd gen)
- Firebase Admin SDK
- Express.js (middleware)

### Estrutura sugerida (functions)

```text
functions/
├── src/
│   ├── index.ts
│   ├── atendimento/
│   │   ├── funcAtendimento.ts
│   │   └── utils/
│   ├── controle-pedidos/
│   │   ├── funcControlePedidos.ts
│   │   └── utils/
│   └── utils/
│       ├── authMiddleware.ts
│       ├── permissaoUtils.ts
│       └── deepConvertTimestamps.ts
├── lib/
├── .env
└── package.json
```

---

## Segurança

- Autenticação obrigatória em todas as rotas
- Validação de token Firebase
- Rate limiting (ex.: 1000 req/min por IP)
- CORS configurado
- Regras de segurança Firestore
- Logs de auditoria
- Sanitização de inputs

---

## Como executar (local)

Pré-requisitos:

- Node.js 18+
- npm ou yarn
- Conta Firebase configurada
- Git

Passos:

```bash
# Clonar repositório
git clone https://github.com/anacostasouza/controle-pedidos.git
cd desenhar

# Atendimento
cd atendimento
npm install
npm run dev

# Controle de Pedidos
cd ../controle-pedidos
npm install
npm run dev

# Functions (backend)
cd ../functions
npm install
npm run build
# Para deploy das functions:
# firebase deploy --only functions
```

---

## Variáveis de ambiente

Crie arquivos `.env` em cada projeto com as variáveis (exemplo):

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=https://us-central1-your_project.cloudfunctions.net
```

---

## Boas práticas implementadas

Código

- TypeScript strict mode
- ESLint configurado
- Componentes funcionais com hooks
- Context API para estado global
- Custom hooks reutilizáveis
- Tratamento de erros centralizado

Performance

- Lazy loading de componentes
- Paginação otimizada
- Debounce em buscas
- Memoização de cálculos pesados
- Otimização de queries Firestore

UI / UX

- Design system consistente
- Feedback visual e loading states
- Mensagens de erro amigáveis
- Responsividade e acessibilidade (ARIA)

Segurança

- Autenticação obrigatória
- Validação de permissões
- Regras de segurança Firestore
- Sanitização de inputs
- Rate limiting nas functions

---

## Design

- Fonte: Comfortaa (Google Fonts)
- Cores principais:
  - Primário: #8a2a2c (vermelho vinho)
  - Hover: #681c1d
  - Background: #f8f9fa
  - Bordas: #e5e7eb
- Componentes: card-based, bordas arredondadas
- Responsividade: mobile-first (breakpoints: 576px, 768px, 992px, 1200px)

---

## Licença

Este projeto é propriedade privada da empresa Desenhar Comunicação Visual.
