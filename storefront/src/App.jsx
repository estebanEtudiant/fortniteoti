import React, { useState, useEffect, useCallback } from 'react';
import api from './lib/api.js';

function useDownloadUrl() {
  const [url, setUrl] = useState(import.meta.env.VITE_DOWNLOAD_URL || '#');
  useEffect(() => {
    api.getLatestSoftware()
      .then(data => { if (data?.url) setUrl(data.url); })
      .catch(() => {});
  }, []);
  return url;
}

function usePublicSettings() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    api.getPublicSettings().then(setSettings).catch(() => {});
  }, []);
  return settings;
}

function useScrollAnimations(route) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    );

    const attach = () => {
      document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => observer.observe(el));
    };

    // Passe initiale (DOM statique)
    const t1 = setTimeout(attach, 60);
    // Passes différées pour le contenu chargé depuis l'API (reviews, plans)
    const t2 = setTimeout(attach, 500);
    const t3 = setTimeout(attach, 1400);
    // Fallback final : force tous les éléments encore invisibles à apparaître
    const t4 = setTimeout(() => {
      document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => el.classList.add('visible'));
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); observer.disconnect(); };
  }, [route]);
}

// ══════════════════════════════════════════════════════
//  Simple Hash Router
// ══════════════════════════════════════════════════════
function parseHash() {
  const full = window.location.hash.slice(1) || '/';
  const idx = full.indexOf('?');
  return idx === -1 ? full : full.slice(0, idx);
}

function getHashParam(name) {
  const full = window.location.hash.slice(1) || '/';
  const idx = full.indexOf('?');
  if (idx === -1) return null;
  return new URLSearchParams(full.slice(idx + 1)).get(name);
}

function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}

function navigate(path) {
  window.location.hash = path;
}

