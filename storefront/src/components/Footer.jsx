import React from 'react';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function Footer({ discordUrl }) {
  const { t } = useTranslation();

  return (
    <footer>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <p className="footer-text">&copy; 2026 404 Tweaks. {t('footer.rights')}</p>
        <p className="footer-text">{t('footer.tagline')}</p>
        <div className="footer-links">
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="footer-link" style={{ color: '#b9beff' }}>
              <i className="fa-brands fa-discord" style={{ marginRight: 5 }}></i>Discord
            </a>
          )}
          <button className="footer-link" onClick={() => navigate('/comment-ca-marche')}>{t('nav.howItWorks')}</button>
          <button className="footer-link" onClick={() => navigate('/legal')}>{t('footer.legal')}</button>
          <button className="footer-link" onClick={() => navigate('/privacy')}>{t('footer.privacy')}</button>
          <button className="footer-link" onClick={() => navigate('/status')}>{t('footer.status')}</button>
          <button className="footer-link">{t('footer.support')}</button>
        </div>
      </div>
    </footer>
  );
}
