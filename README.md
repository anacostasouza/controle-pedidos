Sistema de Gestão Integrada - Desenhar

Sistema completo de gestão de atendimentos e controle de pedidos desenvolvido com React, TypeScript e Firebase.

Visão Geral
    O projeto é composto por 3 módulos principais:

1. Sistema de Atendimento
    Gerenciamento de fila de atendimento presencial com controle de tempo, prioridades e histórico completo.

2. Controle de Pedidos
    Sistema completo para gestão de pedidos gráficos com acompanhamento de status, prazos e relatórios detalhados.

3. Firebase Functions
    Backend serverless com autenticação, autorização e regras de negócio centralizadas.

Arquitetura do Sistema

    desenhar/
    ├── atendimento/          # Sistema de Fila de Atendimento
    ├── controle-pedidos/     # Sistema de Controle de Pedidos
    └── functions/            # Firebase Cloud Functions (Backend)

Sistema de Atendimento

 Funcionalidades
    Registro de atendimentos diretos ou por fila
        Sistema de prioridades (normal/preferencial)
        Controle de tempo de espera e atendimento em tempo real
        Identificação de consumidor final
        Múltiplos tipos de atendimento (Impressão, Criação, Edição, etc.)
    
    Gerenciamento
         Chamar próximo da fila
            Finalizar atendimentos com opções:
            Adicionar ao controle de pedidos
            Finalizar pedido realizado no momento
            Cancelar pedido
            Deletar atendimentos com justificativa obrigatória

    Dashboard e Relatórios
        Histórico completo de atendimentos
        Filtros avançados (data, atendente, status, tipo)
        Estatísticas em tempo real
        Exportação para Excel
        Métricas de desempenho

    Gestão de Usuários
        Log de ações (auditoria)

Tecnologias
    React 18 + TypeScript
    Firebase (Firestore, Authentication, Functions)
    Vite (build tool)
    React Router (navegação)
    Context API (gerenciamento de estado)

Estrutura do Projeto
    atendimento/
    ├── src/
    │   ├── components/
    │   │   └── layout/
    │   │       └── headerPage.tsx          # Header padronizado
    │   ├── context/
    │   │   └── AuthContext.tsx             # Autenticação global
    │   ├── pages/
    │   │   ├── Atendimento/                # Fila de atendimento
    │   │   │   ├── FilaAtendimento.tsx
    │   │   │   └── components/
    │   │   │       ├── FilaAtendimentoItem.tsx
    │   │   │       ├── FinalizarOpcoes.tsx
    │   │   │       ├── ModalSelecionarCliente.tsx
    │   │   │       └── RegistroAtendimento.tsx
    │   │   ├── Dashboard/                  # Histórico e relatórios
    │   │   │   ├── Dashboard.tsx
    │   │   │   └── components/
    │   │   │       ├── HistoricoAtendimentos.tsx
    │   │   │       └── RelatorioAtendimentos.tsx
    │   │   ├── Profile/                    # Gestão de usuários
    │   │   │   ├── ProfileEdit.tsx
    │   │   │   └── components/
    │   │   │       ├── ProfileForm.tsx
    │   │   │       ├── UserList.tsx
    │   │   │       └── LogAtendimentosList.tsx
    │   │   ├── Welcome/                    # Tela inicial
    │   │   │   └── Welcome.tsx
    │   │   └── Login/
    │   │       └── Login.tsx
    │   ├── services/
    │   │   ├── firebase.ts                 # Configuração Firebase
    │   │   └── AtendimentoServices.ts      # Serviços de atendimento
    │   ├── styles/                         # CSS padronizado
    │   ├── types/                          # TypeScript types
    │   └── utils/                          # Funções auxiliares
    ├── .env                                # Variáveis de ambiente
    └── package.json

Padrões de Design
    Fonte: Comfortaa (Google Fonts)
    Cores principais:
    Primário: #8a2a2c (vermelho vinho)
    Hover: #681c1d
    Background: #f8f9fa
    Bordas: #e5e7eb
    Componentes: Card-based design com bordas arredondadas
    Responsividade: Mobile-first (breakpoints: 576px, 768px, 992px, 1200px)

Controle de Pedidos

Funcionalidades

    Gestão de Pedidos
        Cadastro completo de pedidos
        Acompanhamento de status (Em produção, Aguardando, Pronto, Entregue)
        Controle de prazos e entregas
        Upload de arquivos
        Múltiplos tipos de serviço (Impressão, Banner, Adesivo, etc.)

    Dashboard
        Visualização em tabela paginada
        Ordenação por múltiplos critérios
        Filtros avançados (status, tipo, setor, prazo)
        Busca por código/cliente
        Indicadores visuais de urgência

    Relatórios
        Estatísticas completas
        Gráficos interativos:
        Pedidos por status
        Entregas no prazo
        Pedidos por tipo
        Filtros de data personalizados
        Exportação para Excel

    Edição de Pedidos
        Atualização de informações
        Alteração de status
        Upload de novos arquivos
        Retrabalho com justificativa
        Histórico de alterações

Tecnologias
    React 18 + TypeScript
    Firebase (Firestore, Storage, Functions)
    Recharts (gráficos)
    XLSX (exportação Excel)
    Vite (build tool)

