import React, { useState } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = getSearchParam('token');

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', color: '#e53e3e', marginBottom: '1rem' }}>
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
          <h2 className="auth-title">{t('reset.invalidTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {t('reset.invalidDesc')}
          </p>
          <button className="cta-primary" onClick={() => navigate('/forgot-password')}>
            {t('reset.requestNew')}
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('register.error.passwordsMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">{t('reset.doneTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {t('reset.doneDesc')}
            </p>
            <button className="cta-primary" onClick={() => navigate('/login')}>
              {t('reset.signIn')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="auth-title">{t('reset.title')}</h2>
            <p className="auth-subtitle">{t('reset.subtitle')}</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('reset.newPasswordLabel')}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={t('register.passwordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('register.confirmPasswordLabel')}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? t('reset.loading') : t('reset.button')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
