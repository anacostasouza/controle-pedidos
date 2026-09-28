import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, localEmulator } from '../../services/crmApi';
import { AsyncForm, Field, str } from '../../components';

type LoginScreenProps = {
    configured: boolean;
    signed: boolean;
    loading: boolean;
    logging: boolean;
    error: string;
    onLogin: () => Promise<void>;
    onRetry: () => Promise<void>;
    onSwitchAccount: () => Promise<void>;
};

export function LoginScreen({ configured, signed, loading, logging, error, onLogin, onRetry, onSwitchAccount }: LoginScreenProps) {
    if (!configured) {
        return <main className="login-page"><section className="login-card"><div className="brand">desenhar<span>CRM</span></div><h1>Seu próximo negócio começa aqui.</h1><p>Configure o arquivo <code>crm/.env.local</code> com o mesmo projeto Firebase do sistema existente. As instruções estão em README-CRM.md.</p></section></main>;
    }

    return <main className="login-page"><section className="login-card"><div className="brand">desenhar<span>CRM</span></div><p className="eyebrow">RELACIONAMENTOS QUE GERAM RESULTADOS</p><h1>Uma boa conversa.<br />Uma nova oportunidade.</h1><p>Sua carteira, suas propostas e o próximo passo de cada cliente em um só lugar.</p>{error && <p role="alert" className="error">{error}</p>}{loading ? <p>Verificando seu acesso…</p> : signed ? <><p>O acesso usa o cadastro de usuários da Desenhar.</p><button className="primary" onClick={() => void onRetry()}>Tentar novamente</button><button onClick={() => void onSwitchAccount()}>Trocar conta</button></> : <><button className="google-button" disabled={logging} onClick={() => void onLogin()}>{logging ? 'Entrando…' : 'Entrar com Google'}</button>{localEmulator && <details><summary>Acesso local de teste</summary><AsyncForm label="Entrar no emulador" save={async (f) => { await signInWithEmailAndPassword(auth, str(f, 'email'), str(f, 'password')); }}><Field label="E-mail"><input name="email" type="email" required /></Field><Field label="Senha"><input name="password" type="password" required /></Field></AsyncForm></details>}</>}</section><aside><span>01 / ORGANIZE</span><h2>Mais clareza.<br />Mais oportunidades.</h2><p>Transforme cada acompanhamento em um próximo passo.</p></aside></main>;
}

export function createGoogleLogin() {
    return () => signInWithPopup(auth, new GoogleAuthProvider());
}
