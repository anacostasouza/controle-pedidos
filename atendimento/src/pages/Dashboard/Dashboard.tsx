import { HistoricoAtendimento } from "../Dashboard/components/HistoricoAtendimentos";
import HeaderPage from "../../components/layout/headerPage";
import "../../styles/dashboard.css";

export default function DashboardPage() {
    return (
        <div>
            <HeaderPage />
            <div className="dashboard-container">
                <HistoricoAtendimento />
            </div>
        </div>
    );
}
