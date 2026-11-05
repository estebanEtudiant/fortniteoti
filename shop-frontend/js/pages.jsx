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
   HOME — direction « Noir couture » (classes nx-*)
   ================================================================= */
/* emplacements des visuels fournis par le propriétaire.
 * Les getters lisent window.DATA.SETTINGS (alimenté par le backend GET /shop/settings)
 * et retombent sur les chemins locaux si rien n'est configuré côté dashboard. */
function nxSettings() { return (window.DATA && window.DATA.SETTINGS) || {}; }
const NX_MEDIA = {
  get heroPoster() { return nxSettings().heroImage || "assets/hero/poster.jpg"; },
  get feed()       { return nxSettings().heroVideo || "assets/hero/feed.mp4"; },
  demo: {
    get aimbot() { return nxSettings().demoAimbot || "assets/demo/aimbot.mp4"; },
    get esp()    { return nxSettings().demoEsp    || "assets/demo/esp.mp4"; },
    get radar()  { return nxSettings().demoRadar  || "assets/demo/radar.mp4"; },
  },
  game: (id) => "assets/games/" + id + ".jpg",
};

const NX_CHAPTERS = [
  { key: "aimbot", title: "Aimbot", text: { fr: "Lissage, FOV et prédiction réglables, pour viser juste sans viser trop bien.", en: "Adjustable smoothing, FOV and prediction: accurate, never obvious." } },
  { key: "esp", title: "ESP", text: { fr: "Joueurs, squelettes et loot, visibles à travers les murs.", en: "Players, skeletons and loot, visible through walls." } },
  { key: "radar", title: "Radar", text: { fr: "Une carte 2D de chaque ennemi autour de toi.", en: "A 2D map of every enemy around you." } },
];

const NX_STATUS = {
  updated: { fr: "Indétecté", en: "Undetected", cls: "" },
  new: { fr: "Nouveau", en: "New", cls: " is-new" },
  updating: { fr: "Mise à jour", en: "Updating", cls: " is-warn" },
};

function nxReduced() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function nxFinePointer() { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; }
function nxGames() { return (DATA.GAMES || []).filter((g) => g.id !== "spoofer"); }
function nxGo(go, route) { return (e) => { e.preventDefault(); go(route); }; }

