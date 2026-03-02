import React, { useState } from 'react';
import { navigate } from '../lib/router.js';

export default function RegisterPage({ onRegister }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await onRegister(email, username, password);
      navigate('/verify-email-sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Creer un Compte</h2>
        <p className="auth-subtitle">Rejoignez la communaute 404 Tweaks</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input
              type="text"
              className="form-input"
              placeholder="PlayerOne"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="8 caracteres minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="Confirmez votre mot de passe"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creation...' : 'Creer Mon Compte'}
          </button>
        </form>
        <div className="auth-footer">
          Deja un compte ?{' '}
          <button className="auth-footer-link" onClick={() => navigate('/login')}>
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
