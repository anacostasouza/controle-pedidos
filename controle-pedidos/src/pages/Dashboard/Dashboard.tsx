/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState, useCallback } from "react";
import debounce from "lodash/debounce";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  doc,
  getCountFromServer,
  getDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import { buscarPedidos, marcarComoEntregueBackend } from "../../services/ControlePedidosServices";
import "../../styles/Dashboard.css";
import HeaderPage from "../../components/layout/headerPage";

import type { Pedido, StatusPedido } from "../../types/Pedidos";
import {
  TipoServico,
  type TipoServicoValue,
  type SubTipoServicoValue,
} from "../../types/Servicos";
import { tiposServico } from "../../types/tipoServicos";
import { STATUS_SEQUENCE_DEFAULT } from "../../types/StatusPedidos";
import { gerarOpcoesStatus, convertToTimestamp } from "./utils/dashboardUtils";
import { getTodasEtapasDoPedido } from "../../utils/firestoreUtils";

import { PedidosTable } from "./components/PedidosTable";
import { DashboardHeader } from "./components/DashboardHeader";

export default function Dashboard() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [_loading, setLoading] = useState(true);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroServico, setFiltroServico] = useState<TipoServicoValue | "">("");
  const [filtroSubTipo, setFiltroSubTipo] = useState<SubTipoServicoValue | "">("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAtrasados, setFiltroAtrasados] = useState(false);
  const [filtroRequerArte, setFiltroRequerArte] = useState("");
  const [filtroRequerGalpao, setFiltroRequerGalpao] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");

  const [pedidosFiltrados, setPedidosFiltrados] = useState<Pedido[]>([]);
  const [userSetor, setUserSetor] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [statusOptions, setStatusOptions] = useState<StatusPedido[]>(STATUS_SEQUENCE_DEFAULT);
  const [subTipoOptions, setSubTipoOptions] = useState<{ value: SubTipoServicoValue; label: string }[]>([]);
  const [etapasPorPedido, setEtapasPorPedido] = useState<Record<string, Awaited<ReturnType<typeof getTodasEtapasDoPedido>>>>({});
  const [responsaveisOptions, setResponsaveisOptions] = useState<{ uid: string, displayName: string }[]>([]);
  const [totalPedidosFiltrados, setTotalPedidosFiltrados] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [lastEntregas, setLastEntregas] = useState<number[]>([]);
  const totalPages = Math.ceil(totalPedidosFiltrados / itemsPerPage);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/");

      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setUserSetor((userData.setor ?? "").toUpperCase());
        setUserDisplayName(userData.displayName ?? "");
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const debouncedFetchPedidos = useCallback(
    debounce(async (params) => {
      setLoading(true);
      const token = (await getAuth().currentUser?.getIdToken()) || "";
      try {
        const data = await buscarPedidos(params, token);

        const pedidosConvertidos = (data.pedidos || []).map((pedido: any) => ({
          ...pedido,
          prazos: {
            ...pedido.prazos,
            entrega: convertToTimestamp(pedido.prazos?.entrega),
            producao: convertToTimestamp(pedido.prazos?.producao),
            arte: convertToTimestamp(pedido.prazos?.arte),
          },
          criadoEm: convertToTimestamp(pedido.criadoEm),
          atualizadoEm: convertToTimestamp(pedido.atualizadoEm),
          entregueEm: convertToTimestamp(pedido.entregueEm),
        }));

        setPedidos(pedidosConvertidos);
        setTotalPedidosFiltrados(data.total || 0);

        if (data.nextLastEntrega) {
          setLastEntregas((prev) => {
            const arr = [...prev];
            arr[currentPage - 1] = data.nextLastEntrega;
            return arr;
          });
        }
      } catch (error) {
        console.log("Erro ao buscar pedidos:", error);
      } finally {
        setLoading(false);
      }
    }, 400),
    []
  );

  useEffect(() => {
    const params: Record<string, string> = {
      filtroTipo: filtroServico, 
      filtroSubTipo,             
      filtroStatus,
      filtroResponsavelUid: filtroResponsavel,
      filtroAtrasados: filtroAtrasados ? "true" : "",
      porPagina: itemsPerPage.toString(),
      filtroCliente: buscaCliente,
      filtroRequerArte: filtroRequerArte ?? "",
      filtroRequerGalpao: filtroRequerGalpao ?? "",
      filtroOcultarEntregues: "true"
    };

    if (currentPage > 1 && lastEntregas[currentPage - 2]) {
      params.lastEntrega = lastEntregas[currentPage - 2].toString();
    }
    
    debouncedFetchPedidos(params);
    
    return () => {
      debouncedFetchPedidos.cancel();
    };
  }, [
    filtroServico,
    filtroSubTipo,
    filtroStatus,
    filtroResponsavel,
    filtroAtrasados,
    buscaCliente,
    currentPage,
    itemsPerPage,
    filtroRequerArte,
    filtroRequerGalpao,
  ]);

  useEffect(() => {
    const db = getFirestore();
    const pedidosCollectionRef = collection(db, "pedidos");

    const filtros = [];
    if (filtroServico) filtros.push(where("servico.tipo", "==", filtroServico));
    if (filtroSubTipo) filtros.push(where("servico.subTipo", "==", filtroSubTipo));
    if (filtroStatus) filtros.push(where("statusAtual", "==", filtroStatus));
    if (filtroResponsavel) filtros.push(where("responsavel", "==", filtroResponsavel));
    filtros.push(where("statusAtual", "!=", "Entregue"));

    const qContagem = query(pedidosCollectionRef, ...filtros);
    getCountFromServer(qContagem).then((snapshot) => {
      setTotalPedidosFiltrados(snapshot.data().count);
    });
  }, [filtroServico, filtroSubTipo, filtroStatus, filtroResponsavel]);

  useEffect(() => {
    async function atualizarOpcoes() {
      if (!filtroServico) {
        setStatusOptions(
          (await gerarOpcoesStatus(pedidos, "", "")) as StatusPedido[]
        );
        setSubTipoOptions([]);
        setFiltroSubTipo("");
        return;
      }
      setStatusOptions(
        (await gerarOpcoesStatus(
          pedidos,
          filtroServico,
          filtroSubTipo
        )) as StatusPedido[]
      );
      const tipoSelecionado = tiposServico.find(
        (t) => t.value === filtroServico
      );
      if (tipoSelecionado?.subTipos)
        setSubTipoOptions(tipoSelecionado.subTipos);
      else {
        setSubTipoOptions([]);
        setFiltroSubTipo("");
      }
    }
    atualizarOpcoes();
  }, [pedidos, filtroServico, filtroSubTipo]);

  useEffect(() => {
    async function carregarEtapas() {
      if (!pedidosFiltrados.length) return setEtapasPorPedido({});
      const resultados = await Promise.all(
        pedidosFiltrados.map(
          async (pedido) =>
            [pedido.id!, await getTodasEtapasDoPedido(pedido)] as const
        )
      );
      setEtapasPorPedido(Object.fromEntries(resultados));
    }
    carregarEtapas();
  }, [pedidosFiltrados]);

  const podeEditarPedido = (pedido: Pedido): boolean => {
    if (!userSetor) return false;
    if (pedido.statusAtual === "Entregue") return false;
    if (["GESTAO", "SUPORTE", "PRODUCAO_LOJA"].includes(userSetor)) return true;
    if (userDisplayName && pedido.responsavel === userDisplayName) return true;
    if (
      userSetor === "ARTE" &&
      (pedido.requerArte || pedido.servico.tipo === TipoServico.ARTE)
    )
      return true;
    if (
      userSetor === "GALPAO" &&
      (pedido.requerGalpao ||
        pedido.servico.tipo === TipoServico.COMUNICACAO_VISUAL)
    )
      return true;
    return false;
  };

  const handleMarcarComoEntregue = async (
    pedidoId: string,
    currentStatus: StatusPedido
  ) => {
    if (!["CAIXA", "BALCAO", "SUPORTE", "GESTAO"].includes(userSetor))
      return alert("Você não tem permissão.");
    if (currentStatus !== "Concluído")
      return alert("Apenas pedidos 'Concluído'.");
    if (!globalThis.confirm("Deseja marcar este pedido como ENTREGUE?")) return;

    try {
      await marcarComoEntregueBackend(pedidoId);
      alert("Pedido marcado como entregue!");
    } catch {
      alert("Erro ao atualizar pedido.");
    }
  };

  const shouldShowActionsColumn = true;

  useEffect(() => {
    setCurrentPage(1);
    setLastEntregas([]);
  }, [
    filtroServico,
    filtroSubTipo,
    filtroStatus,
    filtroResponsavel,
    filtroAtrasados,
    buscaCliente,
  ]);

  useEffect(() => {
    async function fetchResponsaveis() {
      const db = getFirestore();
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const responsaveis = usuariosSnap.docs
        .map((doc) => ({
          uid: doc.id,
          displayName: doc.data().displayName,
        }))
        .filter(user => user.displayName);
      responsaveis.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setResponsaveisOptions(responsaveis);
    }
    fetchResponsaveis();
  }, []);

  useEffect(() => {
    setPedidosFiltrados(pedidos);
  }, [pedidos]);

  return (
    <div className="dashboard-page">
      <HeaderPage />
      <DashboardHeader
        pedidosFiltrados={pedidosFiltrados}
        buscaCliente={buscaCliente}
        setBuscaCliente={setBuscaCliente}
        filtroServico={filtroServico}
        setFiltroServico={setFiltroServico}
        filtroSubTipo={filtroSubTipo}
        setFiltroSubTipo={setFiltroSubTipo}
        filtroStatus={filtroStatus}
        setFiltroStatus={setFiltroStatus}
        filtroAtrasados={filtroAtrasados}
        setFiltroAtrasados={setFiltroAtrasados}
        filtroRequerArte={filtroRequerArte}
        setFiltroRequerArte={setFiltroRequerArte}
        filtroRequerGalpao={filtroRequerGalpao}
        setFiltroRequerGalpao={setFiltroRequerGalpao}
        filtroResponsavel={filtroResponsavel}
        setFiltroResponsavel={setFiltroResponsavel}
        subTipoOptions={subTipoOptions}
        statusOptions={statusOptions}
        responsaveisOptions={responsaveisOptions}
        userSetor={userSetor}
        navigate={navigate}
        totalPedidosFiltrados={totalPedidosFiltrados}
      />

      <PedidosTable
        pedidosFiltrados={pedidosFiltrados}
        etapasPorPedido={etapasPorPedido}
        userSetor={userSetor}
        handleMarcarComoEntregue={handleMarcarComoEntregue}
        shouldShowActionsColumn={shouldShowActionsColumn}
        navigate={navigate}
        podeEditarPedido={podeEditarPedido}
      />

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}
