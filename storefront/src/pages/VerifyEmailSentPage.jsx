import React, { useState } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';

export default function VerifyEmailSentPage({ customer }) {
  const [resendLoading, setResendLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleResend = async () => {
    setResendLoading(true);
    setMsg('');
    try {
      await api.resendVerification();
      setMsg('Email renvoye ! Verifie ta boite mail (et tes spams).');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem' }}>
          <i className="fa-solid fa-envelope-circle-check"></i>
        </div>
        <h2 className="auth-title">Verifie ton email !</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
          Un lien de verification a ete envoye a{' '}
          <strong style={{ color: '#fff' }}>{customer?.email || 'ton adresse email'}</strong>.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Clique sur le lien dans l'email pour verifier ton compte et pouvoir acheter.<br/>
          Pense a verifier tes spams.
        </p>
        {msg && <div className={msg.includes('renvoye') ? 'form-success' : 'form-error'} style={{ marginBottom: '1rem' }}>{msg}</div>}
        {customer && (
          <button className="btn-outline" style={{ marginBottom: '0.75rem', width: '100%' }} onClick={handleResend} disabled={resendLoading}>
            {resendLoading ? 'Envoi...' : 'Renvoyer l\'email de verification'}
          </button>
        )}
        <button className="auth-footer-link" onClick={() => navigate('/profile')}>
          Aller a mon profil
        </button>
      </div>
    </div>
  );
}
