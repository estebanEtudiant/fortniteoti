import React, { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';
import { useDownloadUrl } from '../hooks/useDownloadUrl.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
  const downloadUrl = useDownloadUrl();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sessionId = getSearchParam('session_id');
    if (!sessionId) {
      setError(t('paymentSuccess.sessionNotFound'));
      setLoading(false);
      return;
    }

    api.confirmPayment(sessionId)
      .then((data) => setLicenseKey(data.licenseKey))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="auth-page" style={{ padding: '3rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: 600, textAlign: 'center' }}>
        {loading ? (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
            <h2 className="auth-title">{t('paymentSuccess.activating')}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{t('paymentSuccess.generatingKey')}</p>
          </>
        ) : error ? (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#e53e3e' }}>
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h2 className="auth-title">{t('paymentSuccess.errorTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
            <button className="btn-outline" onClick={() => navigate('/profile')}>{t('paymentSuccess.goProfile')}</button>
          </>
        ) : (
          <>
            <div className="confetti-container" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="confetti-dot" style={{ '--i': i }} />
              ))}
            </div>

            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">{t('paymentSuccess.title')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              {t('paymentSuccess.subtitle')}
            </p>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: '1.2rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('paymentSuccess.licenseLabel')}
              </p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', margin: 0, wordBreak: 'break-all' }}>
                {licenseKey}
              </p>
            </div>

            <div className="success-steps">
              <div className="success-step">
                <div className="success-step-num" style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.35)' }}>1</div>
                <div className="success-step-label">{t('paymentSuccess.step1')}</div>
              </div>
              <div className="success-step-arrow">-&gt;</div>
              <div className="success-step">
                <div className="success-step-num" style={{ background: 'rgba(143,102,255,0.15)', color: '#8f66ff', border: '1px solid rgba(143,102,255,0.35)' }}>2</div>
                <div className="success-step-label">{t('paymentSuccess.step2')}</div>
              </div>
              <div className="success-step-arrow">-&gt;</div>
              <div className="success-step">
                <div className="success-step-num" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)' }}>3</div>
                <div className="success-step-label">{t('paymentSuccess.step3')}</div>
              </div>
            </div>

            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="cta-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <i className="fa-solid fa-download"></i>
              {t('paymentSuccess.downloadSoftware')}
            </a>
            <button
              className="btn-outline"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={handleCopy}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? t('paymentSuccess.copied') : t('paymentSuccess.copyKey')}
            </button>
            <button className="btn-outline" style={{ width: '100%', padding: '0.8rem' }} onClick={() => navigate('/profile')}>
              {t('paymentSuccess.viewProfile')}
            </button>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {t('paymentSuccess.shareTitle')}
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('paymentSuccess.shareXText'))}&url=${encodeURIComponent('https://404tweaks.tech')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn share-btn--twitter"
                >
                  <i className="fa-brands fa-x-twitter"></i> {t('paymentSuccess.shareOnX')}
                </a>
                <button
                  className="share-btn share-btn--discord"
                  onClick={() => {
                    navigator.clipboard.writeText(t('paymentSuccess.shareDiscordText'));
                  }}
                >
                  <i className="fa-brands fa-discord"></i> {t('paymentSuccess.copyForDiscord')}
                </button>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1.2rem' }}>
              {t('paymentSuccess.footerNote')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
