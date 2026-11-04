/* ====================== 404 — shared components ====================== */
const { useState, useEffect, useRef } = React;

/* ---------- icons ---------- */
const Icon = {
  store: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 9l1.5-5h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M8 13h8"/></svg>,
  status: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12h4l2 6 4-14 2 8h6"/></svg>,
  reviews: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2l2.9 6 6.6.6-5 4.3 1.5 6.5L12 16.8 5.9 19.4 7.4 12.9 2.4 8.6 9 8z"/></svg>,
  user: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  discord: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>,
  star: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l2.9 6 6.6.6-5 4.3 1.5 6.5L12 16.8 5.9 19.4 7.4 12.9 2.4 8.6 9 8z"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5"/></svg>,
  arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  chevron: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6"/></svg>,
  cart: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6"/></svg>,
  users: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.2"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.5M22 20c0-2.6-1.5-4.4-4-5.1"/></svg>,
  bolt: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13z"/></svg>,
  trophy: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"/></svg>,
  shield: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>,
  headset: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM20 14a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2zM18 19a4 4 0 0 1-4 3h-2"/></svg>,
  gear: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.3-1.3L13.7 2h-3.4l-.3 2.5A7 7 0 0 0 7.7 5.8l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.3 1.3l.3 2.5h3.4l.3-2.5a7 7 0 0 0 2.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z"/></svg>,
  telegram: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 3L2 11l6 2 2 7 3-4 5 4 4-17zM9.5 14.5l8-7-9.5 6"/></svg>,
  instagram: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  globe: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>,
};

/* ---------- small bits ---------- */
function Stars({ n = 5, size = 16 }) {
  return <span className="stars">{[0,1,2,3,4].map(i => <Icon.star key={i} style={{ width: size, height: size, opacity: i < n ? 1 : 0.25 }} />)}</span>;
}

function Btn({ kind = "primary", size, block, children, icon, iconRight, ...rest }) {
  const cls = ["btn", `btn-${kind}`, size && `btn-${size}`, block && "btn-block"].filter(Boolean).join(" ");
  return <button className={cls} {...rest}>{icon}{children}{iconRight}</button>;
}

function StatusBadge({ status, lang }) {
  const map = {
    updated: ["badge-ok", "updated", <span className="status-dot s-ok" key="d" />],
    updating: ["badge-warn", "updating", <Icon.gear key="g" style={{ width: 12, height: 12 }} />],
    new: ["badge-new", "isnew", <Icon.bolt key="b" style={{ width: 11, height: 11 }} />],
  };
  const [cls, key, ic] = map[status] || map.updated;
  return <span className={`badge ${cls}`}>{ic}{t(key, lang)}</span>;
}

/* durée courte d'un plan pour l'étiquette « dès X€ / … » (déduite du slug, sinon du champ « per ») */
/* nombre de jours d'un plan (déduit du slug 1d/3d/1w/1m/1y), null si à vie / inconnu */
function planDays(plan) {
  const m = /^(\d+)\s*(d|j|w|m|y)$/i.exec((plan && plan.id) || "");
  if (!m) return null;
  const n = +m[1], u = m[2].toLowerCase();
  return u === "w" ? n * 7 : u === "m" ? n * 30 : u === "y" ? n * 365 : n;
}
/* note moyenne des avis réels (null si aucun avis) */
function reviewSummary() {
  const list = (window.DATA && DATA.REVIEWS) || [];
  if (!list.length) return null;
  const avg = list.reduce((n, r) => n + (r.r || 0), 0) / list.length;
  return { avg: Math.round(avg * 10) / 10, count: list.length };
}
function planShortLabel(plan, lang) {
  if (!plan) return "";
  const fr = lang === "fr";
  const m = /^(\d+)\s*(d|j|w|m|y)$/i.exec(plan.id || "");
  if (m) {
    const n = +m[1], u = m[2].toLowerCase();
    const days = u === "w" ? n * 7 : u === "m" ? n * 30 : u === "y" ? n * 365 : n;
    if (u === "m") return "/ " + n + (fr ? " mois" : n > 1 ? " months" : " month");
    if (u === "y") return "/ " + n + (fr ? (n > 1 ? " ans" : " an") : (n > 1 ? " years" : " year"));
    return "/ " + days + (fr ? (days > 1 ? " jours" : " jour") : (days > 1 ? " days" : " day"));
  }
  if (/^life/i.test(plan.id || "")) return fr ? "à vie" : "lifetime";
  return (plan.per && plan.per[lang]) || "";
}

