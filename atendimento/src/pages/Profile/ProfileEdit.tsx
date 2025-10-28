/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { getAuth, updateProfile } from "firebase/auth";
import { db } from "../../services/firebase";

import "../../styles/ProfileEdit.css";

import { setores, type SetorValue } from "../../types/Setores";
import type { Usuario } from "../../types/Usuario";
import ProfileForm from "./components/ProfileForm";
import LogAtendimentosList from "./components/LogAtendimentosList";
import UserList from "./components/UserList";
import ProfileSidebar from "./components/ProfileSidebar";

export default function ProfileEditPage(): JSX.Element {
  const navigate = useNavigate();

  const [profileName, setProfileName] = useState<string>("");
  const [setor, setSetor] = useState<SetorValue | "">("");
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);

  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState<string>("");
  const [editingUserSetor, setEditingUserSetor] = useState<SetorValue | "">("");
  const [editingUserStatus, setEditingUserStatus] = useState<boolean>(true);

  const [logs, setLogs] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [selected, setSelected] = useState<"profile" | "users" | "log">("profile");

  const setoresAdminLabels = useMemo(() => ["Suporte", "Gestão"], []);
  const isCurrentUserAdmin = useMemo(
    () => setoresAdminLabels.includes(usuarioLogado?.setorNome ?? ""),
    [usuarioLogado, setoresAdminLabels]
  );

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const fetchInitialData = async () => {
      setLoading(true);
      setError("");

      if (!currentUser) {
        navigate("/");
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const currentSetorObj = setores.find((s) => s.value === data.setor);
          const currentSetorLabel = currentSetorObj?.label ?? "";

          const loadedLoggedUser: Usuario = {
            usuarioID: currentUser.uid,
            displayName: data.displayName ?? "",
            email: data.email ?? currentUser.email ?? "",
            setor: (data.setor as SetorValue) ?? "",
            setorNome: currentSetorLabel,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(),
            statusConta: data.statusConta ?? true,
          };
          setUsuarioLogado(loadedLoggedUser);
          setProfileName(loadedLoggedUser.displayName);
          setSetor(loadedLoggedUser.setor as SetorValue);

          if (setoresAdminLabels.includes(loadedLoggedUser.setorNome)) {
            const usersCollectionRef = collection(db, "usuarios");
            const q = query(usersCollectionRef);
            const querySnapshot = await getDocs(q);
            const loadedUsers: Usuario[] = [];
            querySnapshot.forEach((docSnap) => {
              const userData = docSnap.data();
              const userSetorObj = setores.find(
                (s) => s.value === userData.setor
              );
              const userSetorLabel = userSetorObj?.label ?? "";
              loadedUsers.push({
                usuarioID: docSnap.id,
                displayName: userData.displayName ?? "",
                email: userData.email ?? "",
                setor: (userData.setor as SetorValue) ?? "",
                setorNome: userSetorLabel,
                createdAt:
                  userData.createdAt instanceof Timestamp
                    ? userData.createdAt.toDate()
                    : new Date(),
                updatedAt:
                  userData.updatedAt instanceof Timestamp
                    ? userData.updatedAt.toDate()
                    : new Date(),
                statusConta: userData.statusConta ?? true,
              });
            });
            setAllUsers(loadedUsers);
          }
        } else {
          setError("Perfil não encontrado.");
          navigate("/");
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate, setoresAdminLabels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const targetUserId = editingUserId ?? usuarioLogado?.usuarioID ?? "";
      if (!targetUserId) {
        setError("Usuário inválido.");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "usuarios", targetUserId);

      if (editingUserId) {
        await updateDoc(userDocRef, {
          displayName: editingUserName,
          setor: editingUserSetor,
          setorNome:
            setores.find((s) => s.value === editingUserSetor)?.label ?? "",
          statusConta: editingUserStatus,
          updatedAt: Timestamp.now(),
        });

        setAllUsers((prev) =>
          prev.map((u) =>
            u.usuarioID === editingUserId
              ? {
                  ...u,
                  displayName: editingUserName,
                  setor: editingUserSetor,
                  setorNome:
                    setores.find((s) => s.value === editingUserSetor)?.label ??
                    "",
                  statusConta: editingUserStatus,
                  updatedAt: new Date(),
                }
              : u
          )
        );

        setEditingUserId(null);
      } else {
        await updateDoc(userDocRef, {
          displayName: profileName,
          setor,
          setorNome: setores.find((s) => s.value === setor)?.label ?? "",
          updatedAt: Timestamp.now(),
        });

        const auth = getAuth();
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: profileName });
        }

        setUsuarioLogado((prev) =>
          prev
            ? {
                ...prev,
                displayName: profileName,
                setor,
                setorNome: setores.find((s) => s.value === setor)?.label ?? "",
                updatedAt: new Date(),
              }
            : null
        );
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOtherUser = (user: Usuario) => {
    if (!isCurrentUserAdmin) return;
    setEditingUserId(user.usuarioID);
    setEditingUserName(user.displayName);
    setEditingUserSetor(user.setor as SetorValue | "");
    setEditingUserStatus(user.statusConta);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserName("");
    setEditingUserSetor("");
    setEditingUserStatus(true);
  };

  useEffect(() => {
    const fetchLogs = async () => {
      const q = query(
        collection(db, "logAtendimentos"),
        orderBy("data", "desc")
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="profile-page loading">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex" }}>
      {isCurrentUserAdmin && (
        <ProfileSidebar selected={selected} setSelected={setSelected} />
      )}
      <div
        className="settings-page"
      >
        <main className="profile-content">
          {selected === "profile" && (
            <ProfileForm
              profileName={profileName}
              setProfileName={setProfileName}
              setor={setor}
              setSetor={setSetor}
              handleSubmit={handleSubmit}
              error={error}
            />
          )}

          {isCurrentUserAdmin && selected === "users" && (
            <UserList
              allUsers={allUsers}
              usuarioLogado={usuarioLogado}
              handleEditOtherUser={handleEditOtherUser}
              editingUserId={editingUserId}
              editingUserName={editingUserName}
              setEditingUserName={setEditingUserName}
              editingUserSetor={editingUserSetor}
              setEditingUserSetor={setEditingUserSetor}
              editingUserStatus={editingUserStatus}
              setEditingUserStatus={setEditingUserStatus}
              handleSubmit={handleSubmit}
              handleCancelEdit={handleCancelEdit}
              error={error}
            />
          )}

          {isCurrentUserAdmin && selected === "log" && (
            <LogAtendimentosList logs={logs} />
          )}

          <div id="logo">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="102"
              height="136"
              viewBox="0 0 202 236"
              fill="none"
            >
              <path
                id="logo-path1"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.9613 182.455C4.33308 168.254 0 152.019 0 134.77C0 79.0324 45.1845 33.8477 100.922 33.8477C104.337 33.8477 107.711 34.0199 111.038 34.3524C111.035 34.5303 111.034 34.7086 111.034 34.8869V56.814C111.034 57.2522 111.053 57.8652 111.09 58.6389C111.111 59.0798 111.144 59.5583 111.187 60.0716C111.15 60.8017 111.118 61.6343 111.092 62.5771C111.055 63.8787 111.036 64.8429 111.036 65.4378H111.053L111.049 117.964C111.048 132.775 108.386 145.725 103.62 156.5C98.5565 167.95 91.1101 176.909 81.9714 182.983C72.8402 189.051 61.9832 192.281 50.0899 192.28C39.8112 192.28 28.7175 189.866 17.2382 184.789L11.9613 182.455Z"
                fill="#A43234"
              />
              <path
                id="logo-path2"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.4762 188.793C33.3935 217.073 64.966 235.848 100.922 235.848C156.746 235.848 202 190.595 202 134.771V56.814V34.8869C202 34.6153 201.996 34.3452 201.99 34.075C201.988 33.9946 201.985 33.9148 201.983 33.8347C201.976 33.6373 201.969 33.441 201.96 33.2446C201.956 33.161 201.952 33.0775 201.947 32.9939C201.936 32.7671 201.921 32.5403 201.904 32.3145C201.901 32.2732 201.899 32.232 201.896 32.1909C201.875 31.9243 201.851 31.6587 201.824 31.3943C201.817 31.3227 201.809 31.2514 201.802 31.1798C201.78 30.9828 201.758 30.7865 201.733 30.5906C201.723 30.5065 201.712 30.4225 201.702 30.3389C201.675 30.139 201.647 29.94 201.617 29.7416C201.607 29.675 201.598 29.609 201.588 29.5424C201.548 29.2852 201.505 29.0286 201.459 28.7727C201.448 28.7115 201.436 28.6506 201.425 28.5897C201.389 28.3907 201.35 28.1923 201.31 27.9948C201.293 27.9098 201.275 27.8252 201.258 27.7407C201.219 27.5561 201.178 27.3721 201.137 27.1886C201.119 27.1132 201.103 27.0386 201.086 26.9633C201.026 26.7111 200.965 26.4597 200.9 26.2095C200.892 26.1777 200.883 26.1456 200.875 26.1137C200.817 25.8936 200.757 25.674 200.695 25.4554C200.673 25.3786 200.651 25.3018 200.629 25.2249C200.577 25.0444 200.522 24.8646 200.467 24.6851C200.444 24.6089 200.42 24.5321 200.397 24.4563C200.327 24.2347 200.255 24.0139 200.181 23.7948C200.172 23.7691 200.164 23.7433 200.155 23.7175C200.072 23.4747 199.986 23.2335 199.899 22.9927C199.873 22.9231 199.847 22.8535 199.82 22.7834C199.754 22.6065 199.687 22.4297 199.618 22.2539C199.588 22.1786 199.559 22.1034 199.529 22.0281C199.453 21.8369 199.374 21.6461 199.294 21.4564C199.274 21.4079 199.255 21.3594 199.234 21.3116C199.134 21.0769 199.032 20.8439 198.927 20.612C198.9 20.5516 198.871 20.4914 198.843 20.431C198.763 20.2552 198.681 20.0804 198.597 19.9063L198.491 19.686C198.407 19.5144 198.322 19.3433 198.235 19.1732C198.204 19.1123 198.174 19.051 198.142 18.9901C198.026 18.7653 197.908 18.542 197.788 18.3204C197.763 18.2746 197.737 18.2297 197.712 18.1844C197.613 18.0049 197.513 17.8265 197.412 17.6487C197.372 17.5781 197.33 17.508 197.29 17.4373C197.197 17.2791 197.104 17.1218 197.009 16.9651C196.97 16.8987 196.93 16.8321 196.889 16.7656C196.757 16.5501 196.623 16.3352 196.486 16.1223L196.467 16.0929C196.336 15.8898 196.203 15.6886 196.068 15.4886C196.025 15.4237 195.98 15.3588 195.936 15.2942C195.833 15.1432 195.728 14.9927 195.623 14.8438C195.577 14.7782 195.531 14.7133 195.485 14.6483C195.359 14.472 195.231 14.2972 195.101 14.1236C195.079 14.0935 195.057 14.0627 195.034 14.0328C194.883 13.8312 194.729 13.6317 194.574 13.4337C194.529 13.377 194.485 13.3208 194.44 13.2646C194.324 13.1187 194.207 12.9739 194.089 12.8295C194.038 12.7677 193.987 12.7053 193.936 12.6434C193.807 12.4893 193.678 12.3363 193.547 12.1846C193.512 12.1433 193.477 12.1016 193.441 12.0603C193.275 11.8695 193.107 11.6805 192.937 11.4933C192.898 11.45 192.858 11.4072 192.818 11.3644C192.684 11.218 192.549 11.0727 192.412 10.9282C192.359 10.8715 192.304 10.8148 192.25 10.7586C192.119 10.6221 191.987 10.487 191.854 10.3525C191.805 10.3035 191.757 10.254 191.707 10.205C191.529 10.026 191.347 9.84921 191.164 9.67457C191.141 9.65176 191.117 9.63012 191.093 9.60747C190.933 9.45481 190.77 9.30382 190.607 9.15434C190.549 9.10217 190.492 9.05017 190.434 8.99817C190.297 8.87436 190.159 8.75223 190.02 8.6306C189.963 8.58111 189.907 8.53162 189.85 8.48263C189.662 8.32024 189.473 8.15886 189.281 7.99999L189.27 7.99127C189.075 7.83039 188.878 7.67219 188.68 7.515C188.618 7.46702 188.557 7.41954 188.496 7.37156C188.353 7.26033 188.21 7.14995 188.065 7.04124C188 6.99175 187.934 6.94226 187.869 6.89328C187.701 6.76897 187.533 6.64583 187.364 6.52454C187.326 6.49786 187.29 6.47052 187.252 6.44368C187.046 6.29723 186.839 6.15345 186.629 6.01119C186.574 5.97344 186.519 5.93687 186.464 5.8998C186.304 5.7931 186.144 5.68792 185.984 5.58324C185.916 5.53996 185.85 5.49667 185.782 5.4539C185.618 5.34921 185.453 5.24604 185.288 5.14404C185.234 5.11099 185.18 5.07744 185.126 5.04455C184.908 4.91202 184.688 4.78218 184.468 4.65485C184.427 4.63103 184.385 4.60788 184.345 4.58422C184.165 4.48155 183.984 4.38005 183.802 4.28057C183.731 4.24132 183.66 4.20273 183.589 4.16448C183.422 4.07423 183.254 3.98566 183.086 3.89792C183.024 3.86604 182.963 3.8335 182.901 3.80162C182.671 3.68452 182.441 3.5691 182.208 3.4567L182.171 3.43909C181.955 3.33458 181.737 3.23241 181.517 3.13242C181.446 3.09937 181.374 3.06801 181.302 3.03546C181.133 2.9598 180.963 2.88498 180.793 2.81184C180.72 2.7803 180.648 2.74943 180.575 2.7184C180.357 2.62562 180.137 2.53604 179.916 2.4483L179.865 2.42716L179.845 2.41894L179.844 2.41944C175.895 0.858432 171.6 7.62939e-06 167.113 7.62939e-06H150.301C131.113 7.62939e-06 115.414 15.699 115.414 34.8869V56.814C115.414 57.8998 115.467 58.9736 115.565 60.035C115.468 61.7848 115.416 63.583 115.416 65.4378L115.412 117.963C115.408 181.169 68.7649 212.36 15.4762 188.793Z"
                fill="#4B4B4D"
              />
            </svg>
          </div>
        </main>
      </div>
    </div>
  );
}
