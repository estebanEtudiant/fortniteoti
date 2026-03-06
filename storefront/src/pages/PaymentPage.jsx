import React, { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { navigate, getSearchParam } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

const planIcons = { DAYS_30: 'fa-calendar', DAYS_90: 'fa-calendar-days', DAYS_365: 'fa-star', LIFETIME: 'fa-infinity' };

const normalizeTextList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => String(v || '').trim()).filter(Boolean))];
};

const resolvePlanIcon = (plan) => {
  const raw = String(plan?.icon || '').trim();
  if (!raw) return planIcons[plan?.key] || 'fa-key';
  if (raw.includes('fa-')) {
    const token = raw.split(/\s+/).filter((part) => part.startsWith('fa-')).pop();
    return token || (planIcons[plan?.key] || 'fa-key');
  }
  return raw;
};

export default function PaymentPage({ customer }) {
  const { t } = useTranslation();
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
      .then((data) => {
        const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setPlans(sorted);

        const byUrl = urlPlan ? sorted.find((p) => p.key === urlPlan) : null;
        const popular = sorted.find((p) => p.popular);
        const fallback = sorted[0] || null;
        setSelectedPlan((byUrl || popular || fallback)?.key || null);
      })
      .catch(() => setError(t('payment.error.loadPlans')))
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
      setResendMsg(t('payment.verify.resentSuccess'));
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
          <h2 className="auth-title">{t('payment.verify.title')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            {t('payment.verify.descBefore')}<br />
            {t('payment.verify.descAfter')} <strong style={{ color: '#fff' }}>{customer.email}</strong>.
          </p>
          {resendMsg && <div className={resendMsg.includes('!') ? 'form-success' : 'form-error'} style={{ marginBottom: '1rem' }}>{resendMsg}</div>}
          <button className="cta-primary" style={{ width: '100%', padding: '0.9rem', marginBottom: '0.75rem' }} onClick={handleResend} disabled={resendLoading}>
            {resendLoading ? t('payment.verify.resending') : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 8 }}></i>{t('payment.verify.resendButton')}</>}
          </button>
          <button className="btn-outline" style={{ width: '100%', padding: '0.8rem' }} onClick={() => navigate('/profile')}>
            {t('payment.verify.backProfile')}
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

  const currentPlan = plans.find((p) => p.key === selectedPlan);
  const discountedPrice = currentPlan && promoInfo
    ? promoInfo.type === 'percent'
      ? currentPlan.price * (1 - promoInfo.amount / 100)
      : Math.max(0, currentPlan.price - promoInfo.amount)
    : null;

  const defaultIncluded = [
    `${t('payment.included1Strong')} ${t('payment.included1')}`,
    t('payment.included2'),
    t('payment.included3'),
    t('payment.included4'),
  ];

  const dynamicFeatures = normalizeTextList(currentPlan?.features);
  const includedItems = dynamicFeatures.length > 0 ? dynamicFeatures : defaultIncluded;
  const dynamicTags = normalizeTextList(currentPlan?.tags);

  return (
    <div className="auth-page" style={{ padding: '3rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: 600 }}>
        <h2 className="auth-title">{t('payment.title')}</h2>
        <p className="auth-subtitle">{t('payment.subtitle')}</p>

        {plansLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem' }}></i>
          </div>
        ) : plans.length === 0 ? (
          <div className="form-error">{t('payment.noPlans')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.5rem 0' }}>
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.key;
                const accent = plan.themeColor || 'var(--accent)';
                const icon = resolvePlanIcon(plan);
                const badgeText = plan.badgeText || t('pricing.popular');

                return (
                  <div
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    style={{
                      border: `2px solid ${isSelected ? accent : 'var(--border-subtle)'}`,
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      background: isSelected ? `${accent}18` : 'var(--card-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? accent : '#444'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <i className={`fa-solid ${icon}`} style={{ color: accent }}></i>
                          {plan.name}
                        </span>
                        {(plan.popular || plan.badgeText) && (
                          <span style={{ marginLeft: 8, fontSize: '0.7rem', background: accent, color: '#000', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                            {badgeText.toUpperCase()}
                          </span>
                        )}
                        {plan.description && (
                          <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.35 }}>
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 12 }}>
                      {plan.originalPrice > 0 && (
                        <div style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', fontSize: '0.8rem' }}>
                          {(plan.originalPrice / 100).toFixed(2)} EUR
                        </div>
                      )}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: accent, fontWeight: 700, fontSize: '1.1rem' }}>
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

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">{t('payment.promoLabel')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="SUMMER20"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value); setPromoInfo(null); setPromoError(''); }}
                  style={{ flex: 1, textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  className="btn-outline"
                  style={{ whiteSpace: 'nowrap', padding: '0 1rem' }}
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCode.trim()}
                >
                  {promoLoading ? '...' : t('payment.applyPromo')}
                </button>
              </div>
              {promoError && <p style={{ color: '#e53e3e', fontSize: '0.82rem', marginTop: '0.35rem' }}>{promoError}</p>}
              {promoInfo && (
                <p style={{ color: '#22c55e', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                  <i className="fa-solid fa-tag" style={{ marginRight: 5 }}></i>
                  {t('payment.promoValid')} {promoInfo.type === 'percent' ? `-${promoInfo.amount}%` : `-${(promoInfo.amount / 100).toFixed(2)} EUR`}
                </p>
              )}
            </div>

            {promoInfo && currentPlan && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('payment.totalAfterDiscount')}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#22c55e', fontWeight: 700, fontSize: '1.2rem' }}>
                  {(discountedPrice / 100).toFixed(2)} EUR
                </span>
              </div>
            )}

            <div style={{ background: 'var(--card-bg)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('payment.includedTitle')}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {includedItems.map((item, idx) => (
                  <li key={`included-${idx}`}>
                    <i className="fa-solid fa-check" style={{ color: currentPlan?.themeColor || 'var(--accent)', marginRight: 8 }}></i>
                    {item}
                  </li>
                ))}
              </ul>
              {dynamicTags.length > 0 && (
                <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {dynamicTags.map((tag, idx) => (
                    <span key={`tag-${idx}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem', borderRadius: 6, border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <button
          className="cta-primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
          onClick={handleCheckout}
          disabled={loading || !selectedPlan || plansLoading}
        >
          {loading ? t('payment.redirectingStripe') : (
            <>
              <i className="fa-brands fa-stripe"></i>
              {currentPlan
                ? promoInfo
                  ? `${t('payment.pay')} ${(discountedPrice / 100).toFixed(2)} EUR`
                  : `${t('payment.pay')} ${(currentPlan.price / 100).toFixed(2)} EUR`
                : t('payment.payWithStripe')}
            </>
          )}
        </button>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
          <i className="fa-solid fa-lock" style={{ marginRight: 6 }}></i>
          {t('payment.secureStripe')}
        </p>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="auth-footer-link" onClick={() => navigate('/')}>
            {t('payment.backProduct')}
          </button>
        </div>
      </div>
    </div>
  );
}
