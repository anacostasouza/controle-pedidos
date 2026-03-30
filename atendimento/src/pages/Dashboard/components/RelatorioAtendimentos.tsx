/* eslint-disable @typescript-eslint/no-explicit-any */
import { gerarExcelAtendimentos } from "../utils/utilsRelatorioAtendimento";
import { saveAs } from "file-saver";

export function RelatorioAtendimentos({
  atendimentos,
  onSolicitarDados,
  exportando = false,
}: Readonly<{
  atendimentos: any[];
  onSolicitarDados?: () => Promise<any[]>;
  exportando?: boolean;
}>) {
  const exportarXLSX = async () => {
    try {
      const dados = onSolicitarDados
        ? await onSolicitarDados()
        : atendimentos;

      if (!dados.length) {
        alert("Nenhum atendimento encontrado para exportar com os filtros atuais.");
        return;
      }

      const excelBuffer = await gerarExcelAtendimentos(dados);
      const arrayBuffer =
        excelBuffer instanceof ArrayBuffer
          ? excelBuffer
          : new Uint8Array(excelBuffer).buffer;
      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "relatorio-atendimentos.xlsx");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Erro ao exportar relatório. Tente novamente.");
    }
  };

  return (
    <div id="relatorio-atendimentos">
      <button className="export-btn" onClick={exportarXLSX} disabled={exportando}>
        <svg
          width="15"
          height="17"
          viewBox="0 0 20 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginRight: "5px" }}
        >
          <path
            id="exportar-icon"
            d="M0.859023 1.87697L13.429 0.081971C13.5 0.0717944 13.5723 0.0769867 13.641 0.0971962C13.7098 0.117406 13.7734 0.15216 13.8275 0.199103C13.8817 0.246047 13.9251 0.304083 13.9549 0.369278C13.9846 0.434474 14 0.505305 14 0.576971V21.423C14 21.4945 13.9846 21.5653 13.9549 21.6304C13.9252 21.6955 13.8819 21.7535 13.8279 21.8004C13.7738 21.8473 13.7103 21.8821 13.6417 21.9024C13.5731 21.9227 13.5009 21.928 13.43 21.918L0.858024 20.123C0.619642 20.089 0.401516 19.9702 0.243712 19.7883C0.0859086 19.6065 -0.000974252 19.3738 -0.000976562 19.133V2.86697C-0.000974252 2.62618 0.0859086 2.39348 0.243712 2.21161C0.401516 2.02975 0.619642 1.91092 0.858024 1.87697H0.859023ZM15 1.99997H19C19.2652 1.99997 19.5196 2.10533 19.7071 2.29286C19.8947 2.4804 20 2.73475 20 2.99997V19C20 19.2652 19.8947 19.5195 19.7071 19.7071C19.5196 19.8946 19.2652 20 19 20H15V1.99997ZM8.20002 11L11 6.99997H8.60002L7.00002 9.28597L5.40002 6.99997H3.00002L5.80002 11L3.00002 15H5.40002L7.00002 12.714L8.60002 15H11L8.20002 11Z"
            fill="#FFFF"
          ></path>
        </svg>
        {exportando ? "Exportando..." : "Exportar relatório"}
      </button>
    </div>
  );
}
