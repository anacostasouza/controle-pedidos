
export type SetorValue =
  | "PRODUCAO_LOJA"
  | "ARTE"
  | "GALPAO"
  | "RH"
  | "FINANCEIRO"
  | "COMERCIAL"
  | "SUPORTE"
  | "BALCAO"
  | "GESTAO";

export interface Setor {
  value: SetorValue;
  label: string;
}

export const setores: Setor[] = [
  { value: "PRODUCAO_LOJA", label: "Produção Loja" },
  { value: "ARTE", label: "Arte" },
  { value: "GALPAO", label: "Galpão" },
  { value: "RH", label: "RH" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "SUPORTE", label: "Suporte" },
  { value: "BALCAO", label: "Balcão" },
  { value: "GESTAO", label: "Gestão" }
];