/* ====================== 404 — App / router ====================== */
const { useState: useS, useEffect: useE, useRef: useR } = React;

/* ---------- API / auth ---------- */
// sur http://localhost (test local) on parle au backend lancé sur la machine ; partout ailleurs, à la prod
const API_BASE = location.hostname === "localhost" ? "http://localhost:3000/api/v1" : "https://api.404tweaks.tech/api/v1";

const Auth = {
  token: () => localStorage.getItem("404_token") || "",
  customer: () => { try { return JSON.parse(localStorage.getItem("404_customer") || "null"); } catch (e) { return null; } },
  set: (token, customer) => {
    localStorage.setItem("404_token", token || "");
    localStorage.setItem("404_customer", JSON.stringify(customer || null));
    window.dispatchEvent(new Event("auth-change"));
  },
  clear: () => {
    localStorage.removeItem("404_token");
    localStorage.removeItem("404_customer");
    fetch(API_BASE + "/customer/logout", { method: "POST", credentials: "include" }).catch(() => {});
    window.dispatchEvent(new Event("auth-change"));
  },
};

async function apiCall(path, opts = {}) {
  const { method = "GET", body, auth = false, credentials = false } = opts;
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = "Bearer " + Auth.token();
  const r = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: credentials ? "include" : "same-origin",
  });
  let data = null;
  const text = await r.text();
  if (text) { try { data = JSON.parse(text); } catch (e) {} }
  if (!r.ok) {
    if (r.status === 401 && auth) Auth.clear();
    let msg = (data && (data.message || data.error)) || ("Erreur " + r.status);
    if (Array.isArray(msg)) msg = msg.join(", ");
    throw new Error(msg);
  }
  return data;
}

const ShopAPI = {
  register: (email, username, password) => {
    const refCode = document.cookie.split('; ').find(c => c.startsWith('ref='))?.split('=')[1];
    return apiCall("/customer/register", { method: "POST", body: { email, username, password, source: "shop", ...(refCode && { refCode }) }, credentials: true });
  },
  login: (login, password) => apiCall("/customer/login", { method: "POST", body: { login, password }, credentials: true }),
  logout: () => apiCall("/customer/logout", { method: "POST", credentials: true }),
  profile: () => apiCall("/customer/profile", { auth: true }),
  updateProfile: (body) => apiCall("/customer/profile", { method: "PUT", auth: true, body }),
  changePassword: (currentPassword, newPassword) => apiCall("/customer/password", { method: "PUT", auth: true, body: { currentPassword, newPassword } }),
  resendVerification: () => apiCall("/customer/resend-verification", { method: "POST", auth: true }),
  checkout: (game, plan, promoCode) => apiCall("/payment/shop/checkout", { method: "POST", auth: true, body: { game, plan, promoCode } }),
  cartCheckout: (items, promoCode) => apiCall("/payment/shop/checkout", { method: "POST", auth: true, body: { items, promoCode } }),
  cryptoCheckout: (items, promoCode) => apiCall("/payment/shop/crypto-checkout", { method: "POST", auth: true, body: { items, promoCode } }),
  confirm: (sessionId) => apiCall("/payment/confirm", { method: "POST", auth: true, body: { sessionId } }),
  verifyEmail: (token) => apiCall("/customer/verify-email?token=" + encodeURIComponent(token)),
  forumSso: () => apiCall("/customer/forum-sso", { method: "POST", auth: true, credentials: true }),
  affEnroll: (code) => apiCall("/affiliate/enroll", { method: "POST", auth: true, body: { code } }),
  affMe: () => apiCall("/affiliate/me", { auth: true }),
  affClicks: (days) => apiCall("/affiliate/clicks?days=" + (days || 30), { auth: true }),
  affConversions: (status) => apiCall("/affiliate/conversions" + (status ? "?status=" + status : ""), { auth: true }),
  affPayouts: () => apiCall("/affiliate/payouts", { auth: true }),
  affPayout: (amountCents, method, destination) => apiCall("/affiliate/payout", { method: "POST", auth: true, body: { amountCents, method, destination } }),
  resellerEnroll: (data) => apiCall("/reseller/enroll", { method: "POST", auth: true, body: data }),
  resellerMe: () => apiCall("/reseller/me", { auth: true }),
  resellerAcceptTerms: () => apiCall("/reseller/accept-terms", { method: "POST", auth: true }),
  resellerTopup: (amountCents, method) => apiCall("/reseller/wallet/topup", { method: "POST", auth: true, body: { amountCents, method } }),
  resellerWalletHistory: (limit) => apiCall("/reseller/wallet/history?limit=" + (limit || 50), { auth: true }),
  resellerOrderBatch: (productId, plan, keyCount) => apiCall("/reseller/batches", { method: "POST", auth: true, body: { productId, plan, keyCount } }),
  resellerBatches: (limit) => apiCall("/reseller/batches?limit=" + (limit || 50), { auth: true }),
  resellerBatch: (id) => apiCall("/reseller/batches/" + id, { auth: true }),
  resellerStats: () => apiCall("/reseller/stats", { auth: true }),
  validatePromo: (code) => apiCall("/payment/validate-promo?context=shop&code=" + encodeURIComponent(code), { auth: !!Auth.token() }),
  myCoupons: () => apiCall("/shop/my-coupons", { auth: true }),
  myReviews: () => apiCall("/shop/my-reviews", { auth: true }),
  submitReview: (game, rating, text) => apiCall("/shop/reviews", { method: "POST", auth: true, body: { game, rating, text } }),
};
window.ShopAPI = ShopAPI; window.Auth = Auth;

