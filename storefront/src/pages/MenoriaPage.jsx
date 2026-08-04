import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { CountUpStat } from '../hooks/useCountUp.jsx';
import FaqItem from '../components/FaqItem.jsx';
import ReviewsCarousel from '../components/ReviewsCarousel.jsx';

const ACCENT       = '#f97316';
const ACCENT_DIM   = 'rgba(249,115,22,0.12)';
const ACCENT_GLOW  = 'rgba(249,115,22,0.35)';
const ACCENT_BORDER = 'rgba(249,115,22,0.35)';

const planIcons = { DAYS_30: 'fa-calendar', DAYS_90: 'fa-calendar-days', DAYS_365: 'fa-star', LIFETIME: 'fa-infinity' };

const normalizeTextList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => String(v || '').trim()).filter(Boolean))];
};

const resolvePlanIcon = (plan) => {
  const raw = String(plan?.icon || '').trim();
  if (!raw) return planIcons[plan.key] || 'fa-key';
  if (raw.includes('fa-')) {
    const token = raw.split(/\s+/).filter(p => p.startsWith('fa-')).pop();
    return token || (planIcons[plan.key] || 'fa-key');
  }
  return raw;
};

const DEFAULT_FEATURES = [
  'Injection automatique dans le launcher Minecraft',
  'Aucune modification manuelle requise',
  'Mises à jour silencieuses via le loader',
  'Compatible toutes versions Java',
  'Support technique Discord dédié',
];

const DEFAULT_TAGS = [
  'Auto-Aim', 'Reach', 'Anti-Knockback', 'Sprint', 'NoFall',
  'ESP', 'Killaura', 'Velocity', 'Scaffold', 'AutoClicker',
];

const FAQS = [
  {
    q: 'Comment fonctionne Menoria ?',
    a: 'Tu télécharges le MenoriaLoader.exe, tu t\'authentifies avec ta clé de licence, et le loader s\'occupe de tout : il injecte automatiquement l\'agent dans Minecraft à chaque lancement. Aucune manipulation manuelle.',
  },
  {
    q: 'Est-ce détectable ?',
    a: 'Menoria utilise une injection via javaagent invisible depuis l\'extérieur. Le processus est conçu pour être discret, mais aucun outil ne peut garantir 100% d\'indétectabilité sur tous les serveurs.',
  },
  {
    q: 'Quelles versions de Minecraft sont supportées ?',
    a: 'Menoria supporte toutes les versions Java standard (1.8 à la dernière release). La liste précise des fonctionnalités disponibles par version est dans le Discord.',
  },
  {
    q: 'Mon accès est-il lié à un seul PC ?',
    a: 'Oui, la licence est liée à ton HWID (identifiant matériel) lors du premier login. Tu peux contacter le support pour un reset si tu changes de machine.',
  },
  {
    q: 'Que se passe-t-il après le paiement ?',
    a: 'Tu reçois ta clé de licence par e-mail. Tu la rentres dans le loader et tu es opérationnel en moins de 2 minutes.',
  },
];

