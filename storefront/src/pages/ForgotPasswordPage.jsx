import React, { useState } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-envelope-circle-check"></i>
            </div>
            <h2 className="auth-title">Email envoye !</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Si un compte existe avec cette adresse, tu vas recevoir un lien de reinitialisation valable <strong style={{ color: '#fff' }}>1 heure</strong>.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Pense a verifier tes spams.
            </p>
            <button className="btn-outline" onClick={() => navigate('/login')}>
              Retour a la connexion
            </button>
          </div>
        ) : (
          <>
            <h2 className="auth-title">Mot de passe oublie</h2>
            <p className="auth-subtitle">Saisis ton email pour recevoir un lien de reinitialisation</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Adresse email</label>
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
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
            <div className="auth-footer" style={{ textAlign: 'center' }}>
              <button className="auth-footer-link" onClick={() => navigate('/login')}>
                Retour a la connexion
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
