import React, { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { useDownloadUrl } from '../hooks/useDownloadUrl.js';
import { useTranslation } from '../lib/i18n.jsx';

function CopyLicenseKey({ licKey }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handle = () => {
    navigator.clipboard.writeText(licKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button className="copy-key-btn" onClick={handle} title={t('profile.copyKey')}>
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
      {copied ? ` ${t('profile.copied')}` : ` ${t('profile.copy')}`}
    </button>
  );
}

export default function ProfilePage({ onLogout, onRefresh }) {
  const { t, lang } = useTranslation();
  const downloadUrl = useDownloadUrl();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    api.getProfile()
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName || '');
        setDiscordId(data.discordId || '');
      })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.updateProfile({ displayName, discordId: discordId || undefined });
      setMessage(t('profile.updated'));
      setEditMode(false);
      const data = await api.getProfile();
      setProfile(data);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      await api.resendVerification();
      setResendMsg(t('profile.verifyResent'));
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMessage('');
    setPwError('');
    try {
      await api.changePassword(currentPw, newPw);
      setPwMessage(t('profile.passwordUpdated'));
      setCurrentPw('');
      setNewPw('');
      setShowPassword(false);
    } catch (err) {
      setPwError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile) return null;

  const initial = (profile.displayName || profile.username || '?')[0].toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{initial}</div>
        <div>
          <h1 className="profile-name">{profile.displayName || profile.username}</h1>
          <p className="profile-email">{profile.email}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {t('profile.memberSince')} {new Date(profile.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
          </p>
        </div>
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-key" style={{ marginRight: 8 }}></i>
          {t('profile.licensesTitle')}
        </h3>
        {profile.licenses && profile.licenses.length > 0 ? (
          profile.licenses.map((lic) => (
            <div className="license-card" key={lic.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div className="license-key" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>{lic.licenseKey}</div>
                <CopyLicenseKey licKey={lic.licenseKey} />
              </div>
              <div className="license-meta">
                <span>{t('profile.plan')}: <strong>{lic.plan}</strong></span>
                <span className={`license-status ${lic.status.toLowerCase()}`}>{lic.status}</span>
                {lic.expiresAt && (
                  <span>{t('profile.expires')}: {new Date(lic.expiresAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}</span>
                )}
              </div>
              {lic.status === 'ACTIVE' && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cta-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', padding: '0.6rem 1.2rem', fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <i className="fa-solid fa-download"></i>
                  {t('profile.downloadSoftware')}
                </a>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block', color: '#333' }}></i>
            {t('profile.noLicense')}
            <br />
            <button className="cta-primary" style={{ marginTop: '1rem', padding: '0.8rem 2rem', fontSize: '1rem' }} onClick={() => navigate('/payment')}>
              {t('profile.buySoftware')}
            </button>
          </div>
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-receipt" style={{ marginRight: 8 }}></i>
          {t('profile.ordersTitle')}
        </h3>
        {profile.orders && profile.orders.length > 0 ? (
          profile.orders.map((order) => (
            <div className="order-row" key={order.id}>
              <div>
                <span className="order-plan">{order.plan}</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '1rem', fontSize: '0.9rem' }}>
                  {new Date(order.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {(order.amount / 100).toFixed(2)}{order.currency}
                </span>
                <span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">{t('profile.noOrders')}</div>
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-pen" style={{ marginRight: 8 }}></i>
          {t('profile.infoTitle')}
        </h3>
        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}
        {editMode ? (
          <>
            <div className="profile-form-row">
              <div className="form-group">
                <label className="form-label">{t('profile.displayName')}</label>
                <input type="text" className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Discord ID</label>
                <input type="text" className="form-input" placeholder="Username#1234" value={discordId} onChange={(e) => setDiscordId(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="cta-primary" style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }} onClick={handleSave} disabled={saving}>
                {saving ? t('profile.saving') : t('profile.save')}
              </button>
              <button className="btn-outline" onClick={() => setEditMode(false)}>{t('common.cancel')}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span className="form-label">{t('profile.username')}</span>
                <p>{profile.username}</p>
              </div>
              <div>
                <span className="form-label">{t('profile.displayName')}</span>
                <p>{profile.displayName || '-'}</p>
              </div>
              <div>
                <span className="form-label">Email</span>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {profile.email}
                  {profile.emailVerified ? (
                    <span style={{ fontSize: '0.75rem', color: '#48bb78', background: 'rgba(72,187,120,0.15)', borderRadius: 4, padding: '1px 6px' }}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i>{t('profile.verified')}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#f6ad55', background: 'rgba(246,173,85,0.15)', borderRadius: 4, padding: '1px 6px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 4 }}></i>{t('profile.notVerified')}
                    </span>
                  )}
                </p>
                {!profile.emailVerified && (
                  <div style={{ marginTop: '0.4rem' }}>
                    {resendMsg && <p style={{ fontSize: '0.8rem', color: resendMsg.includes('!') ? '#48bb78' : '#e53e3e', marginBottom: '0.3rem' }}>{resendMsg}</p>}
                    <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={handleResendVerification} disabled={resendLoading}>
                      {resendLoading ? t('verifySent.resending') : t('profile.resendVerification')}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <span className="form-label">Discord</span>
                <p>{profile.discordId || '-'}</p>
              </div>
            </div>
            <button className="btn-outline" onClick={() => setEditMode(true)}>{t('profile.editProfile')}</button>
          </>
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-lock" style={{ marginRight: 8 }}></i>
          {t('profile.security')}
        </h3>
        {pwMessage && <div className="form-success">{pwMessage}</div>}
        {pwError && <div className="form-error">{pwError}</div>}
        {showPassword ? (
          <form onSubmit={handlePasswordChange}>
            <div className="profile-form-row">
              <div className="form-group">
                <label className="form-label">{t('profile.currentPassword')}</label>
                <input type="password" className="form-input" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required autoComplete="current-password" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('profile.newPassword')}</label>
                <input type="password" className="form-input" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="cta-primary" style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }}>
                {t('profile.changePassword')}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowPassword(false)}>{t('common.cancel')}</button>
            </div>
          </form>
        ) : (
          <button className="btn-outline" onClick={() => setShowPassword(true)}>{t('profile.changePassword')}</button>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn-danger" onClick={onLogout}>
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 8 }}></i>
            {t('profile.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
