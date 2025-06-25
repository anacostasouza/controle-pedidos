import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, query, orderBy, doc, getDoc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../styles/Dashboard.css";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido, StatusPedido } from '../types/Pedidos';
import { TipoServicoLabels, SubTipoServicoLabels, TipoServico, SubTipoServico, type TipoServicoValue, type SubTipoServicoValue } from '../types/Servicos';
import { formatDate, filtrarPedidos, isPedidoAtrasado } from "../utils/dashboardUtils";
import { getTodasEtapasDoPedido } from "../utils/statusUtils";
import { capitalizeWords } from "../utils/formatUtils";

const getTipoServicoValueFromLabel = (label: string): TipoServicoValue | undefined => {
    for (const key in TipoServicoLabels) {
        if (TipoServicoLabels[key as TipoServicoValue] === label) {
            return key as TipoServicoValue;
        }
    }
    return undefined;
};

const normalizeSubTipoServicoValue = (value: string | null | undefined): SubTipoServicoValue | undefined => {
    if (!value) return undefined;

    const trimmedValue = value.trim();

    for (const enumKey in SubTipoServico) {
        const enumValue = SubTipoServico[enumKey as keyof typeof SubTipoServico];
        if (typeof enumValue === 'string' && enumValue.toLowerCase() === trimmedValue.toLowerCase()) {
            return enumValue as SubTipoServicoValue;
        }
    }

    const normalizedTrimmedValue = trimmedValue.toLowerCase().replace(/\s/g, '');
    for (const enumKey in SubTipoServicoLabels) {
        const label = SubTipoServicoLabels[enumKey as SubTipoServicoValue];
        if (label.toLowerCase().replace(/\s/g, '') === normalizedTrimmedValue) {
            return enumKey as SubTipoServicoValue;
        }
    }

    switch (trimmedValue.toLowerCase()) {
        case "placa simples": return SubTipoServico.PLACA_SIMPLES;
        case "placa complexa": return SubTipoServico.PLACA_COMPLEXA;
        case "impressao rapida":
        case "impressão rápida": return SubTipoServico.IMPRESSAO_RAPIDA;
        case "impressao com acabamento":
        case "impressão com acabamento": return SubTipoServico.IMPRESSAO_COM_ACABAMENTO;
        case "carimbo": return SubTipoServico.CARIMBO;
        case "acabamento": return SubTipoServico.ACABAMENTO;
        default:
            console.warn(`[normalizeSubTipoServicoValue] SubTipo "${value}" não pôde ser normalizado para um valor de enum. Retornando undefined.`);
            return undefined;
    }
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [buscaCliente, setBuscaCliente] = useState("");
    const [filtroServico, setFiltroServico] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("");
    const [filtroAtrasados, setFiltroAtrasados] = useState(false);
    const [filtroRequerArte, setFiltroRequerArte] = useState("");
    const [filtroRequerGalpao, setFiltroRequerGalpao] = useState("");
    const [pedidosFiltrados, setPedidosFiltrados] = useState<Pedido[]>([]);
    const [userSetor, setUserSetor] = useState("");
    const [userDisplayName, setUserDisplayName] = useState("");

    useEffect(() => {
        const auth = getAuth();
        const db = getFirestore();

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "usuarios", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUserSetor((userData.setor ?? "").toUpperCase());
                    setUserDisplayName(userData.displayName ?? "");
                } else {
                    console.warn("Usuário não encontrado no Firestore.");
                }
            } else {
                console.warn("Usuário não autenticado.");
                navigate('/login');
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, [navigate]);

    useEffect(() => {
        const db = getFirestore();
        const pedidosCollectionRef = collection(db, "pedidos");
        const q = query(pedidosCollectionRef, orderBy("prazos.entrega", "asc"));

        const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
            const pedidosData = querySnapshot.docs.map((docSnap) => {
                const data = docSnap.data();

                const convertTimestamp = (ts: unknown): Timestamp | undefined => {
                    if (ts instanceof Timestamp) {
                        return ts;
                    }
                    if (ts && typeof ts === 'object' && 'seconds' in ts && typeof ts.seconds === 'number' && 'nanoseconds' in ts && typeof ts.nanoseconds === 'number') {
                        return new Timestamp(ts.seconds, ts.nanoseconds);
                    }
                    return undefined;
                };

                const normalizedTipo = getTipoServicoValueFromLabel(data.servico.tipo as string) ?? data.servico.tipo;
                const normalizedSubTipo = data.servico.subTipo
                    ? normalizeSubTipoServicoValue(data.servico.subTipo as string)
                    : undefined;

                return {
                    id: docSnap.id,
                    numeroPedido: data.numeroPedido,
                    nomeCliente: data.nomeCliente,
                    responsavel: data.responsavel,
                    descricao: data.descricao,
                    observacoes: data.observacoes,
                    statusAtual: data.statusAtual,
                    criadoEm: convertTimestamp(data.criadoEm),
                    atualizadoEm: convertTimestamp(data.atualizadoEm),
                    entregueEm: convertTimestamp(data.entregueEm),
                    prazos: {
                        entrega: convertTimestamp(data.prazos?.entrega),
                        producao: convertTimestamp(data.prazos?.producao),
                        arte: convertTimestamp(data.prazos?.arte),
                    },
                    servico: {
                        tipo: normalizedTipo as TipoServicoValue,
                        subTipo: normalizedSubTipo as SubTipoServicoValue | undefined,
                        servicoID: data.servico.servicoID ?? '',
                    },
                    historicoStatus: data.historicoStatus ?? [],
                    StatusArte: data.StatusArte ?? [],
                    StatusGalpao: data.StatusGalpao ?? [],
                    requerArte: data.requerArte === true,
                    requerGalpao: data.requerGalpao === true,
                    pedidoID: data.pedidoID ?? docSnap.id,
                    setoresResponsaveis: data.setoresResponsaveis ?? [],
                    tipoDeEntrega: data.tipoDeEntrega ?? 'retirada_loja',
                } as Pedido;
            });

            setPedidos(pedidosData);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar pedidos em tempo real:", error);
            setLoading(false);
        });

        return () => unsubscribeFirestore();
    }, []);

    useEffect(() => {
        const pedidosFiltrados = filtrarPedidos(
            pedidos,
            buscaCliente,
            filtroServico,
            filtroStatus,
            filtroAtrasados,
            userSetor === "ARTE" ? filtroRequerArte : "",
            userSetor === "GALPAO" ? filtroRequerGalpao : "",
            userSetor
        );
        setPedidosFiltrados(pedidosFiltrados);
    }, [pedidos, buscaCliente, filtroServico, filtroStatus, filtroAtrasados, filtroRequerArte, filtroRequerGalpao, userSetor]);

    const podeEditarPedido = (pedido: Pedido): boolean => {
        if (!userSetor) return false;

        if (pedido.statusAtual === "Entregue") return false;

        if (userSetor === "GESTAO" || userSetor === "SUPORTE" || userSetor === "PRODUCAO_LOJA") return true;

        if (userDisplayName && pedido.responsavel === userDisplayName) return true;

        if (userSetor === "ARTE" && (pedido.requerArte || pedido.servico.tipo === TipoServico.ARTE)) return true;

        if (userSetor === "GALPAO" && (pedido.requerGalpao || pedido.servico.tipo === TipoServico.COMUNICACAO_VISUAL)) return true;

        return false;
    };

    const handleMarcarComoEntregue = async (pedidoId: string, currentStatus: StatusPedido) => {
        if (userSetor !== "CAIXA" && userSetor !== "BALCAO") {
            alert("Você não tem permissão para marcar pedidos como entregues.");
            return;
        }

        if (currentStatus !== "Concluído") {
            alert("Apenas pedidos com status 'Concluído' podem ser marcados como entregues.");
            return;
        }

        if (window.confirm("Tem certeza que deseja marcar este pedido como ENTREGUE?")) {
            const db = getFirestore();
            const pedidoRef = doc(db, "pedidos", pedidoId);
            const now = Timestamp.now();

            try {
                await updateDoc(pedidoRef, {
                    statusAtual: "Entregue",
                    entregueEm: now,
                    atualizadoEm: now,
                    historicoStatus: [
                        ...(pedidos.find(p => p.id === pedidoId)?.historicoStatus || []),
                        {
                            status: "Entregue",
                            data: now,
                            responsavel: userDisplayName,
                            setor: userSetor,
                        },
                    ],
                });
                alert("Pedido marcado como Entregue com sucesso!");
            } catch (error) {
                console.error("Erro ao marcar pedido como entregue:", error);
                alert("Erro ao marcar pedido como entregue. Tente novamente.");
            }
        }
    };

    const shouldShowActionsColumn = pedidosFiltrados.some(pedido =>
        (pedido.statusAtual === "Concluído" && (userSetor === "CAIXA" || userSetor === "BALCAO")) || podeEditarPedido(pedido)
    );

    return (
        <div className="dashboard-page">
            <HeaderPage />

            <div className="table-container">
                <div className="header-dashboard">
                    <div className="dashboard-header-content">
                        <h2>Pedidos ({pedidosFiltrados.length}) </h2>
                        <button
                            className="new-order-button"
                            onClick={() => navigate("/novo-pedido")}
                        >
                            Novo Pedido
                        </button>
                    </div>

                    <div className="filters">
                        <input
                            type="text"
                            placeholder="Buscar cliente ou nº do pedido..."
                            value={buscaCliente}
                            onChange={(e) => setBuscaCliente(e.target.value)}
                        />
                        <select
                            aria-label="Filtro de serviço"
                            value={filtroServico}
                            onChange={(e) => setFiltroServico(e.target.value)}
                        >
                            <option value="">Todos os serviços</option>
                            {Object.entries(TipoServicoLabels).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filtro de status"
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                        >
                            <option value="">Todos os status</option>
                            <option value="Iniciado">Iniciado</option>
                            <option value="Em Aprovação">Em Aprovação</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Impressão">Impressão</option>
                            <option value="Acabamento">Acabamento</option>
                            <option value="Montagem">Montagem</option>
                            <option value="Pedido Feito">Pedido Feito</option>
                            <option value="Liberado">Liberado</option>
                            <option value="Corte">Corte</option>
                            <option value="Estrutura">Estrutura</option>
                            <option value="Pintura">Pintura</option>
                            <option value="Elétrica">Elétrica</option>
                            <option value="Corte e Preparação do Material">Corte e Preparação do Material</option>
                            <option value="Montagem/Acabamento">Montagem/Acabamento</option>
                            {(userSetor === "CAIXA" || userSetor === "BALCAO") && <option value="Entregue">Entregue</option>}
                        </select>

                        {userSetor === "ARTE" && (
                            <select
                                aria-label="Filtro de Requer Arte"
                                value={filtroRequerArte}
                                onChange={(e) => setFiltroRequerArte(e.target.value)}
                            >
                                <option value="">Requer Arte (Todos)</option>
                                <option value="true">Requer Arte (Sim)</option>
                                <option value="false">Requer Arte (Não)</option>
                            </select>
                        )}

                        {userSetor === "GALPAO" && (
                            <select
                                aria-label="Filtro de Requer Galpão"
                                value={filtroRequerGalpao}
                                onChange={(e) => setFiltroRequerGalpao(e.target.value)}
                            >
                                <option value="">Requer Galpão (Todos)</option>
                                <option value="true">Requer Galpão (Sim)</option>
                                <option value="false">Requer Galpão (Não)</option>
                            </select>
                        )}

                        <label>
                            <input
                                type="checkbox"
                                checked={filtroAtrasados}
                                onChange={(e) => setFiltroAtrasados(e.target.checked)}
                            />{" "}
                            Mostrar apenas pedidos atrasados
                        </label>
                    </div>
                </div>
                {loading ? (
                    <div className="loading">Carregando pedidos...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="pedidos-table">
                            <thead>
                                <tr>
                                    <th>Nº Pedido</th>
                                    <th>Cliente</th>
                                    <th>Responsável</th>
                                    <th>Serviço</th>
                                    <th>Prazo</th>
                                    <th>Etapas</th>
                                    <th>Status</th>
                                    {shouldShowActionsColumn && (
                                        <th>Ações</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosFiltrados.map((pedido) => {
                                    const etapasInfo = getTodasEtapasDoPedido(pedido);

                                    return (
                                        <tr key={pedido.id} className="pedidos-row">
                                            <td>{pedido.numeroPedido}</td>
                                            <td>{capitalizeWords(pedido.nomeCliente)}</td>
                                            <td>{pedido.responsavel}</td>
                                            <td>
                                                {TipoServicoLabels[pedido.servico.tipo] ?? pedido.servico.tipo}
                                                {(() => {
                                                    let subTipoLabel = "";
                                                    if (pedido.servico.subTipo && SubTipoServicoLabels[pedido.servico.subTipo]) {
                                                        subTipoLabel = `(${SubTipoServicoLabels[pedido.servico.subTipo]})`;
                                                    } else if (pedido.servico.subTipo) {
                                                        subTipoLabel = ` (${pedido.servico.subTipo})`;
                                                    }
                                                    return subTipoLabel;
                                                })()}
                                            </td>
                                            <td>
                                                {formatDate(pedido.prazos.entrega)}
                                                {isPedidoAtrasado(pedido.prazos.entrega) && pedido.statusAtual !== "Concluído" && pedido.statusAtual !== "Entregue" && (
                                                    <span className="atrasado-alert">Atrasado!</span>
                                                )}
                                            </td>
                                            <td>
                                                <div>
                                                    <span><strong>Geral:</strong> {etapasInfo.geral.atual}/{etapasInfo.geral.total}</span><br />
                                                    {etapasInfo.arte && (
                                                        <span><strong>Arte:</strong> {etapasInfo.arte.atual}/{etapasInfo.arte.total}</span>
                                                    )}
                                                    {etapasInfo.arte && etapasInfo.galpao && <br />}
                                                    {etapasInfo.galpao && (
                                                        <span><strong>Galpão:</strong> {etapasInfo.galpao.atual}/{etapasInfo.galpao.total}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{pedido.statusAtual}</td>
                                            {shouldShowActionsColumn && (
                                                <td>
                                                    {pedido.statusAtual === "Concluído" && (userSetor === "CAIXA" || userSetor === "BALCAO") ? (
                                                        <button
                                                            className="entregar-button"
                                                            onClick={() => pedido.id && handleMarcarComoEntregue(pedido.id, pedido.statusAtual)}
                                                        >
                                                            Entregue
                                                        </button>
                                                    ) : podeEditarPedido(pedido) ? (
                                                        <button
                                                            className="edit-button"
                                                            onClick={() => navigate(`/editar-pedido/${pedido.id}`)}
                                                        >
                                                            Editar
                                                        </button>
                                                    ) : (
                                                        <span className="no-edit-permission">Sem permissão</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}