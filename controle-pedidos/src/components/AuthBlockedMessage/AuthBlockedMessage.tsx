interface AuthBlockedMessageProps {
    accountDisabled?: boolean;
    authDenialReason?: string | null;
}

export function AuthBlockedMessage({ accountDisabled, authDenialReason }: Readonly<AuthBlockedMessageProps>) {
    if (!authDenialReason) return null;

    const isDisabled = accountDisabled || authDenialReason.includes("desativada");

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: isDisabled ? "#fef3f3" : "#fff3cd",
            zIndex: 9999,
            textAlign: "center",
            padding: "20px"
        }}>
            <div style={{ fontSize: "5rem", marginBottom: "30px" }}>
                {isDisabled ? "🔒" : "🚫"}
            </div>
            <h2 style={{
                color: isDisabled ? "#c41e3a" : "#5f1919",
                marginBottom: "15px",
                fontSize: "2rem",
                margin: "0 0 15px 0"
            }}>
                {isDisabled ? "Conta Desativada" : "Acesso Negado"}
            </h2>
            <p style={{
                color: "#333",
                fontSize: "1.1rem",
                maxWidth: "500px",
                lineHeight: "1.6",
                margin: "0 0 20px 0"
            }}>
                {authDenialReason}
            </p>
            <p style={{
                color: "#666",
                fontSize: "0.95rem",
                margin: "0"
            }}>
                Você será redirecionado para login em alguns instantes...
            </p>
        </div>
    );
}
