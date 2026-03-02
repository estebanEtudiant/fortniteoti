import React from 'react';
import { navigate } from '../lib/router.js';

export default function ExitIntentPopup({ onClose, discordUrl }) {
  return (
    <div className="exit-overlay" onClick={onClose}>
      <div className="exit-modal" onClick={e => e.stopPropagation()}>
        <button className="exit-close" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="exit-icon">🚀</div>
        <h2 className="exit-title">Attends ! Avant de partir...</h2>
        <p className="exit-desc">
          Rejoins notre Discord gratuit et reçois <strong>+10 tweaks exclusifs</strong> que le logiciel n'applique pas automatiquement.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          {discordUrl && (
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.9rem', textDecoration: 'none', fontSize: '1rem' }}
              onClick={onClose}
            >
              <i className="fa-brands fa-discord"></i>
              Rejoindre le Discord gratuit
            </a>
          )}
          <button
            className="btn-outline"
            style={{ padding: '0.75rem', fontSize: '0.9rem' }}
            onClick={() => { onClose(); navigate('/payment'); }}
          >
            <i className="fa-solid fa-cart-shopping" style={{ marginRight: 8 }}></i>
            Voir les offres
          </button>
        </div>
        <p className="exit-skip" onClick={onClose}>Non merci, je veux rester sans performances</p>
      </div>
    </div>
  );
}
