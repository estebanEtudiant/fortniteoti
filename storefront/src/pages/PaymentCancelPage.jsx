import React from 'react';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function PaymentCancelPage() {
  const { t } = useTranslation();

  return (
    <div className="auth-page" style={{ padding: '3rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#888' }}>
          <i className="fa-solid fa-circle-xmark"></i>
        </div>
        <h2 className="auth-title">{t('paymentCancel.title')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          {t('paymentCancel.desc')}
        </p>
        <button className="cta-primary" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }} onClick={() => navigate('/payment')}>
          {t('paymentCancel.retry')}
        </button>
      </div>
    </div>
  );
}
