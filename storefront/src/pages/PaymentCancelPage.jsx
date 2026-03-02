import React from 'react';
import { navigate } from '../lib/router.js';

export default function PaymentCancelPage() {
  return (
    <div className="auth-page" style={{ padding: '3rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#888' }}>
          <i className="fa-solid fa-circle-xmark"></i>
        </div>
        <h2 className="auth-title">Paiement annule</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          Votre paiement a ete annule. Aucun montant n'a ete debite. Vous pouvez reessayer quand vous voulez.
        </p>
        <button className="cta-primary" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }} onClick={() => navigate('/payment')}>
          Reessayer le paiement
        </button>
      </div>
    </div>
  );
}
