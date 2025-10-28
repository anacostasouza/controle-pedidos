/* eslint-disable @typescript-eslint/no-explicit-any */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};


export const capitalizeWords = (str: string): string => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => capitalizeFirstLetter(word))
    .join(" ")
    .replace(/_/g, " ")
    .replace(
      /\w\S*/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
};


const normalizarStatus = (status: string) =>
  status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const STATUS_CONCLUIDO_EQUIVALENTES = [
  "concluido",
  "concluida",
  "concluídos",
  "concluídas",
  "concluido.", 
  "concluida.", 
  "concluido(a)",
  "concluida(o)",
];

export const isStatusConcluido = (status: string): boolean => {
  const norm = normalizarStatus(status);
  return STATUS_CONCLUIDO_EQUIVALENTES.some(eq => norm === normalizarStatus(eq));
};

export const formatDateTime = (date?: any): string => {
  if (!date) return "-";
  const d = "toDate" in date ? date.toDate() : new Date(date);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const horas = String(d.getHours()).padStart(2, "0");
  const minutos = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
};

export const formatTimeDiff = (inicio: Date, fim: Date): string => {
  const diffMs = fim.getTime() - inicio.getTime();
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
};