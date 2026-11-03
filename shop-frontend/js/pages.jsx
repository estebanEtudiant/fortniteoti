/* ====================== 404 — pages ====================== */
const { useState: useStateP, useEffect: useEffectP } = React;

function shopDiscordUrl() {
  return (window.DATA && window.DATA.SETTINGS && window.DATA.SETTINGS.discordUrl) || "";
}
function openShopDiscord() {
  const u = shopDiscordUrl();
  if (u) window.open(u, "_blank", "noopener,noreferrer");
}

/* =================================================================
   HERO — title animations (switch via tweak `heroTextAnim`)
   reveal · shimmer · glitch · pulse · split · neon
   ================================================================= */
function HeroTitle({ line1, line2, anim = "shimmer", className = "", style = {}, inline = false }) {
  const cls = ["hero-title", `hero-title--${anim}`, className].filter(Boolean).join(" ");
  const accentCls = anim === "split" ? "" : anim === "neon" ? "" : " grad-tx";
  const line2Content = anim === "split"
    ? line2.split(" ").map((w, i, arr) => (
        <span key={i} className="hero-title-word" style={{ animationDelay: `${0.42 + i * 0.11}s` }}>{w}{i < arr.length - 1 ? "\u00A0" : ""}</span>
      ))
    : line2;

  return (
    <h1 className={cls} style={style}>
      <span className="hero-title-line hero-title-line-1">{line1}</span>
      {!inline && <br />}
      {inline && " "}
      <span className={"hero-title-line hero-title-line-2" + accentCls} data-text={anim === "glitch" ? line2 : undefined}>{line2Content}</span>
    </h1>
  );
}

/* ambient hero : ciel étoilé + nébuleuse + halos + spot qui suit la souris */
function HeroAmbient() {
  return (
    <div className="hero-ambient" aria-hidden="true">
      <i className="orb o1" /><i className="orb o2" /><i className="orb o3" />
      <StarField density={1.1} />
      <div className="nebula" />
      <div className="hero-spot" />
    </div>
  );
}

const MARQUEE_ITEMS = {
  fr: ["Loader sécurisé", "Mis à jour à chaque patch", "Livraison instantanée", "Support 24/7", "Stream-proof", "Paiement sécurisé", "Clé envoyée par email", "Configs incluses"],
  en: ["Secure loader", "Updated every patch", "Instant delivery", "24/7 support", "Stream-proof", "Secure checkout", "Key sent by email", "Configs included"],
};

/* =================================================================
   HERO — three art directions, switchable via tweak `heroVariant`
   ================================================================= */
function Hero({ lang, go, variant, textAnim = "shimmer", splitStyle = "slant-fade" }) {
  const S = DATA.STATS;
  const heroImg = (DATA.SETTINGS && DATA.SETTINGS.heroImage) || "";
  const line1 = t("heroTitle1", lang);
  const line2 = t("heroTitle2", lang);
  const Copy = (
    <>
      <HeroTitle line1={line1} line2={line2} anim={textAnim} style={{ fontSize: "clamp(40px, 6vw, 76px)", maxWidth: 640 }} />
      <p style={{ color: "var(--tx-dim)", fontSize: 17, maxWidth: 480, marginTop: 20 }}>{t("heroSub", lang)}</p>
    </>
  );
  const StatsInline = (
    <div style={{ display: "flex", alignItems: "center", gap: 38, marginTop: 34, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontFamily: "var(--f-display)", fontWeight: 900, fontSize: 38, color: "var(--acc)", lineHeight: 1 }}>{S.delivered >= 1000 ? <><CountUp value={Math.round(S.delivered/1000)} />k+</> : <><CountUp value={S.delivered} />+</>}</div>
        <div className="eyebrow" style={{ marginTop: 6 }}>{t("delivered", lang)}</div>
      </div>
      <div style={{ width: 1, height: 44, background: "var(--line-2)" }} />
      <div>
        <div style={{ fontFamily: "var(--f-display)", fontWeight: 900, fontSize: 38, color: "var(--acc)", lineHeight: 1 }}><CountUp value={S.members} /></div>
        <div className="eyebrow" style={{ marginTop: 6 }}>{t("totalMembers", lang)}</div>
      </div>
    </div>
  );

  if (variant === "centered") {
    return (
      <section className="hero hero-live" style={{ padding: "92px 0 120px" }}>
        <div className="hero-art" />
        <HeroAmbient />
        <div className="wrap" style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <HeroTitle line1={line1} line2={line2} anim={textAnim} inline style={{ fontSize: "clamp(44px, 8vw, 104px)", letterSpacing: "-0.04em" }} />
          <p style={{ color: "var(--tx-dim)", fontSize: 18, maxWidth: 560, margin: "22px auto 0" }}>{t("heroSub", lang)}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 34 }}>
            <Btn kind="primary" size="lg" iconRight={<Icon.arrow />} onClick={() => go("store")}>{t("browse", lang)}</Btn>
            <Btn kind="ghost" size="lg" icon={<Icon.discord />} onClick={openShopDiscord}>{t("joinDiscord", lang)}</Btn>
          </div>
          <div style={{ display: "inline-flex" }}>{StatsInline}</div>
        </div>
      </section>
    );
  }

  if (variant === "showcase") {
    const top = DATA.GAMES.slice(0, 3);
    return (
      <section className="hero hero-live" style={{ padding: "72px 0 92px" }}>
        <div className="hero-art" />
        <HeroAmbient />
        <div className="wrap" style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 50, alignItems: "center" }}>
          <div>
            {Copy}
            <div style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
              <Btn kind="primary" size="lg" iconRight={<Icon.arrow />} onClick={() => go("store")}>{t("browse", lang)}</Btn>
              <Btn kind="ghost" size="lg" icon={<Icon.discord />} onClick={openShopDiscord}>{t("joinDiscord", lang)}</Btn>
            </div>
            {StatsInline}
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {top.map((g, i) => (
              <div key={g.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: 14, cursor: "pointer", animation: `floaty ${5+i}s ease-in-out ${i*0.4}s infinite` }} onClick={() => go("game/" + g.id)}>
                <div className="art-ph" data-label="" style={{ width: 96, height: 64, flex: "none", position: "relative" }}><div className="shard" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 18 }}>{g.name}</div>
                  <div className="eyebrow" style={{ marginTop: 3 }}>{g.tipsCount} {t("perGame", lang)} · {g.chip}</div>
                </div>
                <StatusBadge status={g.status} lang={lang} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* default: split */
  const splitCls = "hero hero--split-" + splitStyle;
  return (
    <section className={splitCls + " hero-live"}>
      <div className="hero-art" />
      <HeroAmbient />
      {heroImg
        ? <div className="hero-fig hero-fig-img"><Img src={heroImg} alt="" priority /></div>
        : <div className="hero-fig"><span>HERO ARTWORK</span></div>}
      <div className="hero-edge" aria-hidden="true" />
      <div className="wrap" style={{ position: "relative", zIndex: 2, padding: "78px 0 96px" }}>
        <div className="hero-copy hero-stagger">
          {Copy}
          <div style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
            <Btn kind="primary" size="lg" iconRight={<Icon.arrow />} onClick={() => go("store")}>{t("browse", lang)}</Btn>
            <Btn kind="ghost" size="lg" icon={<Icon.discord />} onClick={openShopDiscord}>{t("joinDiscord", lang)}</Btn>
          </div>
          {StatsInline}
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   HOME
   ================================================================= */
function HomePage({ lang, go, onAdd, heroVariant, heroTextAnim = "shimmer", heroSplit = "slant-fade" }) {
  const S = DATA.STATS;
  const sideStats = [
    [t("totalMembers", lang), S.members.toLocaleString(), Icon.users],
    [t("mostOnline", lang), S.online.toLocaleString(), Icon.bolt],
    [t("newest", lang), S.newestMemberUsername || "—", Icon.trophy],
  ];
  return (
    <div className="page-enter">
      <Hero lang={lang} go={go} variant={heroVariant} textAnim={heroTextAnim} splitStyle={heroSplit} />
      <Crumbs trail={[t("home", lang)]} lang={lang} overlap />
      <Marquee items={MARQUEE_ITEMS[lang] || MARQUEE_ITEMS.en} />

      <div className="wrap section" style={{ paddingTop: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }} className="home-split">
          {/* welcome panel */}
          <div className="panel reveal spot-card" style={{ padding: "46px 44px" }}>
            <h2 style={{ fontSize: "clamp(34px, 4.4vw, 56px)" }}>
              {t("welcomeTo", lang)} <span className="grad-tx">404</span><br />{t("welcomeTail", lang)}
            </h2>
            <p style={{ color: "var(--tx-dim)", fontSize: 16, marginTop: 22, maxWidth: 620 }}>{t("welcomeBody", lang)}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Btn kind="primary" iconRight={<Icon.arrow />} onClick={() => go("store")}>{t("browse", lang)}</Btn>
              <Btn kind="outline" onClick={() => go("status")}>{navLabel("status", lang)}</Btn>
            </div>
          </div>
          {/* side stat tiles */}
          <div className="reveal-grid" style={{ display: "grid", gap: 14 }}>
            {sideStats.map(([k, v, Ic], i) => (
              <div key={i} className="card stat-tile spot-card">
                <div><div className="k">{k}</div><div className="v">{typeof v === "string" && /^[\d\s,.\u202f]+$/.test(v) ? <CountUp value={parseInt(v.replace(/\D/g, ""), 10)} /> : v}</div></div>
                <div className="stat-ic"><Ic /></div>
              </div>
            ))}
          </div>
        </div>

        {/* support banner */}
        <div className="panel reveal spot-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 26px", marginTop: 22 }}>
          <div className="stat-ic" style={{ width: 50, height: 50 }}><Icon.headset style={{ width: 26, height: 26 }} /></div>
          <div>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 18 }}>{t("support247", lang)}</div>
            <div style={{ color: "var(--tx-dim)", fontSize: 14, marginTop: 3 }}>{t("supportBody", lang)}</div>
          </div>
        </div>

        {/* all products */}
        <div style={{ marginTop: 54 }}>
          <div className="reveal" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 22 }}>
            <h2 className="h-accent" style={{ fontSize: 32 }}>{t("allProducts", lang)}</h2>
            <a className="signin" style={{ cursor: "pointer" }} onClick={() => go("store")}>{t("browse", lang)} <Icon.arrow style={{ width: 14, height: 14 }} /></a>
          </div>
          <div className="grid-3 reveal-grid">
            {DATA.GAMES.map(g => <GameCard key={g.id} game={g} lang={lang} go={go} onAdd={onAdd} />)}
          </div>
        </div>

        {/* CTA */}
        <CTA lang={lang} go={go} />
      </div>
    </div>
  );
}

