import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import axiosInstance from '../../axios';
import { baseUrl } from '../../config/apiConfig';

const GoogleG = () => (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);

/**
 * The front door. Google is the primary path; email/password rides the same
 * rails - the register step feeds the identical staged setup flow (username,
 * profile) and both mint the same access/refresh JWTs.
 */
const LoginPage = () => {
    const [loginUrl, setLoginUrl] = useState('');
    const [failed, setFailed] = useState(false);
    const [mode, setMode] = useState(null);          // null | 'signin' | 'register'
    const [identifier, setIdentifier] = useState('');
    const [firstName, setFirstName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState(null);
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    const fetchLoginUrl = useCallback(() => {
        setFailed(false);
        axiosInstance.get(`${baseUrl}/login`)
            .then((response) => setLoginUrl(response.data.login_url))
            .catch((error) => {
                console.error('Error fetching login URL: ', error);
                setFailed(true);
            });
    }, []);

    useEffect(() => { fetchLoginUrl(); }, [fetchLoginUrl]);

    const signIn = async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setFormError(null);
        try {
            const res = await axiosInstance.post('/auth/email-login', {
                identifier: identifier.trim(),
                password,
            });
            localStorage.setItem('accessToken', res.data.access_token);
            localStorage.setItem('refreshToken', res.data.refresh_token);
            // Full reload (like the OAuth TokenReceiver) so the user context
            // hydrates fresh from /users/me.
            window.location.href = '/';
        } catch (err) {
            setFormError(err.response?.data?.detail || 'Could not sign in');
            setBusy(false);
        }
    };

    const register = async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setFormError(null);
        try {
            const res = await axiosInstance.post('/auth/email-start', {
                email: email.trim(),
                password,
                ...(firstName.trim() ? { first_name: firstName.trim() } : {}),
            });
            // Token travels in router state, not the URL - same setup page the
            // Google flow uses (username, occupation, city).
            navigate('/user-setup', { state: { token: res.data.registration_token } });
        } catch (err) {
            const detail = err.response?.data?.detail;
            setFormError(typeof detail === 'string' ? detail : 'Could not start registration');
            setBusy(false);
        }
    };

    const switchMode = (next) => {
        setMode(next);
        setFormError(null);
        setPassword('');
    };

    return (
        <div className="login-page">
            <div className="login-hero">
                <div className="login-logo">ME <span className="login-logo-v">v2</span></div>
                <p className="login-tagline">Become the second version of yourself.</p>

                <ul className="login-points">
                    <li><span>⚡</span> Habits that pay out like a game: XP, streaks, levels</li>
                    <li><span>🏋️</span> A workout logger with the rest timer built in</li>
                    <li><span>📈</span> Progress you can see: strength, weight, consistency</li>
                </ul>

                {loginUrl && (
                    <a href={loginUrl} className="google-btn">
                        <GoogleG /> Continue with Google
                    </a>
                )}
                {!loginUrl && failed && (
                    <button className="login-retry" onClick={fetchLoginUrl}>
                        Could not reach the server - tap to retry
                    </button>
                )}
                {!loginUrl && !failed && <div className="login-loading">Connecting…</div>}

                <div className="login-divider"><span>or use email</span></div>

                <div className="login-mode-tabs">
                    <button
                        className={`login-mode-tab ${mode === 'signin' ? 'active' : ''}`}
                        onClick={() => switchMode(mode === 'signin' ? null : 'signin')}
                    >
                        Sign in
                    </button>
                    <button
                        className={`login-mode-tab ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => switchMode(mode === 'register' ? null : 'register')}
                    >
                        Create account
                    </button>
                </div>

                {mode === 'signin' && (
                    <form className="login-form" onSubmit={signIn}>
                        <input
                            type="text" placeholder="Email or username" autoComplete="username"
                            value={identifier} onChange={(e) => setIdentifier(e.target.value)} required
                        />
                        <input
                            type="password" placeholder="Password" autoComplete="current-password"
                            value={password} onChange={(e) => setPassword(e.target.value)} required
                        />
                        {formError && <div className="login-form-error">{formError}</div>}
                        <button type="submit" className="login-submit" disabled={busy}>
                            {busy ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                )}

                {mode === 'register' && (
                    <form className="login-form" onSubmit={register}>
                        <input
                            type="text" placeholder="First name (optional)" autoComplete="given-name"
                            maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)}
                        />
                        <input
                            type="email" placeholder="Email" autoComplete="email"
                            value={email} onChange={(e) => setEmail(e.target.value)} required
                        />
                        <input
                            type="password" placeholder="Password (8+ characters)" autoComplete="new-password"
                            minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required
                        />
                        {formError && <div className="login-form-error">{formError}</div>}
                        <button type="submit" className="login-submit" disabled={busy}>
                            {busy ? 'One moment…' : 'Continue →'}
                        </button>
                        <p className="login-form-hint">Next: pick your username and set up your player.</p>
                    </form>
                )}

                <p className="login-fineprint">
                    One account either way - Google and email sign-ins use the same player system.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
