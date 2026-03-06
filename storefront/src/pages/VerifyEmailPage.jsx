import React, { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function VerifyEmailPage({ onRefresh }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const token = getSearchParam('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t('verify.invalidLink'));
      return;
    }

    api.verifyEmail(token)
      .then(() => {
        setStatus('success');
        if (onRefresh) onRefresh();
      })
      .catch((err) => {
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
            <h2 className="auth-title">{t('verify.loadingTitle')}</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">{t('verify.successTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              {t('verify.successDesc')}
            </p>
            <button className="cta-primary" style={{ padding: '0.9rem 2rem' }} onClick={() => navigate('/payment')}>
              <i className="fa-solid fa-cart-shopping" style={{ marginRight: 8 }}></i>
              {t('verify.buySoftware')}
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', color: '#e53e3e', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h2 className="auth-title">{t('verify.invalidTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {errorMsg || t('verify.invalidDesc')}
            </p>
            <button className="cta-primary" onClick={() => navigate('/verify-email-sent')}>
              {t('verify.resendEmail')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