/* ---------- image optimisée : charge la copie .webp générée par shop-images.js, sinon l'original ---------- */
function webpOf(url) {
  return typeof url === "string" && /\/uploads\/gallery\/shop\/[^?#]+\.(png|jpe?g)$/i.test(url) ? url + ".webp" : url;
}
function Img({ src, priority, ...rest }) {
  return (
    <img src={webpOf(src)} decoding="async" loading={priority ? "eager" : "lazy"} fetchpriority={priority ? "high" : undefined}
      onError={(e) => { if (src && e.currentTarget.getAttribute("src") !== src) e.currentTarget.src = src; }} {...rest} />
  );
}

/* ---------- game card ---------- */
function useSpooferStock(enabled) {
  const [state, setState] = React.useState({ plans: DATA.SPOOFER_PLANS || [], ready: false, error: false });
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let pending = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(API_BASE + '/shop/spoofer/plans', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Stock unavailable');
        const plans = await response.json();
        if (!Array.isArray(plans)) throw new Error('Stock unavailable');
        if (!cancelled) { DATA.SPOOFER_PLANS = plans; setState({ plans, ready: true, error: false }); }
      } catch (error) {
        if (!cancelled) setState((previous) => ({ ...previous, ready: false, error: true }));
      } finally { pending = false; }
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [enabled]);
  return state;
}

function stockLabel(remaining, lang) {
  if (remaining === undefined) return lang === 'fr' ? 'Disponible' : 'Available';
  if (remaining === 0) return lang === 'fr' ? 'Rupture de stock' : 'Out of stock';
  return lang === 'fr' ? `${remaining} clé${remaining > 1 ? 's' : ''} en stock` : `${remaining} key${remaining > 1 ? 's' : ''} in stock`;
}

function GameCard({ game, lang, go, onAdd }) {
  const inventory = useSpooferStock(game.id === 'spoofer');
  const offers = game.id === 'spoofer' ? inventory.plans : DATA.PLANS;
  const cheapest = offers.reduce((a, p) => (!a || p.price < a.price ? p : a), null);
  const remaining = game.id === 'spoofer' ? offers.reduce((total, offer) => total + offer.stock, 0) : undefined;
  const minPrice = cheapest ? cheapest.price : 0;
  return (
    <div className="game-card" onClick={() => go("game/" + game.id)}>
      <div className={"media art-ph" + (game.image ? " has-img" : "")} data-label="ARTWORK">
        {game.image && <Img src={game.image} alt={game.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />}
        <div className="shard" />
        <div className="ph-fig" />
        <div className="glogo">{game.logo.split("\n").map((l,i) => <div key={i}>{l}</div>)}</div>
        <div className="tag">{game.name}</div>
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 4 }}>
          <StatusBadge status={game.status} lang={lang} />
        </div>
      </div>
      <div className="meta">
        <div className="price">
          <span style={{ fontFamily: "var(--f-mono)", fontWeight: 500, fontSize: 11, color: "var(--tx-mute)" }}>{t("from", lang)} </span>
          {cheapest ? minPrice.toFixed(2) + '€' : (lang === 'fr' ? 'Indisponible' : 'Unavailable')} <small>{cheapest && planShortLabel(cheapest, lang)}</small>
          <div style={{ fontSize: 12, marginTop: 6, color: remaining === 0 ? '#f87171' : 'var(--tx-dim)' }}>{game.id === 'spoofer' && !inventory.ready ? (lang === 'fr' ? 'Vérification du stock…' : 'Checking stock…') : stockLabel(remaining, lang)}</div>
        </div>
        <Btn kind="ghost" size="sm" iconRight={<Icon.arrow style={{ width: 14, height: 14 }} />}
          onClick={(e) => { e.stopPropagation(); go("game/" + game.id); }}>
          {t("viewTips", lang)}
        </Btn>
      </div>
    </div>
  );
}

