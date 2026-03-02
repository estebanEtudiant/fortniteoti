import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';
import { useDownloadUrl } from '../hooks/useDownloadUrl.js';

export default function PaymentSuccessPage() {
  const downloadUrl = useDownloadUrl();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sessionId = getSearchParam('session_id');
    if (!sessionId) {
      setError('Session de paiement introuvable.');
      setLoading(false);
      return;
    }
    api.confirmPayment(sessionId)
      .then(data => setLicenseKey(data.licenseKey))
      .catch(err => setError(err.message))
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
            <h2 className="auth-title">Activation en cours...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Votre cle de licence est en cours de generation.</p>
          </>
        ) : error ? (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#e53e3e' }}>
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h2 className="auth-title">Une erreur est survenue</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
            <button className="btn-outline" onClick={() => navigate('/profile')}>Aller dans mon profil</button>
          </>
        ) : (
          <>
            {/* Confetti */}
            <div className="confetti-container" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="confetti-dot" style={{ '--i': i }} />
              ))}
            </div>

            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">Paiement confirme !</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              Merci pour votre achat. Voici votre cle de licence. Conservez-la precieusement.
            </p>

            {/* License key */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: '1.2rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Votre cle de licence
              </p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', margin: 0, wordBreak: 'break-all' }}>
                {licenseKey}
              </p>
            </div>

            {/* Onboarding steps */}
            <div className="success-steps">
              <div className="success-step">
                <div className="success-step-num" style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.35)' }}>1</div>
                <div className="success-step-label">Copiez la clé</div>
              </div>
              <div className="success-step-arrow">→</div>
              <div className="success-step">
                <div className="success-step-num" style={{ background: 'rgba(143,102,255,0.15)', color: '#8f66ff', border: '1px solid rgba(143,102,255,0.35)' }}>2</div>
                <div className="success-step-label">Téléchargez</div>
              </div>
              <div className="success-step-arrow">→</div>
              <div className="success-step">
                <div className="success-step-num" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)' }}>3</div>
                <div className="success-step-label">Lancez &amp; Profitez</div>
              </div>
            </div>

            {/* Buttons — Download first (primary CTA) */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="cta-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <i className="fa-solid fa-download"></i>
              Telecharger le logiciel
            </a>
            <button
              className="btn-outline"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={handleCopy}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? 'Copie !' : 'Copier la cle'}
            </button>
            <button className="btn-outline" style={{ width: '100%', padding: '0.8rem' }} onClick={() => navigate('/profile')}>
              Voir mon profil
            </button>

            {/* Social share */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Partager ma victoire 🏆
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Je viens d'acheter 404 Tweaks et je vais enfin avoir +66% FPS sur Fortnite 🚀 #Fortnite #404Tweaks")}&url=${encodeURIComponent('https://404tweaks.tech')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn share-btn--twitter"
                >
                  <i className="fa-brands fa-x-twitter"></i> Partager sur X
                </a>
                <button
                  className="share-btn share-btn--discord"
                  onClick={() => {
                    navigator.clipboard.writeText('🚀 Je viens d\'acheter 404 Tweaks ! +66% FPS Fortnite garanti → https://404tweaks.tech');
                  }}
                >
                  <i className="fa-brands fa-discord"></i> Copier pour Discord
                </button>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1.2rem' }}>
              La cle et le lien de telechargement sont aussi disponibles dans votre profil.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
