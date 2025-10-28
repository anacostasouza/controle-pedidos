/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseFirestoreDate } from "../../../utils/timeUtils";

export default function LogAtendimentosList({ logs, loadingLogs }: any) {
  const formatarDataLog = (data: any): string => {
    const dataFormatada = parseFirestoreDate(data);
    if (!dataFormatada || Number.isNaN(dataFormatada.getTime())) {
      return "-";
    }
    return dataFormatada.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
    });
  };

  return (
    <div className="log-container">
      <h2 className="title-header">Log de Atendimentos</h2>
      {loadingLogs ? (
        <p>Carregando log...</p>
      ) : logs.length === 0 ? (
        <p>Nenhum log encontrado.</p>
      ) : (
        <ul className="log-atendimentos-list">
          {logs.map((log: any) => (
            <li key={log.id} className={`log-item log-${log.acao}`}>
              <div className="log-main">
                <span className="log-action">{log.acao?.toUpperCase() || "AÇÃO"}</span>
                <span className="log-client">{log.nomeCliente}</span>
                <span className="log-date">{formatarDataLog(log.data)}</span>
              </div>
              <div className="log-details">
                {log.justificativa && (
                  <span className="log-justificativa">
                    <strong>Justificativa:</strong> {log.justificativa}
                  </span>
                )}
                {log.responsavelNome && (
                  <span className="log-responsavel">
                    <strong>Responsável:</strong> {log.responsavelNome}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}