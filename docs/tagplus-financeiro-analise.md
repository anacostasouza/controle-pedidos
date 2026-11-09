# Análise Técnica: API TagPlus (Financeiro - Contas a Pagar/Receber)

> Base de integração com API oficial TagPlus (v2.0)

---

## 1. Autenticação — OAuth 2.0

**URLs Base:**
- API de dados: `https://api.tagplus.com.br`
- Portal de autorização: `https://developers.tagplus.com.br`

### Tokens & Validade
- `access_token`: 24 horas
- `refresh_token`: 15 dias (uso único por rotação, gerando novo par)
- Renovação automática já implementada em `functions/src/tagplus/tagplusShared.ts`

**Headers obrigatórios:**
```
Authorization: Bearer <ACCESS_TOKEN>
Accept: application/json
Content-Type: application/json
X-Api-Version: 2.0
```

---

## 2. Endpoints do Módulo Financeiro TagPlus

### Rotas Disponíveis

| Verbo | Rota | Descrição |
|-------|------|-----------|
| `GET` | `/financeiros` | Lista lançamentos unificados (filtro `tipo: C` ou `D`) |
| `POST` | `/financeiros` | Cria lançamento |
| `GET` | `/financeiros/:id` | Detalhes do lançamento |
| `PUT` | `/financeiros/:id` | Atualização / Liquidação (baixa) |
| `DELETE` | `/financeiros/:id` | Cancelamento / exclusão |

### Endpoints Auxiliares
- `GET /clientes` (read:clientes)
- `GET /fornecedores` (read:fornecedores)
- `GET /formas_pagamento` (read:formas_pagamento)
- `GET /contas` (read:contas)
- `GET /planos_orcamentarios` (read:planos_orcamentarios)

---

## 3. Estrutura de Lançamento (POST/PUT)

```json
{
  "descricao": "Fatura 123",
  "valor": 1500.00,
  "valor_pago": 0.00,
  "data_emissao": "2026-11-01",
  "data_vencimento": "2026-11-30",
  "data_pagamento": null,
  "entidade_id": 12345,
  "forma_pagamento_id": 1,
  "conta_bancaria_id": 2,
  "plano_orcamentario_id": 10,
  "tipo": "C",
  "observacoes": ""
}
```

### Liquidação / Baixa (PUT)
```json
{
  "valor_pago": 1500.00,
  "data_pagamento": "2026-11-06",
  "conta_bancaria_id": 2,
  "forma_pagamento_id": 1
}
```

