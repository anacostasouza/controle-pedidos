interface Props {
  total: number;
  atual: number;
  setAtual: (p: number) => void;
  porPagina: number;
}

export default function Pagination({ total, atual, setAtual, porPagina }: Readonly<Props>) {
  const totalPaginas = Math.ceil(total / porPagina);

  if (totalPaginas <= 1) return null;

  return (
    <div className="pagination">
      <button onClick={() => setAtual(atual - 1)} disabled={atual === 1}>
        Anterior
      </button>
      <span>
        Página {atual} de {totalPaginas}
      </span>
      <button
        onClick={() => setAtual(atual + 1)}
        disabled={atual === totalPaginas}
      >
        Próxima
      </button>
    </div>
  );
}
