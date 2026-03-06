import React, { useState } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-envelope-circle-check"></i>
            </div>
            <h2 className="auth-title">{t('forgot.sentTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {t('forgot.sentDescBefore')} <strong style={{ color: '#fff' }}>{t('forgot.sentDescHighlight')}</strong>{t('forgot.sentDescAfter')}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {t('forgot.spamTip')}
            </p>
            <button className="btn-outline" onClick={() => navigate('/login')}>
              {t('forgot.backToLogin')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="auth-title">{t('forgot.title')}</h2>
            <p className="auth-subtitle">{t('forgot.subtitle')}</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('forgot.emailLabel')}</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder={t('forgot.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? t('forgot.loading') : t('forgot.button')}
              </button>
            </form>
            <div className="auth-footer" style={{ textAlign: 'center' }}>
              <button className="auth-footer-link" onClick={() => navigate('/login')}>
                {t('forgot.backToLogin')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
