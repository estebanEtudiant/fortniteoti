import React, { useState } from 'react';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

function LangSwitcher() {
  const { lang, setLang } = useTranslation();
  const next = lang === 'fr' ? 'en' : 'fr';
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(next)}
      title={next === 'en' ? 'Switch to English' : 'Passer en français'}
    >
      <span className={lang === 'fr' ? 'lang-toggle-active' : 'lang-toggle-dim'}>FR</span>
      <span className="lang-toggle-sep">|</span>
      <span className={lang === 'en' ? 'lang-toggle-active' : 'lang-toggle-dim'}>EN</span>
    </button>
  );
}

export default function Header({ customer, onLogout, discordUrl }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();

  const handleNav = (path) => { setMenuOpen(false); navigate(path); };

  return (
    <header>
      <div className="header-content">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="404 Tweaks" height="38" style={{ display: 'block' }} />
        </div>

        {/* Desktop nav */}
        <div className="header-nav">
          <LangSwitcher />
          <button className="header-link" onClick={() => navigate('/comment-ca-marche')}>
            {t('nav.howItWorks')}
          </button>
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="discord-btn">
              <i className="fa-brands fa-discord"></i>Discord
            </a>
          )}
          {customer ? (
            <>
              <button className="header-link" onClick={() => navigate('/profile')}>
                <i className="fa-solid fa-user" style={{ marginRight: 6 }}></i>
                {customer.displayName || customer.username}
              </button>
              <button className="header-link" onClick={onLogout}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <button className="header-link" onClick={() => navigate('/login')}>{t('nav.login')}</button>
              <button className="cta-header" onClick={() => navigate('/register')}>{t('nav.register')}</button>
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className={`hamburger-btn${menuOpen ? ' hamburger-btn--open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="mobile-menu">
          <button className="mobile-nav-link" onClick={() => handleNav('/comment-ca-marche')}>{t('nav.howItWorks')}</button>
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
              <i className="fa-brands fa-discord" style={{ marginRight: 6 }}></i>Discord
            </a>
          )}
          {customer ? (
            <>
              <button className="mobile-nav-link" onClick={() => handleNav('/profile')}>
                <i className="fa-solid fa-user" style={{ marginRight: 6 }}></i>
                {customer.displayName || customer.username}
              </button>
              <button className="mobile-nav-link" onClick={() => { setMenuOpen(false); onLogout(); }}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <button className="mobile-nav-link" onClick={() => handleNav('/login')}>{t('nav.login')}</button>
              <button className="mobile-nav-link mobile-nav-cta" onClick={() => handleNav('/register')}>{t('nav.register')}</button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
