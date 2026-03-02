import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';

const planIcons = { DAYS_30: 'fa-calendar', DAYS_90: 'fa-calendar-days', DAYS_365: 'fa-star', LIFETIME: 'fa-infinity' };

export default function PaymentPage({ customer }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoInfo, setPromoInfo] = useState(null);
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    const urlPlan = getSearchParam('plan');
    api.getPlans()
      .then(data => {
        setPlans(data);
        if (urlPlan && data.find(p => p.key === urlPlan)) {
          setSelectedPlan(urlPlan);
        } else if (data.length > 0) {
          setSelectedPlan(data[data.length - 1].key);
        }
      })
      .catch(() => setError('Impossible de charger les plans.'))
      .finally(() => setPlansLoading(false));
  }, []);

  if (!customer) {
    navigate('/register');
    return null;
  }

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      await api.resendVerification();
      setResendMsg('Email de verification renvoye ! Verifie ta boite mail.');
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoInfo(null);
    try {
      const info = await api.validatePromo(promoCode.trim().toUpperCase());
      setPromoInfo(info);
    } catch (err) {
      setPromoError(err.message);
    } finally {
      setPromoLoading(false);
    }
  };

  if (!customer.emailVerified) {
    return (
      <div className="auth-page" style={{ padding: '3rem 1rem' }}>
        <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--accent)' }}>
            <i className="fa-solid fa-envelope"></i>
          </div>
          <h2 className="auth-title">Verifie ton email</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            Pour effectuer un achat, tu dois d'abord verifier ton adresse email.<br/>
            Un lien de verification a ete envoye a <strong style={{ color: '#fff' }}>{customer.email}</strong>.
          </p>
          {resendMsg && <div className={resendMsg.includes('renvoye') ? 'form-success' : 'form-error'} style={{ marginBottom: '1rem' }}>{resendMsg}</div>}
          <button className="cta-primary" style={{ width: '100%', padding: '0.9rem', marginBottom: '0.75rem' }} onClick={handleResend} disabled={resendLoading}>
            {resendLoading ? 'Envoi...' : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 8 }}></i>Renvoyer l'email de verification</>}
          </button>
          <button className="btn-outline" style={{ width: '100%', padding: '0.8rem' }} onClick={() => navigate('/profile')}>
            Retour au profil
          </button>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setError('');
    setLoading(true);
    try {
      const { url } = await api.createCheckoutSession(selectedPlan, promoInfo ? promoCode.trim().toUpperCase() : undefined);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.key === selectedPlan);
  const discountedPrice = currentPlan && promoInfo
    ? promoInfo.type === 'percent'
      ? currentPlan.price * (1 - promoInfo.amount / 100)
      : Math.max(0, currentPlan.price - promoInfo.amount)
    : null;

  return (
    <div className="auth-page" style={{ padding: '3rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <h2 className="auth-title">Choisissez votre plan</h2>
        <p className="auth-subtitle">404 Tweaks &mdash; Logiciel d'optimisation &mdash; Acces instantane</p>

        {plansLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem' }}></i>
          </div>
        ) : plans.length === 0 ? (
          <div className="form-error">Aucun plan disponible pour le moment.</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.5rem 0' }}>
              {plans.map(plan => {
                const isSelected = selectedPlan === plan.key;
                return (
                  <div key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    style={{
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(0,212,255,0.06)' : 'var(--card-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `2px solid ${isSelected ? 'var(--accent)' : '#444'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600 }}>
                          <i className={`fa-solid ${planIcons[plan.key] || 'fa-key'}`} style={{ marginRight: 8, color: 'var(--accent)' }}></i>
                          {plan.name}
                        </span>
                        {plan.popular && (
                          <span style={{ marginLeft: 8, fontSize: '0.7rem', background: 'var(--accent)', color: '#000', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                            POPULAIRE
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {plan.originalPrice > 0 && (
                        <div style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', fontSize: '0.8rem' }}>
                          {(plan.originalPrice / 100).toFixed(2)} EUR
                        </div>
                      )}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' }}>
                        {(plan.price / 100).toFixed(2)} EUR
                      </span>
                      {plan.originalPrice > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>
                          -{Math.round((1 - plan.price / plan.originalPrice) * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Promo code */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Code promo (optionnel)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="SUMMER20"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value); setPromoInfo(null); setPromoError(''); }}
                  style={{ flex: 1, textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  className="btn-outline"
                  style={{ whiteSpace: 'nowrap', padding: '0 1rem' }}
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCode.trim()}
                >
                  {promoLoading ? '...' : 'Appliquer'}
                </button>
              </div>
              {promoError && <p style={{ color: '#e53e3e', fontSize: '0.82rem', marginTop: '0.35rem' }}>{promoError}</p>}
              {promoInfo && (
                <p style={{ color: '#22c55e', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                  <i className="fa-solid fa-tag" style={{ marginRight: 5 }}></i>
                  Code valide — {promoInfo.type === 'percent' ? `-${promoInfo.amount}%` : `-${(promoInfo.amount / 100).toFixed(2)} €`}
                </p>
              )}
            </div>

            {/* Price summary with promo */}
            {promoInfo && currentPlan && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total après réduction</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#22c55e', fontWeight: 700, fontSize: '1.2rem' }}>
                  {(discountedPrice / 100).toFixed(2)} EUR
                </span>
              </div>
            )}

            <div style={{ background: 'var(--card-bg)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inclus avec votre achat</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><i className="fa-solid fa-check" style={{ color: 'var(--accent)', marginRight: 8 }}></i>Logiciel d'optimisation complet</li>
                <li><i className="fa-solid fa-check" style={{ color: 'var(--accent)', marginRight: 8 }}></i>Acces Discord VIP prive</li>
                <li><i className="fa-solid fa-check" style={{ color: 'var(--accent)', marginRight: 8 }}></i>Mises a jour incluses</li>
                <li><i className="fa-solid fa-check" style={{ color: 'var(--accent)', marginRight: 8 }}></i>Support technique direct</li>
              </ul>
            </div>
          </>
        )}

        {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <button className="cta-primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
          onClick={handleCheckout}
          disabled={loading || !selectedPlan || plansLoading}>
          {loading ? 'Redirection vers Stripe...' : (
            <>
              <i className="fa-brands fa-stripe"></i>
              {currentPlan
                ? promoInfo
                  ? `Payer ${(discountedPrice / 100).toFixed(2)} EUR`
                  : `Payer ${(currentPlan.price / 100).toFixed(2)} EUR`
                : 'Payer avec Stripe'}
            </>
          )}
        </button>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
          <i className="fa-solid fa-lock" style={{ marginRight: 6 }}></i>
          Paiement 100% securise via Stripe
        </p>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="auth-footer-link" onClick={() => navigate('/')}>
            Retour a la page produit
          </button>
        </div>
      </div>
    </div>
  );
}