/* ---------- review card ---------- */
function ReviewCard({ rev, lang }) {
  return (
    <div className="card rev-card">
      <div className="rev-head">
        <div className="avatar">{rev.name[0]}</div>
        <div>
          <div className="rev-name">{rev.name}</div>
          <div className="rev-loc">{rev.game}{rev.date ? " · " + new Date(rev.date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", year: "numeric" }) : ""}</div>
        </div>
        <Stars n={rev.r} size={14} />
      </div>
      <div className="rev-text">"{rev[lang] || rev.en}"</div>
      <div className="rev-verified" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Icon.check style={{ width: 12, height: 12 }} /> {t("verified", lang)}
      </div>
    </div>
  );
}

/* ---------- brand logo ---------- */
function BrandLogo({ className = "" }) {
  return (
    <div className={"brand-logo" + (className ? " " + className : "")}>
      <span className="brand-logo-num grad-tx" aria-hidden="true">404</span>
      <span className="brand-logo-tag">CHEAT NOT FOUND</span>
    </div>
  );
}

/* ---------- emplacement de visuel : affiche un état vide soigné tant que le fichier n'existe pas ---------- */
function MediaSlot({ src, type = "image", alt = "", label, className = "", priority, videoRef, autoPlayInView }) {
  const [failed, setFailed] = useState(!src);
  const vRef = useRef(null);
  useEffect(() => { setFailed(!src); }, [src]);
  useEffect(() => {
    const v = vRef.current;
    if (!autoPlayInView || !v || failed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.4 });
    io.observe(v);
    return () => io.disconnect();
  }, [autoPlayInView, failed]);
  const setVideo = (v) => { vRef.current = v; if (videoRef) videoRef(v); };
  const manual = autoPlayInView && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div className={"nx-slot" + (failed ? " is-empty" : "") + (className ? " " + className : "")}>
      {!failed && (type === "video"
        ? <video ref={setVideo} src={src} muted loop playsInline preload="metadata" controls={manual} onError={() => setFailed(true)} aria-label={label} />
        : <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />)}
      {failed && <div className="nx-slot-empty" role={label ? "img" : undefined} aria-label={label}><span aria-hidden="true">404</span></div>}
    </div>
  );
}

/* ---------- header ---------- */
const NX_DISCORD = "https://discord.com/invite/YacGgRdBAY";

