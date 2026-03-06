import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';
import { CountUpStat } from '../hooks/useCountUp.jsx';
import FaqItem from '../components/FaqItem.jsx';
import ReviewsCarousel from '../components/ReviewsCarousel.jsx';
import BeforeAfterSlider from '../components/BeforeAfterSlider.jsx';

const planIcons = { DAYS_30: 'fa-calendar', DAYS_90: 'fa-calendar-days', DAYS_365: 'fa-star', LIFETIME: 'fa-infinity' };
const DEFAULT_PLAN_FEATURE_KEYS = ['pricing.feat1', 'pricing.feat2', 'pricing.feat3', 'pricing.feat4', 'pricing.feat5'];
const DEFAULT_PLAN_TAGS = ['Double Edit', 'Drag Edit', 'Shotgun Pullout', 'Auto Build', 'Pick Up', 'Single Edit', 'Instant Build', 'Item Pullout', 'Wall Retake', 'Prefire'];

const normalizeTextList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => String(v || '').trim()).filter(Boolean))];
};

const resolvePlanIcon = (plan) => {
  const raw = String(plan?.icon || '').trim();
  if (!raw) return planIcons[plan.key] || 'fa-key';
  if (raw.includes('fa-')) {
    const token = raw.split(/\s+/).filter((part) => part.startsWith('fa-')).pop();
    return token || (planIcons[plan.key] || 'fa-key');
  }
  return raw;
};