/* ---------- panier (localStorage) + remise dégressive ---------- */
const bulkPct = (q) => (q >= 5 ? 0.15 : q >= 3 ? 0.10 : q >= 2 ? 0.05 : 0);
const Cart = {
  items: () => { try { return JSON.parse(localStorage.getItem("404_cart") || "[]"); } catch (e) { return []; } },
  _save: (arr) => { localStorage.setItem("404_cart", JSON.stringify(arr)); window.dispatchEvent(new Event("cart-change")); },
  count: () => Cart.items().reduce((n, i) => n + (i.qty || 0), 0),
  add: (game, plan, qty = 1) => {
    const arr = Cart.items();
    const key = game.id + "|" + plan.id;
    const ex = arr.find(i => i.key === key);
    if (game.id === 'spoofer' && (!Number.isInteger(plan.stock) || (ex?.qty || 0) + qty > plan.stock)) return false;
    if (ex) ex.qty = Math.min(50, ex.qty + qty);
    else arr.push({ key, game: game.id, gameName: game.name, plan: plan.id, planName: plan.name, per: plan.per, price: plan.price, qty: Math.min(50, Math.max(1, qty)) });
    Cart._save(arr);
    return true;
  },
  setQty: (key, qty) => { const arr = Cart.items(); const it = arr.find(i => i.key === key); if (it) { it.qty = Math.max(1, Math.min(50, qty)); Cart._save(arr); } },
  remove: (key) => Cart._save(Cart.items().filter(i => i.key !== key)),
  clear: () => Cart._save([]),
};
window.Cart = Cart; window.bulkPct = bulkPct;
function useCart() {
  const [items, setItems] = useS(Cart.items());
  useE(() => {
    const h = () => setItems(Cart.items());
    window.addEventListener("cart-change", h);
    return () => window.removeEventListener("cart-change", h);
  }, []);
  return items;
}
window.useCart = useCart;

function useAuth() {
  const [c, setC] = useS(Auth.customer());
  useE(() => {
    const h = () => setC(Auth.customer());
    window.addEventListener("auth-change", h);
    return () => window.removeEventListener("auth-change", h);
  }, []);
  return c;
}
window.useAuth = useAuth;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 280,
  "heroVariant": "split",
  "heroSplit": "slant-fade",
  "navVariant": "gradient",
  "navIconSet": "default",
  "pageAnim": "glass",
  "font": "default"
}/*EDITMODE-END*/;

// Panneau de personnalisation réservé au propriétaire : activer avec ?tweaks=on, désactiver avec ?tweaks=off
function tweaksAdmin() {
  try {
    const q = new URLSearchParams(location.search).get("tweaks");
    if (q === "on") localStorage.setItem("404_tweaks_admin", "1");
    if (q === "off") localStorage.removeItem("404_tweaks_admin");
    return localStorage.getItem("404_tweaks_admin") === "1";
  } catch (e) { return false; }
}
const TWEAKS_ADMIN = tweaksAdmin();

