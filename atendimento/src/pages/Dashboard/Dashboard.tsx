/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { buscarTodosAtendimentos } from "../../services/AtendimentoServices";
import { HistoricoAtendimento } from "../Dashboard/components/HistoricoAtendimentos";
import HeaderPage from "../../components/layout/headerPage";
import "../../styles/dashboard.css";

export default function DashboardPage() {
    const [_atendimentos, setAtendimentos] = useState<any[]>([]);

    useEffect(() => {
        buscarTodosAtendimentos().then(setAtendimentos);
    }, []);

    return (
        <div>
            <HeaderPage />
            <div className="dashboard-container">
                <HistoricoAtendimento />
            </div>
        </div>
    );
}