function Header({ route, go, lang, setLang, customer, cartCount = 0 }) {
  const [open, setOpen] = useState(false);
  const fr = lang === "fr";
  const top = route.split("/")[0];
  const links = [
    ["store", top === "store" || top === "game"],
    ["status", top === "status"],
    ["reviews", top === "reviews"],
  ];
  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("nx-lock");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("nx-lock"); };
  }, [open]);
  const nav = (r) => (e) => { e.preventDefault(); setOpen(false); go(r); };
  // projecteur qui glisse d'un lien à l'autre (largeur de base 100px, mise à l'échelle)
  const navRef = useRef(null);
  const lightRef = useRef(null);
  const placeLight = (el) => {
    const L = lightRef.current;
    if (!L) return;
    if (!el) { L.classList.remove("is-on"); return; }
    const tf = "translateX(" + el.offsetLeft + "px) scaleX(" + el.offsetWidth / 100 + ")";
    if (!L.classList.contains("is-on")) { L.style.transition = "none"; L.style.transform = tf; void L.offsetWidth; L.style.transition = ""; }
    L.style.transform = tf;
    L.classList.add("is-on");
  };
  const restLight = () => placeLight(navRef.current && navRef.current.querySelector('[aria-current="page"]'));
  useEffect(() => {
    restLight();
    if (document.fonts) document.fonts.ready.then(restLight);
  }, [route, lang]);
  // se resserre en pilule centrée dès qu'on a défilé, reprend toute la largeur en haut de page
  const hdrRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const h = hdrRef.current;
        if (h) h.classList.toggle("is-compact", window.scrollY > 120 && !document.body.classList.contains("nx-lock"));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  const logout = () => { window.Auth.clear(); go("home"); };
  const account = customer ? (
    <>
      <a className="nx-hdr-link nx-hdr-link--strong" href="#profile" onClick={nav("profile")}>{customer.displayName || customer.username}</a>
      <button type="button" className="nx-hdr-link" onClick={logout}>{fr ? "Déconnexion" : "Log out"}</button>
    </>
  ) : (
    <>
      <a className="nx-hdr-link" href="#auth/signin" onClick={nav("auth/signin")}>{fr ? "Connexion" : "Sign in"}</a>
      <a className="nx-hdr-link nx-hdr-link--strong" href="#auth/signup" onClick={nav("auth/signup")}>{fr ? "Inscription" : "Sign up"}</a>
    </>
  );
  const langToggle = (
    <div className="nx-lang" role="group" aria-label={fr ? "Langue" : "Language"}>
      <button type="button" aria-pressed={lang === "fr"} onClick={() => setLang("fr")}>FR</button>
      <span aria-hidden="true">/</span>
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
    </div>
  );
  return (
    <header className="nx-hdr" ref={hdrRef} onTransitionEnd={(e) => { if (e.propertyName === "max-width") restLight(); }}>
      <div className="nx-wrap nx-hdr-in">
        <a className="nx-logo" href="#home" onClick={nav("home")} aria-label={fr ? "404, accueil" : "404, home"}>
          <span className="nx-logo-num">404</span>
          <span className="nx-logo-tag">Cheat not found</span>
        </a>
        <nav className="nx-nav" ref={navRef} onMouseLeave={restLight} aria-label={fr ? "Navigation principale" : "Main navigation"}>
          {links.map(([key, on]) => (
            <a key={key} href={"#" + key} onClick={nav(key)} onMouseEnter={(e) => placeLight(e.currentTarget)} onFocus={(e) => placeLight(e.currentTarget)} onBlur={restLight}
              aria-current={on ? "page" : undefined}>{navLabel(key, lang)}</a>
          ))}
          <span className="nx-nav-light" ref={lightRef} aria-hidden="true" />
        </nav>
        <div className="nx-hdr-right">
          <div className="nx-hdr-desk">
            {langToggle}
            <div className="nx-hdr-acc">{account}</div>
          </div>
          <a className="nx-ico" href={NX_DISCORD} target="_blank" rel="noopener noreferrer" aria-label={fr ? "Rejoindre le Discord" : "Join the Discord"} title="Discord">
            <Icon.discord aria-hidden="true" />
          </a>
          <a className="nx-ico nx-me" href={customer ? "#profile" : "#auth/signin"} onClick={nav(customer ? "profile" : "auth/signin")}
            aria-current={top === "profile" || top === "account" ? "page" : undefined}
            aria-label={customer ? (fr ? "Mon compte" : "My account") : (fr ? "Connexion" : "Sign in")} title={customer ? (customer.displayName || customer.username) : (fr ? "Connexion" : "Sign in")}>
            <Icon.user aria-hidden="true" />
          </a>
          <button type="button" className="nx-cart" onClick={() => go("cart")} aria-current={top === "cart" ? "page" : undefined}
            aria-label={(fr ? "Panier" : "Cart") + (cartCount ? ", " + cartCount + (fr ? " article" + (cartCount > 1 ? "s" : "") : " item" + (cartCount > 1 ? "s" : "")) : "")}>
            <Icon.cart />
            {cartCount > 0 && <span className="nx-cart-n" aria-hidden="true">{cartCount > 99 ? "99+" : cartCount}</span>}
          </button>
          <button type="button" className="nx-burger" aria-expanded={open} aria-controls="nx-menu" aria-label={fr ? "Menu" : "Menu"} onClick={() => setOpen(!open)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 9h16M4 15h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div id="nx-menu" className="nx-menu">
          <nav className="nx-menu-links" aria-label={fr ? "Navigation principale" : "Main navigation"}>
            {links.map(([key, on]) => (
              <a key={key} href={"#" + key} onClick={nav(key)} aria-current={on ? "page" : undefined}>{navLabel(key, lang)}</a>
            ))}
            <a href="#faq" onClick={nav("faq")}>FAQ</a>
          </nav>
          <div className="nx-menu-foot">
            {langToggle}
            <div className="nx-hdr-acc">{account}</div>
          </div>
        </div>
      )}
    </header>
  );
}

