import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';

export default function VerifyEmailPage({ onRefresh }) {
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const token = getSearchParam('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Lien invalide.');
      return;
    }
    api.verifyEmail(token)
      .then(() => {
        setStatus('success');
        if (onRefresh) onRefresh();
      })
      .catch(err => {
        setStatus('error');
        setErrorMsg(err.message);
      });
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
            <h2 className="auth-title">Verification en cours...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">Email verifie !</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              Ton adresse email a ete verifiee avec succes. Tu peux maintenant acheter le logiciel.
            </p>
            <button className="cta-primary" style={{ padding: '0.9rem 2rem' }} onClick={() => navigate('/payment')}>
              <i className="fa-solid fa-cart-shopping" style={{ marginRight: 8 }}></i>
              Acheter le logiciel
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', color: '#e53e3e', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h2 className="auth-title">Lien invalide</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {errorMsg || 'Ce lien est invalide ou a expire.'}
            </p>
            <button className="cta-primary" onClick={() => navigate('/verify-email-sent')}>
              Renvoyer un email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
