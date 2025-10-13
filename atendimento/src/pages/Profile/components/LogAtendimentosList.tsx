/* eslint-disable @typescript-eslint/no-explicit-any */
export default function LogAtendimentosList({ logs, loadingLogs }: any) {
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
                <span className="log-date">{log.data && new Date(log.data).toLocaleString("pt-BR")}</span>
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