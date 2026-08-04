import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { PokemonNav, PokemonFooter } from './pokemon/Shell.jsx';
import './pokemon.css';

export default function PokemonLoginPage({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  useEffect(() => { document.title = 'Connexion — CardRevive'; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await onLogin(login, password);
      navigate('/pokemon');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(''); setForgotBusy(true);
    try {
      await api.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div className="pkm">
      <PokemonNav />
      <div className="pkm-auth-wrap">
        <div className="pkm-auth-card">
          {!forgotMode ? (
            <>
              <h1>Connexion</h1>
              <p className="pkm-auth-sub">Accède à ton compte pour commander et suivre tes kits.</p>
              {error && <div className="pkm-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="pkm-field">
                  <label>Email ou identifiant</label>
                  <input value={login} onChange={(e) => setLogin(e.target.value)} required autoComplete="username" />
                </div>
                <div className="pkm-field">
                  <label>Mot de passe</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <button type="submit" className="pkm-btn pkm-btn-gold" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                  {loading ? 'Connexion…' : 'Se connecter'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button type="button" className="pkm-link-btn" onClick={() => { setForgotMode(true); setError(''); }}>Mot de passe oublié ?</button>
                </div>
              </form>
              <p className="pkm-auth-switch">
                Pas encore de compte ? <button onClick={() => navigate('/pokemon/register')}>Créer un compte</button>
              </p>
            </>
          ) : (
            <>
              <h1>Mot de passe oublié</h1>
              <p className="pkm-auth-sub">Entre ton email, on t'envoie un lien de réinitialisation.</p>
              {error && <div className="pkm-error">{error}</div>}
              {forgotSent ? (
                <p style={{ textAlign: 'center', color: 'var(--pkm-text-dim)', lineHeight: 1.6 }}>
                  Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Pense à vérifier tes spams.
                </p>
              ) : (
                <form onSubmit={handleForgot}>
                  <div className="pkm-field">
                    <label>Email</label>
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                  </div>
                  <button type="submit" className="pkm-btn pkm-btn-gold" disabled={forgotBusy} style={{ width: '100%', justifyContent: 'center' }}>
                    {forgotBusy ? 'Envoi…' : 'Envoyer le lien'}
                  </button>
                </form>
              )}
              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <button className="pkm-link-btn" onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}>← Retour à la connexion</button>
              </div>
            </>
          )}
        </div>
      </div>
      <PokemonFooter />
    </div>
  );
}
