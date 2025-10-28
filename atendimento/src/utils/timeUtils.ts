/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseFirestoreDate(data: any): Date | null {
  if (!data) return null;
  if (data.seconds) return new Date(data.seconds * 1000);
  if (typeof data === "string" || data instanceof Date) return new Date(data);
  return null;
}

export function tempoAguardando(atendimento: any) {
    let criado: Date | null = null;
    if (atendimento.criadoEm?.seconds) {
      criado = new Date(atendimento.criadoEm.seconds * 1000);
    } else if (
      typeof atendimento.criadoEm === "string" ||
      atendimento.criadoEm instanceof Date
    ) {
      criado = new Date(atendimento.criadoEm);
    }
    if (!criado || Number.isNaN(criado.getTime())) return "-";

    const agora = new Date();
    const diff = Math.floor((agora.getTime() - criado.getTime()) / 1000);
    const minutos = Math.floor(diff / 60);
    const segundos = diff % 60;
    return `${minutos}m ${segundos}s`;
  }

export function tempoAguardandoSegundos(atendimento: any): number {
  let criado: Date | null = null;
  if (atendimento.criadoEm?.seconds) {
    criado = new Date(atendimento.criadoEm.seconds * 1000);
  } else if (
    typeof atendimento.criadoEm === "string" ||
    atendimento.criadoEm instanceof Date
  ) {
    criado = new Date(atendimento.criadoEm);
  }
  if (!criado || Number.isNaN(criado.getTime())) return 0;
  const agora = new Date();
  return Math.floor((agora.getTime() - criado.getTime()) / 1000);
}

export function tempoAtendimento(atendimento: any) {
  const h: any[] = atendimento.historico || [];
  const iniciado = h.find((h: any) => h.status === "Em Atendimento");
  const fim = h.find(
    (h: any) =>
      h.status === "Finalizado" ||
      h.status === "Cancelado" ||
      h.status === "Adicionado ao controle de pedidos"
  );
  if (iniciado && fim) {
    const inicio = parseFirestoreDate(iniciado.data);
    const termino = parseFirestoreDate(fim.data);
    if (!inicio || !termino) return "-";
    const diff = Math.floor((termino.getTime() - inicio.getTime()) / 1000);
    const minutos = Math.floor(diff / 60);
    const segundos = diff % 60;
    return `${minutos}m ${segundos}s`;
  }
  if (iniciado && !fim) {
    const inicio = parseFirestoreDate(iniciado.data);
    if (!inicio) return "-";
    const agora = new Date();
    const diff = Math.floor((agora.getTime() - inicio.getTime()) / 1000);
    const minutos = Math.floor(diff / 60);
    const segundos = diff % 60;
    return `${minutos}m ${segundos}s`;
  }
  return "-";
}

export function tempoBrasil() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
}

export function formatarTempoHHMMSS(tempo: string | number): string {
  let totalSegundos: number;
  if (typeof tempo === "number") {
    totalSegundos = tempo;
  } else if (typeof tempo === "string" && tempo.includes(":")) {
    return tempo;
  } else {
    totalSegundos = Number(tempo);
  }
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;

  if (h > 0) {
    return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
  }
  return [m, s].map(v => String(v).padStart(2, "0")).join(":");
}

export function formatarTempo(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    if (h > 0) {
        return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
    }
    return [m, s].map(v => String(v).padStart(2, "0")).join(":");
}