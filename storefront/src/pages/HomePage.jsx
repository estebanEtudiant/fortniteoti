import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';
import { CountUpStat } from '../hooks/useCountUp.jsx';
import FaqItem from '../components/FaqItem.jsx';
import ReviewsCarousel from '../components/ReviewsCarousel.jsx';
import BeforeAfterSlider from '../components/BeforeAfterSlider.jsx';

const planIcons = { DAYS_30: 'fa-calendar', DAYS_90: 'fa-calendar-days', DAYS_365: 'fa-star', LIFETIME: 'fa-infinity' };

export default function HomePage({ customer, screenshotUrl }) {
  const [plans, setPlans] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [lightbox, setLightbox] = useState(false);
  const [activeClients, setActiveClients] = useState(null);
  const [showSticky, setShowSticky] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => { if (e.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => {});
    api.getReviews().then(data => { if (Array.isArray(data) && data.length > 0) setReviews(data); }).catch(() => {});
    api.getPublicStats().then(data => { if (data?.activeThisMonth) setActiveClients(data.activeThisMonth); }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 300) { setShowSticky(false); return; }
      const pricing = document.getElementById('pricing');
      if (pricing) {
        setShowSticky(pricing.getBoundingClientRect().top > window.innerHeight);
      } else {
        setShowSticky(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const minPrice = plans.length > 0 ? Math.min(...plans.map(p => p.price)) : null;

  const handlePurchase = (planKey) => {
    if (!customer) {
      navigate('/register');
      return;
    }
    navigate(`/payment?plan=${planKey}`);
  };

  const scrollToPrice   = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  const scrollToProduct = () => document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-badge">{t('hero.badge')}</div>
          <h1>{t('hero.title1')}<br/>{t('hero.title2')} <span className="highlight">{t('hero.highlight')}</span></h1>
          <p className="hero-subtitle">{t('hero.subtitle')}</p>
          {activeClients && (
            <div className="social-counter">
              <span className="social-counter-dot" />
              <strong style={{ color: 'var(--neon-green)' }}>{activeClients.toLocaleString('fr-FR')}</strong>
              <span> {t('hero.activeClients')}</span>
            </div>
          )}
          <div className="stats-row">
            <div className="stat">
              <CountUpStat value="+66%" />
              <span className="stat-label">{t('hero.stat.fps')}</span>
            </div>
            <div className="stat">
              <CountUpStat value="-65%" />
              <span className="stat-label">{t('hero.stat.delay')}</span>
            </div>
            <div className="stat">
              <CountUpStat value="98" />
              <span className="stat-label">{t('hero.stat.tweaks')}</span>
            </div>
          </div>
          {minPrice !== null && (
            <p className="hero-price-hint">
              {t('hero.priceFrom')} <strong className="hero-price-amount">{(minPrice / 100).toFixed(2)} €</strong>
              <span className="hero-price-sep"> · </span>
              {t('hero.instantAccess')}
              <span className="hero-price-sep"> · </span>
              {t('hero.noCommitment')}
            </p>
          )}
          <div className="hero-ctas">
            <button className="cta-primary" onClick={scrollToPrice}>{t('hero.cta.buy')}</button>
            <button className="cta-secondary" onClick={scrollToProduct}>{t('hero.cta.see')}</button>
          </div>
        </div>
      </section>

      {/* ── PAIN STRIP ── */}
      <div className="pain-strip">
        <div className="pain-strip-inner">
          <div className="pain-item">
            <i className="fa-solid fa-bolt-lightning"></i>
            <div>
              <p className="pain-title">{t('pain.delay.title')}</p>
              <p className="pain-desc">{t('pain.delay.desc')}</p>
            </div>
          </div>
          <div className="pain-divider" />
          <div className="pain-item">
            <i className="fa-solid fa-wave-square"></i>
            <div>
              <p className="pain-title">{t('pain.fps.title')}</p>
              <p className="pain-desc">{t('pain.fps.desc')}</p>
            </div>
          </div>
          <div className="pain-divider" />
          <div className="pain-item">
            <i className="fa-solid fa-network-wired"></i>
            <div>
              <p className="pain-title">{t('pain.ping.title')}</p>
              <p className="pain-desc">{t('pain.ping.desc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRODUCT ── */}
      <section className="section" id="product" style={{ background: 'var(--card-bg)' }}>
        <div className="secret-container">
          <div className="secret-content animate-on-scroll">
            <div className="product-tweaks-badge">
              <span className="tweaks-count">98</span>
              <div className="tweaks-label-wrap">
                <span className="tweaks-label">{t('product.tweaksBadge')}</span>
                <span className="tweaks-sublabel">{t('product.available')}</span>
              </div>
            </div>
            <h2 style={{ marginTop: '1.25rem' }}>{t('product.title')} <span className="highlight">404 Tweaks</span></h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, margin: '1rem 0 1.5rem' }}>
              {t('product.subtitle')}
            </p>
            <ul className="secret-list">
              <li><i className="fa-solid fa-check"></i> {t('product.feat1')}</li>
              <li><i className="fa-solid fa-check"></i> {t('product.feat2')}</li>
              <li><i className="fa-solid fa-check"></i> {t('product.feat3')}</li>
              <li><i className="fa-solid fa-check"></i> {t('product.feat4')}</li>
              <li><i className="fa-solid fa-check"></i> {t('product.feat5')}</li>
            </ul>
            <button className="cta-primary product-price-cta" onClick={scrollToPrice}>
              {t('product.seePrices')}
            </button>
          </div>
          <div
            className={`book-preview${screenshotUrl ? ' book-preview--img' : ''} animate-on-scroll`}
            onClick={() => screenshotUrl && setLightbox(true)}
          >
            {screenshotUrl
              ? <img src={screenshotUrl} alt="404 Tweaks" />
              : <i className="fa-solid fa-laptop-code"></i>
            }
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && screenshotUrl && (
        <div className="lightbox-overlay" onClick={() => setLightbox(false)} role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Fermer">✕</button>
          <img src={screenshotUrl} alt="404 Tweaks — plein écran" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ── VIDEO DÉMO ── */}
      <section className="section" style={{ textAlign: 'center' }}>
        <h2 className="section-title animate-on-scroll">{t('video.title')} <span className="highlight">{t('video.highlight')}</span></h2>
        <p className="section-subtitle animate-on-scroll">{t('video.subtitle')}</p>
        <div className="video-embed-wrapper animate-on-scroll">
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
            title="404 Tweaks — Démo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem' }}>
          Remplace l'URL par ta vraie vidéo YouTube dans HomePage.jsx
        </p>
      </section>

      {/* ── PERFORMANCE ── */}
      <section className="section" style={{ background: 'var(--card-bg)' }}>
        <h2 className="section-title animate-on-scroll">{t('perf.title')} <span className="highlight">{t('perf.highlight')}</span></h2>
        <p className="section-subtitle animate-on-scroll">{t('perf.config')}</p>
        <div className="perf-grid">
          {[
            { label: t('perf.fps'),        before: '144 FPS',             after: '240+ FPS',          pctBad: 44, pctGood: 95 },
            { label: 'Input Delay',        before: '35 ms',               after: '12 ms',             pctBad: 70, pctGood: 24 },
            { label: 'Stutter',            before: t('perf.stutter.before'), after: t('perf.stutter.after'), pctBad: 60, pctGood: 3 },
          ].map((row, i) => (
            <div className="perf-row animate-on-scroll" key={i}>
              <div className="perf-header">
                <span className="perf-label">{row.label}</span>
                <div className="perf-vals">
                  <span className="perf-val-bad">{row.before}</span>
                  <span className="perf-arrow">→</span>
                  <span className="perf-val-good">{row.after}</span>
                </div>
              </div>
              <div className="perf-tracks">
                <div className="perf-track">
                  <span className="perf-track-label">{t('perf.before')}</span>
                  <div className="perf-track-bar">
                    <div className="perf-bar perf-bar--bad" style={{ '--w': `${row.pctBad}%` }} />
                  </div>
                </div>
                <div className="perf-track">
                  <span className="perf-track-label">{t('perf.after')}</span>
                  <div className="perf-track-bar">
                    <div className="perf-bar perf-bar--good" style={{ '--w': `${row.pctGood}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BEFORE / AFTER SLIDER ── */}
      <section className="section" style={{ textAlign: 'center', background: 'var(--card-bg)' }}>
        <h2 className="section-title animate-on-scroll">{t('slider.title')} <span className="highlight">{t('slider.highlight')}</span></h2>
        <p className="section-subtitle animate-on-scroll">{t('slider.subtitle')}</p>
        <BeforeAfterSlider />
      </section>

      {/* ── REVIEWS CAROUSEL ── */}
      {reviews.length > 0 && (() => {
        const avg = (reviews.reduce((s, r) => s + (r.stars || 5), 0) / reviews.length).toFixed(1);
        return (
          <section className="section">
            <h2 className="section-title animate-on-scroll">{t('reviews.title')} <span className="highlight">{t('reviews.highlight')}</span> {t('reviews.titleSuffix')}</h2>
            <div className="reviews-stats animate-on-scroll">
              <span><strong style={{ color: 'var(--neon-green)' }}>{reviews.length}</strong> {t('reviews.verified')}</span>
              <span className="reviews-sep">·</span>
              <span><strong style={{ color: '#FFD700' }}>{avg} ★</strong> {t('reviews.avgRating')}</span>
              <span className="reviews-sep">·</span>
              <span><strong style={{ color: 'var(--neon-green)' }}>{reviews.filter(r => r.stars === 5).length}</strong> {t('reviews.fiveStar')}</span>
            </div>
            <ReviewsCarousel reviews={reviews} />
          </section>
        );
      })()}

      {/* ── PRICING ── */}
      <section className="section pricing-section" id="pricing" style={{ background: 'var(--card-bg)' }}>
        <h2 className="section-title animate-on-scroll">{t('pricing.title')} <span className="highlight">{t('pricing.highlight')}</span> ?</h2>
        <p className="section-subtitle animate-on-scroll">{t('pricing.subtitle')}</p>
        <div className="pricing-grid">
          {plans.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{t('pricing.loading')}</p>
          ) : plans.map((plan, idx) => (
            <div
              className={`plan-card animate-on-scroll${plan.popular ? ' plan-card--popular' : ''}`}
              key={plan.key}
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="plan-card-glow" aria-hidden="true" />
              {plan.popular && (
                <div className="plan-popular-badge">
                  <i className="fa-solid fa-bolt-lightning"></i> {t('pricing.popular')}
                </div>
              )}
              <div className="plan-icon">
                <i className={`fa-solid ${planIcons[plan.key] || 'fa-key'}`}></i>
              </div>
              <p className="plan-name">{plan.name}</p>
              <div className="plan-price-block">
                {plan.originalPrice > 0 && (
                  <span className="plan-price-old">{(plan.originalPrice / 100).toFixed(2)} €</span>
                )}
                <span className="plan-price-main">{(plan.price / 100).toFixed(2)}<span className="plan-price-currency"> €</span></span>
                {plan.originalPrice > 0 && (
                  <span className="plan-discount-badge">-{Math.round((1 - plan.price / plan.originalPrice) * 100)}%</span>
                )}
              </div>
              <div className="plan-divider" />
              <ul className="plan-features">
                <li><i className="fa-solid fa-check"></i> {t('pricing.feat1')}</li>
                <li><i className="fa-solid fa-check"></i> {t('pricing.feat2')}</li>
                <li><i className="fa-solid fa-check"></i> {t('pricing.feat3')}</li>
                <li><i className="fa-solid fa-check"></i> {t('pricing.feat4')}</li>
              </ul>
              <button
                className={`plan-cta${plan.popular ? ' plan-cta--popular' : ''}`}
                onClick={() => handlePurchase(plan.key)}
              >
                {customer ? t('pricing.buy') : t('pricing.register')}
                <i className="fa-solid fa-arrow-right plan-cta-arrow"></i>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">{t('faq.title')} <span className="highlight">{t('faq.highlight')}</span></h2>
        <div className="faq-container">
          <FaqItem question={t('faq.q1')} answer={t('faq.a1')} />
          <FaqItem question={t('faq.q2')} answer={t('faq.a2')} />
          <FaqItem question={t('faq.q3')} answer={t('faq.a3')} />
          <FaqItem question={t('faq.q4')} answer={t('faq.a4')} />
          <FaqItem question={t('faq.q5')} answer={t('faq.a5')} />
        </div>
      </section>

      {/* ── STICKY CTA BAR ── */}
      {showSticky && minPrice !== null && (
        <div className="sticky-cta">
          <div className="sticky-cta-info">
            <strong>404 Tweaks</strong>
            <span> — {t('sticky.from')} <strong className="sticky-cta-price">{(minPrice / 100).toFixed(2)} €</strong></span>
          </div>
          <button className="sticky-cta-btn" onClick={scrollToPrice}>
            {t('sticky.buy')}
          </button>
        </div>
      )}
    </>
  );
}