function CTA({ lang, go }) {
  return (
    <div className="panel reveal cta-live" style={{ marginTop: 56, padding: "56px 44px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div className="hero-art" style={{ opacity: 0.6 }} />
      <i className="orb o1" aria-hidden="true" /><i className="orb o2" aria-hidden="true" />
      <div style={{ position: "relative", zIndex: 2 }}>
        <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)" }}>{t("ctaTitle", lang)}</h2>
        <p style={{ color: "var(--tx-dim)", fontSize: 16, maxWidth: 480, margin: "16px auto 0" }}>{t("ctaSub", lang)}</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 28 }}>
          <Btn kind="primary" size="lg" iconRight={<Icon.arrow />} onClick={() => go("store")}>{t("browse", lang)}</Btn>
          {shopDiscordUrl() && <Btn kind="ghost" size="lg" icon={<Icon.discord />} onClick={openShopDiscord}>{t("joinDiscord", lang)}</Btn>}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   SHOP
   ================================================================= */
function ShopPage({ lang, go, onAdd }) {
  const [filter, setFilter] = useStateP("all");
  const [swapped, setSwapped] = useStateP(false);
  const cats = ["all", ...new Set(DATA.GAMES.map(g => g.chip))];
  const list = filter === "all" ? DATA.GAMES : DATA.GAMES.filter(g => g.chip === filter);
  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, navLabel("store", lang)]} lang={lang} go={go} />
      <div className="wrap section" style={{ paddingTop: 40 }}>
        <div className="panel reveal spot-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 26px", marginBottom: 26 }}>
          <div className="stat-ic" style={{ width: 50, height: 50 }}><Icon.headset style={{ width: 26, height: 26 }} /></div>
          <div>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 18 }}>{t("support247", lang)}</div>
            <div style={{ color: "var(--tx-dim)", fontSize: 14, marginTop: 3 }}>{t("supportBody", lang)}</div>
          </div>
        </div>

        <div className="panel reveal" style={{ padding: "32px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <h2 className="h-accent" style={{ fontSize: 30 }}>{t("allProducts", lang)}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cats.map(c => (
                <button key={c} className={"chip" + (filter === c ? " active" : "")} onClick={() => { setFilter(c); setSwapped(true); }}>
                  {c === "all" ? t("all", lang) : c}
                </button>
              ))}
            </div>
          </div>
          <div className={"grid-3 " + (swapped ? "grid-swap" : "reveal-grid")} key={filter}>
            {list.map(g => <GameCard key={g.id} game={g} lang={lang} go={go} onAdd={onAdd} />)}
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h2 className="reveal h-accent" style={{ fontSize: 26, marginBottom: 18 }}>{t("popular", lang)}</h2>
          <div className="grid-4 reveal-grid">
            {DATA.GAMES.slice(0, 4).map(g => <GameCard key={g.id} game={g} lang={lang} go={go} onAdd={onAdd} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- product image gallery (scroll + zoom) ---------- */
function Gallery({ images, name, logo, lang }) {
  const list = (images && images.length) ? images : [];
  const [idx, setIdx] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  React.useEffect(() => { setIdx(0); setZoom(false); }, [name]);
  React.useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => { if (e.key === "Escape") setZoom(false); if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, list.length]);
  function go(d) { setIdx(i => (i + d + list.length) % list.length); }

  if (!list.length) {
    return (
      <div className="gal">
        <div className="gal-main art-ph">
          <div className="shard" />
          <div className="glogo" style={{ fontSize: 40 }}>{(logo || name || "").split("\n").map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="gal">
      <div className="gal-main" onClick={() => setZoom(true)}>
        <Img src={list[idx]} alt={name} priority={idx === 0} />
        <button className="gal-zoom" onClick={(e) => { e.stopPropagation(); setZoom(true); }} aria-label="zoom">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </button>
        {list.length > 1 && (
          <>
            <button className="gal-nav prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="prev"><Icon.chevron style={{ width: 20, height: 20, transform: "rotate(90deg)" }} /></button>
            <button className="gal-nav next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="next"><Icon.chevron style={{ width: 20, height: 20, transform: "rotate(-90deg)" }} /></button>
            <div className="gal-dots">{list.map((_, i) => <span key={i} className={"gal-dot" + (i === idx ? " on" : "")} onClick={(e) => { e.stopPropagation(); setIdx(i); }} />)}</div>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="gal-thumbs">
          {list.map((u, i) => (
            <button key={i} className={"gal-thumb" + (i === idx ? " on" : "")} onClick={() => setIdx(i)}>
              <Img src={u} alt="" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="gal-lightbox" onClick={() => setZoom(false)}>
          <button className="gal-close" onClick={() => setZoom(false)} aria-label="close">✕</button>
          <Img src={list[idx]} alt={name} priority onClick={(e) => e.stopPropagation()} />
          {list.length > 1 && (
            <>
              <button className="gal-nav prev" onClick={(e) => { e.stopPropagation(); go(-1); }}><Icon.chevron style={{ width: 30, height: 30, transform: "rotate(90deg)" }} /></button>
              <button className="gal-nav next" onClick={(e) => { e.stopPropagation(); go(1); }}><Icon.chevron style={{ width: 30, height: 30, transform: "rotate(-90deg)" }} /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* =================================================================
   PRODUCT / GAME DETAIL
   ================================================================= */
function ProductPage({ id, lang, go, onAdd }) {
  const game = DATA.GAMES.find(g => g.id === id) || DATA.GAMES[0];
  const [sel, setSel] = useStateP("1m");
  const [qty, setQty] = useStateP(1);
  const gameReviews = DATA.REVIEWS.filter(r => r.game === game.name).slice(0, 3);
  const galleryImgs = (game.images && game.images.length) ? game.images : (game.image ? [game.image] : []);
  const sections = (game.sections && game.sections.length)
    ? game.sections
    : [{ title: { fr: t("whatsIncluded", "fr"), en: t("whatsIncluded", "en") }, items: game.includes }];
  const inventory = useSpooferStock(game.id === 'spoofer');
  const plans = game.id === 'spoofer' ? inventory.plans : DATA.PLANS;
  const selPlan = plans.find(p => p.id === sel) || plans[0];
  const currencyLabel = '€';
  const unavailable = !selPlan || (game.id === 'spoofer' && !inventory.ready) || (selPlan.stock !== undefined && selPlan.stock < qty);
  // référence = prix/jour du plan le plus court, pour afficher l'économie des plans longs
  const dayRef = plans.filter(p => planDays(p)).reduce((a, p) => (!a || planDays(p) < planDays(a) ? p : a), null);
  const refPerDay = dayRef ? dayRef.price / planDays(dayRef) : 0;
  const planValue = (p) => {
    const d = planDays(p);
    if (!d || !refPerDay) return null;
    const perDay = p.price / d;
    const save = Math.round((1 - perDay / refPerDay) * 100);
    return { perDay, save };
  };
  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, { label: navLabel("store", lang), route: "store" }, game.name]} lang={lang} go={go} />

      <div className="wrap section" style={{ paddingTop: 40 }}>
        {/* haut : galerie (gauche) + choix de la licence (droite) */}
        <div className="prod-top">
          <Gallery images={galleryImgs} name={game.name} logo={game.logo} lang={lang} />
          <div className="prod-buy">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 32 }}>{game.name}</h1>
              <StatusBadge status={game.status} lang={lang} />
            </div>
            <p style={{ color: "var(--tx-dim)", fontSize: 15, marginBottom: 14 }}>{game.tagline[lang]}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              {game.tipsCount > 0 && <span className="prod-stat"><Icon.bolt /><b><CountUp value={game.tipsCount} duration={900} /></b> {t("perGame", lang)}</span>}
              {sections.length > 0 && <span className="prod-stat"><Icon.gear /><b>{sections.length}</b> {lang === "fr" ? (sections.length > 1 ? "catégories" : "catégorie") : (sections.length > 1 ? "categories" : "category")}</span>}
              {game.members > 0 && <span className="prod-stat"><Icon.users /><b><CountUp value={game.members} duration={900} /></b> {lang === "fr" ? (game.members > 1 ? "clients" : "client") : (game.members > 1 ? "customers" : "customer")}</span>}
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 14 }}>{t("choosePlan", lang)}</h3>
            <div className="buybox">
              {plans.map(p => (
                <button key={p.id} type="button" disabled={p.stock === 0} className={"plan-row" + (selPlan?.id === p.id ? " on" : "")} onClick={() => setSel(p.id)}>
                  <span className="pr-radio" />
                  <span className="pr-info">
                    <span className="pr-name">{p.name[lang]}{p.featured && <em className="pr-best">Best</em>}</span>
                    <span className="pr-per">{p.per[lang]}{planValue(p) && planDays(p) > 1 ? " · " + planValue(p).perDay.toFixed(2) + currencyLabel + (lang === "fr" ? "/jour" : "/day") : ""}</span>
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: p.stock === 0 ? '#f87171' : '#4ade80' }} aria-live="polite">{game.id === 'spoofer' && !inventory.ready ? (lang === 'fr' ? 'Vérification du stock…' : 'Checking stock…') : stockLabel(p.stock, lang)}</span>
                  </span>
                  {planValue(p) && planValue(p).save >= 5 && <span className="pr-save">−{planValue(p).save}%</span>}
                  {!planDays(p) && /^life/i.test(p.id) && <span className="pr-save life">{lang === "fr" ? "Payé une fois" : "Pay once"}</span>}
                  <span className="pr-price">{p.price.toFixed(2)}<span className="cur">{currencyLabel}</span></span>
                </button>
              ))}
            </div>
            {selPlan?.perks[lang] && selPlan.perks[lang].length > 0 && (
              <ul className="buybox-perks">
                {selPlan.perks[lang].map((perk, i) => <li key={i}><Icon.check />{perk}</li>)}
              </ul>
            )}
            <div className="qty-row">
              <span className="qty-lab">{lang === "fr" ? "Quantité" : "Quantity"}</span>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <input aria-label={lang === 'fr' ? 'Quantité' : 'Quantity'} type="number" min="1" max={Math.max(1, selPlan?.stock ?? 50)} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(selPlan?.stock ?? 50, 50, parseInt(e.target.value) || 1)))} />
                <button type="button" disabled={qty >= (selPlan?.stock ?? 50)} onClick={() => setQty(q => Math.min(selPlan?.stock ?? 50, 50, q + 1))}>+</button>
              </div>
            </div>
            <Btn kind="primary" size="lg" block disabled={unavailable} icon={<Icon.cart />} onClick={() => !unavailable && onAdd(game, selPlan, qty)}>
              {unavailable ? (lang === 'fr' ? 'Stock indisponible pour cette quantité' : 'Insufficient stock') : (lang === "fr" ? "Ajouter au panier" : "Add to cart")}
            </Btn>
            {inventory.error && game.id === 'spoofer' && <p role="alert">{lang === 'fr' ? 'Stock temporairement indisponible. Réessaie dans quelques instants.' : 'Stock temporarily unavailable. Please try again shortly.'}</p>}
            <button className="link-cart" onClick={() => go("cart")}>{lang === "fr" ? "Voir le panier" : "View cart"} →</button>
            <p className="bulk-hint">{lang === "fr" ? "Remise dès 2 licences : −5% · −10% (3+) · −15% (5+)" : "Bulk discount from 2: −5% · −10% (3+) · −15% (5+)"}</p>
            <ul className="buy-trust">
              <li><Icon.bolt />{lang === "fr" ? "Clé livrée instantanément (profil + email)" : "Instant key delivery (profile + email)"}</li>
              <li><Icon.lock />{lang === "fr" ? "Paiement sécurisé : carte, Apple Pay, Google Pay, Klarna…" : "Secure checkout: card, Apple Pay, Google Pay, Klarna…"}</li>
              <li><Icon.headset />{lang === "fr" ? "Support 24/7 pour l'installation" : "24/7 install support"} · <a onClick={() => go("faq")}>{lang === "fr" ? "Voir la FAQ" : "Read the FAQ"}</a></li>
            </ul>
          </div>
        </div>

        {/* barre d'achat collante (mobile) — rendue dans <body> pour rester fixée à l'écran */}
        {selPlan && ReactDOM.createPortal(<div className="sticky-buy">
          <div className="sb-info">
            <b>{game.name} · {selPlan.name[lang]}</b>
            <span>{(selPlan.price * qty).toFixed(2)}{currencyLabel}{qty > 1 ? " (×" + qty + ")" : ""}</span>
          </div>
          <Btn kind="primary" disabled={unavailable} icon={<Icon.cart />} onClick={() => !unavailable && onAdd(game, selPlan, qty)}>{unavailable ? (lang === 'fr' ? 'Indisponible' : 'Unavailable') : (lang === "fr" ? "Ajouter" : "Add")}</Btn>
        </div>, document.body)}

        {/* Product Information — catégories éditables dans un rectangle */}
        <div className="panel prod-info reveal">
          <h3 className="prod-info-h">{lang === "fr" ? "Informations produit" : "Product Information"}</h3>
          <div className="prod-info-grid">
            {sections.map((sec, si) => {
              const items = (sec.items && (sec.items[lang] || sec.items.fr || sec.items.en)) || [];
              const title = (sec.title && (sec.title[lang] || sec.title.fr || sec.title.en)) || t("whatsIncluded", lang);
              return (
                <div key={si} className="prod-info-sec">
                  <h4>{title}</h4>
                  <ul>
                    {items.map((it, i) => (
                      <li key={i}>
                        <span className="ck"><Icon.check style={{ width: 14, height: 14, color: "var(--acc)" }} /></span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* My License for this game */}
        <GameLicenseSection gameId={game.id} gameName={game.name} lang={lang} />

        {/* mini reviews */}
        {gameReviews.length > 0 && (
          <div style={{ marginTop: 44 }}>
            <h3 style={{ fontSize: 22, marginBottom: 18 }}>{game.name} · {t("verifiedReviews", lang)}</h3>
            <div className="grid-3">
              {gameReviews.map((r, i) => <ReviewCard key={i} rev={r} lang={lang} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GameLicenseSection({ gameId, gameName, lang }) {
  const [licenses, setLicenses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dlLoading, setDlLoading] = React.useState(false);
  const [dlError, setDlError] = React.useState("");

  React.useEffect(() => {
    if (!window.Auth.token()) { setLoading(false); return; }
    window.ShopAPI.profile()
      .then((p) => {
        const all = (p && p.licenses) || [];
        const filtered = all.filter((lic) => {
          const m = lic.metadata || {};
          const slug = (m.shopGame || "").toLowerCase();
          if (slug === gameId) return true;
          if (gameId === "fortnite" && lic.product === "FORTNITE_CLIENT") return true;
          return false;
        });
        setLicenses(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gameId]);

  if (!window.Auth.token() || loading || licenses.length === 0) return null;

  const activeLic = licenses.filter((l) => l.status === "ACTIVE");

  const handleDownloadLoader = async () => {
    setDlLoading(true); setDlError("");
    try {
      const token = window.Auth.token();
      const r = await fetch(API_BASE + "/software/customer/fortnite-loader", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error((d && d.message) || "Erreur " + r.status);
      }
      const blob = await r.blob();
      const cd = r.headers.get("content-disposition") || "";
      const fnMatch = cd.match(/filename="?([^";\s]+)"?/);
      const filename = fnMatch ? fnMatch[1] : Math.random().toString(36).slice(2) + ".exe";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setDlError(e.message); }
    finally { setDlLoading(false); }
  };

  return (
    <div className="panel" style={{ marginTop: 36, padding: "26px 26px" }}>
      <h3 style={{ fontSize: 20, marginBottom: 16 }}>{lang === "fr" ? "Ma licence" : "My license"} — {gameName}</h3>
      <div style={{ display: "grid", gap: 14 }}>
        {licenses.map((lic) => {
          const st = STATUS_META[lic.status] || STATUS_META.EXPIRED;
          const plan = (PLAN_LABEL[lic.plan] && PLAN_LABEL[lic.plan][lang]) || lic.plan;
          return (
            <div key={lic.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--tx-mute)" }}>{plan}</span>
                <span className={"badge " + st.cls}>{st[lang]}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px" }}>
                <code style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 600, flex: 1, wordBreak: "break-all" }}>{lic.licenseKey}</code>
                <PfCopy text={lic.licenseKey} lang={lang} />
              </div>
            </div>
          );
        })}
      </div>

      {gameId === 'spoofer' && activeLic.length > 0 && <PfLoaderBtn lang={lang} endpoint="/software/customer/spoofer" spoofer />}
      {gameId === "fortnite" && activeLic.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button
            onClick={handleDownloadLoader}
            disabled={dlLoading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 22px",
              background: "var(--acc-grad)", color: "#14110a", border: "none", borderRadius: 10,
              fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 14, cursor: dlLoading ? "wait" : "pointer",
              opacity: dlLoading ? 0.6 : 1,
            }}
          >
            <Icon.arrow style={{ width: 16, height: 16, transform: "rotate(90deg)" }} />
            {dlLoading ? (lang === "fr" ? "Téléchargement…" : "Downloading…") : (lang === "fr" ? "Télécharger le loader" : "Download loader")}
          </button>
          {dlError && <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{dlError}</div>}
        </div>
      )}
    </div>
  );
}

/* =================================================================
   STATUS
   ================================================================= */
function StatusPage({ lang, go }) {
  const [filter, setFilter] = useStateP("all");
  const list = filter === "all" ? DATA.GAMES : DATA.GAMES.filter(g => g.id === filter);
  const legend = [["updated","badge-ok",<span className="status-dot s-ok" key="a"/>],["updating","badge-warn",<Icon.gear key="b" style={{width:12,height:12}}/>],["isnew","badge-new",<Icon.bolt key="c" style={{width:11,height:11}}/>]];
  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, navLabel("status", lang)]} lang={lang} go={go} />
      <div className="wrap section" style={{ paddingTop: 40 }}>
        <div className="panel" style={{ padding: "32px 32px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 32 }}>{t("statusTitle", lang)}</h2>
              <p style={{ color: "var(--tx-dim)", marginTop: 6 }}>{t("statusSub", lang)}</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {legend.map(([k, cls, ic]) => <span key={k} className={"badge " + cls}>{ic}{t(k, lang)}</span>)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "26px 0 8px", paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
            <button className={"chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{t("all", lang)}</button>
            {DATA.GAMES.map(g => <button key={g.id} className={"chip" + (filter === g.id ? " active" : "")} onClick={() => setFilter(g.id)}>{g.name}</button>)}
          </div>

          {list.map(g => (
            <div key={g.id}>
              <div className="status-group-h">{g.name}</div>
              <div className="status-row">
                <div className="name">{g.name} <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500, color: "var(--tx-mute)" }}>· {g.tipsCount} {t("perGame", lang)}</span></div>
                <div className="since">
                  <div className="lab">{t("upToDateSince", lang)}</div>
                  <div className="val">{g.since[lang]}</div>
                </div>
                <StatusBadge status={g.status} lang={lang} />
                <Btn kind="primary" size="sm" onClick={() => go("game/" + g.id)}>{t("purchaseNow", lang)}</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   REVIEWS
   ================================================================= */
function ReviewsPage({ lang, go }) {
  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, navLabel("reviews", lang)]} lang={lang} go={go} />
      <div className="wrap section" style={{ paddingTop: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div className="acc-eyebrow">{t("ourCommunity", lang)}</div>
        </div>

        <h2 style={{ fontSize: "clamp(30px,4vw,46px)", textAlign: "center", margin: "40px 0 30px" }}>
          {t("reviewsTitle", lang)} <span className="grad-tx">{t("reviewsTail", lang)}</span>
        </h2>

        <div style={{ textAlign: "center", margin: "-10px 0 26px" }}>
          <Btn kind="primary" icon={<Icon.star />} onClick={() => {
            if (window.Auth.token()) { try { sessionStorage.setItem("404_profile_tab", "licenses"); } catch (e) {} go("profile"); }
            else { try { sessionStorage.setItem("404_after_login", "profile"); } catch (e) {} go("auth"); }
          }}>{lang === "fr" ? "Laisser un avis · −10 % offerts" : "Leave a review · 10% off"}</Btn>
          <p className="bulk-hint" style={{ marginTop: 8 }}>{lang === "fr" ? "Réservé aux clients ayant acheté le jeu." : "For customers who bought the game."}</p>
        </div>
        {reviewSummary() && (
          <div className="rev-summary">
            <b>{reviewSummary().avg}</b><span>/5</span>
            <Stars n={Math.round(reviewSummary().avg)} size={18} />
            <em>{reviewSummary().count} {lang === "fr" ? "avis de clients ayant acheté" : "reviews from paying customers"}</em>
          </div>
        )}
        {DATA.REVIEWS.length > 0 ? (
          <div className="grid-4 reveal-grid">
            {DATA.REVIEWS.map((r, i) => <ReviewCard key={i} rev={r} lang={lang} />)}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "var(--tx-dim)", fontSize: 15, marginTop: 30 }}>
            {lang === "fr" ? "Aucun avis pour le moment." : "No reviews yet."}
          </p>
        )}
      </div>
    </div>
  );
}

/* =================================================================
   AUTH
   ================================================================= */
function forumReturnUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(decodeURIComponent(raw));
    if (u.protocol === "https:" && u.hostname === "forum.404tweaks.tech") return u.href;
  } catch (e) {}
  return null;
}

function parseAuthRouteParams() {
  const raw = (location.hash || "").slice(1);
  const q = raw.indexOf("?");
  const qs = q >= 0 ? raw.slice(q + 1) : (location.search || "").replace(/^\?/, "");
  const params = new URLSearchParams(qs);
  return {
    mode: params.get("mode"),
    returnUrl: forumReturnUrl(params.get("return")),
  };
}

function AuthPage({ lang, go, route }) {
  const authParams = parseAuthRouteParams();
  const forumReturn = authParams.returnUrl;
  const me = window.useAuth ? window.useAuth() : null;
  const routeMode = (route || "").split("/")[1];
  const initMode = routeMode === "signup" ? "signup" : authParams.mode === "signup" ? "signup" : "signin";
  const [mode, setMode] = useStateP(initMode);

  useEffectP(() => {
    const m = (route || "").split("/")[1];
    if (m === "signup" || m === "signin") setMode(m);
  }, [route]);
  const [username, setUsername] = useStateP("");
  const [email, setEmail] = useStateP("");
  const [password, setPassword] = useStateP("");
  const [busy, setBusy] = useStateP(false);
  const [err, setErr] = useStateP("");
  const [notice, setNotice] = useStateP("");
  const isUp = mode === "signup";

  useEffectP(() => {
    if (!me || !forumReturn) return;
    let cancelled = false;
    (async () => {
      try {
        await window.ShopAPI.forumSso();
      } catch (e) { /* cookie may already exist */ }
      if (!cancelled) window.location.href = forumReturn;
    })();
    return () => { cancelled = true; };
  }, [me, forumReturn]);

  // déjà connecté → écran de compte (sauf redirect forum en cours)
  if (me && !forumReturn) {
    return (
      <div className="page-enter">
        <div className="wrap section" style={{ display: "grid", placeItems: "center", paddingTop: 60 }}>
          <div className="panel" style={{ width: "100%", maxWidth: 440, padding: "40px 38px", textAlign: "center" }}>
            <div className="logo" style={{ justifyContent: "center", marginBottom: 14 }}>
              <span className="mark">404</span><span>404<span style={{ color: "var(--acc)" }}>·</span>GG</span>
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 6 }}>{lang === "fr" ? "Connecté" : "Signed in"}</h2>
            <p style={{ color: "var(--tx-dim)", marginBottom: 24 }}>{me.displayName || me.username} · {me.email}</p>
            <Btn kind="primary" block onClick={() => go("profile")}>{lang === "fr" ? "Mon compte" : "My account"}</Btn>
            <div style={{ height: 10 }} />
            <Btn kind="outline" block onClick={() => go("store")}>{lang === "fr" ? "Voir la boutique" : "Browse the shop"}</Btn>
            <div style={{ height: 10 }} />
            <Btn kind="ghost" block onClick={() => { window.Auth.clear(); go("home"); }}>
              {lang === "fr" ? "Déconnexion" : "Log out"}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (me && forumReturn) {
    return (
      <div className="page-enter">
        <div className="wrap section" style={{ display: "grid", placeItems: "center", paddingTop: 60 }}>
          <div className="panel" style={{ width: "100%", maxWidth: 440, padding: "40px 38px", textAlign: "center" }}>
            <p style={{ color: "var(--tx-dim)" }}>{lang === "fr" ? "Connexion au forum…" : "Signing in to the forum…"}</p>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setNotice(""); setBusy(true);
    try {
      const res = isUp
        ? await window.ShopAPI.register(email.trim(), username.trim(), password)
        : await window.ShopAPI.login(email.trim(), password);
      window.Auth.set(res.token, res.customer);
      const next = sessionStorage.getItem("404_after_login");
      sessionStorage.removeItem("404_after_login");
      if (forumReturn) {
        window.location.href = forumReturn;
        return;
      }
      if (isUp) {
        setNotice(lang === "fr"
          ? "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant d'acheter."
          : "Account created! Check your inbox to confirm your email before buying.");
      } else {
        go(next || "home");
      }
    } catch (e2) {
      setErr(e2.message || (lang === "fr" ? "Une erreur est survenue" : "Something went wrong"));
    } finally { setBusy(false); }
  };

  return (
    <div className="page-enter">
      <div className="wrap section" style={{ display: "grid", placeItems: "center", paddingTop: 60 }}>
        <div className="panel" style={{ width: "100%", maxWidth: 440, padding: "40px 38px" }}>
          <div className="logo" style={{ justifyContent: "center", marginBottom: 8 }}>
            <span className="mark">404</span><span>404<span style={{ color: "var(--acc)" }}>·</span>GG</span>
          </div>
          <h2 style={{ fontSize: 26, textAlign: "center", marginBottom: 26 }}>{isUp ? t("signUpTitle", lang) : t("signInTitle", lang)}</h2>
          {forumReturn && (
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--tx-dim)", marginBottom: 16, marginTop: -12 }}>
              {lang === "fr" ? "Utilise ton compte 404 shop — même email / pseudo / mot de passe." : "Use your 404 shop account — same email / username / password."}
            </p>
          )}
          {err && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{err}</div>}
          {notice && <div style={{ background: "var(--acc-soft)", border: "1px solid var(--line-2)", color: "var(--tx)", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{notice}</div>}
          <form onSubmit={submit}>
            {isUp && (
              <div className="field"><label>{t("username", lang)}</label><input className="input" placeholder="belo" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
            )}
            <div className="field"><label>{isUp ? t("email", lang) : (lang === "fr" ? "Email ou pseudo" : "Email or username")}</label><input className="input" type={isUp ? "email" : "text"} placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="field"><label>{t("password", lang)}</label><input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Btn kind="primary" block size="lg" icon={<Icon.lock />} type="submit" style={{ marginTop: 6 }} disabled={busy}>
              {busy ? "…" : (isUp ? t("createAccount", lang) : t("login", lang))}
            </Btn>
          </form>
          <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--tx-dim)" }}>
            {isUp ? t("haveAccount", lang) : t("noAccount", lang)}{" "}
            <a style={{ color: "var(--acc)", cursor: "pointer", fontWeight: 600 }} onClick={() => { setErr(""); setNotice(""); go(isUp ? "auth/signin" : "auth/signup"); }}>
              {isUp ? t("login", lang) : t("signup", lang)}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   SUCCÈS PAIEMENT — récupère la clé de licence
   ================================================================= */
function SuccessPage({ lang, go }) {
  const [state, setState] = useStateP("loading"); // loading | ok | error
  const [keys, setKeys] = useStateP([]);
  const [msg, setMsg] = useStateP("");

  useEffectP(() => {
    const sid = new URLSearchParams(location.search).get("session_id");
    if (!sid) { setState("error"); setMsg(lang === "fr" ? "Session de paiement introuvable." : "Payment session not found."); return; }
    if (!window.Auth.token()) { setState("error"); setMsg(lang === "fr" ? "Reconnecte-toi pour récupérer ta clé." : "Sign in again to retrieve your key."); return; }
    let tries = 0;
    const attempt = () => {
      window.ShopAPI.confirm(sid)
        .then((res) => {
          const ks = (res.licenseKeys && res.licenseKeys.length) ? res.licenseKeys : (res.licenseKey ? [res.licenseKey] : []);
          setKeys(ks); setState("ok");
          if (window.Cart) window.Cart.clear();
        })
        .catch((e) => {
          // le paiement peut mettre quelques secondes à se confirmer
          if (tries < 4) { tries++; setTimeout(attempt, 2000); }
          else { setState("error"); setMsg(e.message); }
        });
    };
    attempt();
  }, []);

  return (
    <div className="page-enter">
      <div className="wrap section" style={{ display: "grid", placeItems: "center", paddingTop: 60 }}>
        <div className="panel" style={{ width: "100%", maxWidth: 520, padding: "44px 40px", textAlign: "center" }}>
          {state === "loading" && (
            <>
              <h2 style={{ fontSize: 26, marginBottom: 10 }}>{lang === "fr" ? "Validation du paiement…" : "Confirming payment…"}</h2>
              <p style={{ color: "var(--tx-dim)" }}>{lang === "fr" ? "Un instant, on génère ta clé de licence." : "One moment, generating your license key."}</p>
            </>
          )}
          {state === "ok" && (
            <>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--acc-grad)", display: "grid", placeItems: "center", margin: "0 auto 18px", color: "#14110a" }}>
                <Icon.check style={{ width: 28, height: 28 }} />
              </div>
              <h2 style={{ fontSize: 28, marginBottom: 8 }}>{lang === "fr" ? "Merci pour ton achat !" : "Thanks for your purchase!"}</h2>
              <p style={{ color: "var(--tx-dim)", marginBottom: 22 }}>{keys.length > 1 ? (lang === "fr" ? `Tes ${keys.length} clés de licence (aussi envoyées par email) :` : `Your ${keys.length} license keys (also emailed to you):`) : (lang === "fr" ? "Ta clé de licence (aussi envoyée par email) :" : "Your license key (also emailed to you):")}</p>
              <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                {keys.map((k, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, fontFamily: "var(--f-mono)", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "12px 14px", wordBreak: "break-all", textAlign: "left" }}>{k}</div>
                    <button className="cart-rm" style={{ flex: "none" }} title={lang === "fr" ? "Copier" : "Copy"} onClick={() => { navigator.clipboard && navigator.clipboard.writeText(k); }}>⧉</button>
                  </div>
                ))}
              </div>
              <Btn kind="outline" block onClick={() => { navigator.clipboard && navigator.clipboard.writeText(keys.join("\n")); }}>{lang === "fr" ? "Tout copier" : "Copy all"}</Btn>
              <div style={{ height: 10 }} />
              <Btn kind="ghost" block onClick={() => go("profile")}>{lang === "fr" ? "Voir mes licences" : "View my licenses"}</Btn>
              <div style={{ marginTop: 22, textAlign: "left" }}>
                <PfReviewBox lang={lang} onlyMissing title={lang === "fr" ? "Note ton achat" : "Rate your purchase"} />
              </div>
            </>
          )}
          {state === "error" && (
            <>
              <h2 style={{ fontSize: 26, marginBottom: 10 }}>{lang === "fr" ? "Un souci est survenu" : "Something went wrong"}</h2>
              <p style={{ color: "var(--tx-dim)", marginBottom: 22 }}>{msg}</p>
              <Btn kind="outline" block onClick={() => go("store")}>{lang === "fr" ? "Retour à la boutique" : "Back to shop"}</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   VÉRIFICATION EMAIL
   ================================================================= */
function VerifyPage({ lang, go }) {
  const [state, setState] = useStateP("loading");
  const [msg, setMsg] = useStateP("");
  useEffectP(() => {
    const token = new URLSearchParams(location.search).get("token");
    if (!token) { setState("error"); setMsg(lang === "fr" ? "Lien invalide." : "Invalid link."); return; }
    window.ShopAPI.verifyEmail(token)
      .then(() => setState("ok"))
      .catch((e) => { setState("error"); setMsg(e.message); });
  }, []);
  return (
    <div className="page-enter">
      <div className="wrap section" style={{ display: "grid", placeItems: "center", paddingTop: 60 }}>
        <div className="panel" style={{ width: "100%", maxWidth: 480, padding: "44px 40px", textAlign: "center" }}>
          {state === "loading" && <h2 style={{ fontSize: 24 }}>{lang === "fr" ? "Vérification…" : "Verifying…"}</h2>}
          {state === "ok" && (
            <>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--acc-grad)", display: "grid", placeItems: "center", margin: "0 auto 18px", color: "#14110a" }}>
                <Icon.check style={{ width: 28, height: 28 }} />
              </div>
              <h2 style={{ fontSize: 26, marginBottom: 8 }}>{lang === "fr" ? "Email vérifié !" : "Email verified!"}</h2>
              <p style={{ color: "var(--tx-dim)", marginBottom: 22 }}>{lang === "fr" ? "Tu peux maintenant acheter sur la boutique." : "You can now buy on the shop."}</p>
              <Btn kind="primary" block onClick={() => go("store")}>{lang === "fr" ? "Aller à la boutique" : "Go to shop"}</Btn>
            </>
          )}
          {state === "error" && (
            <>
              <h2 style={{ fontSize: 24, marginBottom: 10 }}>{lang === "fr" ? "Vérification échouée" : "Verification failed"}</h2>
              <p style={{ color: "var(--tx-dim)", marginBottom: 22 }}>{msg}</p>
              <Btn kind="outline" block onClick={() => go("home")}>{lang === "fr" ? "Accueil" : "Home"}</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   PANIER
   ================================================================= */
function CartPage({ lang, go, flash }) {
  const cartItems = window.useCart ? window.useCart() : [];
  const hasSpoofer = cartItems.some((item) => item.game === 'spoofer');
  const inventory = useSpooferStock(hasSpoofer);
  const items = cartItems.map((item) => {
    const offer = item.game === 'spoofer' ? inventory.plans.find((plan) => plan.id === item.plan) : null;
    return offer ? { ...item, price: offer.price } : item;
  });
  const unavailable = hasSpoofer && (!inventory.ready || items.some((item) => item.game === 'spoofer' && (inventory.plans.find((plan) => plan.id === item.plan)?.stock ?? 0) < item.qty));
  const currencyLabel = '€';
  const [busy, setBusy] = useStateP(false);
  const totalQty = items.reduce((n, i) => n + i.qty, 0);
  const pct = window.bulkPct ? window.bulkPct(totalQty) : 0;
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = subtotal * pct;
  const afterBulk = subtotal - discount;
  // code promo (validé côté API ; le serveur recalcule le prix final)
  const [promoIn, setPromoIn] = useStateP("");
  const [promo, setPromo] = useStateP(null);       // { code, type, amount, label }
  const [promoErr, setPromoErr] = useStateP("");
  const [promoBusy, setPromoBusy] = useStateP(false);
  const [myCoupons, setMyCoupons] = useStateP([]);
  useEffectP(() => { if (window.Auth.token()) window.ShopAPI.myCoupons().then(setMyCoupons).catch(() => {}); }, []);
  const applyPromo = async (forced) => {
    const code = (typeof forced === "string" ? forced : promoIn).trim().toUpperCase(); if (!code) return;
    setPromoBusy(true); setPromoErr("");
    try { const r = await window.ShopAPI.validatePromo(code); setPromo({ code, ...r }); setPromoIn(""); }
    catch (e) { setPromo(null); setPromoErr(e.message || (lang === "fr" ? "Code invalide" : "Invalid code")); }
    finally { setPromoBusy(false); }
  };
  const promoOff = !promo ? 0 : promo.type === "percent"
    ? afterBulk * (promo.amount / 100)
    : Math.min(afterBulk * 0.9, promo.amount / 100);
  const total = Math.max(0, afterBulk - promoOff);

  const cryptoOn = !!(window.DATA && window.DATA.SETTINGS && window.DATA.SETTINGS.cryptoEnabled);
  const payload = () => items.map(i => ({ game: i.game, plan: i.plan, qty: i.qty }));
  const promoCode = () => (promo ? promo.code : undefined);
  const guard = () => { if (!window.Auth.token()) { sessionStorage.setItem("404_after_login", "cart"); go("auth"); return false; } return true; };

  const checkout = async () => {
    if (!items.length || unavailable || !guard()) return;
    setBusy(true);
    try { const { url } = await window.ShopAPI.cartCheckout(payload(), promoCode()); window.location.href = url; }
    catch (e) { if (flash) flash("⚠ " + e.message, 5000); setBusy(false); }
  };
  const cryptoCheckout = async () => {
    if (!items.length || unavailable || !guard()) return;
    setBusy(true);
    try { const { url } = await window.ShopAPI.cryptoCheckout(payload(), promoCode()); window.location.href = url; }
    catch (e) { if (flash) flash("⚠ " + e.message, 5000); setBusy(false); }
  };

  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, lang === "fr" ? "Panier" : "Cart"]} lang={lang} go={go} />
      <div className="wrap section" style={{ paddingTop: 40, maxWidth: 820 }}>
        <h1 style={{ fontSize: 30, marginBottom: 22 }}>{lang === "fr" ? "Mon panier" : "My cart"}</h1>
        {items.length === 0 ? (
          <div className="panel" style={{ padding: "44px 30px", textAlign: "center" }}>
            <p style={{ color: "var(--tx-dim)", marginBottom: 18 }}>{lang === "fr" ? "Ton panier est vide." : "Your cart is empty."}</p>
            <Btn kind="primary" onClick={() => go("store")}>{t("browse", lang)}</Btn>
          </div>
        ) : (
          <div className="panel" style={{ padding: "8px 0 0" }}>
            {items.map(it => (
              <div key={it.key} className="cart-row">
                <div className="cart-info">
                  <div className="cart-name">{it.gameName}</div>
                  <div className="cart-sub">{lang === "fr" ? "Licence" : "License"} {(it.planName && (it.planName[lang] || it.planName.fr)) || it.plan}</div>
                  <div style={{ fontSize: 12, marginTop: 5 }} aria-live="polite">{it.game === 'spoofer' ? (!inventory.ready ? (lang === 'fr' ? 'Vérification du stock…' : 'Checking stock…') : stockLabel(inventory.plans.find((plan) => plan.id === it.plan)?.stock ?? 0, lang)) : stockLabel(undefined, lang)}</div>
                </div>
                <div className="qty-stepper sm">
                  <button type="button" onClick={() => window.Cart.setQty(it.key, it.qty - 1)}>−</button>
                  <input value={it.qty} onChange={(e) => window.Cart.setQty(it.key, parseInt(e.target.value) || 1)} />
                  <button type="button" onClick={() => window.Cart.setQty(it.key, it.qty + 1)}>+</button>
                </div>
                <div className="cart-price">{(it.price * it.qty).toFixed(2)}{currencyLabel}</div>
                <button className="cart-rm" onClick={() => window.Cart.remove(it.key)} aria-label="remove">✕</button>
              </div>
            ))}
            <div className="cart-summary">
              <div className="cart-line"><span>{lang === "fr" ? "Sous-total" : "Subtotal"}</span><span>{subtotal.toFixed(2)}{currencyLabel}</span></div>
              {pct > 0 && <div className="cart-line disc"><span>{lang === "fr" ? `Remise volume (−${(pct * 100).toFixed(0)}%)` : `Bulk discount (−${(pct * 100).toFixed(0)}%)`}</span><span>−{discount.toFixed(2)}{currencyLabel}</span></div>}
              {promo && <div className="cart-line disc"><span>{lang === "fr" ? "Code" : "Code"} {promo.code} ({promo.label}) <button className="promo-x" onClick={() => setPromo(null)} aria-label="remove">✕</button></span><span>−{promoOff.toFixed(2)}{currencyLabel}</span></div>}
              {!promo && (
                <div className="promo-row">
                  <input className="input" placeholder={lang === "fr" ? "Code promo" : "Promo code"} value={promoIn}
                    onChange={(e) => setPromoIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyPromo(); }} />
                  <Btn kind="ghost" disabled={promoBusy || !promoIn.trim()} onClick={applyPromo}>{promoBusy ? "…" : (lang === "fr" ? "Appliquer" : "Apply")}</Btn>
                </div>
              )}
              {!promo && myCoupons.length > 0 && (
                <div className="promo-mine">
                  {myCoupons.map((c) => (
                    <button key={c.code} className="chip" onClick={() => applyPromo(c.code)}>
                      <Icon.bolt style={{ width: 12, height: 12, verticalAlign: "-2px" }} /> {lang === "fr" ? "Utiliser" : "Use"} {c.code} ({c.type === "percent" ? "−" + c.amount + " %" : "−" + (c.amount / 100).toFixed(2) + " €"})
                    </button>
                  ))}
                </div>
              )}
              {promoErr && <p className="promo-err">{promoErr}</p>}
              <div className="cart-line total"><span>{lang === "fr" ? "Total" : "Total"}</span><span>{total.toFixed(2)}{currencyLabel}</span></div>
              {pct < 0.15 && <p className="bulk-hint" style={{ margin: "2px 0 14px" }}>{lang === "fr" ? "Plus tu en prends, moins c'est cher (jusqu'à −15%)" : "The more you buy, the cheaper (up to −15%)"}</p>}
              {unavailable && <p role="alert" style={{ color: '#f87171', marginBottom: 12 }}>{!inventory.ready ? (lang === 'fr' ? 'Vérification du stock en cours. Réessaie dans quelques instants.' : 'Checking stock. Please try again shortly.') : (lang === 'fr' ? 'Stock insuffisant : réduis la quantité ou retire le produit épuisé pour payer.' : 'Insufficient stock: reduce the quantity or remove the sold-out product to pay.')}</p>}
              <Btn kind="primary" size="lg" block icon={<Icon.lock />} disabled={busy || unavailable} onClick={checkout}>
                {busy ? "…" : (lang === "fr" ? "Payer maintenant" : "Pay now")}
              </Btn>
              <div className="pay-methods">{lang === "fr" ? "Carte · Apple Pay · Google Pay · Klarna · Bancontact · Revolut Pay" : "Card · Apple Pay · Google Pay · Klarna · Bancontact · Revolut Pay"}</div>
              <ul className="buy-trust center">
                <li><Icon.lock />{lang === "fr" ? "Paiement chiffré via Stripe" : "Encrypted checkout via Stripe"}</li>
                <li><Icon.bolt />{lang === "fr" ? "Clé livrée instantanément" : "Instant key delivery"}</li>
              </ul>
              {cryptoOn && (
                <Btn kind="outline" size="lg" block disabled={busy || unavailable} onClick={cryptoCheckout} style={{ marginTop: 10 }}>
                  {lang === "fr" ? "Payer en crypto" : "Pay with crypto"}
                </Btn>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================================================
   FAQ
   ================================================================= */
const FAQ = [
  { q: { fr: "Comment je reçois ma clé après l'achat ?", en: "How do I get my key after buying?" },
    a: { fr: "Dès que le paiement est confirmé, ta clé est générée automatiquement. Elle s'affiche sur la page de confirmation, dans ton profil (onglet « Mes licences ») et t'est envoyée par email.", en: "As soon as the payment is confirmed, your key is generated automatically. It is shown on the confirmation page, in your profile (\"My licenses\" tab) and sent to you by email." } },
  { q: { fr: "Quels moyens de paiement acceptez-vous ?", en: "Which payment methods do you accept?" },
    a: { fr: "Carte bancaire, Apple Pay, Google Pay, Klarna, Bancontact, Revolut Pay, Amazon Pay et Link, via Stripe. Le paiement est chiffré : nous ne voyons jamais tes coordonnées bancaires.", en: "Card, Apple Pay, Google Pay, Klarna, Bancontact, Revolut Pay, Amazon Pay and Link, through Stripe. Checkout is encrypted: we never see your card details." } },
  { q: { fr: "Comment installer et lancer le cheat ?", en: "How do I install and launch it?" },
    a: { fr: "Télécharge le loader depuis ton profil (bouton « Télécharger le loader » sur ta licence), lance-le et entre ta clé. Le support t'accompagne sur Discord si besoin.", en: "Download the loader from your profile (\"Download loader\" button on your license), run it and enter your key. Support can help you on Discord if needed." } },
  { q: { fr: "Ma clé fonctionne sur combien de PC ?", en: "How many PCs can I use my key on?" },
    a: { fr: "Une licence est liée à un seul PC (HWID) au premier lancement du loader. Si tu changes de matériel, le support peut réinitialiser ton HWID (réinitialisations limitées, sur validation).", en: "A license is bound to one PC (HWID) on first launch of the loader. If you change hardware, support can reset your HWID (limited resets, subject to approval)." } },
  { q: { fr: "Est-ce que je risque un ban ?", en: "Can I get banned?" },
    a: { fr: "Nos cheats sont mis à jour à chaque patch et le statut de chaque jeu est affiché en temps réel sur la page Statut. Mais aucun cheat n'est sans risque : tu restes responsable de ton compte de jeu, et un ban n'ouvre pas droit à remboursement.", en: "Our cheats are updated every patch and each game's status is shown live on the Status page. But no cheat is risk-free: you remain responsible for your game account, and a ban is not grounds for a refund." } },
  { q: { fr: "Que se passe-t-il quand un jeu est « en mise à jour » ?", en: "What happens when a game is \"updating\"?" },
    a: { fr: "Après un patch du jeu, on met le cheat à jour avant de le rendre de nouveau disponible. Suis l'état en direct sur la page Statut et sur notre Discord.", en: "After a game patch we update the cheat before making it available again. Follow it live on the Status page and on our Discord." } },
  { q: { fr: "Puis-je être remboursé ?", en: "Can I get a refund?" },
    a: { fr: "Les licences sont des produits numériques livrés instantanément. Une fois la clé activée (premier lancement du loader), aucun remboursement n'est possible. Avant activation, une demande peut être étudiée au cas par cas (double paiement, clé non livrée…). Détails dans la politique de remboursement.", en: "Licenses are digital products delivered instantly. Once the key is activated (first loader launch), no refund is possible. Before activation, a request may be reviewed case by case (double charge, key not delivered…). See the refund policy." }, link: "refund" },
  { q: { fr: "Y a-t-il des réductions ?", en: "Are there discounts?" },
    a: { fr: "Oui : −5 % dès 2 licences, −10 % dès 3 et −15 % dès 5 dans le même panier. Les plans longs reviennent aussi bien moins cher par jour, et tu peux saisir un code promo dans le panier.", en: "Yes: −5% from 2 licenses, −10% from 3 and −15% from 5 in the same cart. Longer plans are also much cheaper per day, and you can enter a promo code in the cart." } },
  { q: { fr: "Je n'ai pas reçu ma clé, que faire ?", en: "I didn't receive my key, what should I do?" },
    a: { fr: "Regarde d'abord dans ton profil, onglet « Mes licences » : la clé y apparaît même si l'email est en retard (vérifie aussi tes spams). Sinon, contacte support@404tweaks.tech ou le Discord avec l'email de ton compte.", en: "First check your profile, \"My licenses\" tab: the key shows there even if the email is late (also check spam). Otherwise contact support@404tweaks.tech or Discord with your account email." } },
];

function FaqPage({ lang, go }) {
  const [open, setOpen] = useStateP(0);
  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, "FAQ"]} lang={lang} go={go} />
      <div className="wrap section" style={{ paddingTop: 40, maxWidth: 860 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{lang === "fr" ? "Questions fréquentes" : "Frequently asked questions"}</div>
        <h1 className="h-accent" style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 30 }}>{lang === "fr" ? "Tout ce qu'il faut savoir avant d'acheter" : "Everything to know before buying"}</h1>
        <div className="faq">
          {FAQ.map((f, i) => (
            <div key={i} className={"faq-item" + (open === i ? " on" : "")}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span>{f.q[lang]}</span><Icon.chevron />
              </button>
              <div className="faq-a"><div>
                <p>{f.a[lang]}</p>
                {f.link && <a className="faq-link" onClick={() => go(f.link)}>{lang === "fr" ? "Lire la politique de remboursement →" : "Read the refund policy →"}</a>}
              </div></div>
            </div>
          ))}
        </div>
        <div className="panel faq-cta">
          <div>
            <b>{lang === "fr" ? "Une autre question ?" : "Another question?"}</b>
            <p>{lang === "fr" ? "Le support répond en quelques minutes sur Discord, ou par email à support@404tweaks.tech." : "Support answers within minutes on Discord, or by email at support@404tweaks.tech."}</p>
          </div>
          {shopDiscordUrl()
            ? <Btn kind="primary" icon={<Icon.discord />} onClick={openShopDiscord}>{lang === "fr" ? "Ouvrir un ticket" : "Open a ticket"}</Btn>
            : <Btn kind="primary" onClick={() => go("store")}>{t("browse", lang)}</Btn>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FaqPage, HomePage, ShopPage, ProductPage, StatusPage, ReviewsPage, AuthPage, SuccessPage, VerifyPage, CartPage, CTA, Hero, HeroTitle });
