/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { StatusPedido, Pedido } from "../../../types/Pedidos";
import {
  type TipoServicoValue,
  type SubTipoServicoValue,
} from "../../../types/Servicos";
import { capitalizeWords } from "../../../utils/formatUtils";
import { fetchAllServicosStatus } from "../../../utils/firestoreUtils";

interface DashboardHeaderProps {
  pedidosFiltrados: Pedido[];
  buscaCliente: string;
  setBuscaCliente: (val: string) => void;
  filtroServico: TipoServicoValue | "";
  setFiltroServico: (val: TipoServicoValue | "") => void;
  filtroSubTipo: SubTipoServicoValue | "";
  setFiltroSubTipo: (val: SubTipoServicoValue | "") => void;
  filtroStatus: string;
  setFiltroStatus: (val: string) => void;
  filtroAtrasados: boolean;
  setFiltroAtrasados: (val: boolean) => void;
  filtroRequerArte: string;
  setFiltroRequerArte: (val: string) => void;
  filtroRequerGalpao: string;
  setFiltroRequerGalpao: (val: string) => void;
  filtroResponsavel: string;
  setFiltroResponsavel: (val: string) => void;
  subTipoOptions: { value: SubTipoServicoValue; label: string }[];
  statusOptions: StatusPedido[];
  responsaveisOptions: { uid: string; displayName: string }[];
  userSetor: string;
  navigate: any;
  totalPedidosFiltrados: number;
}

export function DashboardHeader(props: Readonly<DashboardHeaderProps>) {
  const [tiposServicoOptions, setTiposServicoOptions] = useState<
    { value: TipoServicoValue; label: string }[]
  >([]);

  // Carrega tipos de serviço do Firestore
  useEffect(() => {
    fetchAllServicosStatus().then((servicos) => {
      const tiposUnicos = Array.from(
        new Set(servicos.filter((s) => s.tipo !== "GALPAO").map((s) => s.tipo))
      ) as TipoServicoValue[];

      setTiposServicoOptions(tiposUnicos.map((t) => ({ value: t, label: t })));
    });
  }, []);

  // Atualiza subtipos quando muda o tipo selecionado
  const handleTipoChange = (tipoSelecionado: TipoServicoValue | "") => {
    props.setFiltroServico(tipoSelecionado);
    props.setFiltroSubTipo("");

    fetchAllServicosStatus().then((servicos) => {
      const subTiposDoTipo = servicos
        .filter((s) => s.tipo === tipoSelecionado && s.subTipo)
        .map((s) => ({
          value: s.subTipo as SubTipoServicoValue, 
          label: s.subTipo!,
        }));

      props.setFiltroSubTipo("");
      props.subTipoOptions.splice(
        0,
        props.subTipoOptions.length,
        ...subTiposDoTipo
      );
    });
  };

  return (
    <div className="header-dashboard">
      <div className="dashboard-header-content">
        <h2>Pedidos ({props.totalPedidosFiltrados})</h2>
        <button
          className="new-order-button"
          onClick={() => props.navigate("/novo-pedido")}
        >
          <span className="plus-icon">+ </span> Novo Pedido
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Buscar cliente ou nº do pedido..."
          value={props.buscaCliente}
          onChange={(e) => props.setBuscaCliente(e.target.value)}
        />

        <select
          value={props.filtroServico}
          onChange={(e) =>
            handleTipoChange(e.target.value as TipoServicoValue | "")
          }
        >
          <option value="">Todos os serviços</option>
          {tiposServicoOptions.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {capitalizeWords(tipo.label)}
            </option>
          ))}
        </select>

        {props.subTipoOptions.length > 0 && (
          <select
            value={props.filtroSubTipo}
            onChange={(e) =>
              props.setFiltroSubTipo(e.target.value as SubTipoServicoValue | "")
            }
          >
            <option value="">Todos os subtipos</option>
            {props.subTipoOptions.map((sub) => (
              <option key={sub.value} value={sub.value}>
                {sub.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={props.filtroStatus}
          onChange={(e) => props.setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {props.statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={props.filtroResponsavel}
          onChange={(e) => props.setFiltroResponsavel(e.target.value)}
        >
          <option value="">Todos os responsáveis</option>
          {props.responsaveisOptions.map((user) => (
            <option key={user.uid} value={user.uid}>
              {user.displayName}
            </option>
          ))}
        </select>

        {props.userSetor === "ARTE" && (
            <select
              value={props.filtroRequerArte}
              onChange={(e) => {
                props.setFiltroRequerArte(e.target.value);
              }}
            >
              <option value="">Requer Arte (Todos)</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
        )}

        {props.userSetor === "GALPAO" && (
          <select
            value={props.filtroRequerGalpao}
            onChange={(e) => props.setFiltroRequerGalpao(e.target.value)}
          >
            <option value="">Requer Galpão (Todos)</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        )}

        <div className="checkbox-wrapper-4">
          <input
            className="inp-cbx"
            id="filtroAtrasados"
            type="checkbox"
            checked={props.filtroAtrasados}
            onChange={(e) => props.setFiltroAtrasados(e.target.checked)}
          />
          <label className="cbx" htmlFor="filtroAtrasados">
            <span>
              <svg width="12px" height="10px">
                <use xlinkHref="#check-4"></use>
              </svg>
            </span>
            <span>Mostrar apenas pedidos atrasados</span>
          </label>
          <svg className="inline-svg">
            <symbol id="check-4" viewBox="0 0 12 10">
              <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
            </symbol>
          </svg>
        </div>
      </div>
    </div>
  );
}