function loadTweakDefaults() {
  if (!TWEAKS_ADMIN) return TWEAK_DEFAULTS;   // visiteurs : toujours le design officiel
  try {
    const raw = localStorage.getItem("404_tweaks");
    if (raw) return { ...TWEAK_DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {}
  return TWEAK_DEFAULTS;
}

// ── Réglages du design (admin) : variables CSS appliquées en direct, sauvegardées dans ce navigateur ──
const NX_TWEAK_DEFAULTS = {
  light: "#f7f7f7", beamInt: 0.9, poolInt: 1, hoverInt: 1, beamBlur: 28, beamTop: 3, sway: true, swayAmp: 0,
  aX: -1, aW: 65, aRot: -1.5, bX: -4, bW: 44, bRot: -9, bOp: 0.9,
  torch: true, beamAnim: true, torchSize: 390, torchInt: 0.6,
  stage: true, stageW: 100, stageBright: 0.66, stageSat: 0.35, stageFade: 42, titleScale: 1.03, sweep: true, titleFx: true,
  stretch: 75, accent: "#f75bda", bg: "#000000",
  innerX: -3, innerRot: 6, innerW: 62, innerH: 720, innerOp: 1, still: false,
  aOp: 1, poolX: 2, poolY: 4, poolW: 62, poolH: 26,
  sX: 2, sW: 66, sRot: 5, sOp: 0.75, cX: 20, cW: 59, cRot: 0, cOp: 1,
  h2X: 35, h2Y: 48, h2Size: 50, h2Int: 1,
};
function loadNxTweaks() {
  try { return { ...NX_TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem("404_nx_tweaks") || "{}") }; }
  catch (e) { return NX_TWEAK_DEFAULTS; }
}
function nxHexRgb(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
}
function applyNxTweaks(v) {
  const r = document.documentElement.style, b = document.body.style, c = document.documentElement.classList;
  const set = { "--nx-light": nxHexRgb(v.light), "--nx-beam-int": v.beamInt, "--nx-pool-int": v.poolInt, "--nx-hover-int": v.hoverInt,
    "--nx-beam-blur": v.beamBlur + "px", "--nx-beam-top": v.beamTop + "%", "--nx-sway": v.swayAmp + "deg",
    "--nx-a-x": v.aX + "%", "--nx-a-w": v.aW + "%", "--nx-a-rot": v.aRot + "deg",
    "--nx-b-x": v.bX + "%", "--nx-b-w": v.bW + "%", "--nx-b-rot": v.bRot + "deg", "--nx-b-op": v.bOp,
    "--nx-torch-size": v.torchSize + "px", "--nx-torch-int": v.torchInt,
    "--nx-stage-w": v.stageW + "%", "--nx-stage-bright": v.stageBright, "--nx-stage-sat": v.stageSat, "--nx-stage-fade": v.stageFade + "%",
    "--nx-title-scale": v.titleScale, "--nx-stretch": v.stretch + "%",
    "--nx-violet": v.accent, "--nx-violet-hi": v.accent, "--nx-bg": v.bg,
    "--nx-inner-x": v.innerX + "%", "--nx-inner-rot": v.innerRot + "deg",
    "--nx-inner-w": v.innerW + "vw", "--nx-inner-h": v.innerH + "px", "--nx-inner-op": v.innerOp, "--nx-a-op": v.aOp,
    "--nx-pool-x": v.poolX + "%", "--nx-pool-y": v.poolY + "%", "--nx-pool-w": v.poolW + "%", "--nx-pool-h": v.poolH + "%",
    "--nx-s-x": v.sX + "%", "--nx-s-w": v.sW + "%", "--nx-s-rot": v.sRot + "deg", "--nx-s-op": v.sOp,
    "--nx-c-x": v.cX + "%", "--nx-c-w": v.cW + "%", "--nx-c-rot": v.cRot + "deg", "--nx-c-op": v.cOp,
    "--nx-h2-x": v.h2X + "%", "--nx-h2-y": v.h2Y + "%", "--nx-h2-size": v.h2Size + "%", "--nx-h2-int": v.h2Int };
  Object.keys(set).forEach((k) => r.setProperty(k, String(set[k])));
  // les pages intérieures lisent leurs propres jetons sur <body>
  b.setProperty("--acc", v.accent); b.setProperty("--acc-2", v.accent); b.setProperty("--acc-grad", v.accent);
  b.setProperty("--bg-0", v.bg);
  c.toggle("nx-no-sway", !v.sway); c.toggle("nx-no-torch", !v.torch); c.toggle("nx-no-stage", !v.stage);
  c.toggle("nx-no-sweep", !v.sweep); c.toggle("nx-no-title-fx", !v.titleFx); c.toggle("nx-no-beam-anim", !v.beamAnim); c.toggle("nx-still", !!v.still);
}
if (TWEAKS_ADMIN) applyNxTweaks(loadNxTweaks());

function NxTweaks() {
  const [v, setV] = useS(loadNxTweaks);
  const [copied, setCopied] = useS(false);
  useE(() => {
    applyNxTweaks(v);
    try { localStorage.setItem("404_nx_tweaks", JSON.stringify(v)); } catch (e) {}
  }, [v]);
  const s = (k) => (val) => setV((p) => ({ ...p, [k]: val }));
  const diff = () => Object.fromEntries(Object.entries(v).filter(([k, val]) => val !== NX_TWEAK_DEFAULTS[k]));
  const copy = () => {
    const txt = JSON.stringify(diff(), null, 2);
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }, () => window.prompt("Copie ces réglages :", txt));
  };
  const reset = () => setV(NX_TWEAK_DEFAULTS);
  const SL = (label, k, min, max, step, unit) => <TweakSlider label={label} value={v[k]} min={min} max={max} step={step} unit={unit || ""} onChange={s(k)} />;
  const TG = (label, k) => <TweakToggle label={label} value={v[k]} onChange={s(k)} />;
  return (
    <TweaksPanel title="Réglages du design">
      <TweakSection label="Lumière" />
      <TweakColor label="Couleur de la lumière" value={v.light} options={["#ffe4f8", "#ffffff", "#ffe9c7", "#d8e6ff", "#f75bda"]} onChange={s("light")} />
      <TweakColor label="Couleur libre" value={v.light} onChange={s("light")} />
      {SL("Intensité des faisceaux", "beamInt", 0, 3, 0.05)}
      {SL("Intensité de tous les halos", "poolInt", 0, 3, 0.05)}
      {SL("Lumière au survol", "hoverInt", 0, 3, 0.05)}
      {SL("Flou des faisceaux", "beamBlur", 0, 80, 1, "px")}
      {SL("Ouverture en haut du faisceau", "beamTop", 0, 25, 0.5, "%")}
      {TG("Allumage animé (haut de l'accueil)", "beamAnim")}
      {TG("Balancement (haut de l'accueil)", "sway")}
      {SL("Amplitude du balancement", "swayAmp", 0, 10, 0.5, "°")}

      <TweakSection label="Accueil, en haut : projecteur gauche" />
      {SL("Position", "aX", -50, 70, 1, "%")}
      {SL("Largeur", "aW", 10, 140, 1, "%")}
      {SL("Angle", "aRot", -40, 40, 0.5, "°")}
      {SL("Opacité", "aOp", 0, 1, 0.05)}

      <TweakSection label="Accueil, en haut : projecteur droit" />
      {SL("Position depuis la droite", "bX", -50, 70, 1, "%")}
      {SL("Largeur", "bW", 10, 140, 1, "%")}
      {SL("Angle", "bRot", -40, 40, 0.5, "°")}
      {SL("Opacité", "bOp", 0, 1, 0.05)}

      <TweakSection label="Accueil, en haut : halo au sol" />
      {SL("Position horizontale", "poolX", -30, 80, 1, "%")}
      {SL("Hauteur depuis le bas", "poolY", -20, 80, 1, "%")}
      {SL("Largeur", "poolW", 10, 140, 1, "%")}
      {SL("Hauteur", "poolH", 5, 100, 1, "%")}

      <TweakSection label="En-têtes boutique, statut, fiche produit" />
      {SL("Position", "sX", -50, 70, 1, "%")}
      {SL("Largeur", "sW", 10, 140, 1, "%")}
      {SL("Angle", "sRot", -40, 40, 0.5, "°")}
      {SL("Opacité", "sOp", 0, 1, 0.05)}

      <TweakSection label="Accueil, en bas : projecteur final" />
      {SL("Position", "cX", -30, 80, 1, "%")}
      {SL("Largeur", "cW", 10, 140, 1, "%")}
      {SL("Angle", "cRot", -40, 40, 0.5, "°")}
      {SL("Opacité", "cOp", 0, 1, 0.05)}

      <TweakSection label="Halo derrière les titres de section" />
      {SL("Position horizontale", "h2X", 0, 100, 1, "%")}
      {SL("Position verticale", "h2Y", 0, 100, 1, "%")}
      {SL("Taille", "h2Size", 10, 100, 1, "%")}
      {SL("Intensité", "h2Int", 0, 3, 0.05)}

      <TweakSection label="Pages intérieures (FAQ, panier, compte…)" />
      {SL("Position", "innerX", -30, 80, 1, "%")}
      {SL("Angle", "innerRot", -40, 40, 0.5, "°")}
      {SL("Largeur", "innerW", 20, 120, 1, "vw")}
      {SL("Longueur", "innerH", 200, 1400, 10, "px")}
      {SL("Opacité", "innerOp", 0, 1, 0.05)}

      <TweakSection label="Lampe qui suit la souris" />
      {TG("Activée", "torch")}
      {SL("Taille", "torchSize", 200, 1800, 10, "px")}
      {SL("Intensité", "torchInt", 0, 4, 0.05)}

      <TweakSection label="Haut de l'accueil" />
      {TG("Vidéo de fond", "stage")}
      {SL("Largeur de la vidéo", "stageW", 30, 100, 1, "%")}
      {SL("Luminosité de la vidéo", "stageBright", 0.1, 1.2, 0.02)}
      {SL("Saturation de la vidéo (0 = noir et blanc)", "stageSat", 0, 1.2, 0.05)}
      {SL("Fondu vers la gauche", "stageFade", 0, 90, 1, "%")}
      {SL("Taille du titre", "titleScale", 0.6, 1.4, 0.01, "×")}
      {TG("Balayage lumineux sur « Sans être vu. »", "sweep")}
      {TG("« Domine. » éclairé (allumage + reflet souris)", "titleFx")}

      <TweakSection label="Typo et couleurs" />
      {SL("Largeur des titres (75 = étroit)", "stretch", 75, 125, 1, "%")}
      <TweakColor label="Accent" value={v.accent} options={["#f75bda", "#7c4dff", "#ff4d6d", "#3ddc97", "#f0b03c"]} onChange={s("accent")} />
      <TweakColor label="Accent libre" value={v.accent} onChange={s("accent")} />
      <TweakColor label="Fond" value={v.bg} options={["#09080e", "#000000", "#0d0b14", "#100c18"]} onChange={s("bg")} />

      <TweakSection label="Animations" />
      {TG("Figer toutes les animations", "still")}

      <TweakSection label="Enregistrer" />
      <TweakButton label={copied ? "Copié ✓" : "Copier mes réglages"} onClick={copy} />
      <TweakButton label="Revenir au design d'origine" secondary onClick={reset} />
    </TweaksPanel>
  );
}