function SoftwareCarousel({ images, onZoom }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);
  if (images.length === 0) return <div className="book-preview animate-on-scroll"><i className="fa-solid fa-laptop-code"></i></div>;
  return (
    <div className="book-preview book-preview--img software-carousel animate-on-scroll">
      <img
        key={idx}
        src={images[idx]}
        alt="404 Tweaks"
        className="carousel-img"
        style={{ cursor: 'zoom-in' }}
        onClick={() => onZoom(images, idx)}
      />
      {images.length > 1 && (
        <>
          <button className="carousel-btn carousel-btn--prev" onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}>‹</button>
          <button className="carousel-btn carousel-btn--next" onClick={() => setIdx(i => (i + 1) % images.length)}>›</button>
          <div className="carousel-dots">
            {images.map((_, i) => (
              <button key={i} className={`carousel-dot${i === idx ? ' carousel-dot--active' : ''}`} onClick={() => setIdx(i)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function HomePage({ customer, screenshotUrl, screenshotUrls }) {
  const [plans, setPlans] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [lightbox, setLightbox] = useState(null); // { images: string[], idx: number }
  const [activeClients, setActiveClients] = useState(null);
  const [showSticky, setShowSticky] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === 'Escape')      setLightbox(null);
      if (e.key === 'ArrowRight')  setLightbox(l => l && l.images.length > 1 ? { ...l, idx: (l.idx + 1) % l.images.length } : l);
      if (e.key === 'ArrowLeft')   setLightbox(l => l && l.images.length > 1 ? { ...l, idx: (l.idx - 1 + l.images.length) % l.images.length } : l);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  useEffect(() => {
    api.getPlans().then((data) => {
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setPlans(sorted);
    }).catch(() => {});
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
  const carouselImages = screenshotUrls
    ? screenshotUrls.split('\n').map(s => s.trim()).filter(Boolean)
    : screenshotUrl ? [screenshotUrl] : [];

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
              <strong style={{ color: 'var(--neon-green)' }}>{activeClients.toLocaleString()}</strong>
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
              <CountUpStat value="100+" />
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
            <button className="cta-primary cta-primary--hero" onClick={scrollToPrice}>
              {t('hero.cta.buy')}
              <span className="cta-arrow-anim">→</span>
            </button>
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
              <span className="tweaks-count">100+</span>
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
          <SoftwareCarousel images={carouselImages} onZoom={(imgs, i) => setLightbox({ images: imgs, idx: i })} />
        </div>
      </section>

      {/* Lightbox — rendu via portal hors de page-transition */}
      {lightbox && createPortal(
        <div className="lightbox-overlay" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label={t('common.close')}>x</button>
          <img
            key={lightbox.idx}
            src={lightbox.images[lightbox.idx]}
            alt={t('home.lightboxAlt')}
            style={{ cursor: lightbox.images.length > 1 ? 'pointer' : 'default' }}
            onClick={e => {
              e.stopPropagation();
              if (lightbox.images.length > 1)
                setLightbox(l => ({ ...l, idx: (l.idx + 1) % l.images.length }));
            }}
          />
          {lightbox.images.length > 1 && (
            <>
              <button className="lightbox-nav lightbox-nav--prev"
                onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, idx: (l.idx - 1 + l.images.length) % l.images.length })); }}>
                ‹
              </button>
              <button className="lightbox-nav lightbox-nav--next"
                onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, idx: (l.idx + 1) % l.images.length })); }}>
                ›
              </button>
              <div className="lightbox-dots">
                {lightbox.images.map((_, i) => (
                  <button key={i}
                    className={`carousel-dot${i === lightbox.idx ? ' carousel-dot--active' : ''}`}
                    onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, idx: i })); }} />
                ))}
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {/* ── VIDEO DÉMO ── (décommente et remplace l'URL YouTube quand la vidéo est prête)
      <section className="section" style={{ textAlign: 'center' }}>
        <h2 className="section-title animate-on-scroll">{t('video.title')} <span className="highlight">{t('video.highlight')}</span></h2>
        <p className="section-subtitle animate-on-scroll">{t('video.subtitle')}</p>
        <div className="video-embed-wrapper animate-on-scroll">
          <iframe
            src="https://www.youtube.com/embed/REMPLACE_PAR_TON_ID_VIDEO?rel=0&modestbranding=1"
            title="404 Tweaks — Démo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </section>
      */}

      {/* ── PERFORMANCE ── */}
      <section className="section" style={{ background: 'var(--card-bg)' }}>
        <h2 className="section-title animate-on-scroll">{t('perf.title')} <span className="highlight">{t('perf.highlight')}</span></h2>
        <p className="section-subtitle animate-on-scroll">{t('perf.config')}</p>
        <div className="perf-grid">
          {[
            { label: t('perf.fps'),        before: '144 FPS',             after: '240+ FPS',          pctBad: 44, pctGood: 95 },
            { label: t('perf.inputDelay'), before: '35 ms', after: '12 ms', pctBad: 70, pctGood: 24 },
            { label: t('perf.stutter'),    before: t('perf.stutter.before'), after: t('perf.stutter.after'), pctBad: 60, pctGood: 3 },
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
          ) : plans.map((plan, idx) => {
            const features = normalizeTextList(plan.features);
            const tags = normalizeTextList(plan.tags);
            const cardFeatures = features.length > 0 ? features : DEFAULT_PLAN_FEATURE_KEYS.map((key) => t(key));
            const cardTags = tags.length > 0 ? tags : DEFAULT_PLAN_TAGS;
            const icon = resolvePlanIcon(plan);
            const popularLabel = plan.badgeText || t('pricing.popular');
            const ctaLabel = plan.ctaText || (customer ? t('pricing.buy') : t('pricing.register'));

            return (
              <div
                className={`plan-card animate-on-scroll${plan.popular ? ' plan-card--popular' : ''}`}
                key={plan.key}
                style={{
                  animationDelay: `${idx * 0.08}s`,
                  borderColor: !plan.popular && plan.themeColor ? `${plan.themeColor}55` : undefined,
                }}
              >
                <div
                  className="plan-card-glow"
                  aria-hidden="true"
                  style={plan.themeColor ? { background: `radial-gradient(circle, ${plan.themeColor}22 0%, transparent 70%)` } : undefined}
                />
                {plan.popular && (
                  <div className="plan-popular-badge">
                    <i className="fa-solid fa-bolt-lightning"></i> {popularLabel}
                  </div>
                )}
                <div
                  className="plan-icon"
                  style={plan.themeColor ? {
                    color: plan.themeColor,
                    borderColor: `${plan.themeColor}55`,
                    background: `${plan.themeColor}22`,
                  } : undefined}
                >
                  <i className={`fa-solid ${icon}`}></i>
                </div>
                <p className="plan-name">{plan.name}</p>
                {plan.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {plan.description}
                  </p>
                )}
                <div className="plan-price-block">
                  {plan.originalPrice > 0 && (
                    <span className="plan-price-old">{(plan.originalPrice / 100).toFixed(2)} EUR</span>
                  )}
                  <span className="plan-price-main">{(plan.price / 100).toFixed(2)}<span className="plan-price-currency"> EUR</span></span>
                  {plan.originalPrice > 0 && (
                    <span className="plan-discount-badge">-{Math.round((1 - plan.price / plan.originalPrice) * 100)}%</span>
                  )}
                </div>
                <div className="plan-divider" />
                <ul className="plan-features">
                  {cardFeatures.map((feature, featureIdx) => (
                    <li key={`${plan.key}-feature-${featureIdx}`}>
                      <i className="fa-solid fa-check"></i> {feature}
                    </li>
                  ))}
                </ul>
                {cardTags.length > 0 && (
                  <div className="plan-macros">
                    {cardTags.map((tag, tagIdx) => <span key={`${plan.key}-tag-${tagIdx}`} className="plan-macro-tag">{tag}</span>)}
                  </div>
                )}
                <button
                  className={`plan-cta${plan.popular ? ' plan-cta--popular' : ''}`}
                  onClick={() => handlePurchase(plan.key)}
                  style={!plan.popular && plan.themeColor ? {
                    color: plan.themeColor,
                    borderColor: `${plan.themeColor}55`,
                    background: `${plan.themeColor}1f`,
                  } : undefined}
                >
                  {ctaLabel}
                  <i className="fa-solid fa-arrow-right plan-cta-arrow"></i>
                </button>
              </div>
            );
          })}
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
            <span className="sticky-cta-badge">{t('sticky.limitedOffer')}</span>
            <strong>404 Tweaks</strong>
            <span> — {t('sticky.from')} <strong className="sticky-cta-price">{(minPrice / 100).toFixed(2)} €</strong></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button className="sticky-cta-btn" onClick={scrollToPrice}>
              {t('sticky.buy')}
            </button>
            <span className="sticky-cta-sub">{t('sticky.instantAfterPayment')}</span>
          </div>
        </div>
      )}
    </>
  );
}



