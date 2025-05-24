import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, getDocs, Timestamp } from "firebase/firestore";
import "../styles/Dashboard.css"; 
interface Pedido {
  id: string; 
  arte: boolean;
  galpao: boolean;
  nomeCliente: string;
  numeroPedido: number;
  pedidoID: number;
  prazoArte: Timestamp; 
  prazoDeEntrega: Timestamp;
  responsavel: string;
  servico: string;
  statusGalpao: string;
  statusPedido: string;
  tipoDeEntrega: string;
}


export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [userName, setUserName] = useState("");

  const userSetor = localStorage.getItem("userSetor");

  const podeEditarStatus = userSetor === "producao_loja" || userSetor === "gestao";

  useEffect(() => {
    const fetchPedidos = async () => {
      const db = getFirestore();
      const pedidosSnapshot = await getDocs(collection(db, "pedidos"));
      const pedidosData = pedidosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Pedido, "id">),
      }));
      setPedidos(pedidosData as Pedido[]);
    };

    const name = localStorage.getItem("profileName");
    setUserName(name ?? "");

    fetchPedidos();
  }, []);

  const irParaPerfil = () => {
    navigate("/ProfileEdit");
  };

  return (
    <div className="dashboard-page">
      <div className="container-title">
        <h2>Controle de Pedidos</h2>
        <button onClick={irParaPerfil}>👤 {userName}</button>
      </div>

      <button onClick={() => navigate("/NovoPedido")} className="novo-pedido-button">
        ➕ Novo Pedido
      </button>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Nº Pedido</th>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Prazo Entrega</th>
            <th>Status</th>
            {podeEditarStatus && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>{pedido.numeroPedido}</td>
              <td>{pedido.nomeCliente}</td>
              <td>{pedido.servico}</td>
              <td>{new Date(pedido.prazoDeEntrega.seconds * 1000).toLocaleString()}</td>
              <td>{pedido.statusPedido}</td>
              {podeEditarStatus && (
                <td>
                  <button onClick={() => alert(`Editar status do pedido ${pedido.numeroPedido}`)}>
                    Editar Status
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
