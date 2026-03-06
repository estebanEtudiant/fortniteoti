import React from 'react';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function ExitIntentPopup({ onClose, discordUrl }) {
  const { t } = useTranslation();

  return (
    <div className="exit-overlay" onClick={onClose}>
      <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="exit-close" onClick={onClose} aria-label={t('common.close')}>x</button>
        <div className="exit-icon">??</div>
        <h2 className="exit-title">{t('exit.title')}</h2>
        <p className="exit-desc">
          {t('exit.desc.before')} <strong>{t('exit.desc.highlight')}</strong> {t('exit.desc.after')}
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
              {t('exit.joinDiscord')}
            </a>
          )}
          <button
            className="btn-outline"
            style={{ padding: '0.75rem', fontSize: '0.9rem' }}
            onClick={() => {
              onClose();
              navigate('/payment');
            }}
          >
            <i className="fa-solid fa-cart-shopping" style={{ marginRight: 8 }}></i>
            {t('exit.seeOffers')}
          </button>
        </div>
        <p className="exit-skip" onClick={onClose}>{t('exit.skip')}</p>
      </div>
    </div>
  );
}
