import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import "../styles/Dashboard.css"; 
import HeaderPage from '../components/headerPage'; // Importando o HeaderPage
import type { Pedido } from "../types/Pedidos";


export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ , setUserName ] = useState("");

  const userSetor = localStorage.getItem("userSetor");

  const podeEditarStatus = userSetor === "producao_loja" || userSetor === "gestao" || userSetor === "suporte"; 

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

  return (
    <div className="dashboard-page">
      <div className="container-title">
        <HeaderPage/>
      </div>

      <button onClick={() => navigate("/NovoPedido")} className="novo-pedido-button">
        Novo Pedido
      </button>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Nº Pedido</th>
            <th>Cliente</th>
            <th>Responsável</th>
            <th>Serviço</th>
            <th>Prazo Entrega</th>
            <th>Tipo de Entrega</th>
            <th>Status</th>
            {podeEditarStatus && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>{pedido.numeroPedido}</td>
              <td>{pedido.nomeCliente}</td>
              <td>{pedido.responsavel}</td>
              <td>{pedido.servico}</td>
              <td>
                {pedido.prazoDeEntrega?.toDate().toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td>{pedido.tipoDeEntrega}</td>
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
