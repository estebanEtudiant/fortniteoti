import React, { useState } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function VerifyEmailSentPage({ customer }) {
  const { t } = useTranslation();
  const [resendLoading, setResendLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleResend = async () => {
    setResendLoading(true);
    setMsg('');
    try {
      await api.resendVerification();
      setMsg(t('verifySent.resentSuccess'));
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
        <h2 className="auth-title">{t('verifySent.title')}</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
          {t('verifySent.descBefore')}{' '}
          <strong style={{ color: '#fff' }}>{customer?.email || t('verifySent.fallbackEmail')}</strong>.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {t('verifySent.descAction')}<br />
          {t('verifySent.spamTip')}
        </p>
        {msg && <div className={msg.includes('!') ? 'form-success' : 'form-error'} style={{ marginBottom: '1rem' }}>{msg}</div>}
        {customer && (
          <button className="btn-outline" style={{ marginBottom: '0.75rem', width: '100%' }} onClick={handleResend} disabled={resendLoading}>
            {resendLoading ? t('verifySent.resending') : t('verifySent.resendButton')}
          </button>
        )}
        <button className="auth-footer-link" onClick={() => navigate('/profile')}>
          {t('verifySent.goProfile')}
        </button>
      </div>
    </div>
  );
}