Estrutura do Projeto

    controle-pedidos/
    ├── src/
    │   ├── components/
    │   │   └── layout/
    │   │       └── headerPage.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── pages/
    │   │   ├── Dashboard/
    │   │   │   ├── Dashboard.tsx
    │   │   │   └── components/
    │   │   │       ├── DashboardHeader.tsx
    │   │   │       ├── PedidosTable.tsx
    │   │   │       ├── PedidoRow.tsx
    │   │   │       └── Pagination.tsx
    │   │   ├── NovoPedido.tsx             # Cadastro de pedidos
    │   │   ├── EditarPedidos/
    │   │   │   └── EditarPedido.tsx
    │   │   ├── Relatorios/
    │   │   │   ├── Relatorios.tsx
    │   │   │   └── components/
    │   │   │       ├── GraficoPedidosPorStatus.tsx
    │   │   │       ├── GraficoEntregasPrazo.tsx
    │   │   │       └── GraficoPedidosPorTipo.tsx
    │   │   ├── ProfileEdit.tsx
    │   │   └── Login.tsx
    │   ├── services/
    │   │   ├── firebase.ts
    │   │   └── ControlePedidosServices.ts
    │   ├── styles/                        # CSS padronizado
    │   ├── types/                         # TypeScript interfaces
    │   │   ├── Pedidos.ts
    │   │   ├── StatusPedidos.ts
    │   │   ├── Servicos.ts
    │   │   └── Setores.ts
    │   └── utils/
    │       ├── timeUtils.ts
    │       ├── formatUtils.ts
    │       └── firestoreUtils.ts
    ├── firestore.rules                    # Regras de segurança
    └── package.json

Padrões de Design
    Layout: Idêntico ao sistema de atendimento
    Tabelas: Header com gradiente, bordas arredondadas, hover suave
    Cards: Background branco, sombra suave, padding consistente
    Gráficos: Recharts com cores customizadas
    Badges: Status coloridos com bordas arredondadas

Firebase Functions (Backend)

Funcionalidades
    Atendimento
        buscarAtendimentos - Lista atendimentos com filtros
        buscarHistoricoAtendimentos - Histórico completo
        Validação de permissões
        Conversão de Timestamps
    Controle de Pedidos
        buscarPedidos - Lista pedidos com filtros avançados
        buscarRelatorios - Dados para relatórios
        Validação de permissões por função
        Conversão de Timestamps

    Autenticação e Autorização
        Middleware de autenticação JWT
        Validação de tokens Firebase
        Controle de permissões por função (admin/atendente/operador)
        Rate limiting e segurança

Tecnologias
    Node.js + TypeScript
    Firebase Functions (2nd gen)
    Firebase Admin SDK
    Express.js (middleware)

Estrutura

        functions/
    ├── src/
    │   ├── index.ts                       # Entry point
    │   ├── atendimento/
    │   │   ├── funcAtendimento.ts         # Functions de atendimento
    │   │   └── utils/
    │   │       └── filtrosUtils.ts        # Filtros customizados
    │   ├── controle-pedidos/
    │   │   ├── funcControlePedidos.ts     # Functions de pedidos
    │   │   └── utils/
    │   │       └── filtrosUtils.ts
    │   └── utils/
    │       ├── authMiddleware.ts          # Middleware JWT
    │       ├── permissaoUtils.ts          # Validação de permissões
    │       └── deepConvertTimestamps.ts   # Conversão de datas
    ├── lib/                               # JavaScript compilado
    ├── .env                               # Variáveis de ambiente
    └── package.json

Segurança
    Autenticação obrigatória em todas as rotas
        Validação de token Firebase
        Rate limiting (1000 req/min por IP)
        CORS configurado
        Validação de permissões por função
        Logs de auditoria

Deploy
  cd functions
    npm run build
    firebase deploy --only functions

Como Executar
    Pré-requisitos
        Node.js 18+
        npm ou yarn
        Conta Firebase configurada
        Git

Instalação
    Clone o repositório
        git clone https://github.com/anacostasouza/controle-pedidos.git
        cd desenhar

    Instalar dependências
        # Atendimento
            cd atendimento
            npm install

        # Controle de Pedidos
            cd ../controle-pedidos
            npm install

        # Functions
            cd ../functions
            npm install

Configurar variáveis de ambiente
    Crie arquivos .env em cada projeto:
        VITE_FIREBASE_API_KEY=your_api_key
        VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
        VITE_FIREBASE_PROJECT_ID=your_project_id
        VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
        VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
        VITE_FIREBASE_APP_ID=your_app_id
        VITE_API_URL=https://us-central1-your_project.cloudfunctions.net

Boas Práticas Implementadas
    Código
        TypeScript strict mode
        ESLint configurado
        Componentes funcionais com hooks
        Context API para estado global
        Custom hooks reutilizáveis
        Tratamento de erros centralizado

    Performance
        Lazy loading de componentes
        Paginação otimizada
        Debounce em buscas
        Memoização de cálculos pesados
        Otimização de queries Firestore

    UI/UX
        Design system consistente
        Feedback visual em todas as ações
        Loading states
        Mensagens de erro amigáveis
        Responsividade completa
        Acessibilidade (ARIA labels, focus states)

    Segurança
        Autenticação obrigatória
        Validação de permissões
        Regras de segurança Firestore
        Sanitização de inputs
        Rate limiting nas functions

Licença
    Este projeto é propriedade privada da empresa Desenhar Comunicação Visual

