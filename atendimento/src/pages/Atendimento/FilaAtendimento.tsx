/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  listenFilaAtendimento,
  getNomeAtendente,
  atualizarHistoricoAtendimento
} from "../../services/AtendimentoServices";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Login from "../Login/Login";
import HeaderPage from "../../components/layout/headerPage";
import "../../styles/FilaAtendimento.css";
import FilaAtendimentoList from "./components/FilaAtendimentoList";
import { tempoAguardandoSegundos } from "../../utils/timeUtils";

export function FilaAtendimento() {
  const [user, setUser] = useState<any>(null);
  const [fila, setFila] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizarId, setFinalizarId] = useState<string | null>(null);
  const [, setItemFinalizar] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => setFila((f) => [...f]), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => setUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsubscribe = listenFilaAtendimento((novaFila) => {
        setFila(novaFila);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleFinalizar = (item: any) => {
    setItemFinalizar(item);
    setFinalizarId(item.id);
  };

  const handleChamarAtendimento = async (id: string) => {
    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }
    const atendente = await getNomeAtendente(user.uid);
    if (!atendente) {
      alert("Não foi possível identificar o atendente.");
      return;
    }
    const db = getFirestore();
    await updateDoc(doc(db, "atendimentos", id), {
      status: "Em Atendimento",
      atendente: atendente,
      atendenteUid: user.uid,
      inicioAtendimento: serverTimestamp(),
    });
    await atualizarHistoricoAtendimento(id, "Em Atendimento", atendente);
  };

  const filaOrdenada = fila.slice().sort((a, b) => {
    if (a.prioridade === "preferencial" && b.prioridade !== "preferencial")
      return -1;
    if (a.prioridade !== "preferencial" && b.prioridade === "preferencial")
      return 1;
    return tempoAguardandoSegundos(b) - tempoAguardandoSegundos(a);
  });

  const filaAguardando = filaOrdenada.filter(
    (item) => item.status === "Aguardando"
  );
  const filaEmAtendimento = filaOrdenada.filter(
    (item) => item.status === "Em Atendimento"
  );

  if (!user) return <Login />;
  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <HeaderPage />
      <div className="fila-atendimento-container">
        <div id="fila-atendimento-header">
          Total na fila: {filaAguardando.length}
        </div>

        <h3>Fila de Espera</h3>
        <FilaAtendimentoList
          fila={filaAguardando}
          finalizarId={finalizarId}
          setFinalizarId={setFinalizarId}
          handleFinalizar={handleFinalizar}
          handleChamarAtendimento={handleChamarAtendimento}
          setFila={setFila}
        />

        {filaEmAtendimento.length > 0 && (
          <>
            <h3>Em Atendimento</h3>
            <FilaAtendimentoList
              fila={filaEmAtendimento}
              finalizarId={finalizarId}
              setFinalizarId={setFinalizarId}
              handleFinalizar={handleFinalizar}
              handleChamarAtendimento={handleChamarAtendimento}
              setFila={setFila}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default FilaAtendimento;
