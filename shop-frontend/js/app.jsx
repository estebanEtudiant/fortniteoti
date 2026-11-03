/* ====================== 404 — App / router ====================== */
const { useState: useS, useEffect: useE, useRef: useR } = React;

/* ---------- API / auth ---------- */
const API_BASE = "https://api.404tweaks.tech/api/v1";

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
      <SkyBackdrop />
      <div className="scroll-prog" ref={progRef} />
      <Header route={route} go={go} lang={lang} setLang={setLang} customer={customer} cartCount={cartCount} navVariant={t2.navVariant} navIconSet={t2.navIconSet} />
      <main key={route}>{page}</main>
      <Footer lang={lang} go={go} />

      {toast && (
        <div className={"toast show"}>
          <span className="ic"><Icon.check /></span>
          <span>{toast}</span>
        </div>
      )}

      {TWEAKS_ADMIN && <>
      <TweaksPanel title={lang === "fr" ? "Personnalisation" : "Customize"}>
        <TweakSection label={lang === "fr" ? "Direction du hero" : "Hero direction"} />
        <TweakRadio label={lang === "fr" ? "Mise en page" : "Layout"} value={t2.heroVariant}
          options={["split", "centered", "showcase"]}
          onChange={(v) => setTweak("heroVariant", v)} />
        <TweakRadio label={lang === "fr" ? "Séparation hero" : "Hero divider"} value={t2.heroSplit}
          options={["slant-fade", "fade", "slant", "soft", "curve", "wave", "glass", "glow", "frame"]}
          onChange={(v) => setTweak("heroSplit", v)} />
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--tx-mute)", padding: "2px 2px 10px", lineHeight: 1.5 }}>
          {lang === "fr"
            ? "slant-fade = biseau + fondu · fade = fondu · slant = biseau · soft = doux · curve = courbe · wave = vague · glass = verre · glow = lumière · frame = cadre"
            : "slant-fade = slash + blend · fade = blend · slant = slash · soft = soft · curve = curve · wave = wave · glass = glass · glow = glow · frame = frame"}
        </div>
        <TweakSection label={lang === "fr" ? "Navigation" : "Navigation"} />
        <TweakRadio label={lang === "fr" ? "Style des liens" : "Link style"} value={t2.navVariant}
          options={["gradient", "line", "pills", "neon", "minimal", "ghost"]}
          onChange={(v) => setTweak("navVariant", v)} />
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--tx-mute)", padding: "2px 2px 10px", lineHeight: 1.5 }}>
          {lang === "fr"
            ? "gradient = dégradé · line = souligné · pills = pastilles · neon = néon · minimal = horizontal · ghost = bordure"
            : "gradient = gradient · line = underline · pills = pills · neon = neon · minimal = horizontal · ghost = border"}
        </div>
        <TweakSection label={lang === "fr" ? "Icônes navbar" : "Navbar icons"} />
        <TweakRadio label={lang === "fr" ? "Jeu d'icônes" : "Icon set"} value={t2.navIconSet}
          options={["default", "filled", "gaming", "cheat", "minimal", "bold"]}
          onChange={(v) => setTweak("navIconSet", v)} />
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--tx-mute)", padding: "2px 2px 10px", lineHeight: 1.5 }}>
          {lang === "fr"
            ? "Boutique · Statut · Avis · Compte · Discord — default / filled / gaming / cheat / minimal / bold"
            : "Store · Status · Reviews · Account · Discord — default / filled / gaming / cheat / minimal / bold"}
        </div>
        <TweakSection label={lang === "fr" ? "Animation vitrine" : "Showcase motion"} />
        <TweakRadio label={lang === "fr" ? "Style page" : "Page style"} value={t2.pageAnim}
          options={["fade", "glass", "cinematic", "lift", "snap", "float", "spotlight"]}
          onChange={(v) => setTweak("pageAnim", v)} />
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--tx-mute)", padding: "2px 2px 10px", lineHeight: 1.5 }}>
          {lang === "fr"
            ? "fade = minimal · glass = reflet images · cinematic = zoom lent · lift = élévation · snap = sec · float = flottant · spotlight = lumière"
            : "fade = minimal · glass = image shine · cinematic = slow zoom · lift = elevation · snap = crisp · float = floating · spotlight = light"}
        </div>
        <TweakSection label={lang === "fr" ? "Couleur d'accent" : "Accent color"} />
        <TweakRadio label={lang === "fr" ? "Teinte" : "Hue"} value={String(t2.accentHue)}
          options={["26", "16", "12", "200", "280", "150"]}
          onChange={(v) => setTweak("accentHue", Number(v))} />
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--tx-mute)", padding: "2px 2px 6px" }}>
          26 orange · 16 corail · 12 rouge · 200 cyan · 280 violet · 150 vert
        </div>
        <TweakSection label={lang === "fr" ? "Typographie" : "Typography"} />
        <TweakRadio label="Display" value={t2.font}
          options={["default", "condensed", "techno"]}
          onChange={(v) => setTweak("font", v)} />
      </TweaksPanel>

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
  const API = "https://api.404tweaks.tech/api/v1";
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
