import React, { useState } from 'react';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function LoginPage({ onLogin }) {
  const { t } = useTranslation();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(login, password);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="auth-page">
        <div className="auth-card">
          <h2 className="auth-title">{t('login.title')}</h2>
          <p className="auth-subtitle">{t('login.subtitle')}</p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('login.emailLabel')}</label>
              <input
                  type="text"
                  className="form-input"
                  placeholder={t('login.emailPlaceholder')}
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  required
                  autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('login.passwordLabel')}</label>
              <input
                  type="password"
                  className="form-input"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? t('login.loading') : t('login.button')}
            </button>
          </form>

          <div
              className="auth-footer"
              style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}
          >
          <span>
            {t('login.noAccount')}{' '}
            <button className="auth-footer-link" onClick={() => navigate('/register')}>
              {t('login.createAccount')}
            </button>
          </span>

            <button className="auth-footer-link" onClick={() => navigate('/forgot-password')}>
              {t('login.forgotPassword')}
            </button>
          </div>
        </div>
      </div>
  );
}