import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";
import type { Pedido } from "../types/Pedidos";
import HeaderPage from '../components/headerPage';


export default function NovoPedido() {
  const navigate = useNavigate();
  const [userName] = useState(localStorage.getItem("profileName") ?? "");
  const [formData, setFormData] = useState<Omit<Pedido, 'pedidoID' | 'createdAt'>>({
    arte: false,
    galpao: false,
    nomeCliente: "",
    numeroPedido: 0,
    prazoArte: "",
    prazoDeEntrega: "",
    responsavel: "",
    servico: "",
    statusGalpao: "",
    statusPedido: "",
    tipoDeEntrega: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'number' ? Number(value) : value
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'prazoArte' | 'prazoDeEntrega') => {
    const date = e.target.valueAsDate;
    setFormData({
      ...formData,
      [field]: date ? Timestamp.fromDate(date) : null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const db = getFirestore();
      await addDoc(collection(db, "pedidos"), {
        ...formData,
        pedidoID: generateId(),
        createdAt: Timestamp.now()
      });
      
      alert("Pedido cadastrado com sucesso!");
      navigate("/pedidos");
    } catch (error) {
      console.error("Erro ao cadastrar pedido:", error);
      alert("Erro ao cadastrar pedido");
    }
  };

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
  };

  return (
    <div className="novo-pedido-page">
      <div className="container-title">
        <HeaderPage />
      </div>
      
      <h1>Cadastro de Novo Pedido</h1>
      
      <form onSubmit={handleSubmit}>
        <label htmlFor="nomeCliente">Nome do Cliente:</label>
        <input 
          type="text" 
          id="nomeCliente" 
          name="nomeCliente" 
          value={formData.nomeCliente}
          onChange={handleInputChange}
          required 
        />

        <label htmlFor="numeroPedido">Número do Pedido:</label>
        <input 
          type="number" 
          id="numeroPedido" 
          name="numeroPedido" 
          value={formData.numeroPedido}
          onChange={handleInputChange}
          required 
        />

        <label htmlFor="prazoArte">Prazo Arte:</label>
        <input 
          type="date" 
          id="prazoArte" 
          name="prazoArte" 
          onChange={(e) => handleDateChange(e, 'prazoArte')}
          required 
        />

        <label htmlFor="prazoDeEntrega">Prazo de Entrega:</label>
        <input 
          type="date" 
          id="prazoDeEntrega" 
          name="prazoDeEntrega" 
          onChange={(e) => handleDateChange(e, 'prazoDeEntrega')}
          required 
        />

        <label htmlFor="responsavel">Responsável:</label>
        <input 
          type="text" 
          id="responsavel" 
          name="responsavel" 
          value={formData.responsavel}
          onChange={handleInputChange}
          required 
        />

        <label htmlFor="servico">Serviço:</label>
        <input 
          type="text" 
          id="servico" 
          name="servico" 
          value={formData.servico}
          onChange={handleInputChange}
          required 
        />

        <label htmlFor="statusGalpao">Status Galpão:</label>
        <input 
          type="text" 
          id="statusGalpao" 
          name="statusGalpao" 
          value={formData.statusGalpao}
          onChange={handleInputChange}
          required 
        />

        <label htmlFor="statusPedido">Status do Pedido:</label>
        <input 
          type="text" 
          id="statusPedido" 
          name="statusPedido" 
          value={formData.statusPedido}
          onChange={handleInputChange}
          required 
        />

        <label htmlFor="tipoDeEntrega">Tipo de Entrega:</label>
        <input 
          type="text" 
          id="tipoDeEntrega" 
          name="tipoDeEntrega" 
          value={formData.tipoDeEntrega}
          onChange={handleInputChange}
          required 
        />

        <button type="submit">Cadastrar Pedido</button>
      </form>
    </div>
  );
}