/* nav labels need nested i18n; helper */
function navLabel(key, lang) { return (I18N.nav[key] && I18N.nav[key][lang]) || key; }

/* ---------- crumbs ---------- */
function Crumbs({ trail, lang, overlap, go }) {
  return (
    <div className="wrap" style={{ marginTop: overlap ? -36 : 22, position: "relative", zIndex: 5 }}>
      <div className="crumbs">
        <div className="path">
          {trail.map((c, i) => {
            const isObj = c && typeof c === "object";
            const label = isObj ? c.label : c;
            const route = isObj ? c.route : null;
            const last = i === trail.length - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="sep">/</span>}
                {last
                  ? <b>{label}</b>
                  : (route && go)
                    ? <a className="crumb-link" onClick={() => go(route)}>{label}</a>
                    : <span>{label}</span>}
              </React.Fragment>
            );
          })}
        </div>
        <div className="path" style={{ gap: 7 }}>
          <Icon.status style={{ width: 14, height: 14 }} /> {t("allActivity", lang)}
        </div>
      </div>
    </div>
  );
}

/* ---------- footer ---------- */
function Footer({ lang, go }) {
  const fr = lang === "fr";
  const games = DATA.GAMES || [];
  const summary = reviewSummary();
  const nav = (r) => (e) => { e.preventDefault(); go(r); };
  const info = [
    ["faq", "FAQ"],
    ["info", t("info", lang)],
    ["about", t("aboutLink", lang)],
    ["terms", t("tos", lang)],
    ["terms-sale", t("tosale", lang)],
    ["refund", t("refund", lang)],
  ];
  const pay = [["Visa", "visa"], ["Mastercard", "mastercard"], ["American Express", "americanexpress"], ["Apple Pay", "applepay"], ["Google Pay", "googlepay"], ["PayPal", "paypal"], ["Bitcoin", "bitcoin"]];
  return (
    <footer className="nx-foot">
      <div className="nx-wrap">
        <div className="nx-foot-top">
          <a className="nx-foot-mark" href="#home" onClick={nav("home")} aria-label={fr ? "404, accueil" : "404, home"}>404</a>
          <p className="nx-foot-tag">Stay hidden. Stay 404.</p>
        </div>
        <div className="nx-foot-grid">
          <div>
            <h2 className="nx-foot-h">{t("aboutTitle", lang)}</h2>
            <p>{t("aboutBody", lang)}</p>
            {summary && (
              <a className="nx-link nx-foot-rating" href="#reviews" onClick={nav("reviews")}>
                {fr ? `${summary.avg} sur 5, ${summary.count} avis vérifiés` : `${summary.avg} out of 5, ${summary.count} verified reviews`}
              </a>
            )}
          </div>
          <div>
            <h2 className="nx-foot-h">{t("ourGames", lang)}</h2>
            <ul className="nx-foot-list">
              {games.map((g) => <li key={g.id}><a href={"#game/" + g.id} onClick={nav("game/" + g.id)}>{g.name}</a></li>)}
            </ul>
          </div>
          <div>
            <h2 className="nx-foot-h">{t("info", lang)}</h2>
            <ul className="nx-foot-list">
              {info.map(([r, label]) => <li key={r}><a href={"#" + r} onClick={nav(r)}>{label}</a></li>)}
            </ul>
          </div>
          <div>
            <h2 className="nx-foot-h">{t("contact", lang)}</h2>
            <ul className="nx-foot-list">
              <li><a href="mailto:support@404tweaks.tech">support@404tweaks.tech</a></li>
              <li><a className="nx-foot-discord" href={NX_DISCORD} target="_blank" rel="noopener noreferrer"><Icon.discord aria-hidden="true" />{fr ? "Rejoindre le Discord" : "Join the Discord"}</a></li>
            </ul>
            <h2 className="nx-foot-h nx-foot-h--pay">{fr ? "Paiement sécurisé" : "Secure payment"}</h2>
            <ul className="nx-pay">{pay.map(([n, f]) => <li key={f} title={n}><span role="img" aria-label={n} style={{ WebkitMaskImage: "url(assets/pay/" + f + ".svg)", maskImage: "url(assets/pay/" + f + ".svg)" }} /></li>)}</ul>
          </div>
        </div>
        <div className="nx-foot-bottom">
          <span>© 2022–2026 404</span>
          <p className="nx-foot-legal">
            {fr
              ? "Toutes les marques, titres de jeux et logos appartiennent à leurs propriétaires respectifs. 404 fournit des logiciels de triche indépendants et n'est ni approuvé ni associé à un éditeur de jeux."
              : "All trademarks, game titles and logos are property of their respective owners. 404 provides independent cheat software and is not endorsed by or associated with any game publisher."}
          </p>
        </div>
      </div>
    </footer>
  );
}