function App() {
  const [t2, setTweak] = useTweaks(loadTweakDefaults());
  const [route, setRoute] = useS(() => (location.hash || "#home").slice(1) || "home");
  const [lang, setLang] = useS(() => localStorage.getItem("404_lang") || "fr");
  const [toast, setToast] = useS(null);

  // routing via hash
  useE(() => {
    const onHash = () => { setRoute((location.hash || "#home").slice(1) || "home"); window.scrollTo({ top: 0, behavior: "auto" }); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (r) => { if (("#" + r) === location.hash) setRoute(r); else location.hash = r; window.scrollTo({ top: 0 }); };

  useE(() => { localStorage.setItem("404_lang", lang); }, [lang]);

  useE(() => {
    localStorage.setItem("404_tweaks", JSON.stringify({
      accentHue: t2.accentHue,
      heroVariant: t2.heroVariant,
      heroSplit: t2.heroSplit,
      navVariant: t2.navVariant,
      navIconSet: t2.navIconSet,
      pageAnim: t2.pageAnim,
      font: t2.font,
    }));
  }, [t2.accentHue, t2.heroVariant, t2.heroSplit, t2.navVariant, t2.navIconSet, t2.pageAnim, t2.font]);

  // apply tweaks
  useE(() => { document.documentElement.style.setProperty("--acc-h", t2.accentHue); }, [t2.accentHue]);
  useE(() => { document.body.dataset.font = t2.font; }, [t2.font]);
  useE(() => { document.body.dataset.pageAnim = t2.pageAnim || "fade"; }, [t2.pageAnim]);

  const customer = useAuth();

  const flash = (msg, ms = 2600) => {
    setToast(msg);
    clearTimeout(window.__tT); window.__tT = setTimeout(() => setToast(null), ms);
  };

  const cartItems = useCart();
  const cartCount = cartItems.reduce((n, i) => n + (i.qty || 0), 0);

  // ajouter au panier (la connexion n'est requise qu'au paiement)
  const onAdd = (game, plan, qty = 1) => {
    if (Cart.add(game, plan, qty) === false) {
      flash(lang === 'fr' ? 'Stock insuffisant pour cette quantité, en comptant les clés déjà dans ton panier.' : 'Insufficient stock for this quantity, including the keys already in your cart.', 5000);
      return;
    }
    flash(lang === "fr" ? "Ajouté au panier ✓" : "Added to cart ✓");
  };

  // reveal on scroll
  useE(() => {
    const els = document.querySelectorAll(".reveal, .reveal-grid");
    const io = new IntersectionObserver((ents) => ents.forEach(e => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.1, rootMargin: "0px 0px -4% 0px" });
    els.forEach(el => { el.classList.remove("in"); io.observe(el); });
    return () => io.disconnect();
  }, [route, t2.pageAnim]);

  // parallax hero / images (cinematic & float)
  useE(() => {
    if (t2.pageAnim !== "cinematic" && t2.pageAnim !== "float") return;
    const targets = document.querySelectorAll(".hero-fig-img img, .hero-art");
    if (!targets.length) return;
    const onScroll = () => {
      const y = window.scrollY;
      targets.forEach((el) => { el.style.transform = "translate3d(0," + (y * 0.06).toFixed(1) + "px,0)"; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      targets.forEach((el) => { el.style.transform = ""; });
    };
  }, [route, t2.pageAnim]);

  // motion : spot lumineux qui suit la souris (cartes + hero) + tilt 3D léger sur les cartes jeu
  useE(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, last = null;
    const apply = () => {
      raf = 0;
      const e = last; if (!e) return;
      const el = e.target.closest && e.target.closest(".game-card, .spot-card, .hero-live, .gal-main");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty("--mx", x + "px");
      el.style.setProperty("--my", y + "px");
      if (el.classList.contains("game-card")) {
        const media = el.querySelector(".media");
        if (media) {
          const rx = ((y / r.height) - 0.5) * -6, ry = ((x / r.width) - 0.5) * 8;
          media.style.transform = "perspective(700px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
        }
      }
    };
    const onMove = (e) => { last = e; if (!raf) raf = requestAnimationFrame(apply); };
    const onOut = (e) => {
      const card = e.target.closest && e.target.closest(".game-card");
      if (card && !card.contains(e.relatedTarget)) {
        const media = card.querySelector(".media");
        if (media) media.style.transform = "";
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerout", onOut); cancelAnimationFrame(raf); };
  }, []);

  // header compact + ombre une fois qu'on a scrollé
  useE(() => {
    const onScroll = () => document.body.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // barre de progression de scroll (haut de page)
  const progRef = useR(null);
  useE(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const f = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
      if (progRef.current) progRef.current.style.transform = "scaleX(" + f.toFixed(4) + ")";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [route]);

  const top = route.split("/")[0];
  let page;
  if (top === "store") page = <ShopPage lang={lang} go={go} onAdd={onAdd} />;
  else if (top === "game") page = <ProductPage id={route.split("/")[1]} lang={lang} go={go} onAdd={onAdd} />;
  else if (top === "status") page = <StatusPage lang={lang} go={go} />;
  else if (top === "reviews") page = <ReviewsPage lang={lang} go={go} />;
  else if (top === "profile") page = <ProfilePage lang={lang} go={go} />;
  else if (top === "auth") page = <AuthPage lang={lang} go={go} route={route} />;
  else if (top === "account") page = (Auth.token() ? <ProfilePage lang={lang} go={go} /> : <AuthPage lang={lang} go={go} route={route} />);
  else if (top === "faq") page = <FaqPage lang={lang} go={go} />;
  else if (top === "cart") page = <CartPage lang={lang} go={go} flash={flash} />;
  else if (top === "success") page = <SuccessPage lang={lang} go={go} />;
  else if (top === "verify") page = <VerifyPage lang={lang} go={go} />;
  else if (top === "info") page = <InfoHubPage lang={lang} go={go} />;
  else if (top === "about") page = <LegalDocPage id="about" lang={lang} go={go} />;
  else if (top === "terms") page = <LegalDocPage id="terms" lang={lang} go={go} />;
  else if (top === "terms-sale") page = <LegalDocPage id="terms-sale" lang={lang} go={go} />;
  else if (top === "refund") page = <LegalDocPage id="refund" lang={lang} go={go} />;
  else page = <HomePage lang={lang} go={go} onAdd={onAdd} heroVariant={t2.heroVariant} heroTextAnim="shimmer" heroSplit={t2.heroSplit} />;

  return (
    <>
      <Header route={route} go={go} lang={lang} setLang={setLang} customer={customer} cartCount={cartCount} navVariant={t2.navVariant} navIconSet={t2.navIconSet} />
      <main key={route} className={page.type === HomePage || page.type === ShopPage || page.type === StatusPage || page.type === ProductPage ? "" : "nx-inner"}>{page}</main>
      <Footer lang={lang} go={go} />

      {toast && (
        <div className={"toast show"}>
          <span className="ic"><Icon.check /></span>
          <span>{toast}</span>
        </div>
      )}

      {TWEAKS_ADMIN && <>
      <NxTweaks />

      <button
        type="button"
        className="tweak-fab"
        title={lang === "fr" ? "Animations & style" : "Animations & style"}
        aria-label={lang === "fr" ? "Ouvrir les réglages visuels" : "Open visual settings"}
        onClick={() => window.dispatchEvent(new Event("404-open-tweaks"))}
      >
        <Icon.gear style={{ width: 18, height: 18 }} />
      </button>
      </>}
    </>
  );
}

// ── Boot: charge les jeux/plans depuis l'API (fallback = données statiques de data.jsx) ──
async function boot() {
  const API = API_BASE;
  const fetchJson = async (path) => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch(`${API}${path}`, { signal: ctrl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(to); }
  };
  try {
    const [games, plans, settings, community, reviews, spooferPlans] = await Promise.all([
      fetchJson("/shop/games").catch(() => null),
      fetchJson("/shop/plans").catch(() => null),
      fetchJson("/shop/settings").catch(() => null),
      fetchJson("/shop/community-stats").catch(() => null),
      fetchJson("/shop/reviews").catch(() => null),
      fetchJson("/shop/spoofer/plans").catch(() => []),
    ]);
    if (Array.isArray(reviews)) {
      window.DATA.REVIEWS = reviews.map((r) => ({ name: r.name, game: r.game, r: r.r, fr: r.text, en: r.text, date: r.createdAt }));
    }
    if (Array.isArray(games) && games.length) window.DATA.GAMES = games;
    if (Array.isArray(plans) && plans.length) window.DATA.PLANS = plans;
    window.DATA.SPOOFER_PLANS = Array.isArray(spooferPlans) ? spooferPlans : [];
    if (settings && typeof settings === "object") {
      window.DATA.SETTINGS = { ...window.DATA.SETTINGS, ...settings };
    }
    if (community && typeof community === "object" && community.totalMembers) {
      window.DATA.STATS = {
        ...window.DATA.STATS,
        members: community.totalMembers,
        newestMemberUsername: community.newestMemberUsername || null,
        newestMemberAvatarUrl: community.newestMemberAvatarUrl || null,
      };
    }
    const pub = await fetchJson("/admin/public-settings").catch(() => null);
    if (pub && pub.discordInviteUrl) {
      window.DATA.SETTINGS = { ...window.DATA.SETTINGS, discordUrl: pub.discordInviteUrl };
    }
  } catch (e) { /* garde le fallback statique */ }
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}
boot();
