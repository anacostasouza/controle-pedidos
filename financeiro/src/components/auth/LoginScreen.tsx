import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, configured } from '../../api';

type LoginScreenProps = {
    loading: boolean;
    logging: boolean;
    error: string;
    onLogin: () => Promise<void>;
};

export function LoginScreen({ loading, logging, error, onLogin }: LoginScreenProps) {
    if (!configured) {
        return (
            <main className="login-page">
                <section className="login-card">
                    <div className="brand">
                        desenhar<span>FIN</span>
                    </div>
                    <h1>Configuração necessária.</h1>
                    <p>
                        Configure o arquivo <code>financeiro/.env.local</code> com as
                        credenciais do Firebase. Consulte o README para instruções.
                    </p>
                </section>
            </main>
        );
    }

    return (
        <main className="login-page">
            <section className="login-card">
                <div className="brand">
                    desenhar<span>FIN</span>
                </div>
                <p className="eyebrow">CONTROLE FINANCEIRO</p>
                <h1>
                    Visão clara.<br />
                    Decisões seguras.
                </h1>
                <p>
                    Gerencie contas a receber e a pagar da Desenhar Digital em um só
                    lugar.
                </p>
                {error && (
                    <p role="alert" className="error">
                        {error}
                    </p>
                )}
                {loading ? (
                    <p>Verificando seu acesso…</p>
                ) : (
                    <button
                        className="google-button"
                        disabled={logging}
                        onClick={() => void onLogin()}
                    >
                        {logging ? 'Entrando…' : 'Entrar com Google'}
                    </button>
                )}
            </section>
            <aside>
                <span>FINANCEIRO · DESENHAR DIGITAL</span>
                <h2>
                    Controle total.<br />
                    Resultado real.
                </h2>
                <p>
                    Acompanhe os lançamentos em tempo real e mantenha o fluxo de caixa
                    sempre atualizado.
                </p>
            </aside>
        </main>
    );
}

export function createGoogleLogin() {
    return () => signInWithPopup(auth, new GoogleAuthProvider());
}