export default function MenoriaPage({ customer }) {
  const [plans, setPlans]           = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [lightbox, setLightbox]     = useState(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    api.getMenoriaPlans().then(data => {
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setPlans(sorted);
    }).catch(() => {});
    api.getReviews().then(data => { if (Array.isArray(data) && data.length > 0) setReviews(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === 'Escape')     setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox(l => l && l.images.length > 1 ? { ...l, idx: (l.idx + 1) % l.images.length } : l);
      if (e.key === 'ArrowLeft')  setLightbox(l => l && l.images.length > 1 ? { ...l, idx: (l.idx - 1 + l.images.length) % l.images.length } : l);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 300) { setShowSticky(false); return; }
      const pricing = document.getElementById('menoria-pricing');
      if (pricing) setShowSticky(pricing.getBoundingClientRect().top > window.innerHeight);
      else setShowSticky(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const minPrice = plans.length > 0 ? Math.min(...plans.map(p => p.price)) : null;

  const handlePurchase = (planKey) => {
    if (!customer) { navigate('/register'); return; }
    navigate(`/menoria/payment?plan=${planKey}`);
  };

  const scrollToPrice   = () => document.getElementById('menoria-pricing')?.scrollIntoView({ behavior: 'smooth' });
  const scrollToProduct = () => document.getElementById('menoria-product')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero" style={{ '--accent-override': ACCENT }}>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-badge" style={{ borderColor: ACCENT_BORDER, color: ACCENT, background: ACCENT_DIM }}>
            ● Minecraft Java · Cheat Client Premium
          </div>
          <h1>
            Domine Minecraft<br />
            comme jamais avant avec{' '}
            <span className="highlight" style={{ color: ACCENT, textShadow: `0 0 40px ${ACCENT_GLOW}` }}>
              Menoria
            </span>
          </h1>
          <p className="hero-subtitle">
            Le client Java injecté directement dans ton launcher. Activation en 2 minutes, aucune manipulation.
          </p>
          <div className="stats-row">
            <div className="stat">
              <CountUpStat value="+95%" style={{ color: ACCENT }} />
              <span className="stat-label" style={{ color: ACCENT }}>Précision visée</span>
            </div>
            <div className="stat">
              <CountUpStat value="-80%" style={{ color: ACCENT }} />
              <span className="stat-label" style={{ color: ACCENT }}>Knockback reçu</span>
            </div>
            <div className="stat">
              <CountUpStat value="50+" style={{ color: ACCENT }} />
              <span className="stat-label" style={{ color: ACCENT }}>Modules actifs</span>
            </div>
          </div>
          {minPrice !== null && (
            <p className="hero-price-hint">
              À partir de <strong className="hero-price-amount" style={{ color: ACCENT }}>{(minPrice / 100).toFixed(2)} €</strong>
              <span className="hero-price-sep"> · </span>
              Accès instantané
              <span className="hero-price-sep"> · </span>
              Sans engagement
            </p>
          )}
          <div className="hero-ctas">
            <button
              className="cta-primary cta-primary--hero"
              onClick={scrollToPrice}
              style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT_GLOW}`, color: '#000' }}
            >
              Obtenir Menoria
              <span className="cta-arrow-anim">→</span>
            </button>
            <button className="cta-secondary" onClick={scrollToProduct}>Voir le produit</button>
          </div>
        </div>
      </section>

      {/* ── PAIN STRIP ── */}
      <div className="pain-strip">
        <div className="pain-strip-inner">
          <div className="pain-item">
            <i className="fa-solid fa-crosshairs" style={{ color: ACCENT }}></i>
            <div>
              <p className="pain-title">Visée imprécise</p>
              <p className="pain-desc">Tu rates des kills que tu aurais dû avoir. L'aim assist corrige ça.</p>
            </div>
          </div>
          <div className="pain-divider" />
          <div className="pain-item">
            <i className="fa-solid fa-arrow-down-up-across-line" style={{ color: ACCENT }}></i>
            <div>
              <p className="pain-title">Knockback abusif</p>
              <p className="pain-desc">Les ennemis t'envoient valser à chaque hit. Le module velocity l'annule.</p>
            </div>
          </div>
          <div className="pain-divider" />
          <div className="pain-item">
            <i className="fa-solid fa-eye" style={{ color: ACCENT }}></i>
            <div>
              <p className="pain-title">Vision limitée</p>
              <p className="pain-desc">Tu ne vois pas les ennemis à travers les murs. L'ESP te donne l'avantage.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRODUCT ── */}
      <section className="section" id="menoria-product" style={{ background: 'var(--card-bg)' }}>
        <div className="secret-container">
          <div className="secret-content animate-on-scroll">
            <div
              className="product-tweaks-badge"
              style={{ borderColor: ACCENT_BORDER, background: ACCENT_DIM, color: ACCENT }}
            >
              <span className="tweaks-count" style={{ color: ACCENT }}>50+</span>
              <div className="tweaks-label-wrap">
                <span className="tweaks-label">Modules</span>
                <span className="tweaks-sublabel">disponibles</span>
              </div>
            </div>
            <h2 style={{ marginTop: '1.25rem' }}>
              Ce que fait{' '}
              <span className="highlight" style={{ color: ACCENT }}>Menoria</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, margin: '1rem 0 1.5rem' }}>
              Un agent Java injecté directement via le launcher Minecraft. Pas de modifications de fichiers, pas de risque de
              corruption — le loader patch le processus au lancement et restaure tout proprement à la fermeture.
            </p>
            <ul className="secret-list">
              {DEFAULT_FEATURES.map((f, i) => (
                <li key={i}>
                  <i className="fa-solid fa-check" style={{ color: ACCENT }}></i> {f}
                </li>
              ))}
            </ul>
            <button
              className="cta-primary product-price-cta"
              onClick={scrollToPrice}
              style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}`, color: '#000' }}
            >
              Voir les prix
            </button>
          </div>

          <div className="book-preview animate-on-scroll" style={{ borderColor: ACCENT_BORDER, background: ACCENT_DIM }}>
            <i className="fa-solid fa-cube" style={{ fontSize: '4rem', color: ACCENT, opacity: 0.7 }}></i>
          </div>
        </div>
      </section>

      {/* ── PERF ── */}
      <section className="section" style={{ background: 'var(--card-bg)' }}>
        <h2 className="section-title animate-on-scroll">
          Résultats{' '}
          <span className="highlight" style={{ color: ACCENT }}>mesurés</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">Données relevées sur des sessions PvP 1v1 en 1.8.9</p>
        <div className="perf-grid">
          {[
            { label: 'Précision auto-aim',  before: '62%',    after: '96%',     pctBad: 62, pctGood: 96 },
            { label: 'Knockback reçu',       before: '3.2 blocs', after: '0.6 blocs', pctBad: 80, pctGood: 15 },
            { label: 'Reach effectif',       before: '3.0 blocs', after: '3.8 blocs', pctBad: 30, pctGood: 76 },
          ].map((row, i) => (
            <div className="perf-row animate-on-scroll" key={i}>
              <div className="perf-header">
                <span className="perf-label">{row.label}</span>
                <div className="perf-vals">
                  <span className="perf-val-bad">{row.before}</span>
                  <span className="perf-arrow">→</span>
                  <span className="perf-val-good" style={{ color: ACCENT }}>{row.after}</span>
                </div>
              </div>
              <div className="perf-tracks">
                <div className="perf-track">
                  <span className="perf-track-label">Avant</span>
                  <div className="perf-track-bar">
                    <div className="perf-bar perf-bar--bad" style={{ '--w': `${row.pctBad}%` }} />
                  </div>
                </div>
                <div className="perf-track">
                  <span className="perf-track-label">Après</span>
                  <div className="perf-track-bar">
                    <div className="perf-bar" style={{ '--w': `${row.pctGood}%`, background: ACCENT, width: `${row.pctGood}%`, height: '100%', borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ── */}
      {reviews.length > 0 && (() => {
        const avg = (reviews.reduce((s, r) => s + (r.stars || 5), 0) / reviews.length).toFixed(1);
        return (
          <section className="section">
            <h2 className="section-title animate-on-scroll">
              Ce que disent nos{' '}
              <span className="highlight" style={{ color: ACCENT }}>clients</span>
            </h2>
            <div className="reviews-stats animate-on-scroll">
              <span><strong style={{ color: ACCENT }}>{reviews.length}</strong> avis vérifiés</span>
              <span className="reviews-sep">·</span>
              <span><strong style={{ color: '#FFD700' }}>{avg} ★</strong> note moyenne</span>
              <span className="reviews-sep">·</span>
              <span><strong style={{ color: ACCENT }}>{reviews.filter(r => r.stars === 5).length}</strong> 5 étoiles</span>
            </div>
            <ReviewsCarousel reviews={reviews} />
          </section>
        );
      })()}

      {/* ── PRICING ── */}
      <section className="section pricing-section" id="menoria-pricing" style={{ background: 'var(--card-bg)' }}>
        <h2 className="section-title animate-on-scroll">
          Choisir un{' '}
          <span className="highlight" style={{ color: ACCENT }}>plan Menoria</span>
        </h2>
        <p className="section-subtitle animate-on-scroll">Accès instantané après paiement · Clé reçue par e-mail</p>
        <div className="pricing-grid">
          {plans.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Chargement des plans...</p>
          ) : plans.map((plan, idx) => {
            const features  = normalizeTextList(plan.features);
            const tags      = normalizeTextList(plan.tags);
            const cardFeats = features.length > 0 ? features : DEFAULT_FEATURES;
            const cardTags  = tags.length > 0 ? tags : DEFAULT_TAGS;
            const icon      = resolvePlanIcon(plan);
            const popular   = plan.badgeText || 'Populaire';
            const cta       = plan.ctaText || (customer ? 'Acheter' : "S'inscrire");
            const accent    = plan.themeColor || ACCENT;

            return (
              <div
                className={`plan-card animate-on-scroll${plan.popular ? ' plan-card--popular' : ''}`}
                key={plan.key}
                style={{
                  animationDelay: `${idx * 0.08}s`,
                  borderColor: plan.popular ? ACCENT : `${accent}55`,
                }}
              >
                <div
                  className="plan-card-glow"
                  aria-hidden="true"
                  style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)` }}
                />
                {plan.popular && (
                  <div className="plan-popular-badge" style={{ background: ACCENT, color: '#000' }}>
                    <i className="fa-solid fa-fire"></i> {popular}
                  </div>
                )}
                <div
                  className="plan-icon"
                  style={{ color: accent, borderColor: `${accent}55`, background: `${accent}22` }}
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
                  <span className="plan-price-main">
                    {(plan.price / 100).toFixed(2)}<span className="plan-price-currency"> EUR</span>
                  </span>
                  {plan.originalPrice > 0 && (
                    <span className="plan-discount-badge">-{Math.round((1 - plan.price / plan.originalPrice) * 100)}%</span>
                  )}
                </div>
                <div className="plan-divider" />
                <ul className="plan-features">
                  {cardFeats.map((f, fi) => (
                    <li key={fi}><i className="fa-solid fa-check" style={{ color: accent }}></i> {f}</li>
                  ))}
                </ul>
                {cardTags.length > 0 && (
                  <div className="plan-macros">
                    {cardTags.map((tag, ti) => (
                      <span key={ti} className="plan-macro-tag" style={{ borderColor: `${accent}44`, color: accent }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  className={`plan-cta${plan.popular ? ' plan-cta--popular' : ''}`}
                  onClick={() => handlePurchase(plan.key)}
                  style={plan.popular
                    ? { background: ACCENT, color: '#000', border: 'none' }
                    : { color: accent, borderColor: `${accent}55`, background: `${accent}1f` }
                  }
                >
                  {cta}
                  <i className="fa-solid fa-arrow-right plan-cta-arrow"></i>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">
          Questions{' '}
          <span className="highlight" style={{ color: ACCENT }}>fréquentes</span>
        </h2>
        <div className="faq-container">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* ── STICKY CTA ── */}
      {showSticky && minPrice !== null && (
        <div className="sticky-cta" style={{ borderColor: ACCENT_BORDER }}>
          <div className="sticky-cta-info">
            <span className="sticky-cta-badge" style={{ background: ACCENT, color: '#000' }}>Offre limitée</span>
            <strong>Menoria</strong>
            <span> — à partir de <strong className="sticky-cta-price" style={{ color: ACCENT }}>{(minPrice / 100).toFixed(2)} €</strong></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              className="sticky-cta-btn"
              onClick={scrollToPrice}
              style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
            >
              Obtenir l'accès
            </button>
            <span className="sticky-cta-sub">Accès instantané après paiement</span>
          </div>
        </div>
      )}

      {lightbox && createPortal(
        <div className="lightbox-overlay" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Fermer">x</button>
          <img
            key={lightbox.idx}
            src={lightbox.images[lightbox.idx]}
            alt="Menoria"
            onClick={e => {
              e.stopPropagation();
              if (lightbox.images.length > 1)
                setLightbox(l => ({ ...l, idx: (l.idx + 1) % l.images.length }));
            }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
