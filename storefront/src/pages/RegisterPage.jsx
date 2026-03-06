import React, { useState } from 'react';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function RegisterPage({ onRegister }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('register.error.passwordsMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('register.error.passwordLength'));
      return;
    }

    setLoading(true);
    try {
      await onRegister(email, username, password);
      navigate('/verify-email-sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">{t('register.title')}</h2>
        <p className="auth-subtitle">{t('register.subtitle')}</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('register.emailLabel')}</label>
            <input
              type="email"
              className="form-input"
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.usernameLabel')}</label>
            <input
              type="text"
              className="form-input"
              placeholder="PlayerOne"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.passwordLabel')}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t('register.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t('register.loading') : t('register.button')}
          </button>
        </form>
        <div className="auth-footer">
          {t('register.hasAccount')}{' '}
          <button className="auth-footer-link" onClick={() => navigate('/login')}>
            {t('register.signIn')}
          </button>
        </div>
      </div>
    </div>
  );
}