// ══════════════════════════════════════════════════════
//  Auth Context
// ══════════════════════════════════════════════════════
function useAuth() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (api.getToken()) {
      api.getProfile()
        .then(data => setCustomer(data))
        .catch(() => { api.logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (loginStr, password) => {
    const data = await api.login(loginStr, password);
    setCustomer(data.customer);
    return data;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const data = await api.register(email, username, password);
    setCustomer(data.customer);
    return data;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setCustomer(null);
    navigate('/');
  }, []);

  const refresh = useCallback(async () => {
    const data = await api.getProfile();
    setCustomer(data);
  }, []);

  return { customer, loading, login, register, logout, refresh };
}

// ══════════════════════════════════════════════════════
//  HEADER
// ══════════════════════════════════════════════════════
function Header({ customer, onLogout, discordUrl }) {
  return (
    <header>
      <div className="header-content">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="404 Tweaks" height="38" style={{ display: 'block' }} />
        </div>
        <div className="header-nav">
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="discord-btn">
              <i className="fa-brands fa-discord"></i>Discord
            </a>
          )}
          {customer ? (
            <>
              <button className="header-link" onClick={() => navigate('/profile')}>
                <i className="fa-solid fa-user" style={{ marginRight: 6 }}></i>
                {customer.displayName || customer.username}
              </button>
              <button className="header-link" onClick={onLogout}>Deconnexion</button>
            </>
          ) : (
            <>
              <button className="header-link" onClick={() => navigate('/login')}>Connexion</button>
              <button className="cta-header" onClick={() => navigate('/register')}>Creer un compte</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════
//  FAQ Item
// ══════════════════════════════════════════════════════
function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <span className={`faq-toggle ${open ? 'open' : ''}`}>&#9660;</span>
      </button>
      {open && <div className="faq-answer">{answer}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  HOME PAGE (Vitrine)
// ══════════════════════════════════════════════════════
const planIcons  = { DAYS_30: 'fa-calendar', DAYS_90: 'fa-calendar-days', DAYS_365: 'fa-star', LIFETIME: 'fa-infinity' };


function StarRating({ count }) {
  const n = Math.max(1, Math.min(5, count || 5));
  return (
    <div className="stars">
      {Array.from({ length: n }).map((_, i) => <span key={i}>&#9733;</span>)}
      {Array.from({ length: 5 - n }).map((_, i) => <span key={`e${i}`} style={{ opacity: 0.3 }}>&#9733;</span>)}
    </div>
  );
}

const REVIEWS_PREVIEW = 6;

function HomePage({ customer, screenshotUrl }) {
  const [plans, setPlans] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => { if (e.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => {});
    api.getReviews().then(data => { if (Array.isArray(data) && data.length > 0) setReviews(data); }).catch(() => {});
  }, []);

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
          <div className="hero-badge">⚡ 100+ TWEAKS DISPONIBLES</div>
          <h1>STOP JOUER<br/>AVEC UN <span className="highlight">HANDICAP</span></h1>
          <p className="hero-subtitle">
            Un logiciel. 100+ optimisations. Des résultats en 5 minutes.
          </p>
          <div className="stats-row">
            <div className="stat">
              <span className="stat-number">+66%</span>
              <span className="stat-label">FPS Boost</span>
            </div>
            <div className="stat">
              <span className="stat-number">-65%</span>
              <span className="stat-label">Input Delay</span>
            </div>
            <div className="stat">
              <span className="stat-number">100+</span>
              <span className="stat-label">Tweaks</span>
            </div>
          </div>
          <div className="hero-ctas">
            <button className="cta-primary" onClick={scrollToPrice}>Acheter maintenant</button>
            <button className="cta-secondary" onClick={scrollToProduct}>Voir le logiciel ↓</button>
          </div>
        </div>
      </section>

      {/* ── PAIN STRIP ── */}
      <div className="pain-strip">
        <div className="pain-strip-inner">
          <div className="pain-item">
            <i className="fa-solid fa-bolt-lightning"></i>
            <div>
              <p className="pain-title">Input Delay caché</p>
              <p className="pain-desc">Le micro-délai qui fait rater chaque pompe</p>
            </div>
          </div>
          <div className="pain-divider" />
          <div className="pain-item">
            <i className="fa-solid fa-wave-square"></i>
            <div>
              <p className="pain-title">FPS instables</p>
              <p className="pain-desc">Chutes en endgame qui coûtent vos victoires</p>
            </div>
          </div>
          <div className="pain-divider" />
          <div className="pain-item">
            <i className="fa-solid fa-network-wired"></i>
            <div>
              <p className="pain-title">Ping élevé</p>
              <p className="pain-desc">Votre ennemi vous voit 50ms avant vous</p>
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
                <span className="tweaks-label">tweaks</span>
                <span className="tweaks-sublabel">disponibles</span>
              </div>
            </div>
            <h2 style={{ marginTop: '1.25rem' }}>Le Logiciel <span className="highlight">404 Tweaks</span></h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, margin: '1rem 0 1.5rem' }}>
              Toutes les optimisations des meilleurs joueurs mondiaux, automatisées en un clic.
            </p>
            <ul className="secret-list">
              <li><i className="fa-solid fa-check"></i> Tweaks Windows appliqués automatiquement</li>
              <li><i className="fa-solid fa-check"></i> GPU, CPU, RAM et réseau optimisés</li>
              <li><i className="fa-solid fa-check"></i> Interface simple, aucune compétence requise</li>
              <li><i className="fa-solid fa-check"></i> Restauration en 1 clic si besoin</li>
              <li><i className="fa-solid fa-check"></i> Mises à jour automatiques incluses</li>
            </ul>
            <button className="cta-primary product-price-cta" onClick={scrollToPrice}>
              Voir les prix →
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

      {/* ── PERFORMANCE ── */}
      <section className="section">
        <h2 className="section-title animate-on-scroll">Résultats <span className="highlight">Mesurables</span></h2>
        <p className="section-subtitle animate-on-scroll">Config milieu de gamme — RTX 4060 / i5-13400</p>
        <div className="perf-grid">
          {[
            { label: 'FPS Moyen',   before: '144 FPS',  after: '240+ FPS', pctBad: 44, pctGood: 95 },
            { label: 'Input Delay', before: '35 ms',    after: '12 ms',    pctBad: 70, pctGood: 24 },
            { label: 'Stutter',     before: 'Fréquent', after: 'Zéro',     pctBad: 60, pctGood: 3  },
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
                  <span className="perf-track-label">Avant</span>
                  <div className="perf-track-bar">
                    <div className="perf-bar perf-bar--bad" style={{ '--w': `${row.pctBad}%` }} />
                  </div>
                </div>
                <div className="perf-track">
                  <span className="perf-track-label">Après</span>
                  <div className="perf-track-bar">
                    <div className="perf-bar perf-bar--good" style={{ '--w': `${row.pctGood}%` }} />
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
        const displayed = showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW);
        const hasMore = reviews.length > REVIEWS_PREVIEW;
        return (
          <section className="section" style={{ background: 'var(--card-bg)' }}>
            <h2 className="section-title animate-on-scroll">Ils ont <span className="highlight">Transformé</span> leur Setup</h2>
            <div className="reviews-stats animate-on-scroll">
              <span><strong style={{ color: 'var(--neon-green)' }}>{reviews.length}</strong> avis vérifiés</span>
              <span className="reviews-sep">·</span>
              <span><strong style={{ color: '#FFD700' }}>{avg} ★</strong> note moyenne</span>
              <span className="reviews-sep">·</span>
              <span><strong style={{ color: 'var(--neon-green)' }}>{reviews.filter(r => r.stars === 5).length}</strong> avis 5★</span>
            </div>
            <div className="testimonials-grid">
              {displayed.map((t, i) => (
                <div className="testimonial animate-on-scroll" key={i}>
                  <StarRating count={t.stars} />
                  <p className="testimonial-text">"{t.text}"</p>
                  <p className="testimonial-author">{t.username}</p>
                  <p className="testimonial-role">{t.description}</p>
                </div>
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button onClick={() => setShowAllReviews(v => !v)} className="btn-secondary" style={{ padding: '0.75rem 2rem' }}>
                  {showAllReviews ? 'Voir moins' : `Voir tous les avis (${reviews.length})`}
                </button>
              </div>
            )}
          </section>
        );
      })()}

      {/* ── PRICING ── */}
      <section className="section pricing-section" id="pricing">
        <h2 className="section-title animate-on-scroll">Prêt à <span className="highlight">Dominer</span> ?</h2>
        <p className="section-subtitle animate-on-scroll">Accès immédiat après paiement — sans engagement</p>
        <div className="pricing-grid">
          {plans.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Chargement...</p>
          ) : plans.map((plan, idx) => (
            <div
              className={`plan-card animate-on-scroll${plan.popular ? ' plan-card--popular' : ''}`}
              key={plan.key}
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              {/* Glow orb */}
              <div className="plan-card-glow" aria-hidden="true" />

              {/* Popular badge */}
              {plan.popular && (
                <div className="plan-popular-badge">
                  <i className="fa-solid fa-bolt-lightning"></i> Populaire
                </div>
              )}

              {/* Icon */}
              <div className="plan-icon">
                <i className={`fa-solid ${planIcons[plan.key] || 'fa-key'}`}></i>
              </div>

              {/* Duration */}
              <p className="plan-name">{plan.name}</p>

              {/* Price block */}
              <div className="plan-price-block">
                {plan.originalPrice > 0 && (
                  <span className="plan-price-old">{(plan.originalPrice / 100).toFixed(2)} €</span>
                )}
                <span className="plan-price-main">{(plan.price / 100).toFixed(2)}<span className="plan-price-currency"> €</span></span>
                {plan.originalPrice > 0 && (
                  <span className="plan-discount-badge">-{Math.round((1 - plan.price / plan.originalPrice) * 100)}%</span>
                )}
              </div>

              {/* Divider */}
              <div className="plan-divider" />

              {/* Features */}
              <ul className="plan-features">
                <li><i className="fa-solid fa-check"></i> 100+ tweaks d'optimisation</li>
                <li><i className="fa-solid fa-check"></i> Discord VIP privé</li>
                <li><i className="fa-solid fa-check"></i> Mises à jour automatiques</li>
                <li><i className="fa-solid fa-check"></i> Support technique direct</li>
              </ul>

              {/* CTA */}
              <button
                className={`plan-cta${plan.popular ? ' plan-cta--popular' : ''}`}
                onClick={() => handlePurchase(plan.key)}
              >
                {customer ? 'Acheter maintenant' : 'Créer un Compte'}
                <i className="fa-solid fa-arrow-right plan-cta-arrow"></i>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section" style={{ background: 'var(--card-bg)' }}>
        <h2 className="section-title animate-on-scroll">Questions <span className="highlight">Fréquentes</span></h2>
        <div className="faq-container">
          <FaqItem question="Le logiciel fonctionne-t-il pour tous les PC ?" answer="Oui ! Toutes les configurations sont supportées, des entrées de gamme aux setups haut de gamme. Chaque module détecte automatiquement votre matériel (Intel/AMD, NVIDIA/AMD) et adapte les optimisations." />
          <FaqItem question="Est-ce que je risque d'endommager mon PC ?" answer="Non. Les 100+ optimisations sont sûres et réversibles. Un point de restauration Windows est créé automatiquement avant chaque modification. Un clic pour revenir en arrière." />
          <FaqItem question="Combien de temps faut-il pour tout appliquer ?" answer="Moins de 5 minutes. Le logiciel applique automatiquement les 100+ tweaks. Vous pouvez aussi activer les modules un par un selon vos besoins." />
          <FaqItem question="Compatible AMD et NVIDIA ?" answer="Absolument. Le module GPU détecte votre carte et applique les paramètres optimaux : Low Latency Mode, NVIDIA Reflex, Anti-Lag (RTX 2000/3000/4000, RX 6000/7000)." />
          <FaqItem question="Y a-t-il des mises à jour ?" answer="Oui, le logiciel se met à jour automatiquement avec les nouvelles optimisations Fortnite, updates de drivers et changements de méta. Toujours incluses." />
        </div>
      </section>
    </>
  );
}

// ══════════════════════════════════════════════════════
//  LOGIN PAGE
// ══════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
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
        <h2 className="auth-title">Connexion</h2>
        <p className="auth-subtitle">Accedez a votre espace client</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email ou nom d'utilisateur</label>
            <input
              type="text"
              className="form-input"
              placeholder="votre@email.com"
              value={login}
              onChange={e => setLogin(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="Votre mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Connexion...' : 'Se Connecter'}
          </button>
        </form>
        <div className="auth-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            Pas encore de compte ?{' '}
            <button className="auth-footer-link" onClick={() => navigate('/register')}>
              Creer un compte
            </button>
          </span>
          <button className="auth-footer-link" onClick={() => navigate('/forgot-password')}>
            Mot de passe oublie ?
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  FORGOT PASSWORD PAGE
// ══════════════════════════════════════════════════════
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-envelope-circle-check"></i>
            </div>
            <h2 className="auth-title">Email envoye !</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Si un compte existe avec cette adresse, tu vas recevoir un lien de reinitialisation valable <strong style={{ color: '#fff' }}>1 heure</strong>.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Pense a verifier tes spams.
            </p>
            <button className="btn-outline" onClick={() => navigate('/login')}>
              Retour a la connexion
            </button>
          </div>
        ) : (
          <>
            <h2 className="auth-title">Mot de passe oublie</h2>
            <p className="auth-subtitle">Saisis ton email pour recevoir un lien de reinitialisation</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Adresse email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
            <div className="auth-footer" style={{ textAlign: 'center' }}>
              <button className="auth-footer-link" onClick={() => navigate('/login')}>
                Retour a la connexion
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  RESET PASSWORD PAGE
// ══════════════════════════════════════════════════════
function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = getHashParam('token');

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', color: '#e53e3e', marginBottom: '1rem' }}>
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
          <h2 className="auth-title">Lien invalide</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Ce lien est invalide ou a expire. Fais une nouvelle demande.
          </p>
          <button className="cta-primary" onClick={() => navigate('/forgot-password')}>
            Nouvelle demande
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">Mot de passe modifie !</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Ton mot de passe a ete reinitialise avec succes.
            </p>
            <button className="cta-primary" onClick={() => navigate('/login')}>
              Se connecter
            </button>
          </div>
        ) : (
          <>
            <h2 className="auth-title">Nouveau mot de passe</h2>
            <p className="auth-subtitle">Choisis un nouveau mot de passe securise</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="8 caracteres minimum"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  REGISTER PAGE
// ══════════════════════════════════════════════════════
function RegisterPage({ onRegister }) {
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
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
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
        <h2 className="auth-title">Creer un Compte</h2>
        <p className="auth-subtitle">Rejoignez la communaute 404 Tweaks</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input
              type="text"
              className="form-input"
              placeholder="PlayerOne"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="8 caracteres minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="Confirmez votre mot de passe"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creation...' : 'Creer Mon Compte'}
          </button>
        </form>
        <div className="auth-footer">
          Deja un compte ?{' '}
          <button className="auth-footer-link" onClick={() => navigate('/login')}>
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  PROFILE PAGE
// ══════════════════════════════════════════════════════
function ProfilePage({ customer, onLogout, onRefresh }) {
  const downloadUrl = useDownloadUrl();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    api.getProfile()
      .then(data => {
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
      setMessage('Profil mis a jour');
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
      setResendMsg('Email de verification renvoye !');
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
      setPwMessage('Mot de passe modifie avec succes');
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
        <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
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
            Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Licenses */}
      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-key" style={{ marginRight: 8 }}></i>
          Mes Licences
        </h3>
        {profile.licenses && profile.licenses.length > 0 ? (
          profile.licenses.map(lic => (
            <div className="license-card" key={lic.id}>
              <div className="license-key">{lic.licenseKey}</div>
              <div className="license-meta">
                <span>Plan: <strong>{lic.plan}</strong></span>
                <span className={`license-status ${lic.status.toLowerCase()}`}>{lic.status}</span>
                {lic.expiresAt && (
                  <span>Expire: {new Date(lic.expiresAt).toLocaleDateString('fr-FR')}</span>
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
                  Telecharger le logiciel
                </a>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block', color: '#333' }}></i>
            Aucune licence pour le moment.
            <br/>
            <button className="cta-primary" style={{ marginTop: '1rem', padding: '0.8rem 2rem', fontSize: '1rem' }} onClick={() => navigate('/payment')}>
              Acheter le Logiciel
            </button>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-receipt" style={{ marginRight: 8 }}></i>
          Historique des Commandes
        </h3>
        {profile.orders && profile.orders.length > 0 ? (
          profile.orders.map(order => (
            <div className="order-row" key={order.id}>
              <div>
                <span className="order-plan">{order.plan}</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '1rem', fontSize: '0.9rem' }}>
                  {new Date(order.createdAt).toLocaleDateString('fr-FR')}
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
          <div className="empty-state">Aucune commande pour le moment.</div>
        )}
      </div>

      {/* Edit Profile */}
      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-pen" style={{ marginRight: 8 }}></i>
          Informations du Profil
        </h3>
        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}
        {editMode ? (
          <>
            <div className="profile-form-row">
              <div className="form-group">
                <label className="form-label">Nom d'affichage</label>
                <input type="text" className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Discord ID</label>
                <input type="text" className="form-input" placeholder="Username#1234" value={discordId} onChange={e => setDiscordId(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="cta-primary" style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button className="btn-outline" onClick={() => setEditMode(false)}>Annuler</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span className="form-label">Nom d'utilisateur</span>
                <p>{profile.username}</p>
              </div>
              <div>
                <span className="form-label">Nom d'affichage</span>
                <p>{profile.displayName || '-'}</p>
              </div>
              <div>
                <span className="form-label">Email</span>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {profile.email}
                  {profile.emailVerified ? (
                    <span style={{ fontSize: '0.75rem', color: '#48bb78', background: 'rgba(72,187,120,0.15)', borderRadius: 4, padding: '1px 6px' }}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i>Verifie
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#f6ad55', background: 'rgba(246,173,85,0.15)', borderRadius: 4, padding: '1px 6px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 4 }}></i>Non verifie
                    </span>
                  )}
                </p>
                {!profile.emailVerified && (
                  <div style={{ marginTop: '0.4rem' }}>
                    {resendMsg && <p style={{ fontSize: '0.8rem', color: resendMsg.includes('renvoye') ? '#48bb78' : '#e53e3e', marginBottom: '0.3rem' }}>{resendMsg}</p>}
                    <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={handleResendVerification} disabled={resendLoading}>
                      {resendLoading ? 'Envoi...' : 'Renvoyer l\'email de verification'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <span className="form-label">Discord</span>
                <p>{profile.discordId || '-'}</p>
              </div>
            </div>
            <button className="btn-outline" onClick={() => setEditMode(true)}>Modifier le profil</button>
          </>
        )}
      </div>

      {/* Password Change */}
      <div className="profile-section">
        <h3 className="profile-section-title">
          <i className="fa-solid fa-lock" style={{ marginRight: 8 }}></i>
          Securite
        </h3>
        {pwMessage && <div className="form-success">{pwMessage}</div>}
        {pwError && <div className="form-error">{pwError}</div>}
        {showPassword ? (
          <form onSubmit={handlePasswordChange}>
            <div className="profile-form-row">
              <div className="form-group">
                <label className="form-label">Mot de passe actuel</label>
                <input type="password" className="form-input" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required autoComplete="current-password" />
              </div>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input type="password" className="form-input" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="cta-primary" style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }}>
                Changer le mot de passe
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowPassword(false)}>Annuler</button>
            </div>
          </form>
        ) : (
          <button className="btn-outline" onClick={() => setShowPassword(true)}>Changer le mot de passe</button>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn-danger" onClick={onLogout}>
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 8 }}></i>
            Se deconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  PAYMENT PAGE
// ══════════════════════════════════════════════════════
function PaymentPage({ customer }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    const urlPlan = getHashParam('plan');
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
      const { url } = await api.createCheckoutSession(selectedPlan);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.key === selectedPlan);

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
            {/* Plan selector */}
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

            {/* What's included */}
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
              {currentPlan ? `Payer ${(currentPlan.price / 100).toFixed(2)} EUR` : 'Payer avec Stripe'}
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

// ══════════════════════════════════════════════════════
//  PAYMENT SUCCESS PAGE
// ══════════════════════════════════════════════════════
function PaymentSuccessPage() {
  const downloadUrl = useDownloadUrl();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sessionId = getHashParam('session_id');
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
      <div className="auth-card" style={{ maxWidth: 520, textAlign: 'center' }}>
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
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">Paiement confirme !</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              Merci pour votre achat. Voici votre cle de licence. Conservez-la precieusement.
            </p>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: '1.2rem 1rem', marginBottom: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Votre cle de licence
              </p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', margin: 0, wordBreak: 'break-all' }}>
                {licenseKey}
              </p>
            </div>

            <button
              className="cta-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={handleCopy}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? 'Copie !' : 'Copier la cle'}
            </button>

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

            <button className="btn-outline" style={{ width: '100%', padding: '0.8rem' }} onClick={() => navigate('/profile')}>
              Voir mon profil
            </button>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1.2rem' }}>
              La cle et le lien de telechargement sont aussi disponibles dans votre profil.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  PAYMENT CANCEL PAGE
// ══════════════════════════════════════════════════════
function PaymentCancelPage() {
  return (
    <div className="auth-page" style={{ padding: '3rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#888' }}>
          <i className="fa-solid fa-circle-xmark"></i>
        </div>
        <h2 className="auth-title">Paiement annule</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          Votre paiement a ete annule. Aucun montant n'a ete debite. Vous pouvez reessayer quand vous voulez.
        </p>
        <button className="cta-primary" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }} onClick={() => navigate('/payment')}>
          Reessayer le paiement
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  VERIFY EMAIL SENT PAGE
// ══════════════════════════════════════════════════════
function VerifyEmailSentPage({ customer }) {
  const [resendLoading, setResendLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleResend = async () => {
    setResendLoading(true);
    setMsg('');
    try {
      await api.resendVerification();
      setMsg('Email renvoye ! Verifie ta boite mail (et tes spams).');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem' }}>
          <i className="fa-solid fa-envelope-circle-check"></i>
        </div>
        <h2 className="auth-title">Verifie ton email !</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
          Un lien de verification a ete envoye a{' '}
          <strong style={{ color: '#fff' }}>{customer?.email || 'ton adresse email'}</strong>.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Clique sur le lien dans l'email pour verifier ton compte et pouvoir acheter.<br/>
          Pense a verifier tes spams.
        </p>
        {msg && <div className={msg.includes('renvoye') ? 'form-success' : 'form-error'} style={{ marginBottom: '1rem' }}>{msg}</div>}
        {customer && (
          <button className="btn-outline" style={{ marginBottom: '0.75rem', width: '100%' }} onClick={handleResend} disabled={resendLoading}>
            {resendLoading ? 'Envoi...' : 'Renvoyer l\'email de verification'}
          </button>
        )}
        <button className="auth-footer-link" onClick={() => navigate('/profile')}>
          Aller a mon profil
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  VERIFY EMAIL PAGE (handles token from email link)
// ══════════════════════════════════════════════════════
function VerifyEmailPage({ onRefresh }) {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const token = getHashParam('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Lien invalide.');
      return;
    }
    api.verifyEmail(token)
      .then(() => {
        setStatus('success');
        if (onRefresh) onRefresh();
      })
      .catch(err => {
        setStatus('error');
        setErrorMsg(err.message);
      });
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
            <h2 className="auth-title">Verification en cours...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="auth-title">Email verifie !</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              Ton adresse email a ete verifiee avec succes. Tu peux maintenant acheter le logiciel.
            </p>
            <button className="cta-primary" style={{ padding: '0.9rem 2rem' }} onClick={() => navigate('/payment')}>
              <i className="fa-solid fa-cart-shopping" style={{ marginRight: 8 }}></i>
              Acheter le logiciel
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', color: '#e53e3e', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h2 className="auth-title">Lien invalide</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {errorMsg || 'Ce lien est invalide ou a expire.'}
            </p>
            <button className="cta-primary" onClick={() => navigate('/verify-email-sent')}>
              Renvoyer un email
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  FOOTER
// ══════════════════════════════════════════════════════
function Footer({ discordUrl }) {
  return (
    <footer>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <p className="footer-text">&copy; 2026 404 Tweaks. Tous droits reserves.</p>
        <p className="footer-text">Logiciel d'optimisation Fortnite pour joueurs competitifs</p>
        <div className="footer-links">
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="footer-link" style={{ color: '#b9beff' }}>
              <i className="fa-brands fa-discord" style={{ marginRight: 5 }}></i>Discord
            </a>
          )}
          <button className="footer-link">Conditions d'utilisation</button>
          <button className="footer-link">Politique de confidentialite</button>
          <button className="footer-link">Contact</button>
        </div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════
//  APP (Router)
// ══════════════════════════════════════════════════════
export default function App() {
  const route = useRoute();
  const { customer, loading, login, register, logout, refresh } = useAuth();
  const publicSettings = usePublicSettings();
  useScrollAnimations(route);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Chargement...</p>
      </div>
    );
  }

  let page;
  switch (route) {
    case '/login':
      page = customer ? <ProfilePage customer={customer} onLogout={logout} onRefresh={refresh} /> : <LoginPage onLogin={login} />;
      break;
    case '/register':
      page = customer ? <ProfilePage customer={customer} onLogout={logout} onRefresh={refresh} /> : <RegisterPage onRegister={register} />;
      break;
    case '/profile':
      page = customer ? <ProfilePage customer={customer} onLogout={logout} onRefresh={refresh} /> : <LoginPage onLogin={login} />;
      break;
    case '/payment':
      page = customer ? <PaymentPage customer={customer} /> : <LoginPage onLogin={login} />;
      break;
    case '/payment/success':
      page = <PaymentSuccessPage />;
      break;
    case '/payment/cancel':
      page = <PaymentCancelPage />;
      break;
    case '/forgot-password':
      page = <ForgotPasswordPage />;
      break;
    case '/reset-password':
      page = <ResetPasswordPage />;
      break;
    case '/verify-email-sent':
      page = <VerifyEmailSentPage customer={customer} />;
      break;
    case '/verify-email':
      page = <VerifyEmailPage onRefresh={refresh} />;
      break;
    default:
      page = <HomePage customer={customer} screenshotUrl={publicSettings.screenshotUrl} />;
  }

  return (
    <>
      <Header customer={customer} onLogout={logout} discordUrl={publicSettings.discordInviteUrl} />
      {page}
      <Footer discordUrl={publicSettings.discordInviteUrl} />
    </>
  );
}
