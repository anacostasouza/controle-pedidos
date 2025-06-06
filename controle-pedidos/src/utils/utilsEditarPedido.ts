import { getFirestore, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Pedido, StatusPedido, StatusArte, StatusGalpao } from '../types/Pedidos';
import { TipoServicoLabels, SubTipoServicoLabels } from '../types/Servicos';
import { statusPorServico } from '../types/StatusPedidos';

export const fetchPedidoById = async (id: string): Promise<Pedido | null> => {
  const db = getFirestore();
  const docRef = doc(db, "pedidos", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as Pedido;
  }

  return null;
};

export const deletarPedidoPorId = async (id: string): Promise<void> => {
  const db = getFirestore();
  const pedidoRef = doc(db, "pedidos", id);
  await deleteDoc(pedidoRef);
};

export const atualizarStatusPedido = async (
  id: string,
  pedido: Pedido,
  novoStatus: StatusPedido,
  responsavel: string
): Promise<void> => {
  const db = getFirestore();
  const pedidoRef = doc(db, "pedidos", id);
  const now = Timestamp.now();

  const updateData: Partial<Pedido> = {
    statusAtual: novoStatus,
    historicoStatus: [
      ...pedido.historicoStatus,
      {
        status: novoStatus,
        data: now,
        responsavel,
        setor: responsavel // Adiciona o campo setor, assumindo que responsavel representa o setor
      }
    ],
    atualizadoEm: now,
  };

  // Se for ARTE ou GALPÃO, atualizar também o campo específico
  if (responsavel === 'ARTE') {
    updateData.StatusArte = [
      ...(pedido.StatusArte ?? []),
      {
        status: novoStatus as StatusArte, // Cast to StatusArte if you are sure it's compatible
        data: now,
        responsavel
      }
    ];
  } else if (responsavel === 'GALPÃO') {
    updateData.StatusGalpao = [
      ...(pedido.StatusGalpao ?? []),
      {
        status: novoStatus as StatusGalpao, // Cast to StatusGalpao if needed
        data: now,
        responsavel
      }
    ];
  }

  await updateDoc(pedidoRef, updateData);
};

export const getStatusDisponiveis = (pedido: Pedido): StatusPedido[] => {
  const tipoLabel = TipoServicoLabels[pedido.servico.tipo];
  const subTipoLabel = pedido.servico.subTipo;

  const statusEntry = statusPorServico[tipoLabel];

  if (
    typeof statusEntry === "object" && 
    !Array.isArray(statusEntry) &&
    subTipoLabel
  ) {
    return statusEntry[subTipoLabel] ?? [];
  }

  return Array.isArray(statusEntry) ? statusEntry : [];
};