function useNxReveal(ref) {
  useEffectP(() => {
    const root = ref.current;
    if (!root || nxReduced()) return;
    root.classList.add("nx-anim");
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -10% 0px" });
    root.querySelectorAll("[data-nx-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function NxCta({ href, onClick, children }) {
  const ref = React.useRef(null);
  useEffectP(() => {
    const el = ref.current;
    if (!el || nxReduced() || !nxFinePointer()) return;
    let raf = 0, x = 0, y = 0, tx = 0, ty = 0;
    const loop = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      el.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px)";
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width / 2) * 0.12;
      ty = (e.clientY - r.top - r.height / 2) * 0.2;
      kick();
    };
    const leave = () => { tx = 0; ty = 0; kick(); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, []);
  return <span className="nx-magnet" ref={ref}><a className="nx-btn" href={href} onClick={onClick}>{children}</a></span>;
}

function NxHero({ lang, go }) {
  const fr = lang === "fr";
  const games = nxGames();
  const list = games.length ? new Intl.ListFormat(fr ? "fr" : "en", { type: "conjunction" }).format(games.map((g) => g.name)) : "";
  const live = games.filter((g) => g.status !== "updating").length;
  const discord = shopDiscordUrl();
  const line2 = fr ? "Sans être vu." : "Unseen.";
  const heroRef = React.useRef(null);
  const litRef = React.useRef(null);
  const lit1Ref = React.useRef(null);
  useEffectP(() => {
    const sec = heroRef.current, lit = litRef.current, lit1 = lit1Ref.current;
    if (!sec || !lit || !nxFinePointer()) return;
    let raf = 0, ev = null;
    const apply = () => {
      raf = 0;
      const r = lit.getBoundingClientRect();
      lit.style.setProperty("--mx", (ev.clientX - r.left).toFixed(0) + "px");
      lit.style.setProperty("--my", (ev.clientY - r.top).toFixed(0) + "px");
      // reflet sur « Domine. » : suit la souris horizontalement
      if (lit1) lit1.style.setProperty("--sx", (ev.clientX - lit1.getBoundingClientRect().left).toFixed(0) + "px");
    };
    const move = (e) => { ev = e; lit.classList.add("is-lit"); if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => lit.classList.remove("is-lit");
    sec.addEventListener("pointermove", move);
    sec.addEventListener("pointerleave", leave);
    return () => { sec.removeEventListener("pointermove", move); sec.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, []);
  return (
    <section ref={heroRef} className="nx-hero" aria-labelledby="nx-hero-title">
      <div className="nx-hero-stage" data-nx-reveal aria-hidden="true">
        {nxReduced()
          ? <MediaSlot src={NX_MEDIA.heroPoster} priority />
          : <MediaSlot src={NX_MEDIA.feed} type="video" autoPlayInView />}
      </div>
      <div className="nx-beams" data-nx-reveal aria-hidden="true">
        <i className="nx-beam nx-beam--a" /><i className="nx-beam nx-beam--b" /><i className="nx-pool" />
      </div>
      <div className="nx-wrap nx-hero-grid">
        <div className="nx-hero-copy">
          <h1 id="nx-hero-title" className="nx-display nx-mask" data-nx-reveal>
            <span className="nx-line"><span className="nx-lit1" ref={lit1Ref}>{fr ? "Domine." : "Dominate."}</span></span>
            <span className="nx-line"><span className="nx-lit" ref={litRef} data-text={line2}>{line2}</span></span>
          </h1>
          <p className="nx-lede nx-fade" data-nx-reveal style={{ "--d": 3 }}>
            {fr
              ? <>Des cheats pour {list}. Ta clé arrive en 30 secondes, et chaque cheat revient en ligne sous 24 h après un patch.</>
              : <>Cheats for {list}. Your key lands in 30 seconds, and every cheat is back online within 24 hours of a patch.</>}
          </p>
          <div className="nx-actions nx-fade" data-nx-reveal style={{ "--d": 4 }}>
            <NxCta href="#store" onClick={nxGo(go, "store")}>{fr ? "Voir la boutique" : "Browse the store"}</NxCta>
            {discord && <a className="nx-link" href={discord} target="_blank" rel="noopener noreferrer">{fr ? "Rejoindre le Discord" : "Join the Discord"}</a>}
          </div>
          {games.length > 0 && (
            <a className={"nx-status nx-fade" + (live < games.length ? " is-warn" : "")} href="#status" onClick={nxGo(go, "status")} data-nx-reveal style={{ "--d": 5 }}>
              <span className="nx-dot" aria-hidden="true" />
              <span>{fr ? `${live} cheats sur ${games.length} indétectés` : `${live} of ${games.length} cheats undetected`}</span>
              <span className="nx-status-more">{fr ? "Voir le statut" : "View status"}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

const NX_GROW = 0.22;
function NxShowcase({ lang }) {
  const fr = lang === "fr";
  const ref = React.useRef(null);
  const maskRef = React.useRef(null);
  const introRef = React.useRef(null);
  const segs = React.useRef([]);
  const vids = React.useRef([]);
  const [pinned, setPinned] = useStateP(false);
  const [active, setActive] = useStateP(-1);
  const layers = [{ key: "feed", src: NX_MEDIA.feed }].concat(NX_CHAPTERS.map((c) => ({ key: c.key, src: NX_MEDIA.demo[c.key] })));

  useEffectP(() => {
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffectP(() => {
    if (!pinned) return;
    let raf = 0, last = -2;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el || !maskRef.current) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
      const g = Math.min(1, p / NX_GROW);
      const e = g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2;
      const v = 1 - e;
      maskRef.current.style.clipPath = "inset(" + (v * 15).toFixed(2) + "% " + (v * 30).toFixed(2) + "% " + (v * 15).toFixed(2) + "% " + (v * 30).toFixed(2) + "%)";
      introRef.current.style.opacity = String(Math.max(0, 1 - g * 1.6));
      introRef.current.style.transform = "translateY(" + (-g * 40).toFixed(1) + "px)";
      const cp = Math.max(0, (p - NX_GROW) / (1 - NX_GROW)) * NX_CHAPTERS.length;
      segs.current.forEach((s, i) => { if (s) s.style.transform = "scaleX(" + Math.min(1, Math.max(0, cp - i)).toFixed(3) + ")"; });
      const idx = p < NX_GROW ? -1 : Math.min(NX_CHAPTERS.length - 1, Math.floor(cp));
      if (idx !== last) { last = idx; setActive(idx); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [pinned]);

  // en mode épinglé, seule la couche visible joue, et seulement quand la section est à l'écran
  useEffectP(() => {
    const el = ref.current;
    if (!pinned || !el) return;
    const io = new IntersectionObserver(([en]) => {
      vids.current.forEach((v, i) => {
        if (!v) return;
        if (en.isIntersecting && i === active + 1) v.play().catch(() => {});
        else v.pause();
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, [pinned, active]);

  return (
    <section ref={ref} className={"nx-show" + (pinned ? " is-pinned" : "")} aria-labelledby="nx-show-title">
      <div className="nx-show-stage">
        {pinned && (
          <div className="nx-show-mask" ref={maskRef}>
            {layers.map((l, i) => (
              <div key={l.key} className={"nx-show-layer" + (i === active + 1 ? " is-on" : "")}>
                <MediaSlot type="video" src={l.src} videoRef={(v) => { vids.current[i] = v; }} label={fr ? "Démo en jeu" : "In-game demo"} />
              </div>
            ))}
            <div className="nx-show-scrim" aria-hidden="true" />
          </div>
        )}
        <h2 id="nx-show-title" ref={introRef} className="nx-show-intro">
          {fr ? <>Le cheat,<br /><em>en jeu.</em></> : <>See it<br /><em>in game.</em></>}
        </h2>
        <div className="nx-show-caps">
          {NX_CHAPTERS.map((c, i) => (
            <article key={c.key} className={"nx-chap" + (active === i ? " is-on" : "")}>
              {!pinned && <MediaSlot type="video" src={NX_MEDIA.demo[c.key]} className="nx-chap-media" autoPlayInView label={c.title} />}
              <h3 className="nx-chap-title">{c.title}</h3>
              <p className="nx-chap-text">{c.text[lang] || c.text.en}</p>
            </article>
          ))}
        </div>
        {pinned && (
          <div className="nx-show-prog" aria-hidden="true">
            {NX_CHAPTERS.map((c, i) => <span key={c.key} className="nx-seg"><i ref={(s) => { segs.current[i] = s; }} /></span>)}
          </div>
        )}
      </div>
    </section>
  );
}

function NxGameRow({ game, lang, go, onHover }) {
  const fr = lang === "fr";
  const inventory = useSpooferStock(game.id === "spoofer");
  const offers = game.id === "spoofer" ? inventory.plans : DATA.PLANS;
  const cheapest = offers.reduce((a, p) => (!a || p.price < a.price ? p : a), null);
  const st = NX_STATUS[game.status] || NX_STATUS.updated;
  return (
    <li>
      <a className="nx-grow" href={"#game/" + game.id} onClick={nxGo(go, "game/" + game.id)} onPointerEnter={onHover} onFocus={onHover}>
        <span className="nx-g-thumb"><MediaSlot src={game.image || NX_MEDIA.game(game.id)} /></span>
        <span className="nx-g-name">{game.name}</span>
        <span className="nx-g-genre">{game.chip}</span>
        <span className={"nx-g-status" + st.cls}><span className="nx-dot" aria-hidden="true" />{st[lang] || st.en}</span>
        <span className="nx-g-price">
          {cheapest ? <>{fr ? "dès " : "from "}<b>{cheapest.price.toFixed(2)} €</b></> : (fr ? "Indisponible" : "Unavailable")}
        </span>
      </a>
    </li>
  );
}

function NxGames({ lang, go }) {
  const fr = lang === "fr";
  const games = DATA.GAMES || [];
  const [hover, setHover] = useStateP(null);
  const secRef = React.useRef(null);
  const floatRef = React.useRef(null);

  useEffectP(() => {
    const sec = secRef.current, fl = floatRef.current;
    if (!sec || !fl || !nxFinePointer()) return;
    const ease = nxReduced() ? 1 : 0.14;
    let raf = 0, x = 0, y = 0, tx = 0, ty = 0, placed = false;
    const loop = () => {
      x += (tx - x) * ease; y += (ty - y) * ease;
      fl.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(loop) : 0;
    };
    const move = (e) => {
      const w = fl.offsetWidth, h = fl.offsetHeight;
      const name = e.target.closest && e.target.closest(".nx-grow") && e.target.closest(".nx-grow").querySelector(".nx-g-name");
      tx = Math.max(e.clientX + 32, name ? name.getBoundingClientRect().right + 40 : 0);
      if (tx + w > window.innerWidth - 16) tx = window.innerWidth - w - 16;
      ty = Math.min(window.innerHeight - h - 16, Math.max(16, e.clientY - h / 2));
      if (!placed) { x = tx; y = ty; placed = true; }
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const leave = () => { placed = false; };
    sec.addEventListener("pointermove", move);
    sec.addEventListener("pointerleave", leave);
    return () => { sec.removeEventListener("pointermove", move); sec.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section ref={secRef} className={"nx-games" + (hover ? " is-hovering" : "")} aria-labelledby="nx-games-title">
      <div className="nx-wrap">
        <div className="nx-sec-head">
          <h2 id="nx-games-title" className="nx-h2 nx-mask" data-nx-reveal>
            <span className="nx-line"><span>{fr ? "Choisis ton terrain." : "Pick your ground."}</span></span>
          </h2>
          <a className="nx-link" href="#store" onClick={nxGo(go, "store")}>{fr ? "Toute la boutique" : "Full store"}</a>
        </div>
        <ul className="nx-glist" onPointerLeave={() => setHover(null)}>
          {games.map((g) => <NxGameRow key={g.id} game={g} lang={lang} go={go} onHover={() => setHover(g.id)} />)}
        </ul>
      </div>
      <div className="nx-gfloat" ref={floatRef} aria-hidden="true">
        {games.map((g) => (
          <div key={g.id} className={"nx-gfloat-img" + (hover === g.id ? " is-on" : "")}>
            {hover === g.id && <MediaSlot src={g.image || NX_MEDIA.game(g.id)} priority />}
          </div>
        ))}
      </div>
    </section>
  );
}

function NxSteps({ lang }) {
  const fr = lang === "fr";
  const steps = fr ? [
    ["Choisis ton jeu et ta durée", "Prends la durée qui colle à ton rythme. Remise dès 2 licences : −5 %, puis −10 % à partir de 3 et −15 % à partir de 5."],
    ["Paie en toute sécurité", "Carte, Apple Pay, Google Pay, Klarna ou crypto."],
    ["Reçois ta clé et joue", "Ta clé arrive en 30 secondes environ, dans ton profil et par e-mail. Lance le loader et rejoins ta partie."],
  ] : [
    ["Pick your game and duration", "Take the length that fits how you play. Bulk discount from 2 licenses: −5%, then −10% from 3 and −15% from 5."],
    ["Pay securely", "Card, Apple Pay, Google Pay, Klarna or crypto."],
    ["Get your key and play", "Your key lands in about 30 seconds, in your profile and by email. Start the loader and join your match."],
  ];
  return (
    <section className="nx-steps" aria-labelledby="nx-steps-title">
      <div className="nx-wrap">
        <h2 id="nx-steps-title" className="nx-h2 nx-mask" data-nx-reveal>
          <span className="nx-line"><span>{fr ? "De l'achat au lobby, en trois étapes." : "From checkout to lobby, in three steps."}</span></span>
        </h2>
        <ol className="nx-steps-list">
          {steps.map(([title, body], i) => (
            <li key={i} className="nx-step" data-nx-reveal style={{ "--d": i }}>
              <span className="nx-step-n" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="nx-steps-note">
          <p>{fr ? "Un patch vient de sortir ? Ton cheat revient en ligne sous 24 h." : "A patch just dropped? Your cheat is back online within 24 hours."}</p>
          <p>{fr ? "Bloqué à l'installation ? Le support répond sur Discord, en général en moins de 5 minutes." : "Stuck installing? Support answers on Discord, usually within 5 minutes."}</p>
        </div>
      </div>
    </section>
  );
}

function NxReviews({ lang, go }) {
  const fr = lang === "fr";
  const list = (DATA.REVIEWS || []).slice(0, 3);
  const sum = reviewSummary();
  if (!list.length || !sum) return null;
  const players = fr ? (sum.count > 1 ? "joueurs" : "joueur") : (sum.count > 1 ? "players" : "player");
  return (
    <section className="nx-revs" aria-labelledby="nx-revs-title">
      <div className="nx-wrap">
        <div className="nx-sec-head">
          <h2 id="nx-revs-title" className="nx-h2 nx-mask" data-nx-reveal>
            <span className="nx-line"><span>{fr ? `${sum.avg.toFixed(1)} sur 5, selon ${sum.count} ${players}.` : `${sum.avg.toFixed(1)} out of 5, from ${sum.count} ${players}.`}</span></span>
          </h2>
          <a className="nx-link" href="#reviews" onClick={nxGo(go, "reviews")}>{fr ? "Tous les avis" : "All reviews"}</a>
        </div>
        <ul className="nx-rev-list">
          {list.map((r, i) => (
            <li key={i}>
              <blockquote><p>« {r[lang] || r.en} »</p></blockquote>
              <p className="nx-rev-by">{r.name}{r.game ? ", " + r.game : ""}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function NxFaq({ lang, go }) {
  const fr = lang === "fr";
  const items = [4, 5, 1, 2, 6].map((i) => FAQ[i]).filter(Boolean);
  const [open, setOpen] = useStateP(0);
  return (
    <section className="nx-faq" aria-labelledby="nx-faq-title">
      <div className="nx-wrap nx-faq-grid">
        <div className="nx-faq-side">
          <h2 id="nx-faq-title" className="nx-h2 nx-mask" data-nx-reveal>
            <span className="nx-line"><span>{fr ? "Avant d'acheter." : "Before you buy."}</span></span>
          </h2>
          <p className="nx-faq-sub">{fr ? "Les questions qu'on nous pose le plus. Le reste est dans la FAQ complète." : "The questions we get most. The rest is in the full FAQ."}</p>
          <a className="nx-link" href="#faq" onClick={nxGo(go, "faq")}>{fr ? "Lire toute la FAQ" : "Read the full FAQ"}</a>
        </div>
        <div className="nx-acc">
          {items.map((f, i) => {
            const on = open === i;
            const id = "nx-faq-" + i;
            return (
              <div key={i} className={"nx-acc-item" + (on ? " is-open" : "")}>
                <h3>
                  <button type="button" className="nx-acc-q" aria-expanded={on} aria-controls={id} onClick={() => setOpen(on ? -1 : i)}>
                    <span>{f.q[lang] || f.q.en}</span>
                    <span className="nx-acc-ic" aria-hidden="true" />
                  </button>
                </h3>
                <div id={id} className="nx-acc-a" role="region" inert={on ? undefined : ""}>
                  <div>
                    <p>{f.a[lang] || f.a.en}</p>
                    {f.link && <a className="nx-link" href={"#" + f.link} onClick={nxGo(go, f.link)}>{fr ? "Lire la politique de remboursement" : "Read the refund policy"}</a>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function NxFinal({ lang, go }) {
  const fr = lang === "fr";
  const discord = shopDiscordUrl();
  return (
    <section className="nx-final" aria-labelledby="nx-final-title">
      <div className="nx-beams nx-beams--final" data-nx-reveal aria-hidden="true">
        <i className="nx-beam nx-beam--c" /><i className="nx-pool nx-pool--final" />
      </div>
      <div className="nx-wrap">
        <h2 id="nx-final-title" className="nx-final-title nx-mask" data-nx-reveal>
          <span className="nx-line"><span>{fr ? "Ton lobby" : "Your lobby"}</span></span>
          <span className="nx-line"><span><em>{fr ? "t'attend." : "is waiting."}</em></span></span>
        </h2>
        <div className="nx-actions">
          <NxCta href="#store" onClick={nxGo(go, "store")}>{fr ? "Voir la boutique" : "Browse the store"}</NxCta>
        </div>
        {discord && (
          <p className="nx-final-sub">
            {fr ? "Une question avant ? " : "A question first? "}
            <a className="nx-link" href={discord} target="_blank" rel="noopener noreferrer">{fr ? "Rejoindre le Discord" : "Join the Discord"}</a>
          </p>
        )}
      </div>
    </section>
  );
}

function HomePage({ lang, go }) {
  const ref = React.useRef(null);
  const torchRef = React.useRef(null);
  useNxReveal(ref);
  useNxTorch(torchRef);
  useEffectP(() => {
    document.body.dataset.page = "home";
    return () => { delete document.body.dataset.page; };
  }, []);
  return (
    <div className="nx-home" ref={ref}>
      <div className="nx-torch" ref={torchRef} aria-hidden="true" />
      <NxHero lang={lang} go={go} />
      <NxShowcase lang={lang} />
      <NxGames lang={lang} go={go} />
      <NxSteps lang={lang} />
      <NxReviews lang={lang} go={go} />
      <NxFaq lang={lang} go={go} />
      <NxFinal lang={lang} go={go} />
    </div>
  );
}

/* projecteur qui se pose sur l'onglet actif ([aria-pressed="true"]) */
function useNxTabLight(tabsRef, lightRef, deps) {
  useEffectP(() => {
    const place = () => {
      const L = lightRef.current, el = tabsRef.current && tabsRef.current.querySelector('[aria-pressed="true"]');
      if (L && el) L.style.transform = "translateX(" + el.offsetLeft + "px) scaleX(" + el.offsetWidth / 100 + ")";
    };
    place();
    if (document.fonts) document.fonts.ready.then(place);
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, deps);
}

/* lumière douce qui suit la souris (souris uniquement, mouvement autorisé) */
function useNxTorch(torchRef) {
  useEffectP(() => {
    const el = torchRef.current;
    if (!el || nxReduced() || !nxFinePointer()) return;
    let raf = 0, x = 0, y = 0, tx = 0, ty = 0, placed = false;
    const loop = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      const h = el.offsetWidth / 2;
      el.style.transform = "translate3d(" + (x - h).toFixed(1) + "px," + (y - h).toFixed(1) + "px,0)";
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(loop) : 0;
    };
    const move = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!placed) { x = tx; y = ty; placed = true; el.classList.add("is-on"); }
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const out = (e) => { if (!e.relatedTarget) { el.classList.remove("is-on"); placed = false; } };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", out);
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerout", out); cancelAnimationFrame(raf); };
  }, []);
}

/* =================================================================
   SHOP
   ================================================================= */
function NxStoreCard({ game, lang, go, i }) {
  const fr = lang === "fr";
  const isSpoofer = game.id === "spoofer";
  const inventory = useSpooferStock(isSpoofer);
  const offers = isSpoofer ? inventory.plans : DATA.PLANS;
  const cheapest = offers.reduce((a, p) => (!a || p.price < a.price ? p : a), null);
  const remaining = isSpoofer ? offers.reduce((n, o) => n + o.stock, 0) : undefined;
  const st = NX_STATUS[game.status] || NX_STATUS.updated;
  const stock = isSpoofer ? (inventory.ready ? stockLabel(remaining, lang) : (fr ? "Vérification du stock…" : "Checking stock…")) : null;
  return (
    <li className="nx-card" style={{ "--i": i }}>
      <a href={"#game/" + game.id} onClick={nxGo(go, "game/" + game.id)}>
        <span className="nx-card-media"><MediaSlot src={game.image || NX_MEDIA.game(game.id)} /></span>
        <span className={"nx-card-status" + st.cls}><span className="nx-dot" aria-hidden="true" />{st[lang] || st.en}</span>
        <span className="nx-card-body">
          <span className="nx-card-name">{game.name}</span>
          <span className="nx-card-genre">{game.chip}</span>
          <span className="nx-card-price">
            {cheapest
              ? <>{fr ? "dès " : "from "}<b>{cheapest.price.toFixed(2)} €</b> <small>{planShortLabel(cheapest, lang)}</small></>
              : (fr ? "Indisponible" : "Unavailable")}
          </span>
          {stock && <span className={"nx-card-stock" + (remaining === 0 ? " is-out" : "")}>{stock}</span>}
        </span>
      </a>
    </li>
  );
}

function ShopPage({ lang, go }) {
  const fr = lang === "fr";
  const ref = React.useRef(null);
  const torchRef = React.useRef(null);
  const tabsRef = React.useRef(null);
  const lightRef = React.useRef(null);
  useNxReveal(ref);
  useNxTorch(torchRef);
  useEffectP(() => {
    document.body.dataset.page = "store";
    return () => { delete document.body.dataset.page; };
  }, []);

  const games = DATA.GAMES || [];
  const [filter, setFilter] = useStateP("all");
  const cats = ["all", ...new Set(games.map((g) => g.chip))];
  const list = filter === "all" ? games : games.filter((g) => g.chip === filter);
  const live = games.filter((g) => g.status !== "updating").length;

  useNxTabLight(tabsRef, lightRef, [filter, lang]);

  return (
    <div className="nx-home nx-store" ref={ref}>
      <div className="nx-torch" ref={torchRef} aria-hidden="true" />

      <section className="nx-store-head" aria-labelledby="nx-store-title">
        <div className="nx-beams" data-nx-reveal aria-hidden="true">
          <i className="nx-beam nx-beam--a" /><i className="nx-pool" />
        </div>
        <div className="nx-wrap">
          <nav className="nx-crumbs" aria-label={fr ? "Fil d'Ariane" : "Breadcrumb"}>
            <a href="#home" onClick={nxGo(go, "home")}>{t("home", lang)}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{navLabel("store", lang)}</span>
          </nav>
          <h1 id="nx-store-title" className="nx-store-title nx-mask" data-nx-reveal>
            <span className="nx-line"><span>{fr ? "La boutique." : "The store."}</span></span>
          </h1>
          <div className="nx-store-meta nx-fade" data-nx-reveal style={{ "--d": 2 }}>
            {games.length > 0 && (
              <a className={"nx-status" + (live < games.length ? " is-warn" : "")} href="#status" onClick={nxGo(go, "status")}>
                <span className="nx-dot" aria-hidden="true" />
                <span>{fr ? `${live} cheats sur ${games.length} indétectés` : `${live} of ${games.length} cheats undetected`}</span>
                <span className="nx-status-more">{fr ? "Voir le statut" : "View status"}</span>
              </a>
            )}
            <p className="nx-store-support"><b>{t("support247", lang)}.</b> {t("supportBody", lang)}</p>
          </div>
        </div>
      </section>

      <section className="nx-store-list" aria-labelledby="nx-store-all">
        <div className="nx-wrap">
          <h2 id="nx-store-all" className="nx-sr">{t("allProducts", lang)}</h2>
          <div className="nx-tabs" ref={tabsRef} role="group" aria-label={fr ? "Filtrer par genre" : "Filter by genre"}>
            {cats.map((c) => (
              <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}>
                {c === "all" ? t("all", lang) : c}
                <span className="nx-tabs-n">{c === "all" ? games.length : games.filter((g) => g.chip === c).length}</span>
              </button>
            ))}
            <span className="nx-tabs-light" ref={lightRef} aria-hidden="true" />
          </div>
          <ul className="nx-cards" key={filter}>
            {list.map((g, i) => <NxStoreCard key={g.id} game={g} lang={lang} go={go} i={i} />)}
          </ul>
        </div>
      </section>

      <section className="nx-store-pop" aria-labelledby="nx-store-pop-title">
        <div className="nx-wrap">
          <div className="nx-sec-head">
            <h2 id="nx-store-pop-title" className="nx-h2 nx-mask" data-nx-reveal>
              <span className="nx-line"><span>{t("popular", lang)}</span></span>
            </h2>
          </div>
          <ul className="nx-glist">
            {games.slice(0, 4).map((g) => <NxGameRow key={g.id} game={g} lang={lang} go={go} />)}
          </ul>
        </div>
      </section>
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
  const fr = lang === "fr";
  const game = DATA.GAMES.find(g => g.id === id) || DATA.GAMES[0];
  const [sel, setSel] = useStateP("1m");
  const [qty, setQty] = useStateP(1);
  const ref = React.useRef(null);
  useNxReveal(ref);
  useEffectP(() => {
    document.body.dataset.page = "store";
    return () => { delete document.body.dataset.page; };
  }, []);
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
  const st = NX_STATUS[game.status] || NX_STATUS.updated;
  const maxQty = Math.min(selPlan?.stock ?? 50, 50);
  const meta = [
    game.tipsCount > 0 && game.tipsCount + " " + t("perGame", lang),
    sections.length > 0 && sections.length + " " + (fr ? (sections.length > 1 ? "catégories" : "catégorie") : (sections.length > 1 ? "categories" : "category")),
    game.members > 0 && game.members + " " + (fr ? (game.members > 1 ? "clients" : "client") : (game.members > 1 ? "customers" : "customer")),
  ].filter(Boolean);
  const addLabel = unavailable ? (fr ? "Stock indisponible pour cette quantité" : "Insufficient stock") : (fr ? "Ajouter au panier" : "Add to cart");

  return (
    <div className="nx-home nx-store nx-prod" ref={ref}>
      <section className="nx-store-head nx-prod-head" aria-labelledby="nx-prod-title">
        <div className="nx-beams" data-nx-reveal aria-hidden="true">
          <i className="nx-beam nx-beam--a" /><i className="nx-pool" />
        </div>
        <div className="nx-wrap">
          <nav className="nx-crumbs" aria-label={fr ? "Fil d'Ariane" : "Breadcrumb"}>
            <a href="#home" onClick={nxGo(go, "home")}>{t("home", lang)}</a>
            <span aria-hidden="true">/</span>
            <a href="#store" onClick={nxGo(go, "store")}>{navLabel("store", lang)}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{game.name}</span>
          </nav>
          <h1 id="nx-prod-title" className="nx-store-title nx-mask" data-nx-reveal>
            <span className="nx-line"><span>{game.name}</span></span>
          </h1>
          <div className="nx-prod-meta nx-fade" data-nx-reveal style={{ "--d": 2 }}>
            <a className={"nx-prod-state" + st.cls} href="#status" onClick={nxGo(go, "status")}><span className="nx-dot" aria-hidden="true" />{st[lang] || st.en}</a>
            {game.tagline && <p className="nx-prod-tag">{game.tagline[lang] || game.tagline.en}</p>}
            {meta.length > 0 && <p className="nx-prod-facts">{meta.join(" · ")}</p>}
          </div>
        </div>
      </section>

      <section className="nx-prod-main">
        <div className="nx-wrap nx-prod-grid">
          <div className="nx-prod-media nx-fade" data-nx-reveal style={{ "--d": 3 }}>
            {galleryImgs.length
              ? <Gallery images={galleryImgs} name={game.name} logo={game.logo} lang={lang} />
              : <div className="nx-prod-poster"><MediaSlot src={NX_MEDIA.game(game.id)} alt={game.name} priority /></div>}
          </div>

          <div className="nx-buy nx-fade" data-nx-reveal style={{ "--d": 4 }}>
            <h2 className="nx-buy-h" id="nx-plans-h">{t("choosePlan", lang)}</h2>
            <div className="nx-plans" role="radiogroup" aria-labelledby="nx-plans-h">
              {plans.map(p => {
                const v = planValue(p);
                const on = selPlan?.id === p.id;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={on} disabled={p.stock === 0}
                    className={"nx-plan" + (on ? " is-on" : "")} onClick={() => setSel(p.id)}>
                    <span className="nx-plan-radio" aria-hidden="true" />
                    <span className="nx-plan-info">
                      <span className="nx-plan-name">{p.name[lang]}{p.featured && <em>{fr ? "Recommandé" : "Recommended"}</em>}</span>
                      <span className="nx-plan-per">{p.per[lang]}{v && planDays(p) > 1 ? " · " + v.perDay.toFixed(2) + " " + currencyLabel + (fr ? " / jour" : " / day") : ""}</span>
                      <span className={"nx-plan-stock" + (p.stock === 0 ? " is-out" : "")} aria-live="polite">{game.id === 'spoofer' && !inventory.ready ? (fr ? 'Vérification du stock…' : 'Checking stock…') : stockLabel(p.stock, lang)}</span>
                    </span>
                    <span className="nx-plan-right">
                      {v && v.save >= 5 && <span className="nx-plan-save">−{v.save} %</span>}
                      {!planDays(p) && /^life/i.test(p.id) && <span className="nx-plan-save">{fr ? "Payé une fois" : "Pay once"}</span>}
                      <span className="nx-plan-price">{p.price.toFixed(2)} {currencyLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selPlan?.perks[lang] && selPlan.perks[lang].length > 0 && (
              <ul className="nx-perks">
                {selPlan.perks[lang].map((perk, i) => <li key={i}><Icon.check aria-hidden="true" />{perk}</li>)}
              </ul>
            )}

            <div className="nx-buy-row">
              <div className="nx-qty">
                <span id="nx-qty-l">{fr ? "Quantité" : "Quantity"}</span>
                <div className="nx-stepper">
                  <button type="button" aria-label={fr ? "Une de moins" : "One less"} disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <input aria-labelledby="nx-qty-l" type="number" min="1" max={Math.max(1, maxQty)} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(selPlan?.stock ?? 50, 50, parseInt(e.target.value) || 1)))} />
                  <button type="button" aria-label={fr ? "Une de plus" : "One more"} disabled={qty >= maxQty} onClick={() => setQty(q => Math.min(selPlan?.stock ?? 50, 50, q + 1))}>+</button>
                </div>
              </div>
              {selPlan && (
                <div className="nx-total">
                  <span>Total</span>
                  <b>{(selPlan.price * qty).toFixed(2)} {currencyLabel}</b>
                </div>
              )}
            </div>

            <span className="nx-magnet nx-buy-cta">
              <button type="button" className="nx-btn" disabled={unavailable} onClick={() => !unavailable && onAdd(game, selPlan, qty)}>{addLabel}</button>
            </span>
            {inventory.error && game.id === 'spoofer' && <p className="nx-buy-err" role="alert">{fr ? 'Stock temporairement indisponible. Réessaie dans quelques instants.' : 'Stock temporarily unavailable. Please try again shortly.'}</p>}
            <div className="nx-buy-links">
              <a className="nx-link" href="#cart" onClick={nxGo(go, "cart")}>{fr ? "Voir le panier" : "View cart"}</a>
              <span>{fr ? "Remise dès 2 licences : −5 %, −10 % dès 3, −15 % dès 5" : "Bulk discount: −5% from 2, −10% from 3, −15% from 5"}</span>
            </div>
            <ul className="nx-trust">
              <li><Icon.bolt aria-hidden="true" />{fr ? "Clé livrée instantanément (profil + email)" : "Instant key delivery (profile + email)"}</li>
              <li><Icon.lock aria-hidden="true" />{fr ? "Paiement sécurisé : carte, Apple Pay, Google Pay, Klarna…" : "Secure checkout: card, Apple Pay, Google Pay, Klarna…"}</li>
              <li><Icon.headset aria-hidden="true" /><span>{fr ? "Support 24/7 pour l'installation. " : "24/7 install support. "}<a className="nx-link" href="#faq" onClick={nxGo(go, "faq")}>{fr ? "Voir la FAQ" : "Read the FAQ"}</a></span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* barre d'achat collante (mobile) — rendue dans <body> pour rester fixée à l'écran */}
      {selPlan && ReactDOM.createPortal(<div className="sticky-buy nx-sticky-buy">
        <div className="sb-info">
          <b>{game.name} · {selPlan.name[lang]}</b>
          <span>{(selPlan.price * qty).toFixed(2)} {currencyLabel}{qty > 1 ? " (×" + qty + ")" : ""}</span>
        </div>
        <button type="button" className="nx-btn" disabled={unavailable} onClick={() => !unavailable && onAdd(game, selPlan, qty)}>{unavailable ? (fr ? 'Indisponible' : 'Unavailable') : (fr ? "Ajouter" : "Add")}</button>
      </div>, document.body)}

      <section className="nx-prod-inc" aria-labelledby="nx-inc-title">
        <div className="nx-wrap">
          <h2 id="nx-inc-title" className="nx-h2 nx-mask" data-nx-reveal>
            <span className="nx-line"><span>{fr ? "Ce qui est inclus." : "What's inside."}</span></span>
          </h2>
          <div className="nx-inc-grid">
            {sections.map((sec, si) => {
              const items = (sec.items && (sec.items[lang] || sec.items.fr || sec.items.en)) || [];
              const title = (sec.title && (sec.title[lang] || sec.title.fr || sec.title.en)) || t("whatsIncluded", lang);
              return (
                <div key={si} className="nx-inc-sec">
                  <h3>{title}</h3>
                  <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                </div>
              );
            })}
          </div>
          <GameLicenseSection gameId={game.id} gameName={game.name} lang={lang} />
        </div>
      </section>

      {gameReviews.length > 0 && (
        <section className="nx-revs" aria-labelledby="nx-prod-revs">
          <div className="nx-wrap">
            <div className="nx-sec-head">
              <h2 id="nx-prod-revs" className="nx-h2 nx-mask" data-nx-reveal>
                <span className="nx-line"><span>{t("verifiedReviews", lang)}</span></span>
              </h2>
            </div>
            <ul className="nx-rev-list">
              {gameReviews.map((r, i) => (
                <li key={i}>
                  <blockquote>
                    <p>{r[lang] || r.en}</p>
                    <footer className="nx-rev-by">{r.name}{r.r ? ", " + r.r + "/5" : ""}</footer>
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
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
  const fr = lang === "fr";
  const ref = React.useRef(null);
  const tabsRef = React.useRef(null);
  const lightRef = React.useRef(null);
  useNxReveal(ref);
  useEffectP(() => {
    document.body.dataset.page = "store";
    return () => { delete document.body.dataset.page; };
  }, []);
  const games = DATA.GAMES || [];
  const [filter, setFilter] = useStateP("all");
  const list = filter === "all" ? games : games.filter((g) => g.id === filter);
  useNxTabLight(tabsRef, lightRef, [filter, lang]);
  const count = (k) => games.filter((g) => (NX_STATUS[g.status] ? g.status : "updated") === k).length;
  const live = games.filter((g) => g.status !== "updating").length;
  return (
    <div className="nx-home nx-store" ref={ref}>
      <section className="nx-store-head" aria-labelledby="nx-status-title">
        <div className="nx-beams" data-nx-reveal aria-hidden="true">
          <i className="nx-beam nx-beam--a" /><i className="nx-pool" />
        </div>
        <div className="nx-wrap">
          <nav className="nx-crumbs" aria-label={fr ? "Fil d'Ariane" : "Breadcrumb"}>
            <a href="#home" onClick={nxGo(go, "home")}>{t("home", lang)}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{navLabel("status", lang)}</span>
          </nav>
          <h1 id="nx-status-title" className="nx-store-title nx-mask" data-nx-reveal>
            <span className="nx-line"><span>{fr ? "Statut." : "Status."}</span></span>
          </h1>
          <div className="nx-store-meta nx-fade" data-nx-reveal style={{ "--d": 2 }}>
            <p className="nx-status-sum">
              {fr ? <><b>{live} sur {games.length}</b> cheats utilisables en ce moment.</> : <><b>{live} of {games.length}</b> cheats usable right now.</>}
            </p>
            <ul className="nx-legend" aria-label={fr ? "Légende" : "Legend"}>
              {["updated", "updating", "new"].map((k) => (
                <li key={k} className={NX_STATUS[k].cls.trim()}><span className="nx-dot" aria-hidden="true" />{NX_STATUS[k][lang] || NX_STATUS[k].en}<b>{count(k)}</b></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="nx-store-list" aria-label={t("statusTitle", lang)}>
        <div className="nx-wrap">
          <div className="nx-tabs" ref={tabsRef} role="group" aria-label={fr ? "Filtrer par jeu" : "Filter by game"}>
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("all", lang)}</button>
            {games.map((g) => <button key={g.id} type="button" aria-pressed={filter === g.id} onClick={() => setFilter(g.id)}>{g.name}</button>)}
            <span className="nx-tabs-light" ref={lightRef} aria-hidden="true" />
          </div>
          <ul className="nx-srows" key={filter}>
            {list.map((g, i) => {
              const st = NX_STATUS[g.status] || NX_STATUS.updated;
              // « depuis » n'a de sens que pour un cheat indétecté ; « Release » = depuis la sortie
              const raw = g.status === "updated" && g.since ? (g.since[lang] || g.since.en) : "";
              const since = /^release$/i.test(raw) ? (fr ? "la sortie" : "launch") : raw;
              return (
                <li key={g.id} className={"nx-srow" + st.cls} style={{ "--i": i }}>
                  <div className="nx-srow-game">
                    <span className="nx-srow-name">{g.name}</span>
                    {g.tipsCount != null && <span className="nx-srow-mods">{g.tipsCount} {t("perGame", lang)}</span>}
                  </div>
                  <div className="nx-srow-state"><span className="nx-dot" aria-hidden="true" />{st[lang] || st.en}</div>
                  <div className="nx-srow-since">
                    {since && <><span>{fr ? "Sans détection depuis" : "Undetected since"}</span><b>{since}</b></>}
                  </div>
                  <a className="nx-link nx-srow-buy" href={"#game/" + g.id} onClick={nxGo(go, "game/" + g.id)}>
                    {fr ? "Voir les licences" : "View licenses"}<span className="nx-sr"> {g.name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
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
              <span className="nx-auth-mark">404</span>
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
            <span className="nx-auth-mark">404</span>
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
        <h1 style={{ fontSize: "clamp(48px, 6vw, 84px)", marginBottom: 28 }}>{lang === "fr" ? "Mon panier" : "My cart"}</h1>
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
        <h1 style={{ fontSize: "clamp(44px, 6vw, 84px)", marginBottom: 36, maxWidth: "16ch" }}>{lang === "fr" ? "Tout ce qu'il faut savoir avant d'acheter" : "Everything to know before buying"}</h1>
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

Object.assign(window, { FaqPage, HomePage, ShopPage, ProductPage, StatusPage, ReviewsPage, AuthPage, SuccessPage, VerifyPage, CartPage });
