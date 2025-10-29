import "../../styles/Loading.css";

interface LoadingProps {
    message?: string;
}

export function Loading({ message = "Carregando..." }: Readonly<LoadingProps>) {
    return (
        <div className="loading-container">
            <div className="spinner"></div>
            <span className="loading-text">{message}</span>
        </div>
    );
}