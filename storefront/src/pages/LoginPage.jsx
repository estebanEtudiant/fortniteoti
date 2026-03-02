import React, { useState } from 'react';
import { navigate } from '../lib/router.js';

export default function LoginPage({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(login, password);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Connexion</h2>
        <p className="auth-subtitle">Accedez a votre espace client</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email ou nom d'utilisateur</label>
            <input
              type="text"
              className="form-input"
              placeholder="votre@email.com"
              value={login}
              onChange={e => setLogin(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="Votre mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Connexion...' : 'Se Connecter'}
          </button>
        </form>
        <div className="auth-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            Pas encore de compte ?{' '}
            <button className="auth-footer-link" onClick={() => navigate('/register')}>
              Creer un compte
            </button>
          </span>
          <button className="auth-footer-link" onClick={() => navigate('/forgot-password')}>
            Mot de passe oublie ?
          </button>
        </div>
      </div>
    </div>
  );
}
