import React, { useState } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = getSearchParam('token');

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', color: '#e53e3e', marginBottom: '1rem' }}>
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
          <h2 className="auth-title">Lien invalide</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Ce lien est invalide ou a expire. Fais une nouvelle demande.
          </p>
          <button className="cta-primary" onClick={() => navigate('/forgot-password')}>
            Nouvelle demande
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">Mot de passe modifie !</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Ton mot de passe a ete reinitialise avec succes.
            </p>
            <button className="cta-primary" onClick={() => navigate('/login')}>
              Se connecter
            </button>
          </div>
        ) : (
          <>
            <h2 className="auth-title">Nouveau mot de passe</h2>
            <p className="auth-subtitle">Choisis un nouveau mot de passe securise</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="8 caracteres minimum"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
