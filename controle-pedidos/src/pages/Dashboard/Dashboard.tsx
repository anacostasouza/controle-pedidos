/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState, useCallback } from "react";
import debounce from "lodash.debounce";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import { buscarPedidos, marcarComoEntregueBackend } from "../../services/ControlePedidosServices";
import "../../styles/Dashboard.css";
import HeaderPage from "../../components/layout/headerPage";

import type { Pedido, StatusPedido } from "../../types/Pedidos";
import {
  type TipoServicoValue,
  type SubTipoServicoValue,
} from "../../types/Servicos";
import { tiposServico } from "../../types/tipoServicos";
import { STATUS_SEQUENCE_DEFAULT } from "../../types/StatusPedidos";
import { gerarOpcoesStatus, convertToTimestamp } from "./utils/dashboardUtils";
import { fetchAllServicosStatus, getTodasEtapasDoPedido } from "../../utils/FirestoreUtils";

import { podeEditarPedido as podeEditarPedidoUtils, podeMarcarEntregue, podeEditarPrazoEntrega } from "../../utils/PermissionUtils";

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
  const [etapasPorPedido, setEtapasPorPedido] = useState<Record<string, any>>({});
  const [responsaveisOptions, setResponsaveisOptions] = useState<{ uid: string, displayName: string }[]>([]);
  const [totalPedidosFiltrados, setTotalPedidosFiltrados] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [lastEntregas, setLastEntregas] = useState<number[]>([]);
  const [lastIds, setLastIds] = useState<string[]>([]);
  const [lastResponsaveis, setLastResponsaveis] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState("");
  const totalPages = Math.ceil(totalPedidosFiltrados / itemsPerPage);

  const normalizeResponsavelTerm = (value: string): string =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();

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

  const buildFetchParams = useCallback(
    (page = currentPage): Record<string, string> => {
      const responsavelPrefixoRaw = filtroResponsavel.trim();
      const responsavelPrefixoNormalizado = normalizeResponsavelTerm(responsavelPrefixoRaw);
      const usarPrefixoResponsavel = responsavelPrefixoNormalizado.length >= 2;

      const params: Record<string, string> = {
        filtroTipo: filtroServico,
        filtroSubTipo,
        filtroStatus,
        filtroAtrasados: filtroAtrasados ? "true" : "",
        itensPorPagina: itemsPerPage.toString(),
        porPagina: itemsPerPage.toString(),
        pagina: page.toString(),
        filtroCliente: buscaCliente.trim(),
        filtroRequerArte: filtroRequerArte ?? "",
        filtroRequerGalpao: filtroRequerGalpao ?? "",
        filtroOcultarEntregues: "true",
      };

      if (usarPrefixoResponsavel) {
        params.filtroResponsavelNomePrefixo = responsavelPrefixoRaw;
      }

      if (page > 1 && lastEntregas[page - 2]) {
        params.lastEntrega = lastEntregas[page - 2].toString();
        if (lastIds[page - 2]) {
          params.lastId = lastIds[page - 2];
        }
        if (usarPrefixoResponsavel && lastResponsaveis[page - 2]) {
          params.lastResponsavelNome = lastResponsaveis[page - 2];
        }
      }

      return params;
    },
    [
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
      lastEntregas,
      lastIds,
      lastResponsaveis,
    ]
  );

  const debouncedFetchPedidos = useCallback(
    debounce(async (params: Record<string, string>) => {
      setLoading(true);
      setFetchError("");
      const token = (await getAuth().currentUser?.getIdToken()) || "";
      const pageIndex = Math.max(0, (Number(params.pagina) || 1) - 1);
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
            arr[pageIndex] = data.nextLastEntrega;
            return arr;
          });
        }

        if (data.nextLastId) {
          setLastIds((prev) => {
            const arr = [...prev];
            arr[pageIndex] = data.nextLastId;
            return arr;
          });
        }

        if (data.nextLastResponsavelNome) {
          setLastResponsaveis((prev) => {
            const arr = [...prev];
            arr[pageIndex] = data.nextLastResponsavelNome;
            return arr;
          });
        }
      } catch (error) {
        setFetchError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os pedidos com os filtros selecionados."
        );
        if (import.meta.env.DEV) {
          console.log("Erro ao buscar pedidos:", error);
        }
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    const params = buildFetchParams(currentPage);
    debouncedFetchPedidos(params);

    return () => {
      debouncedFetchPedidos.cancel();
    };
  }, [buildFetchParams, currentPage, debouncedFetchPedidos]);



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
      if (tipoSelecionado?.subTipos && tipoSelecionado.subTipos.length > 0) {
        setSubTipoOptions(tipoSelecionado.subTipos);
      } else {
        try {
          const servicos = await fetchAllServicosStatus();
          const subTiposDinamicos = Array.from(
            new Set(
              servicos
                .filter((s) => s.tipo === filtroServico && s.subTipo)
                .map((s) => s.subTipo as SubTipoServicoValue)
            )
          ).map((v) => ({ value: v, label: v }));
          setSubTipoOptions(subTiposDinamicos);
          if (!subTiposDinamicos.length) {
            setFiltroSubTipo("");
          }
        } catch {
          setSubTipoOptions([]);
          setFiltroSubTipo("");
        }
      }
    }
    atualizarOpcoes();
  }, [pedidos, filtroServico, filtroSubTipo]);

  useEffect(() => {
    async function carregarEtapas() {
      if (!pedidosFiltrados.length) {
        setEtapasPorPedido({});
        return;
      }

      const resultados = await Promise.all(
        pedidosFiltrados.map(async (pedido) => {
          const etapas = await getTodasEtapasDoPedido(pedido);
          return [pedido.id!, etapas] as const;
        })
      );

      setEtapasPorPedido(Object.fromEntries(resultados));
    }

    carregarEtapas();
  }, [pedidosFiltrados]);

  const podeEditarPedido = (pedido: Pedido): boolean => {
    if (!userSetor || !userDisplayName) return false;
    const auth = getAuth();
    return podeEditarPedidoUtils(pedido, {
      setor: userSetor,
      displayName: userDisplayName,
      uid: auth.currentUser?.uid || ""
    });
  };

  const podeEditarPrazo = (pedido: Pedido): boolean => {
    if (!userSetor || !userDisplayName) return false;
    const auth = getAuth();
    return podeEditarPrazoEntrega(pedido, {
      setor: userSetor,
      displayName: userDisplayName,
      uid: auth.currentUser?.uid || ""
    });
  };

  const handleMarcarComoEntregue = async (
    pedidoId: string,
    currentStatus: StatusPedido
  ) => {
    if (!userSetor || !userDisplayName) return alert("Usuário não identificado.");
    
    const auth = getAuth();
    const usuario = {
      setor: userSetor,
      displayName: userDisplayName,
      uid: auth.currentUser?.uid || ""
    };
    
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido || !podeMarcarEntregue(pedido, usuario)) {
      return alert("Você não tem permissão.");
    }
    
    if (currentStatus !== "Concluído") {
      return alert("Apenas pedidos 'Concluído' podem ser marcados como entregues.");
    }
    
    if (!globalThis.confirm("Deseja marcar este pedido como entregue?")) return;

    try {
      await marcarComoEntregueBackend(pedidoId);
      alert("Pedido marcado como entregue!");
      // Recarregar dados após sucesso
      debouncedFetchPedidos(buildFetchParams(currentPage));
    } catch (error) {
      console.error("Erro ao marcar como entregue:", error);
      alert("Erro ao atualizar pedido.");
    }
  };

  const shouldShowActionsColumn = true;

  useEffect(() => {
    setCurrentPage(1);
    setLastEntregas([]);
    setLastIds([]);
    setLastResponsaveis([]);
  }, [
    filtroServico,
    filtroSubTipo,
    filtroStatus,
    filtroResponsavel,
    filtroAtrasados,
    buscaCliente,
    filtroRequerArte,
    filtroRequerGalpao,
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

      {fetchError && (
        <div
          role="alert"
          style={{
            margin: "12px 0",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => debouncedFetchPedidos(buildFetchParams(currentPage))}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #991b1b",
              backgroundColor: "#ffffff",
              color: "#991b1b",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <PedidosTable
        pedidosFiltrados={pedidosFiltrados}
        etapasPorPedido={etapasPorPedido}
        userSetor={userSetor}
        userDisplayName={userDisplayName}
        userUid={getAuth().currentUser?.uid || ""}
        handleMarcarComoEntregue={handleMarcarComoEntregue}
        shouldShowActionsColumn={shouldShowActionsColumn}
        navigate={navigate}
        podeEditarPedido={podeEditarPedido}
        podeEditarPrazo={podeEditarPrazo}
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
