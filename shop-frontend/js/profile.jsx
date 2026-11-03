/* ====================== 404 — Profil / Mon compte ====================== */

const PLAN_LABEL = {
  DAYS_1: { fr: "1 jour", en: "1 day" },
  DAYS_7: { fr: "7 jours", en: "7 days" },
  DAYS_14: { fr: "14 jours", en: "14 days" },
  DAYS_30: { fr: "1 mois", en: "1 month" },
  DAYS_90: { fr: "3 mois", en: "3 months" },
  DAYS_365: { fr: "1 an", en: "1 year" },
  LIFETIME: { fr: "À vie", en: "Lifetime" },
};
const STATUS_META = {
  ACTIVE:    { cls: "badge-ok",   fr: "Active",   en: "Active",    col: "#4ade80" },
  EXPIRED:   { cls: "badge-warn", fr: "Expirée",  en: "Expired",   col: "#f87171" },
  BANNED:    { cls: "badge-warn", fr: "Bannie",   en: "Banned",    col: "#f87171" },
  SUSPENDED: { cls: "badge-warn", fr: "Suspendue",en: "Suspended", col: "#fbbf24" },
  PENDING:   { cls: "badge-new",  fr: "En attente",en: "Pending",  col: "#fbbf24" },
  COMPLETED: { cls: "badge-ok",   fr: "Payée",    en: "Paid",      col: "#4ade80" },
  FAILED:    { cls: "badge-warn", fr: "Échouée",  en: "Failed",    col: "#f87171" },
};

function pfFmtDate(d, lang) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}
function pfDaysLeft(lic) {
  if (!lic.expiresAt) return null; // lifetime
  const ms = new Date(lic.expiresAt) - new Date();
  return Math.max(0, Math.ceil(ms / 86400000));
}
function pfProgress(lic) {
  if (!lic.expiresAt) return 1;
  const total = new Date(lic.expiresAt) - new Date(lic.createdAt);
  const done = new Date() - new Date(lic.createdAt);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - done / total));
}
function pfGameName(lic, lang) {
  const m = lic.metadata || {};
  if (m.shopGameName) return m.shopGameName;
  if (m.shopGame) return m.shopGame;
  if (lic.product === "FORTNITE_CLIENT") return "Fortnite";
  if (lic.product === "MARVEL_RIVALS_CLIENT") return "Marvel Rivals";
  return lang === "fr" ? "Boutique 404" : "404 Shop";
}

function PfCopy({ text, lang }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} onClick={() => {
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 1400);
    }}>
      <Icon.check style={{ width: 13, height: 13 }} /> {copied ? (lang === "fr" ? "Copié" : "Copied") : (lang === "fr" ? "Copier" : "Copy")}
    </button>
  );
}

