import React, { useState } from "react";
import "../../../styles/ProfileSidebar.css";
import { FaUser, FaUsers, FaListAlt, FaBars } from "react-icons/fa";

type ProfileSidebarProps = {
  selected: "profile" | "users" | "log";
  setSelected: React.Dispatch<React.SetStateAction<"profile" | "users" | "log">>;
};

export default function ProfileSidebar({ selected, setSelected }: Readonly<ProfileSidebarProps>) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav id={`profile-sidebar${collapsed ? "-collapsed" : ""}`}>
      <button
        id="sidebar-toggle"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
      >
        <FaBars />
      </button>
      <ul>
        <li>
          <button
            id={`sidebar-btn-profile${selected === "profile" ? "-active" : ""}`}
            onClick={() => setSelected("profile")}
            title="Perfil"
          >
            <FaUser className="sidebar-icon" />
            {!collapsed && <span>Perfil</span>}
          </button>
        </li>
        <li>
          <button
            id={`sidebar-btn-users${selected === "users" ? "-active" : ""}`}
            onClick={() => setSelected("users")}
            title="Usuários"
          >
            <FaUsers className="sidebar-icon" />
            {!collapsed && <span>Usuários</span>}
          </button>
        </li>
        <li>
          <button
            id={`sidebar-btn-log${selected === "log" ? "-active" : ""}`}
            onClick={() => setSelected("log")}
            title="Log de Atendimentos"
          >
            <FaListAlt className="sidebar-icon" />
            {!collapsed && <span>Log de Atendimentos</span>}
          </button>
        </li>
      </ul>
    </nav>
  );
}