/* export */
/* ---------- motion : compteur animé (se lance quand visible) ---------- */
function CountUp({ value, duration = 1400, format }) {
  const ref = useRef(null);
  const num = typeof value === "number" ? value : parseFloat(value);
  const [v, setV] = useState(isFinite(num) ? 0 : value);
  useEffect(() => {
    if (!isFinite(num)) { setV(value); return; }
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(num); return; }
    let raf, started = false;
    const run = () => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        setV(num * e);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !started) { started = true; run(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [num]);
  const out = typeof v === "number" ? (format ? format(v) : Math.round(v).toLocaleString()) : v;
  return <span ref={ref} className="countup">{out}</span>;
}

/* ---------- motion : bandeau défilant d'arguments ---------- */
function Marquee({ items }) {
  const row = items.map((it, i) => (
    <span key={i} className="mq-item"><Icon.bolt />{it}</span>
  ));
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track">{row}{row}</div>
    </div>
  );
}

/* ---------- motion : ciel étoilé (canvas) — profondeur, scintillement, parallaxe souris, étoiles filantes ---------- */
function StarField({ density = 1, shooting = true, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--acc-h")) || 262;
    let W = 0, H = 0, dpr = 1, stars = [], shots = [], raf = 0, visible = true, last = performance.now();
    let mx = 0, my = 0, tmx = 0, tmy = 0, nextShot = 1500 + Math.random() * 2500;

    const build = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((W * H) / 2600 * density);
      stars = Array.from({ length: n }, () => {
        const z = Math.random();                       // 0 = loin, 1 = proche
        const tint = Math.random();
        return {
          x: Math.random() * W, y: Math.random() * H, z,
          r: 0.35 + z * z * 1.5,
          a: 0.25 + z * 0.65,
          tw: Math.random() * Math.PI * 2, ts: 0.6 + Math.random() * 2.2,
          col: tint < 0.72 ? "255,255,255" : tint < 0.88 ? `hsl(${hue} 95% 82%)` : `hsl(${hue + 38} 95% 80%)`,
        };
      });
    };

    const drawStar = (st, t) => {
      const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(st.tw + t * 0.001 * st.ts);
      const px = st.x + mx * st.z * 18, py = st.y + my * st.z * 12;
      const x = ((px % W) + W) % W, y = ((py % H) + H) % H;
      const a = st.a * tw;
      if (st.col[0] === "h") { ctx.globalAlpha = a; ctx.fillStyle = st.col; }
      else { ctx.globalAlpha = 1; ctx.fillStyle = `rgba(${st.col},${a})`; }
      ctx.beginPath(); ctx.arc(x, y, st.r, 0, Math.PI * 2); ctx.fill();
      if (st.r > 1.35) {                                // étoiles brillantes : halo + croix
        ctx.globalAlpha = a * 0.35;
        const g = ctx.createRadialGradient(x, y, 0, x, y, st.r * 5);
        g.addColorStop(0, `hsla(${hue},95%,80%,1)`); g.addColorStop(1, `hsla(${hue},95%,80%,0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, st.r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a * 0.5; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 0.6;
        const L = st.r * 4 * tw;
        ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
      }
    };

    const frame = (t) => {
      raf = 0;
      const dt = Math.min(64, t - last); last = t;
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      ctx.clearRect(0, 0, W, H);
      for (const st of stars) { st.x += 0.004 * dt * (0.2 + st.z); drawStar(st, t); }
      if (shooting && !reduce) {
        nextShot -= dt;
        if (nextShot <= 0) {
          nextShot = 2600 + Math.random() * 4200;
          shots.push({ x: W * (0.2 + Math.random() * 0.8), y: -10 + Math.random() * H * 0.35, vx: -(0.55 + Math.random() * 0.45), vy: 0.22 + Math.random() * 0.2, life: 0, max: 900 + Math.random() * 500 });
        }
        shots = shots.filter((s) => s.life < s.max);
        for (const s of shots) {
          s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
          const p = s.life / s.max, a = Math.sin(p * Math.PI);
          const tx = s.x - s.vx * 160, ty = s.y - s.vy * 160;
          const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
          g.addColorStop(0, `rgba(255,255,255,${a})`);
          g.addColorStop(0.25, `hsla(${hue},95%,75%,${a * 0.6})`);
          g.addColorStop(1, `hsla(${hue},95%,70%,0)`);
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    build(); start();
    const ro = new ResizeObserver(() => { build(); start(); }); ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }); io.observe(cv);
    const onVis = () => { if (!document.hidden) start(); };
    const onMove = (e) => { tmx = (e.clientX / window.innerWidth - 0.5) * 2; tmy = (e.clientY / window.innerHeight - 0.5) * 2; };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pointermove", onMove); };
  }, [density, shooting]);
  return <canvas ref={ref} className={"starfield " + className} aria-hidden="true" />;
}

/* ---------- fond du site : ciel nocturne photographique (voie lactée + étoiles + parallaxe scroll) ---------- */
function SkyBackdrop() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--acc-h")) || 262;
    let W = 0, H = 0, dpr = 1, stars = [], shots = [], milky = null, raf = 0, last = 0, acc = 0;
    let nextShot = 6000 + Math.random() * 6000;
    // pseudo-aléatoire stable (même ciel à chaque visite)
    let seed = 404;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

    const buildMilky = () => {
      // bande diagonale bas-gauche → haut-droite, rendue une seule fois dans un canvas hors écran
      const pad = 160, mw = W, mh = H + pad * 2;
      const off = document.createElement("canvas");
      off.width = Math.round(mw * dpr); off.height = Math.round(mh * dpr);
      const m = off.getContext("2d"); m.setTransform(dpr, 0, 0, dpr, 0, 0);
      const x0 = -mw * 0.1, y0 = mh * 0.92, x1 = mw * 1.1, y1 = mh * 0.08;
      const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux;
      const width = Math.max(120, Math.min(mw, mh) * 0.2);
      seed = 404;
      // poussière / nuages
      m.globalCompositeOperation = "lighter";
      for (let i = 0; i < 220; i++) {
        const t = rnd(), d = gauss() * width * 0.45;
        const cx = x0 + ux * len * t + nx * d, cy = y0 + uy * len * t + ny * d;
        const core = Math.exp(-Math.pow((t - 0.42) / 0.16, 2));          // noyau plus chaud/dense vers le centre
        const r = width * (0.35 + rnd() * 0.7);
        const h = rnd() < 0.5 ? hue : (rnd() < 0.6 ? 222 : 28);
        const a = (0.04 + core * 0.07) * (0.6 + rnd() * 0.8);
        const g = m.createRadialGradient(cx, cy, 0, cx, cy, r);
        const col = h === 28 ? `hsla(28,80%,70%,${a * (0.4 + core)})` : `hsla(${h},70%,${h === 222 ? 62 : 60}%,${a})`;
        g.addColorStop(0, col); g.addColorStop(1, "hsla(0,0%,0%,0)");
        m.fillStyle = g; m.beginPath(); m.arc(cx, cy, r, 0, Math.PI * 2); m.fill();
      }
      // voile de micro-étoiles
      for (let i = 0; i < Math.round(len * 6); i++) {
        const t = rnd(), d = gauss() * width * 0.38;
        const cx = x0 + ux * len * t + nx * d, cy = y0 + uy * len * t + ny * d;
        const a = 0.15 + rnd() * 0.55;
        m.fillStyle = rnd() < 0.85 ? `rgba(255,255,255,${a})` : `hsla(${rnd() < 0.5 ? hue : 210},90%,85%,${a})`;
        m.fillRect(cx, cy, rnd() < 0.9 ? 0.7 : 1.2, rnd() < 0.9 ? 0.7 : 1.2);
      }
      // bande de poussière sombre au centre (comme la vraie voie lactée)
      m.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 110; i++) {
        const t = 0.1 + rnd() * 0.8, wob = Math.sin(t * 17) * width * 0.08 + gauss() * width * 0.05;
        const cx = x0 + ux * len * t + nx * wob, cy = y0 + uy * len * t + ny * wob;
        const r = width * (0.08 + rnd() * 0.16);
        const g = m.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
        m.fillStyle = g; m.beginPath(); m.arc(cx, cy, r, 0, Math.PI * 2); m.fill();
      }
      milky = { canvas: off, pad };
    };

    const build = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 7;
      const n = Math.round((W * H) / 11000);
      stars = Array.from({ length: n }, () => {
        const z = rnd();
        return { x: rnd() * W, y: rnd() * H, z, r: 0.3 + z * z * 0.9, a: 0.12 + z * 0.4, tw: rnd() * 6.28, ts: 0.4 + rnd() * 1.6,
          warm: rnd() < 0.12 };
      });
    };

    const draw = (t) => {
      const sy = window.scrollY || 0;
      ctx.clearRect(0, 0, W, H);
      if (milky) {
        const shift = -Math.min(sy * 0.03, milky.pad);
        ctx.globalAlpha = 1;
        ctx.drawImage(milky.canvas, 0, -milky.pad + shift, W, H + milky.pad * 2);
      }
      for (const st of stars) {
        const tw = reduce ? 1 : 0.6 + 0.4 * Math.sin(st.tw + t * 0.001 * st.ts);
        const y = (((st.y - sy * (0.02 + st.z * 0.08)) % H) + H) % H;
        ctx.fillStyle = st.warm ? `rgba(255,214,170,${st.a * tw})` : `rgba(235,238,255,${st.a * tw})`;
        ctx.beginPath(); ctx.arc(st.x, y, st.r, 0, 6.283); ctx.fill();
        if (false) {
          const g = ctx.createRadialGradient(st.x, y, 0, st.x, y, st.r * 3.5);
          g.addColorStop(0, `rgba(210,220,255,${0.22 * tw})`); g.addColorStop(1, "rgba(210,220,255,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(st.x, y, st.r * 3.5, 0, 6.283); ctx.fill();
        }
      }
      for (const s of shots) {
        const p = s.life / s.max, a = Math.sin(p * Math.PI) * 0.9;
        const tx = s.x - s.vx * 220, ty = s.y - s.vy * 220;
        const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      }
    };

    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, t - (last || t)); last = t; acc += dt;
      if (acc < 33) return;                                   // ~30 fps : doux et économe
      const step = acc; acc = 0;
      nextShot -= step;
      if (false) {
        nextShot = 9000 + Math.random() * 9000;
        shots.push({ x: W * (0.3 + Math.random() * 0.7), y: H * Math.random() * 0.4, vx: -(0.5 + Math.random() * 0.4), vy: 0.18 + Math.random() * 0.15, life: 0, max: 1100 });
      }
      shots = shots.filter((s) => (s.life += step) < s.max);
      for (const s of shots) { s.x += s.vx * step; s.y += s.vy * step; }
      draw(t);
    };

    build();
    if (reduce) draw(0); else raf = requestAnimationFrame(frame);
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) draw(0); }, 150); };
    const onScroll = () => { if (reduce) draw(0); };
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!reduce && !raf) { last = 0; raf = requestAnimationFrame(frame); } };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onScroll); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return (
    <div className="sky" aria-hidden="true">
      <canvas ref={ref} />
      <div className="sky-vignette" />
    </div>
  );
}

Object.assign(window, { MediaSlot, Icon, Stars, Btn, StatusBadge, GameCard, ReviewCard, BrandLogo, Header, Footer, Crumbs, navLabel, CountUp, Marquee, StarField, SkyBackdrop, Img, webpOf, planDays, planShortLabel, reviewSummary });