function PfStat({ label, value, icon: Ic, sub }) {
  return (
    <div className="pf-stat spot-card">
      <div className="pf-stat-ic"><Ic /></div>
      <div className="pf-stat-body">
        <div className="pf-stat-k">{label}</div>
        <div className="pf-stat-v">{typeof value === "number" ? <CountUp value={value} duration={900} /> : value}</div>
        {sub && <div className="pf-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function pfGameData(lic) {
  const m = lic.metadata || {};
  const slug = (m.shopGame || (lic.product === "FORTNITE_CLIENT" ? "fortnite" : lic.product === "MARVEL_RIVALS_CLIENT" ? "marvel_rivals" : "")).toLowerCase();
  return ((window.DATA && DATA.GAMES) || []).find((g) => g.id === slug) || null;
}

function PfLoaderBtn({ lang, endpoint, spoofer = false }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const download = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(API_BASE + endpoint, {
        headers: { Authorization: "Bearer " + Auth.token() },
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
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <button onClick={download} disabled={busy} className={"btn btn-primary btn-sm pf-dl" + (busy ? " busy" : "")}>
        <Icon.arrow style={{ width: 14, height: 14, transform: "rotate(90deg)" }} />
        {busy ? (lang === "fr" ? "Téléchargement…" : "Downloading…") : spoofer ? (lang === 'fr' ? 'Télécharger le spoofer' : 'Download spoofer') : (lang === "fr" ? "Télécharger le loader" : "Download loader")}
      </button>
      {err && <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function pfIsFortnite(lic) {
  if (lic.product === "FORTNITE_CLIENT") return true;
  const m = lic.metadata || {};
  if ((m.shopGame || "").toLowerCase() === "fortnite") return true;
  return false;
}
function pfIsMarvelRivals(lic) {
  if (lic.product === "MARVEL_RIVALS_CLIENT") return true;
  const m = lic.metadata || {};
  const g = (m.shopGame || "").toLowerCase();
  return g === "marvel_rivals" || g === "marvel-rivals" || g === "marvelrivals";
}
function pfLoaderEndpoint(lic) {
  if (lic.product === 'SHOP_SPOOFER') return '/software/customer/spoofer';
  if (pfIsFortnite(lic)) return "/software/customer/fortnite-loader";
  if (pfIsMarvelRivals(lic)) return "/software/customer/marvel-rivals-loader";
  return null;
}

function PfLicenseCard({ lic, lang }) {
  const external = lic.product === 'SHOP_SPOOFER';
  const st = STATUS_META[lic.status] || STATUS_META.EXPIRED;
  const plan = (PLAN_LABEL[lic.plan] && PLAN_LABEL[lic.plan][lang]) || lic.plan;
  const days = pfDaysLeft(lic);
  const prog = pfProgress(lic);
  const lifetime = !lic.expiresAt;
  const loaderEndpoint = pfLoaderEndpoint(lic);
  const game = pfGameData(lic);
  const [show, setShow] = React.useState(false);
  const active = lic.status === "ACTIVE";
  const masked = lic.licenseKey.replace(/[A-Z0-9]/gi, "•");
  return (
    <div className={"pf-lic spot-card" + (active ? " is-active" : "")} style={{ "--st": st.col }}>
      <div className="pf-lic-head">
        <div className="pf-lic-thumb">
          {game && game.image ? <Img src={game.image} alt="" /> : <span>{pfGameName(lic, lang).slice(0, 2).toUpperCase()}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pf-lic-name">{pfGameName(lic, lang)}</div>
          <div className="pf-lic-plan">{plan}</div>
        </div>
        <span className="pf-status"><i />{st[lang]}</span>
      </div>

      <div className="pf-key">
        <code>{show ? lic.licenseKey : masked}</code>
        <button type="button" className="pf-key-eye" onClick={() => setShow((v) => !v)}
          title={show ? (lang === "fr" ? "Masquer" : "Hide") : (lang === "fr" ? "Afficher" : "Show")} aria-label={show ? "hide" : "show"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
            {!show && <path d="M3 3l18 18" />}
          </svg>
        </button>
        <PfCopy text={lic.licenseKey} lang={lang} />
      </div>

      {!lifetime && active && (
        <div className="pf-prog">
          <div className="pf-prog-top">
            <span>{lang === "fr" ? "Temps restant" : "Time left"}</span>
            <b>{days} {lang === "fr" ? (days > 1 ? "jours" : "jour") : (days > 1 ? "days" : "day")}</b>
          </div>
          <div className="pf-bar"><div style={{ width: (prog * 100).toFixed(0) + "%" }} /></div>
        </div>
      )}
      {lifetime && active && <div className="pf-life"><Icon.bolt />{external ? (lang === 'fr' ? 'Durée et activation gérées par le fournisseur' : 'Duration and activation managed by the provider') : (lang === "fr" ? "Accès à vie" : "Lifetime access")}</div>}

      <div className="pf-lic-foot">
        <div className="pf-meta">
          <div><span>{lang === "fr" ? "Achetée le" : "Purchased"}</span><b>{pfFmtDate(lic.createdAt, lang)}</b></div>
          <div><span>{lang === "fr" ? "Expire le" : "Expires"}</span><b>{external ? (lang === 'fr' ? 'Voir dans le spoofer' : 'Check in spoofer') : lifetime ? "∞" : pfFmtDate(lic.expiresAt, lang)}</b></div>
        </div>
        {loaderEndpoint && active && <PfLoaderBtn lang={lang} endpoint={loaderEndpoint} spoofer={external} />}
      </div>
    </div>
  );
}

/* ---------- avis : un par jeu acheté, publié après validation ---------- */
function PfCouponCard({ c, lang }) {
  const fr = lang === "fr";
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="pf-coupon">
      <div className="pf-coupon-l"><b>{c.type === "percent" ? "−" + c.amount + " %" : "−" + (c.amount / 100).toFixed(2) + " €"}</b><span>{fr ? "sur ta prochaine commande" : "on your next order"}</span></div>
      <div className="pf-coupon-r">
        <code>{c.code}</code>
        <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(c.code); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
          {copied ? (fr ? "Copié" : "Copied") : (fr ? "Copier" : "Copy")}
        </button>
        {c.expiresAt && <small>{fr ? "Valable jusqu'au " : "Valid until "}{pfFmtDate(c.expiresAt, lang)} · {fr ? "réservé à ton compte" : "for your account only"}</small>}
      </div>
    </div>
  );
}

function PfReviewBox({ lang, title, onlyMissing }) {
  const [data, setData] = React.useState(null);
  const [draft, setDraft] = React.useState({});   // game -> { rating, text }
  const [msg, setMsg] = React.useState({});       // game -> { ok, text }
  const [busy, setBusy] = React.useState("");
  const [won, setWon] = React.useState(null);     // coupon reçu juste après l'avis
  const load = () => window.ShopAPI.myReviews().then(setData).catch(() => setData({ canReview: [], reviews: [] }));
  React.useEffect(() => { load(); }, []);
  if (!data || !data.canReview.length) return null;
  const fr = lang === "fr";
  const reward = data.reward;
  const games = onlyMissing ? data.canReview.filter((g) => !data.reviews.find((r) => r.game === g.game)) : data.canReview;
  if (!games.length && !won) return null;
  const send = async (game) => {
    const d = draft[game] || {};
    setBusy(game); setMsg((m) => ({ ...m, [game]: null }));
    try {
      const res = await window.ShopAPI.submitReview(game, d.rating || 0, (d.text || "").trim());
      if (res && res.reward) setWon({ code: res.reward.code, type: "percent", amount: res.reward.percent, expiresAt: res.reward.expiresAt });
      setMsg((m) => ({ ...m, [game]: { ok: true, text: fr ? "Merci ! Ton avis sera publié après vérification." : "Thanks! Your review will be published after review." } }));
      setDraft((x) => ({ ...x, [game]: null })); load();
    } catch (e) { setMsg((m) => ({ ...m, [game]: { ok: false, text: e.message } })); }
    finally { setBusy(""); }
  };
  return (
    <div className="panel pf-review">
      <h4 className="pf-form-h"><Icon.star />{title || (fr ? "Donne ton avis" : "Leave a review")}</h4>
      <p className="pf-review-sub">
        {fr ? "Ton retour aide les autres joueurs. Un avis par jeu acheté, modifiable à tout moment." : "Your feedback helps other players. One review per purchased game, editable anytime."}
        {reward && <> <b className="pf-reward-tag"><Icon.bolt style={{ width: 13, height: 13, verticalAlign: "-2px" }} /> {fr ? `−${reward.percent} % offerts` : `−${reward.percent}% off`}</b> {fr ? `sur ta prochaine commande pour ton premier avis sur chaque jeu (code personnel, valable ${reward.days} jours), quelle que soit ta note.` : `your next order for your first review of each game (personal code, valid ${reward.days} days), whatever your rating.`}</>}
      </p>
      {won && (
        <div className="pf-won">
          <div className="pf-won-h">{fr ? "Merci ! Voici ton code de réduction :" : "Thanks! Here is your discount code:"}</div>
          <PfCouponCard c={won} lang={lang} />
        </div>
      )}
      {games.map(({ game, gameName }) => {
        const mine = data.reviews.find((r) => r.game === game);
        const d = draft[game];
        const editing = !!d;
        const rating = (d && d.rating) || 0;
        return (
          <div key={game} className="pf-review-row">
            <div className="pf-review-head">
              <b>{gameName}</b>
              {mine && !editing && <span className={"pf-chip " + (mine.approved ? "ok" : "warn")}>{mine.approved ? (fr ? "Publié" : "Published") : (fr ? "En attente de validation" : "Pending review")}</span>}
            </div>
            {mine && !editing && (
              <div className="pf-review-mine">
                <Stars n={mine.rating} size={14} /> <span>« {mine.text} »</span>
                <button className="pf-key-eye" onClick={() => setDraft((x) => ({ ...x, [game]: { rating: mine.rating, text: mine.text } }))}>{fr ? "Modifier" : "Edit"}</button>
              </div>
            )}
            {(!mine || editing) && (
              <div className="pf-review-form">
                <div className="pf-stars" role="radiogroup" aria-label={fr ? "Note" : "Rating"}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className={n <= rating ? "on" : ""} aria-label={n + "/5"}
                      onClick={() => setDraft((x) => ({ ...x, [game]: { ...(x[game] || {}), rating: n } }))}><Icon.star /></button>
                  ))}
                </div>
                <textarea className="input" rows={3} maxLength={500} placeholder={fr ? "Qu'as-tu pensé du cheat, de l'installation, du support ? (10 caractères min.)" : "What did you think of the cheat, setup, support? (min. 10 characters)"}
                  value={(d && d.text) || ""} onChange={(e) => setDraft((x) => ({ ...x, [game]: { ...(x[game] || {}), text: e.target.value } }))} />
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Btn kind="primary" size="sm" disabled={busy === game || !rating || ((d && d.text) || "").trim().length < 10} onClick={() => send(game)}>
                    {busy === game ? "…" : (fr ? "Publier mon avis" : "Submit review")}
                  </Btn>
                  {editing && <button className="pf-key-eye" onClick={() => setDraft((x) => ({ ...x, [game]: null }))}>{fr ? "Annuler" : "Cancel"}</button>}
                </div>
              </div>
            )}
            {msg[game] && <div className={"pf-review-msg " + (msg[game].ok ? "ok" : "err")}>{msg[game].text}</div>}
          </div>
        );
      })}
    </div>
  );
}

const TIER_META = {
  bronze:  { label: "Bronze",  col: "#cd7f32" },
  silver:  { label: "Silver",  col: "#c0c0c0" },
  gold:    { label: "Gold",    col: "#ffd700" },
  diamond: { label: "Diamond", col: "#b9f2ff" },
};

function PfAffiliateTab({ lang }) {
  const [aff, setAff] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [notEnrolled, setNotEnrolled] = React.useState(false);
  const [enrollCode, setEnrollCode] = React.useState("");
  const [enrollBusy, setEnrollBusy] = React.useState(false);
  const [enrollErr, setEnrollErr] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [convs, setConvs] = React.useState([]);
  const [convsLoading, setConvsLoading] = React.useState(false);
  const [payoutBusy, setPayoutBusy] = React.useState(false);
  const [payoutMsg, setPayoutMsg] = React.useState("");
  const [payoutErr, setPayoutErr] = React.useState("");
  const [payoutForm, setPayoutForm] = React.useState({ amount: "", method: "crypto_usdt", destination: "" });
  const [payouts, setPayouts] = React.useState([]);

  const loadAff = () => {
    setLoading(true);
    window.ShopAPI.affMe()
      .then((d) => { setAff(d); setNotEnrolled(false); })
      .catch((e) => {
        if ((e.message || "").includes("affilié") || (e.message || "").includes("not found") || (e.message || "").toLowerCase().includes("404")) setNotEnrolled(true);
        else setNotEnrolled(true);
      })
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadAff(); }, []);

  React.useEffect(() => {
    if (!aff) return;
    setConvsLoading(true);
    window.ShopAPI.affConversions().then(setConvs).catch(() => {}).finally(() => setConvsLoading(false));
    window.ShopAPI.affPayouts().then(setPayouts).catch(() => {});
  }, [aff]);

  const enroll = async (e) => {
    e.preventDefault(); setEnrollBusy(true); setEnrollErr("");
    try {
      await window.ShopAPI.affEnroll(enrollCode.trim() || undefined);
      loadAff();
    } catch (e2) { setEnrollErr(e2.message); }
    finally { setEnrollBusy(false); }
  };

  const refLink = aff ? (location.origin + "/r/" + aff.code) : "";
  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(refLink);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const requestPayout = async (e) => {
    e.preventDefault(); setPayoutBusy(true); setPayoutMsg(""); setPayoutErr("");
    try {
      const cents = Math.round(parseFloat(payoutForm.amount) * 100);
      await window.ShopAPI.affPayout(cents, payoutForm.method, payoutForm.destination);
      setPayoutMsg(lang === "fr" ? "Demande de paiement envoyée." : "Payout request sent.");
      setPayoutForm({ amount: "", method: "crypto_usdt", destination: "" });
      loadAff();
    } catch (e2) { setPayoutErr(e2.message); }
    finally { setPayoutBusy(false); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--tx-dim)" }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>;

  if (notEnrolled) {
    return (
      <>
        <h3 style={{ fontSize: 22, marginBottom: 8 }}>{lang === "fr" ? "Programme Affilié" : "Affiliate Program"}</h3>
        <div className="panel" style={{ padding: "34px 26px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 18px", background: "var(--acc-grad)", display: "grid", placeItems: "center", color: "#14110a" }}>
            <Icon.users style={{ width: 26, height: 26 }} />
          </div>
          <h4 style={{ fontSize: 18, marginBottom: 8 }}>{lang === "fr" ? "Gagne de l'argent en parrainant" : "Earn money by referring"}</h4>
          <p style={{ color: "var(--tx-dim)", fontSize: 14, maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
            {lang === "fr"
              ? "Partage ton lien unique. Tu gagnes une commission sur le 1er achat (20-35%) + 50% du taux sur les 3 renewals suivants. Tiers basés sur le revenu généré en 30 jours."
              : "Share your unique link. Earn a commission on the 1st purchase (20-35%) + 50% of the rate on the next 3 renewals. Tiers based on 30-day revenue."}
          </p>
          <form onSubmit={enroll} style={{ maxWidth: 360, margin: "0 auto" }}>
            <div className="field">
              <label style={{ fontSize: 12 }}>{lang === "fr" ? "Code personnalisé (optionnel, 4-15 caractères)" : "Custom code (optional, 4-15 chars)"}</label>
              <input className="input" value={enrollCode} onChange={(e) => setEnrollCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder={lang === "fr" ? "Ex: MONSTYLE" : "Ex: MYCODE"} maxLength={15}
                style={{ textAlign: "center", letterSpacing: ".1em", fontFamily: "var(--f-mono)", fontWeight: 700 }} />
            </div>
            {enrollErr && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{enrollErr}</div>}
            <Btn kind="primary" type="submit" disabled={enrollBusy} style={{ width: "100%" }}>
              {enrollBusy ? "…" : (lang === "fr" ? "Devenir affilié" : "Become an affiliate")}
            </Btn>
          </form>
        </div>
      </>
    );
  }

  if (!aff) return null;
  const tier = TIER_META[aff.tier] || TIER_META.bronze;
  const s = aff.stats || {};
  const tp = aff.tierProgress || {};

  return (
    <>
      <h3 style={{ fontSize: 22, marginBottom: 16 }}>{lang === "fr" ? "Programme Affilié" : "Affiliate Program"}</h3>

      {/* Referral link */}
      <div className="panel" style={{ padding: "22px 22px", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--tx-mute)", marginBottom: 10 }}>
          {lang === "fr" ? "Ton lien d'affiliation" : "Your referral link"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "12px 14px" }}>
          <code style={{ fontFamily: "var(--f-mono)", fontSize: 14, fontWeight: 600, flex: 1, wordBreak: "break-all", color: "var(--acc)" }}>{refLink}</code>
          <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} onClick={copyLink}>
            <Icon.check style={{ width: 13, height: 13 }} /> {copied ? (lang === "fr" ? "Copié !" : "Copied!") : (lang === "fr" ? "Copier" : "Copy")}
          </button>
        </div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--tx-mute)", marginTop: 8 }}>
          Code : <strong style={{ color: "var(--acc)" }}>{aff.code}</strong> · Tier : <strong style={{ color: tier.col }}>{tier.label}</strong> · Commission : <strong>{(aff.commissionRate * 100).toFixed(0)}%</strong>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 18 }} className="prof-stats">
        <PfStat label={lang === "fr" ? "Clics 30j" : "Clicks 30d"} value={s.clicks30d || 0} icon={Icon.bolt} />
        <PfStat label={lang === "fr" ? "Conversions" : "Conversions"} value={s.conversions30d || 0} icon={Icon.check} />
        <PfStat label={lang === "fr" ? "Revenu 30j" : "Revenue 30d"} value={(s.revenue30d / 100 || 0).toFixed(2) + "€"} icon={Icon.star} />
        <PfStat label={lang === "fr" ? "Gains 30j" : "Earnings 30d"} value={(s.earnings30d / 100 || 0).toFixed(2) + "€"} icon={Icon.star} />
        <PfStat label={lang === "fr" ? "Solde dispo" : "Balance"} value={(s.pending / 100 || 0).toFixed(2) + "€"} icon={Icon.cart} />
      </div>

      {/* Tier progress */}
      {tp.next && (
        <div className="panel" style={{ padding: "16px 20px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--tx-mute)" }}>
              {lang === "fr" ? "Prochain tier" : "Next tier"}: <strong style={{ color: (TIER_META[tp.next] || {}).col }}>{(TIER_META[tp.next] || {}).label}</strong>
            </span>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--tx-dim)" }}>
              {((tp.revenueNeeded || 0) / 100).toFixed(0)}€ {lang === "fr" ? "de revenu restant" : "revenue left"}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: (tp.revenueNeeded > 0 ? Math.max(5, (1 - tp.revenueNeeded / Math.max(1, tp.revenueNeeded + (s.revenue30d || 0))) * 100) : 100).toFixed(0) + "%",
              background: "var(--acc-grad)",
            }} />
          </div>
          {tp.belowThresholdSince && (
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "#fbbf24", marginTop: 8 }}>
              {lang === "fr" ? "Sous le seuil depuis le " : "Below threshold since "}{new Date(tp.belowThresholdSince).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}{lang === "fr" ? " (downgrade après 60j)" : " (downgrade after 60d)"}
            </div>
          )}
        </div>
      )}

      {/* Conversions table */}
      <div className="panel" style={{ padding: "22px 22px", marginBottom: 18 }}>
        <h4 style={{ fontSize: 16, marginBottom: 14 }}>{lang === "fr" ? "Mes conversions" : "My conversions"}</h4>
        {convsLoading ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--tx-dim)" }}>…</div>
        ) : convs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--tx-dim)", fontSize: 13 }}>{lang === "fr" ? "Aucune conversion pour le moment." : "No conversions yet."}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--f-mono)", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--tx-mute)", textAlign: "left" }}>
                  <th style={{ padding: "6px 10px" }}>Type</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Montant" : "Amount"}</th>
                  <th style={{ padding: "6px 10px" }}>Commission</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Statut" : "Status"}</th>
                  <th style={{ padding: "6px 10px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {convs.map((c, i) => {
                  const stCol = c.status === "approved" ? "#4ade80" : c.status === "rejected" ? "#f87171" : c.status === "refunded" ? "#c084fc" : "#fbbf24";
                  const typeLabel = c.renewalIndex === 0 ? (lang === "fr" ? "1er achat" : "First") : ("Renewal #" + c.renewalIndex);
                  return (
                    <tr key={c.id || i} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 10px", color: c.renewalIndex === 0 ? "var(--acc)" : "var(--tx-mute)", fontSize: 11 }}>{typeLabel}</td>
                      <td style={{ padding: "8px 10px" }}>{(c.amountCents / 100).toFixed(2)}€</td>
                      <td style={{ padding: "8px 10px", color: "#4ade80" }}>{(c.commissionCents / 100).toFixed(2)}€ <span style={{ color: "var(--tx-mute)", fontSize: 10 }}>({(c.commissionRate * 100).toFixed(0)}%)</span></td>
                      <td style={{ padding: "8px 10px" }}><span style={{ color: stCol, fontWeight: 600 }}>{c.status}</span></td>
                      <td style={{ padding: "8px 10px", color: "var(--tx-mute)" }}>{new Date(c.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout request */}
      <div className="panel" style={{ padding: "22px 22px", marginBottom: 18 }}>
        <h4 style={{ fontSize: 16, marginBottom: 14 }}>{lang === "fr" ? "Demander un paiement" : "Request payout"}</h4>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--tx-mute)", marginBottom: 14 }}>
          {lang === "fr" ? "Solde disponible : " : "Available: "}<strong>{((s.pending || 0) / 100).toFixed(2)}€</strong>
          {" · "}{lang === "fr" ? "Total perçu : " : "Total paid: "}<strong>{((s.totalPaid || 0) / 100).toFixed(2)}€</strong>
          <br/><span style={{ fontSize: 10.5, color: "var(--tx-dim)" }}>{lang === "fr" ? "Min: BTC/XMR 75€ · USDT 50€ · SEPA 100€ · Store Credit 20€" : "Min: BTC/XMR 75€ · USDT 50€ · SEPA 100€ · Store Credit 20€"}</span>
        </div>
        {payoutMsg && <div style={{ background: "var(--acc-soft)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{payoutMsg}</div>}
        {payoutErr && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", color: "#fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{payoutErr}</div>}
        <form onSubmit={requestPayout} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field">
              <label style={{ fontSize: 11 }}>{lang === "fr" ? "Montant (€)" : "Amount (€)"}</label>
              <input className="input" type="number" step="0.01" min="20" placeholder="50.00"
                value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} required />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>{lang === "fr" ? "Méthode" : "Method"}</label>
              <select className="input" value={payoutForm.method} onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })}>
                <option value="crypto_usdt">Crypto (USDT)</option>
                <option value="crypto_btc">Crypto (BTC)</option>
                <option value="crypto_xmr">Crypto (XMR)</option>
                <option value="sepa">Virement SEPA</option>
                <option value="store_credit">{lang === "fr" ? "Crédit boutique" : "Store credit"}</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label style={{ fontSize: 11 }}>{lang === "fr" ? "Adresse / IBAN / détails" : "Address / IBAN / details"}</label>
            <input className="input" placeholder={payoutForm.method.startsWith("crypto") ? (lang === "fr" ? "Adresse wallet" : "Wallet address") : "IBAN / détails"}
              value={payoutForm.destination} onChange={(e) => setPayoutForm({ ...payoutForm, destination: e.target.value })} required />
          </div>
          <Btn kind="primary" type="submit" disabled={payoutBusy || (s.pending || 0) < 2000}>
            {payoutBusy ? "…" : (lang === "fr" ? "Demander le paiement" : "Request payout")}
          </Btn>
        </form>
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="panel" style={{ padding: "22px 22px" }}>
          <h4 style={{ fontSize: 16, marginBottom: 14 }}>{lang === "fr" ? "Historique des paiements" : "Payout history"}</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--f-mono)", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--tx-mute)", textAlign: "left" }}>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Montant" : "Amount"}</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Méthode" : "Method"}</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Statut" : "Status"}</th>
                  <th style={{ padding: "6px 10px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => {
                  const stCol = p.status === "paid" ? "#4ade80" : p.status === "failed" ? "#f87171" : "#fbbf24";
                  return (
                    <tr key={p.id || i} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{(p.amountCents / 100).toFixed(2)}€</td>
                      <td style={{ padding: "8px 10px", color: "var(--tx-mute)" }}>{p.method}</td>
                      <td style={{ padding: "8px 10px" }}><span style={{ color: stCol, fontWeight: 600 }}>{p.status}</span></td>
                      <td style={{ padding: "8px 10px", color: "var(--tx-mute)" }}>{new Date(p.requestedAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

const RESELLER_TIER_META = {
  bronze:  { label: "Bronze",  col: "#cd7f32", discount: "25%" },
  silver:  { label: "Silver",  col: "#c0c0c0", discount: "35%" },
  gold:    { label: "Gold",    col: "#ffd700", discount: "45%" },
  diamond: { label: "Diamond", col: "#b9f2ff", discount: "55%" },
};

function PfResellerTab({ lang }) {
  const [reseller, setReseller] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [notEnrolled, setNotEnrolled] = React.useState(false);
  const [enrollBusy, setEnrollBusy] = React.useState(false);
  const [enrollErr, setEnrollErr] = React.useState("");
  const [shopUrl, setShopUrl] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [activity, setActivity] = React.useState("");
  const [telegram, setTelegram] = React.useState("");
  const [monthlyVolume, setMonthlyVolume] = React.useState("");

  const [stats, setStats] = React.useState(null);
  const [batches, setBatches] = React.useState([]);
  const [walletHistory, setWalletHistory] = React.useState([]);
  const [expandedBatch, setExpandedBatch] = React.useState(null);
  const [batchKeys, setBatchKeys] = React.useState([]);
  const [batchKeysLoading, setBatchKeysLoading] = React.useState(false);

  const shopGames = ((window.DATA && window.DATA.GAMES) || []).filter((game) => game.id !== 'spoofer');
  const shopPlans = (window.DATA && window.DATA.PLANS) || [];
  const [orderProduct, setOrderProduct] = React.useState(shopGames.length ? shopGames[0].id : "");
  const [orderPlan, setOrderPlan] = React.useState(shopPlans.length ? shopPlans[0].id : "");
  const [orderCount, setOrderCount] = React.useState(10);
  const [orderBusy, setOrderBusy] = React.useState(false);
  const [orderMsg, setOrderMsg] = React.useState("");
  const [orderErr, setOrderErr] = React.useState("");

  const [topupAmount, setTopupAmount] = React.useState("");
  const [topupBusy, setTopupBusy] = React.useState(false);
  const [topupMsg, setTopupMsg] = React.useState("");
  const [termsBusy, setTermsBusy] = React.useState(false);
  const [termsErr, setTermsErr] = React.useState("");

  const loadReseller = () => {
    setLoading(true);
    window.ShopAPI.resellerMe()
      .then((d) => { setReseller(d); setNotEnrolled(false); })
      .catch(() => setNotEnrolled(true))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadReseller(); }, []);

  React.useEffect(() => {
    if (!reseller) return;
    window.ShopAPI.resellerStats().then(setStats).catch(() => {});
    window.ShopAPI.resellerBatches(20).then(r => setBatches(r.batches || r || [])).catch(() => {});
    window.ShopAPI.resellerWalletHistory(20).then(setWalletHistory).catch(() => {});
  }, [reseller]);

  const enroll = async (e) => {
    e.preventDefault(); setEnrollBusy(true); setEnrollErr("");
    try {
      await window.ShopAPI.resellerEnroll({ companyName, shopUrl, country, activity, telegram: telegram || undefined, monthlyVolume: monthlyVolume || undefined });
      loadReseller();
    } catch (e2) { setEnrollErr(e2.message); }
    finally { setEnrollBusy(false); }
  };

  const orderBatch = async (e) => {
    e.preventDefault(); setOrderBusy(true); setOrderMsg(""); setOrderErr("");
    try {
      const res = await window.ShopAPI.resellerOrderBatch(orderProduct, orderPlan, parseInt(orderCount));
      setOrderMsg(lang === "fr"
        ? `Batch cree ! ${res.keyCount || orderCount} cles generees. Cout: ${((res.totalCents || 0) / 100).toFixed(2)}EUR`
        : `Batch created! ${res.keyCount || orderCount} keys generated. Cost: ${((res.totalCents || 0) / 100).toFixed(2)}EUR`);
      loadReseller();
    } catch (e2) { setOrderErr(e2.message); }
    finally { setOrderBusy(false); }
  };

  const topup = async (e) => {
    e.preventDefault(); setTopupBusy(true); setTopupMsg("");
    try {
      const cents = Math.round(parseFloat(topupAmount) * 100);
      const res = await window.ShopAPI.resellerTopup(cents, "stripe");
      if (res.url) {
        setTopupMsg(lang === "fr" ? "Redirection vers Stripe..." : "Redirecting to Stripe...");
        window.location.href = res.url;
      } else {
        setTopupMsg(lang === "fr" ? "Topup cree." : "Topup created.");
        loadReseller();
      }
    } catch (e2) { setTopupMsg(e2.message); }
    finally { setTopupBusy(false); }
  };

  const acceptTerms = async () => {
    setTermsBusy(true); setTermsErr("");
    try {
      await window.ShopAPI.resellerAcceptTerms();
      loadReseller();
    } catch (e2) { setTermsErr(e2.message); }
    finally { setTermsBusy(false); }
  };

  const toggleBatchKeys = async (batchId) => {
    if (expandedBatch === batchId) { setExpandedBatch(null); setBatchKeys([]); return; }
    setBatchKeysLoading(true);
    try {
      const res = await window.ShopAPI.resellerBatch(batchId);
      setBatchKeys(res.keys || []);
      setExpandedBatch(batchId);
    } catch (e2) { console.error(e2); }
    finally { setBatchKeysLoading(false); }
  };

  const downloadCsv = async (batchId) => {
    try {
      const token = localStorage.getItem("404_token");
      const resp = await fetch("https://api.404tweaks.tech/api/v1/reseller/batches/" + batchId + "/keys.csv", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "batch-" + batchId.slice(0, 8) + ".csv";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e2) { console.error(e2); }
  };

  const copyAllKeys = (keys) => {
    const text = keys.map(k => k.licenseKey).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--tx-dim)" }}>{lang === "fr" ? "Chargement..." : "Loading..."}</div>;

  if (notEnrolled) {
    return (
      <>
        <h3 style={{ fontSize: 22, marginBottom: 8 }}>Reseller Program</h3>
        <div className="panel" style={{ padding: "34px 26px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 18px", background: "var(--acc-grad)", display: "grid", placeItems: "center", color: "#14110a" }}>
            <Icon.store style={{ width: 26, height: 26 }} />
          </div>
          <h4 style={{ fontSize: 18, marginBottom: 8 }}>{lang === "fr" ? "Deviens revendeur 404" : "Become a 404 reseller"}</h4>
          <p style={{ color: "var(--tx-dim)", fontSize: 14, maxWidth: 480, margin: "0 auto 8px", lineHeight: 1.6 }}>
            {lang === "fr"
              ? "Achete des cles en gros a prix reduit et revends-les a tes clients. 4 tiers de remise : Bronze 25%, Silver 35%, Gold 45%, Diamond 55%."
              : "Buy license keys in bulk at discounted prices and resell them to your customers. 4 discount tiers: Bronze 25%, Silver 35%, Gold 45%, Diamond 55%."}
          </p>
          <p style={{ color: "var(--tx-dim)", fontSize: 12, maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.5 }}>
            {lang === "fr"
              ? "Wallet prepaye, generation instantanee de cles, export CSV, dashboard stats, et plus."
              : "Prepaid wallet, instant key generation, CSV export, stats dashboard, and more."}
          </p>
          <form onSubmit={enroll} style={{ maxWidth: 440, margin: "0 auto" }}>
            <div className="field">
              <label style={{ fontSize: 12 }}>{lang === "fr" ? "Nom d'entreprise / pseudo *" : "Company name / alias *"}</label>
              <input className="input" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder={lang === "fr" ? "Ma Boutique" : "My Store"} />
            </div>
            <div className="field">
              <label style={{ fontSize: 12 }}>{lang === "fr" ? "URL de ta boutique / Discord *" : "Your shop URL / Discord *"}</label>
              <input className="input" required value={shopUrl} onChange={(e) => setShopUrl(e.target.value)}
                placeholder="https://mystore.com ou discord.gg/..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field">
                <label style={{ fontSize: 12 }}>{lang === "fr" ? "Pays *" : "Country *"}</label>
                <input className="input" required value={country} onChange={(e) => setCountry(e.target.value)}
                  placeholder={lang === "fr" ? "France" : "France"} />
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>{lang === "fr" ? "Volume mensuel estime" : "Est. monthly volume"}</label>
                <select className="input" value={monthlyVolume} onChange={(e) => setMonthlyVolume(e.target.value)}>
                  <option value="">—</option>
                  <option value="1-50">1 – 50 {lang === "fr" ? "cles/mois" : "keys/mo"}</option>
                  <option value="50-200">50 – 200 {lang === "fr" ? "cles/mois" : "keys/mo"}</option>
                  <option value="200-1000">200 – 1000 {lang === "fr" ? "cles/mois" : "keys/mo"}</option>
                  <option value="1000+">1000+ {lang === "fr" ? "cles/mois" : "keys/mo"}</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label style={{ fontSize: 12 }}>{lang === "fr" ? "Decris ton activite de revente *" : "Describe your reselling activity *"}</label>
              <textarea className="input" required rows={3} value={activity} onChange={(e) => setActivity(e.target.value)}
                style={{ resize: "vertical", minHeight: 60 }}
                placeholder={lang === "fr" ? "Ex: Je revends des cles sur mon Discord/site pour la communaute gaming FR..." : "Ex: I resell keys on my Discord/site for the gaming community..."} />
            </div>
            <div className="field">
              <label style={{ fontSize: 12 }}>Telegram / Discord ({lang === "fr" ? "optionnel" : "optional"})</label>
              <input className="input" value={telegram} onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username" />
            </div>
            {enrollErr && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{enrollErr}</div>}
            <Btn kind="primary" type="submit" disabled={enrollBusy} style={{ width: "100%" }}>
              {enrollBusy ? "..." : (lang === "fr" ? "Envoyer ma demande" : "Submit application")}
            </Btn>
          </form>
        </div>
      </>
    );
  }

  if (!reseller) return null;
  const tier = RESELLER_TIER_META[reseller.tier] || RESELLER_TIER_META.bronze;
  const isPending = reseller.status === "pending" || reseller.status === "pending_approval";
  const isSuspended = reseller.status === "suspended";
  const st = stats || {};

  if (isPending) {
    return (
      <>
        <h3 style={{ fontSize: 22, marginBottom: 16 }}>Reseller Program</h3>
        <div className="panel" style={{ padding: "48px 30px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: "rgba(251,191,36,.15)", display: "grid", placeItems: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h4 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            {lang === "fr" ? "Demande en cours de verification" : "Application under review"}
          </h4>
          <p style={{ color: "var(--tx-dim)", fontSize: 14, maxWidth: 420, margin: "0 auto 16px", lineHeight: 1.7 }}>
            {lang === "fr"
              ? "Ta demande a bien ete envoyee. Notre equipe la verifie dans les plus brefs delais. Tu recevras une notification une fois approuve."
              : "Your application has been submitted. Our team is reviewing it as soon as possible. You'll be notified once approved."}
          </p>
          <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 8, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24", fontWeight: 600, fontSize: 13 }}>
            {lang === "fr" ? "Statut : En attente" : "Status: Pending"}
          </div>
          {reseller.companyName && (
            <p style={{ color: "var(--tx-mute)", fontSize: 12, marginTop: 16 }}>
              {lang === "fr" ? "Entreprise" : "Company"}: {reseller.companyName}
            </p>
          )}
        </div>
      </>
    );
  }

  if (isSuspended) {
    return (
      <>
        <h3 style={{ fontSize: 22, marginBottom: 16 }}>Reseller Program</h3>
        <div className="panel" style={{ padding: "48px 30px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: "rgba(239,68,68,.15)", display: "grid", placeItems: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h4 style={{ fontSize: 20, fontWeight: 700, color: "#f87171", marginBottom: 10 }}>
            {lang === "fr" ? "Compte suspendu" : "Account suspended"}
          </h4>
          <p style={{ color: "var(--tx-dim)", fontSize: 14, maxWidth: 420, margin: "0 auto", lineHeight: 1.7 }}>
            {reseller.suspendReason || (lang === "fr" ? "Ton compte reseller a ete suspendu. Contacte le support pour plus d'informations." : "Your reseller account has been suspended. Contact support for more information.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h3 style={{ fontSize: 22, marginBottom: 16 }}>Reseller Program</h3>

      {/* Terms acceptance */}
      {!isPending && !isSuspended && !reseller.termsVersion && (
        <div className="panel" style={{ padding: "18px 22px", borderColor: "rgba(168,85,247,.4)", background: "rgba(168,85,247,.08)", marginBottom: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{lang === "fr" ? "Conditions d'utilisation" : "Terms of Service"}</div>
          <p style={{ color: "var(--tx-dim)", fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            {lang === "fr"
              ? "Avant de pouvoir commander des cles, tu dois accepter les conditions du programme reseller : pas de revente en dessous du prix minimum, pas d'utilisation personnelle des cles, respect des CGV 404Tweaks."
              : "Before ordering keys, you must accept the reseller program terms: no reselling below minimum price, no personal use of keys, compliance with 404Tweaks ToS."}
          </p>
          {termsErr && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{termsErr}</div>}
          <Btn kind="primary" onClick={acceptTerms} disabled={termsBusy}>
            {termsBusy ? "..." : (lang === "fr" ? "J'accepte les conditions" : "I accept the terms")}
          </Btn>
        </div>
      )}

      {/* Info card */}
      <div className="panel" style={{ padding: "22px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--tx-mute)" }}>
              Tier
            </span>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 22, color: tier.col }}>{tier.label}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--tx-mute)" }}>
              {lang === "fr" ? "Remise" : "Discount"}
            </span>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 22, color: "var(--acc)" }}>{tier.discount}</div>
          </div>
        </div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--tx-mute)" }}>
          Wallet : <strong style={{ color: "var(--tx)" }}>{((reseller.wallet || 0) / 100).toFixed(2)} EUR</strong>
          {reseller.companyName && <> · {reseller.companyName}</>}
        </div>
      </div>

      {/* Stats */}
      {!isPending && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 18 }} className="prof-stats">
          <PfStat label={lang === "fr" ? "Cles totales" : "Total keys"} value={st.totalKeys || 0} icon={Icon.shield} />
          <PfStat label={lang === "fr" ? "Activees" : "Activated"} value={st.activatedKeys || 0} icon={Icon.check} />
          <PfStat label={lang === "fr" ? "Taux d'activation" : "Activation rate"} value={((st.activationRate || 0) * 100).toFixed(1) + "%"} icon={Icon.bolt} />
          <PfStat label={lang === "fr" ? "Wallet" : "Wallet"} value={((reseller.wallet || 0) / 100).toFixed(2) + " EUR"} icon={Icon.cart} />
        </div>
      )}

      {/* Topup wallet */}
      {!isPending && !isSuspended && (
        <div className="panel" style={{ padding: "22px 22px", marginBottom: 18 }}>
          <h4 style={{ fontSize: 16, marginBottom: 14 }}>{lang === "fr" ? "Recharger le wallet" : "Top up wallet"}</h4>
          {topupMsg && <div style={{ fontSize: 12, color: "var(--acc)", marginBottom: 10 }}>{topupMsg}</div>}
          <form onSubmit={topup} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div className="field" style={{ flex: 1 }}>
              <label style={{ fontSize: 11 }}>{lang === "fr" ? "Montant (EUR, min 10)" : "Amount (EUR, min 10)"}</label>
              <input className="input" type="number" step="0.01" min="10" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="50.00" required />
            </div>
            <Btn kind="primary" type="submit" disabled={topupBusy}>{topupBusy ? "..." : (lang === "fr" ? "Recharger" : "Top up")}</Btn>
          </form>
        </div>
      )}

      {/* Order batch */}
      {!isPending && !isSuspended && (
        <div className="panel" style={{ padding: "22px 22px", marginBottom: 18 }}>
          <h4 style={{ fontSize: 16, marginBottom: 14 }}>{lang === "fr" ? "Commander des cles" : "Order keys"}</h4>
          {orderMsg && <div style={{ background: "var(--acc-soft)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{orderMsg}</div>}
          {orderErr && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", color: "#fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{orderErr}</div>}
          <form onSubmit={orderBatch} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="field">
                <label style={{ fontSize: 11 }}>{lang === "fr" ? "Produit" : "Product"}</label>
                <select className="input" value={orderProduct} onChange={(e) => setOrderProduct(e.target.value)}>
                  {shopGames.map((g) => <option key={g.id} value={g.id}>{typeof g.name === "string" ? g.name : (g.name[lang] || g.name.fr || g.id)}</option>)}
                  {!shopGames.length && <option value="">—</option>}
                </select>
              </div>
              <div className="field">
                <label style={{ fontSize: 11 }}>Plan</label>
                <select className="input" value={orderPlan} onChange={(e) => setOrderPlan(e.target.value)}>
                  {shopPlans.map((p) => <option key={p.id} value={p.id}>{typeof p.name === "string" ? p.name : (p.name[lang] || p.name.fr || p.id)}{p.price ? ` (${p.price}€)` : ""}</option>)}
                  {!shopPlans.length && <option value="">—</option>}
                </select>
              </div>
              <div className="field">
                <label style={{ fontSize: 11 }}>{lang === "fr" ? "Quantite" : "Quantity"}</label>
                <input className="input" type="number" min="1" max="10000" value={orderCount} onChange={(e) => setOrderCount(e.target.value)} />
              </div>
            </div>
            <Btn kind="primary" type="submit" disabled={orderBusy}>
              {orderBusy ? "..." : (lang === "fr" ? "Commander le batch" : "Order batch")}
            </Btn>
          </form>
        </div>
      )}

      {/* Batches */}
      {batches.length > 0 && (
        <div className="panel" style={{ padding: "22px 22px", marginBottom: 18 }}>
          <h4 style={{ fontSize: 16, marginBottom: 14 }}>{lang === "fr" ? "Mes batches" : "My batches"}</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--f-mono)", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--tx-mute)", textAlign: "left" }}>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Produit" : "Product"}</th>
                  <th style={{ padding: "6px 10px" }}>Plan</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Cles" : "Keys"}</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Activees" : "Activated"}</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Cout" : "Cost"}</th>
                  <th style={{ padding: "6px 10px" }}>Date</th>
                  <th style={{ padding: "6px 10px" }}></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b, i) => (
                  <React.Fragment key={b.id || i}>
                    <tr style={{ borderBottom: expandedBatch === b.id ? "none" : "1px solid var(--line)", cursor: "pointer" }} onClick={() => toggleBatchKeys(b.id)}>
                      <td style={{ padding: "8px 10px" }}>{b.productId || b.product}</td>
                      <td style={{ padding: "8px 10px" }}>{b.plan}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{b.keyCount}</td>
                      <td style={{ padding: "8px 10px", color: "#4ade80" }}>{b.activatedCount || 0}</td>
                      <td style={{ padding: "8px 10px" }}>{((b.totalCents || b.totalCostCents || 0) / 100).toFixed(2)}€</td>
                      <td style={{ padding: "8px 10px", color: "var(--tx-mute)" }}>{pfFmtDate(b.createdAt, lang)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <button
                          style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 10px", color: "var(--tx)", cursor: "pointer", fontSize: 11 }}
                          onClick={(e) => { e.stopPropagation(); toggleBatchKeys(b.id); }}
                        >
                          {expandedBatch === b.id ? "▲" : (lang === "fr" ? "Voir cles ▼" : "View keys ▼")}
                        </button>
                      </td>
                    </tr>
                    {expandedBatch === b.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ background: "var(--bg-2, rgba(255,255,255,0.03))", borderBottom: "1px solid var(--line)", padding: "12px 14px" }}>
                            {batchKeysLoading ? (
                              <div style={{ textAlign: "center", padding: 12, color: "var(--tx-dim)" }}>...</div>
                            ) : (
                              <>
                                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                  <button
                                    style={{ background: "var(--acc)", border: "none", borderRadius: 6, padding: "5px 12px", color: "#14110a", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                                    onClick={() => copyAllKeys(batchKeys)}
                                  >
                                    {lang === "fr" ? "Copier toutes les cles" : "Copy all keys"}
                                  </button>
                                  <button
                                    style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 12px", color: "var(--tx)", cursor: "pointer", fontSize: 11 }}
                                    onClick={() => downloadCsv(b.id)}
                                  >
                                    CSV ↓
                                  </button>
                                </div>
                                <p style={{ fontSize: 11.5, color: "var(--tx-mute)", margin: "0 0 8px" }}>
                                  {lang === "fr" ? "La durée d'une clé ne commence qu'à sa première activation dans le loader : tu peux la revendre plus tard sans que ton client perde de jours. Les clés jamais activées expirent 12 mois après la commande du lot." : "A key's duration only starts at its first activation in the loader, so you can resell it later without your customer losing days. Never-activated keys expire 12 months after the batch order."}
                                </p>
                                <div style={{ maxHeight: 240, overflowY: "auto", display: "grid", gap: 4 }}>
                                  {batchKeys.map((k, ki) => (
                                    <div key={ki} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.02)" }}>
                                      <code style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 600, flex: 1 }}>{k.licenseKey}</code>
                                      <span style={{ fontSize: 10, color: k.activatedHwid ? "#4ade80" : "var(--tx-mute)", minWidth: 60 }}>
                                        {k.activatedHwid ? (lang === "fr" ? "Activée" : "Activated") : (lang === "fr" ? "Disponible" : "Available")}
                                      </span>
                                      <span style={{ fontSize: 10, color: "var(--tx-mute)", minWidth: 110, textAlign: "right" }}>
                                        {k.expiresAt
                                          ? (lang === "fr" ? "expire le " : "expires ") + pfFmtDate(k.expiresAt, lang)
                                          : (k.metadata && k.metadata.startOnActivation)
                                            ? (lang === "fr" ? `${k.metadata.durationDays} j dès l'activation` : `${k.metadata.durationDays}d from activation`)
                                            : (lang === "fr" ? "à vie" : "lifetime")}
                                      </span>
                                      <PfCopy text={k.licenseKey} lang={lang} />
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallet history */}
      {walletHistory.length > 0 && (
        <div className="panel" style={{ padding: "22px 22px" }}>
          <h4 style={{ fontSize: 16, marginBottom: 14 }}>{lang === "fr" ? "Historique wallet" : "Wallet history"}</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--f-mono)", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--tx-mute)", textAlign: "left" }}>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Montant" : "Amount"}</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Methode" : "Method"}</th>
                  <th style={{ padding: "6px 10px" }}>{lang === "fr" ? "Statut" : "Status"}</th>
                  <th style={{ padding: "6px 10px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {walletHistory.map((w, i) => {
                  const stCol = w.status === "completed" ? "#4ade80" : w.status === "chargebacked" ? "#f87171" : "#fbbf24";
                  return (
                    <tr key={w.id || i} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{(w.amountCents / 100).toFixed(2)} EUR</td>
                      <td style={{ padding: "8px 10px", color: "var(--tx-mute)" }}>{w.method}</td>
                      <td style={{ padding: "8px 10px" }}><span style={{ color: stCol, fontWeight: 600 }}>{w.status}</span></td>
                      <td style={{ padding: "8px 10px", color: "var(--tx-mute)" }}>{pfFmtDate(w.createdAt, lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function ProfilePage({ lang, go }) {
  const [tab, setTab] = React.useState(() => {
    try { const t0 = sessionStorage.getItem("404_profile_tab"); if (t0) { sessionStorage.removeItem("404_profile_tab"); return t0; } } catch (e) {}
    return "overview";
  });
  const [coupons, setCoupons] = React.useState([]);
  const [revInfo, setRevInfo] = React.useState(null);
  React.useEffect(() => {
    if (!window.Auth.token()) return;
    window.ShopAPI.myCoupons().then(setCoupons).catch(() => {});
    window.ShopAPI.myReviews().then(setRevInfo).catch(() => {});
  }, [tab]);
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [displayName, setDisplayName] = React.useState("");
  const [curPwd, setCurPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [newPwd2, setNewPwd2] = React.useState("");
  const [saveMsg, setSaveMsg] = React.useState("");
  const [saveErr, setSaveErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [resendMsg, setResendMsg] = React.useState("");

  const load = () => {
    if (!window.Auth.token()) { go("auth"); return; }
    setLoading(true);
    window.ShopAPI.profile()
      .then((p) => { setProfile(p); setDisplayName(p.displayName || p.username || ""); setError(""); })
      .catch((e) => {
        if ((e.message || "").toLowerCase().includes("401") || !window.Auth.token()) { go("auth"); return; }
        setError(e.message);
      })
      .finally(() => setLoading(false));
  };
  React.useEffect(() => { load(); }, []);

  const licenses = ((profile && profile.licenses) || []).filter((l) => {
    if (l.product === "FORTNITE_CLIENT") return true;
    if (l.product === "MARVEL_RIVALS_CLIENT") return true;
    const m = l.metadata || {};
    if (m.shopGame) return true;
    return false;
  });
  const orders = (profile && profile.orders) || [];
  const activeLic = licenses.filter((l) => l.status === "ACTIVE");

  const saveProfile = async (e) => {
    e.preventDefault(); setSaveMsg(""); setSaveErr(""); setBusy(true);
    try {
      await window.ShopAPI.updateProfile({ displayName: displayName.trim() });
      const c = window.Auth.customer() || {};
      window.Auth.set(window.Auth.token(), { ...c, displayName: displayName.trim() });
      setSaveMsg(lang === "fr" ? "Profil mis à jour." : "Profile updated.");
      load();
    } catch (e2) { setSaveErr(e2.message); } finally { setBusy(false); }
  };
  const changePwd = async (e) => {
    e.preventDefault(); setSaveMsg(""); setSaveErr(""); setBusy(true);
    if (newPwd !== newPwd2) { setSaveErr(lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords don't match."); setBusy(false); return; }
    try {
      await window.ShopAPI.changePassword(curPwd, newPwd);
      setCurPwd(""); setNewPwd(""); setNewPwd2("");
      setSaveMsg(lang === "fr" ? "Mot de passe modifié." : "Password changed.");
    } catch (e2) { setSaveErr(e2.message); } finally { setBusy(false); }
  };
  const resend = async () => {
    setResendMsg("");
    try { await window.ShopAPI.resendVerification(); setResendMsg(lang === "fr" ? "Email de vérification renvoyé." : "Verification email sent."); }
    catch (e) { setResendMsg(e.message); }
  };

  if (loading) {
    return (
      <div className="page-enter"><div className="wrap section" style={{ paddingTop: 36 }}>
        <div className="pf-skel" style={{ height: 210, marginBottom: 26 }} />
        <div className="prof-grid" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 26 }}>
          <div className="pf-skel" style={{ height: 320 }} />
          <div style={{ display: "grid", gap: 16 }}><div className="pf-skel" style={{ height: 96 }} /><div className="pf-skel" style={{ height: 220 }} /></div>
        </div>
      </div></div>
    );
  }
  if (error) {
    return <div className="page-enter"><div className="wrap section" style={{ textAlign: "center", paddingTop: 80 }}><p style={{ color: "var(--tx-dim)", marginBottom: 18 }}>{error}</p><Btn kind="outline" onClick={load}>{lang === "fr" ? "Réessayer" : "Retry"}</Btn></div></div>;
  }
  if (!profile) return null;

  const avatarLetter = (profile.displayName || profile.username || "?")[0].toUpperCase();
  const tabs = [
    ["overview", lang === "fr" ? "Vue d'ensemble" : "Overview", Icon.user],
    ["licenses", lang === "fr" ? "Mes licences" : "My licenses", Icon.shield],
    ["orders", lang === "fr" ? "Commandes" : "Orders", Icon.cart],
    ["affiliate", lang === "fr" ? "Affilié" : "Affiliate", Icon.users],
    ["reseller", "Reseller", Icon.store],
    ["settings", lang === "fr" ? "Paramètres" : "Settings", Icon.gear],
  ];

  return (
    <div className="page-enter">
      <Crumbs trail={[t("home", lang), lang === "fr" ? "Mon compte" : "My account"]} lang={lang} />

      <div className="wrap section" style={{ paddingTop: 36 }}>
        {/* ── bannière profil ── */}
        <div className="pf-banner">
          <StarField density={0.8} />
          <i className="orb o1" aria-hidden="true" /><i className="orb o2" aria-hidden="true" />
          <div className="pf-banner-in">
            <div className="pf-avatar">
              <div className="pf-avatar-in">
                {profile.discordAvatar ? <img src={profile.discordAvatar} alt="" /> : avatarLetter}
              </div>
              {profile.emailVerified && <span className="pf-avatar-ok" title={lang === "fr" ? "Email vérifié" : "Email verified"}><Icon.check /></span>}
            </div>
            <div className="pf-id">
              <div className="pf-hello">{lang === "fr" ? "Bon retour," : "Welcome back,"}</div>
              <h1 className="pf-name">{profile.displayName || profile.username}</h1>
              <div className="pf-chips">
                <span className="pf-chip">{profile.email}</span>
                {profile.emailVerified
                  ? <span className="pf-chip ok"><Icon.check />{lang === "fr" ? "Vérifié" : "Verified"}</span>
                  : <span className="pf-chip warn"><Icon.bolt />{lang === "fr" ? "Non vérifié" : "Not verified"}</span>}
                <span className="pf-chip">{lang === "fr" ? "Membre depuis" : "Member since"} {pfFmtDate(profile.createdAt, lang)}</span>
              </div>
            </div>
            <div className="pf-banner-cta">
              <Btn kind="primary" icon={<Icon.store style={{ width: 15, height: 15 }} />} onClick={() => go("store")}>{lang === "fr" ? "Boutique" : "Shop"}</Btn>
              {shopDiscordUrl() && <Btn kind="ghost" icon={<Icon.discord style={{ width: 15, height: 15 }} />} onClick={openShopDiscord}>Support</Btn>}
            </div>
          </div>
        </div>

        <div className="prof-grid" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 26, alignItems: "start" }}>

          {/* ── sidebar ── */}
          <nav className="pf-nav">
            <div className="pf-nav-lab">{lang === "fr" ? "Mon compte" : "My account"}</div>
            {tabs.map(([id, label, Ic]) => (
              <button key={id} className={"pf-tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>
                <span className="pf-tab-ic"><Ic /></span>{label}
                {id === "licenses" && licenses.length > 0 && <em>{licenses.length}</em>}
                {id === "orders" && orders.length > 0 && <em>{orders.length}</em>}
              </button>
            ))}
            <div className="pf-nav-sep" />
            <button className="pf-tab danger" onClick={() => { window.Auth.clear(); go("home"); }}>
              <span className="pf-tab-ic"><Icon.lock /></span>{lang === "fr" ? "Déconnexion" : "Log out"}
            </button>
          </nav>

          {/* ── content ── */}
          <div className="pf-content" key={tab} style={{ display: "grid", gap: 22 }}>

            {/* OVERVIEW */}
            {tab === "overview" && (
              <>
                {!profile.emailVerified && (
                  <div className="panel" style={{ padding: "16px 20px", borderColor: "rgba(251,191,36,.4)", background: "rgba(251,191,36,.08)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{lang === "fr" ? "Vérifie ton email pour pouvoir acheter" : "Verify your email to be able to buy"}</div>
                    <p style={{ color: "var(--tx-dim)", fontSize: 13, marginBottom: 10 }}>{lang === "fr" ? "On t'a envoyé un lien de confirmation." : "We sent you a confirmation link."}</p>
                    <Btn kind="outline" size="sm" onClick={resend}>{lang === "fr" ? "Renvoyer l'email" : "Resend email"}</Btn>
                    {resendMsg && <div style={{ fontSize: 12, color: "var(--acc)", marginTop: 8 }}>{resendMsg}</div>}
                  </div>
                )}
                {revInfo && revInfo.canReview.some((g) => !revInfo.reviews.find((r) => r.game === g.game)) && (() => {
                  const g = revInfo.canReview.find((x) => !revInfo.reviews.find((r) => r.game === x.game));
                  return (
                    <div className="pf-nudge">
                      <div className="pf-nudge-ic"><Icon.star /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b>{lang === "fr" ? `Ton avis sur ${g.gameName} ?` : `How is ${g.gameName}?`}</b>
                        <p>{lang === "fr" ? `30 secondes, et on t'offre −${revInfo.reward ? revInfo.reward.percent : 10} % sur ta prochaine commande.` : `30 seconds, and get −${revInfo.reward ? revInfo.reward.percent : 10}% off your next order.`}</p>
                      </div>
                      <Btn kind="primary" size="sm" onClick={() => setTab("licenses")}>{lang === "fr" ? "Donner mon avis" : "Leave a review"}</Btn>
                    </div>
                  );
                })()}
                {coupons.length > 0 && (
                  <div className="panel pf-review">
                    <h4 className="pf-form-h"><Icon.bolt />{lang === "fr" ? "Mes codes de réduction" : "My discount codes"}</h4>
                    <div style={{ display: "grid", gap: 10 }}>{coupons.map((c) => <PfCouponCard key={c.code} c={c} lang={lang} />)}</div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }} className="prof-stats">
                  <PfStat label={lang === "fr" ? "Licences actives" : "Active licenses"} value={activeLic.length} icon={Icon.shield} sub={licenses.length + " " + (lang === "fr" ? "au total" : "total")} />
                  <PfStat label={lang === "fr" ? "Commandes" : "Orders"} value={orders.length} icon={Icon.cart} sub={orders.filter((o) => o.status === "COMPLETED").length + " " + (lang === "fr" ? "payées" : "paid")} />
                  <PfStat label={lang === "fr" ? "Total dépensé" : "Total spent"} value={Object.entries(orders.filter((order) => order.status === 'COMPLETED').reduce((totals, order) => { const currency = order.currency || 'EUR'; totals[currency] = (totals[currency] || 0) + (order.amount || 0); return totals; }, {})).map(([currency, amount]) => (amount / 100).toFixed(2) + ' ' + currency).join(' · ') || '0'} icon={Icon.bolt} sub={lang === "fr" ? "Merci pour ta confiance" : "Thanks for your trust"} />
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <h3 className="pf-h">{lang === "fr" ? "Mes licences actives" : "My active licenses"}</h3>
                    {licenses.length > 0 && <a style={{ color: "var(--acc)", cursor: "pointer", fontSize: 13, fontWeight: 600 }} onClick={() => setTab("licenses")}>{lang === "fr" ? "Tout voir" : "View all"}</a>}
                  </div>
                  {activeLic.length === 0 ? (
                    <div className="panel pf-empty">
                      <div className="pf-empty-ic"><Icon.shield /></div>
                      <p style={{ color: "var(--tx-dim)", marginBottom: 16 }}>{lang === "fr" ? "Aucune licence active pour l'instant." : "No active license yet."}</p>
                      <Btn kind="primary" onClick={() => go("store")} icon={<Icon.store style={{ width: 15, height: 15 }} />}>{lang === "fr" ? "Découvrir la boutique" : "Browse the shop"}</Btn>
                    </div>
                  ) : (
                    <div className="pf-lic-grid">
                      {activeLic.slice(0, 2).map((l) => <PfLicenseCard key={l.id} lic={l} lang={lang} />)}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* LICENSES */}
            {tab === "licenses" && (
              <>
                <h3 className="pf-h">{lang === "fr" ? "Mes licences" : "My licenses"}</h3>
                {licenses.length === 0 ? (
                  <div className="panel pf-empty">
                    <div className="pf-empty-ic"><Icon.shield /></div>
                    <p style={{ color: "var(--tx-dim)", marginBottom: 16 }}>{lang === "fr" ? "Tu n'as pas encore de licence." : "You don't have any license yet."}</p>
                    <Btn kind="primary" onClick={() => go("store")} icon={<Icon.store style={{ width: 15, height: 15 }} />}>{lang === "fr" ? "Voir la boutique" : "Browse the shop"}</Btn>
                  </div>
                ) : (
                  <div className="pf-lic-grid">
                    {licenses.map((l) => <PfLicenseCard key={l.id} lic={l} lang={lang} />)}
                  </div>
                )}
                <PfReviewBox lang={lang} />
              </>
            )}

            {/* ORDERS */}
            {tab === "orders" && (
              <>
                <h3 className="pf-h">{lang === "fr" ? "Historique des commandes" : "Order history"}</h3>
                {orders.length === 0 ? (
                  <div className="panel pf-empty"><div className="pf-empty-ic"><Icon.cart /></div><p style={{ color: "var(--tx-dim)", marginBottom: 16 }}>{lang === "fr" ? "Aucune commande pour l'instant." : "No orders yet."}</p><Btn kind="primary" onClick={() => go("store")}>{lang === "fr" ? "Voir la boutique" : "Browse the shop"}</Btn></div>
                ) : (
                  <div className="panel pf-orders">
                    <div className="pf-orow pf-ohead">
                      <span>{lang === "fr" ? "Commande" : "Order"}</span><span>{lang === "fr" ? "Date" : "Date"}</span><span>{lang === "fr" ? "Montant" : "Amount"}</span><span>{lang === "fr" ? "Statut" : "Status"}</span>
                    </div>
                    {orders.map((o) => {
                      const st = STATUS_META[o.status] || STATUS_META.PENDING;
                      const items = Array.isArray(o.items) ? o.items : [];
                      const label = items.length
                        ? items.map((it) => (it.gameName || it.game) + (it.qty > 1 ? " ×" + it.qty : "")).join(", ")
                        : ((PLAN_LABEL[o.plan] && PLAN_LABEL[o.plan][lang]) || o.plan);
                      return (
                        <div key={o.id} className="pf-orow">
                          <div className="pf-o-main"><b>{label}</b><small>#{String(o.id).slice(0, 8).toUpperCase()}</small></div>
                          <span className="pf-o-date">{pfFmtDate(o.createdAt, lang)}</span>
                          <span className="pf-o-amt">{(o.amount / 100).toFixed(2)} {o.currency === "EUR" || !o.currency ? "€" : o.currency}</span>
                          <span className="pf-status" style={{ "--st": st.col }}><i />{st[lang]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* AFFILIATE */}
            {tab === "affiliate" && <PfAffiliateTab lang={lang} />}

            {/* RESELLER */}
            {tab === "reseller" && <PfResellerTab lang={lang} />}

            {/* SETTINGS */}
            {tab === "settings" && (
              <>
                <h3 className="pf-h">{lang === "fr" ? "Paramètres" : "Settings"}</h3>
                {saveMsg && <div style={{ background: "var(--acc-soft)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>{saveMsg}</div>}
                {saveErr && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>{saveErr}</div>}

                <div className="pf-settings">
                <form className="panel pf-form" onSubmit={saveProfile}>
                  <h4 className="pf-form-h"><Icon.user />{lang === "fr" ? "Informations" : "Profile"}</h4>
                  <div className="field"><label>{lang === "fr" ? "Nom affiché" : "Display name"}</label><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
                  <div className="field"><label>{t("email", lang)}</label><input className="input" value={profile.email} disabled style={{ opacity: .6 }} /></div>
                  <Btn kind="primary" type="submit" disabled={busy}>{lang === "fr" ? "Enregistrer" : "Save"}</Btn>
                </form>

                <form className="panel pf-form" onSubmit={changePwd}>
                  <h4 className="pf-form-h"><Icon.lock />{lang === "fr" ? "Changer le mot de passe" : "Change password"}</h4>
                  <div className="field"><label>{lang === "fr" ? "Mot de passe actuel" : "Current password"}</label><input className="input" type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} required /></div>
                  <div className="field"><label>{lang === "fr" ? "Nouveau mot de passe" : "New password"}</label><input className="input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required /></div>
                  <div className="field"><label>{lang === "fr" ? "Confirmer" : "Confirm"}</label><input className="input" type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} required /></div>
                  <Btn kind="primary" type="submit" disabled={busy}>{lang === "fr" ? "Modifier" : "Update"}</Btn>
                </form>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

window.ProfilePage = ProfilePage;
