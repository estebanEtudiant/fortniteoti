import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { loadCart, saveCart, cartCount as countCart } from '../lib/pokemonCart.js';
import { PokemonNav, PokemonFooter } from './pokemon/Shell.jsx';
import './pokemon.css';

const COUNTRY_NAMES = { FR: 'France', BE: 'Belgique', CH: 'Suisse', LU: 'Luxembourg' };

const FAQS = [
  {
    q: 'Comment fonctionne le kit de rénovation ?',
    a: 'Le kit contient tout le nécessaire pour redonner un aspect neuf à tes cartes : nettoyage des surfaces, protection anti-rayures et sleeves premium. Un guide pas-à-pas est inclus dans le colis.',
  },
  {
    q: 'Est-ce que ça abîme mes cartes ?',
    a: 'Non, les produits fournis sont spécifiquement formulés pour les cartes à collectionner et ne contiennent aucun solvant agressif. Suis simplement le guide fourni.',
  },
  {
    q: "Combien de temps pour recevoir ma commande ?",
    a: "La commande est préparée sous 24 à 48h ouvrées puis expédiée. Tu reçois un email avec le numéro de suivi dès l'envoi.",
  },
  {
    q: "Puis-je retourner le kit si je change d'avis ?",
    a: "Oui, conformément au droit de rétractation, tu disposes de 14 jours pour retourner le kit s'il n'a pas été descellé. Voir nos mentions légales & CGV pour la procédure complète.",
  },
];

const STEPS = [
  { title: 'Tu commandes', text: 'Choisis ton kit, renseigne ton adresse de livraison et paie en toute sécurité.' },
  { title: 'On prépare & expédie', text: "Ta commande est préparée sous 24 à 48h et expédiée avec un numéro de suivi envoyé par email." },
  { title: 'Tu restaures tes cartes', text: 'Suis le guide inclus dans le kit et redonne à ta collection tout son éclat.' },
];

function FaqAccordion({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pkm-faq-item">
      <button className="pkm-faq-q" onClick={() => setOpen((o) => !o)}>
        <span>{q}</span>
        <span className={`chevron${open ? ' open' : ''}`}>▾</span>
      </button>
      {open && <div className="pkm-faq-a">{a}</div>}
    </div>
  );
}

export default function PokemonPage({ customer, onLogout }) {
  const [products, setProducts] = useState(null);
  const [settings, setSettings] = useState(null);
  const [cart, setCart] = useState(() => loadCart());
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState('');
  const [shipping, setShipping] = useState({
    shippingName: customer?.displayName || '', shippingLine1: '', shippingLine2: '',
    shippingCity: '', shippingPostalCode: '', shippingCountry: 'FR', shippingPhone: '',
  });
  const [successState, setSuccessState] = useState(null);

  useEffect(() => {
    document.title = 'CardRevive — Kits de rénovation de cartes à collectionner';
    api.getPokemonProducts().then(setProducts).catch(() => setProducts([]));
    api.getPokemonSettings().then(setSettings).catch(() => setSettings({ allowedCountries: ['FR'] }));
  }, []);

  useEffect(() => { saveCart(cart); }, [cart]);

  // Retour Stripe : ?session_id=...#success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id') && window.location.hash === '#success') {
      setSuccessState('pending');
      setCart({});
      let tries = 0;
      const poll = setInterval(async () => {
        tries += 1;
        try {
          const orders = await api.getPokemonOrders();
          const paid = orders?.find((o) => o.status !== 'PENDING');
          if (paid) { setSuccessState(paid); clearInterval(poll); }
        } catch { /* pas connecté ou erreur réseau, on continue de patienter */ }
        if (tries >= 8) clearInterval(poll);
      }, 1500);
      return () => clearInterval(poll);
    }
  }, []);

  const addToCart = (slug) => setCart((c) => ({ ...c, [slug]: (c[slug] || 0) + 1 }));
  const decFromCart = (slug) => setCart((c) => {
    const qty = (c[slug] || 0) - 1;
    const next = { ...c };
    if (qty <= 0) delete next[slug]; else next[slug] = qty;
    return next;
  });

  const cartLines = Object.entries(cart)
    .map(([slug, qty]) => ({ product: products?.find((p) => p.id === slug), qty }))
    .filter((l) => l.product);
  const subtotalCents = cartLines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const shippingCents = settings
    ? (settings.freeShippingThresholdCents > 0 && subtotalCents >= settings.freeShippingThresholdCents ? 0 : settings.flatShippingCents)
    : 0;
  const totalCents = subtotalCents + shippingCents;
  const cartQty = countCart(cart);

  const scrollToProducts = () => document.getElementById('pkm-products')?.scrollIntoView({ behavior: 'smooth' });

  const openCheckout = () => {
    if (!cartLines.length) { scrollToProducts(); return; }
    if (!customer) { navigate('/pokemon/login'); return; }
    setShowCheckout(true);
  };

  const submitCheckout = async (e) => {
    e.preventDefault();
    setCheckoutErr(''); setCheckoutBusy(true);
    try {
      const { url } = await api.createPokemonCheckoutSession({
        items: cartLines.map((l) => ({ slug: l.product.id, qty: l.qty })),
        ...shipping,
      });
      window.location.href = url;
    } catch (err) {
      setCheckoutErr(err.message);
      setCheckoutBusy(false);
    }
  };

  if (successState) {
    return (
      <div className="pkm">
        <PokemonNav customer={customer} onLogout={onLogout} />
        <div className="pkm-success">
          <div className="pkm-success-card">
            <div className="pkm-success-icon">✦</div>
            <h2 style={{ fontFamily: 'var(--pkm-serif)', fontSize: '1.8rem', margin: '0 0 0.75rem' }}>Commande confirmée</h2>
            {successState === 'pending' ? (
              <p style={{ color: 'var(--pkm-text-dim)' }}>On finalise ta commande… ça ne prend que quelques secondes.</p>
            ) : (
              <>
                <p style={{ color: 'var(--pkm-text-dim)', lineHeight: 1.6 }}>
                  Merci pour ta commande. Tu vas recevoir un email de confirmation, puis un second avec le numéro de suivi dès l'expédition.
                </p>
                <p style={{ marginTop: '1rem' }}>
                  Total payé : <strong style={{ color: 'var(--pkm-gold-bright)' }}>{(successState.amount / 100).toFixed(2)} €</strong>
                </p>
              </>
            )}
            <button className="pkm-btn pkm-btn-gold" style={{ marginTop: '1.75rem' }} onClick={() => navigate('/pokemon/account')}>
              Voir mes commandes
            </button>
          </div>
        </div>
        <PokemonFooter />
      </div>
    );
  }

  return (
    <div className="pkm">
      <PokemonNav customer={customer} onLogout={onLogout} cartCount={cartQty} onCartClick={openCheckout} />

      {/* ── HERO ── */}
      <section className="pkm-hero">
        <div className="pkm-eyebrow">Kit de restauration · Cartes à collectionner</div>
        <h1>Redonne à tes cartes<br />leur <em>éclat d'origine</em></h1>
        <p>Nettoyage, protection et sleeves premium — un rituel simple pour restaurer et sublimer ta collection.</p>
        <button className="pkm-btn pkm-btn-gold" onClick={scrollToProducts}>Découvrir les kits →</button>
      </section>

      {/* ── BARRE DE CONFIANCE ── */}
      <div className="pkm-trust">
        <div className="pkm-trust-item"><span className="icon">✓</span> Paiement 100% sécurisé</div>
        <div className="pkm-trust-item"><span className="icon">✓</span> Expédition sous 24-48h</div>
        <div className="pkm-trust-item"><span className="icon">✓</span> Retours sous 14 jours</div>
      </div>

      {/* ── AVANT / APRÈS ── */}
      <section className="pkm-section pkm-section-alt">
        <h2 className="pkm-section-title">Le résultat en un <em>coup d'œil</em></h2>
        <div className="pkm-compare">
          <div className="pkm-compare-item">
            <div className="pkm-compare-frame before" />
            <p className="pkm-compare-label">Avant</p>
          </div>
          <div className="pkm-compare-item">
            <div className="pkm-compare-frame after" />
            <p className="pkm-compare-label after">Après</p>
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="pkm-section">
        <h2 className="pkm-section-title">Comment ça <em>marche</em></h2>
        <div className="pkm-steps">
          {STEPS.map((s, i) => (
            <div className="pkm-step" key={i}>
              <div className="pkm-step-num">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUITS ── */}
      <section className="pkm-section pkm-section-alt" id="pkm-products">
        <h2 className="pkm-section-title">Choisis ton <em>kit</em></h2>
        <p className="pkm-section-sub">
          Paiement sécurisé · Livraison en France{settings?.allowedCountries?.length > 1 ? ' et pays limitrophes' : ''}
          {settings?.freeShippingThresholdCents > 0 && <> · Livraison offerte dès {(settings.freeShippingThresholdCents / 100).toFixed(0)} €</>}
        </p>

        <div className="pkm-grid">
          {products === null && <p style={{ color: 'var(--pkm-text-dim)', gridColumn: '1/-1', textAlign: 'center' }}>Chargement des kits…</p>}
          {products?.length === 0 && <p style={{ color: 'var(--pkm-text-dim)', gridColumn: '1/-1', textAlign: 'center' }}>Les kits arrivent très bientôt, reviens vite !</p>}
          {products?.map((p) => {
            const qtyInCart = cart[p.id] || 0;
            return (
              <div key={p.id} className={`pkm-card${p.featured ? ' featured' : ''}`}>
                {p.featured && <span className="pkm-card-badge">Le plus choisi</span>}
                {p.images?.[0] && (
                  <div className="pkm-card-img"><img src={p.images[0]} alt={p.name.fr} /></div>
                )}
                <h3>{p.name.fr}</h3>
                {p.description?.fr && <p className="pkm-card-desc">{p.description.fr}</p>}
                <div className="pkm-card-price">
                  {p.compareAtPrice > p.price && <span className="old">{(p.compareAtPrice / 100).toFixed(2)} €</span>}
                  <span className="now">{(p.price / 100).toFixed(2)} €</span>
                </div>
                {p.includes?.fr?.length > 0 && (
                  <ul>{p.includes.fr.map((item, i) => <li key={i}>{item}</li>)}</ul>
                )}
                {!p.inStock ? (
                  <button className="pkm-btn pkm-btn-ghost" disabled style={{ width: '100%', justifyContent: 'center' }}>Rupture de stock</button>
                ) : qtyInCart === 0 ? (
                  <button className="pkm-btn pkm-btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => addToCart(p.id)}>
                    Ajouter au panier
                  </button>
                ) : (
                  <div className="pkm-qty">
                    <button onClick={() => decFromCart(p.id)}>−</button>
                    <strong>{qtyInCart}</strong>
                    <button onClick={() => addToCart(p.id)} disabled={qtyInCart >= p.stock}>+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pkm-section">
        <h2 className="pkm-section-title">Questions <em>fréquentes</em></h2>
        <div className="pkm-faq">
          {FAQS.map((f, i) => <FaqAccordion key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      <PokemonFooter />

      {/* ── PANIER STICKY ── */}
      {cartQty > 0 && !showCheckout && (
        <div className="pkm-cartbar">
          <div className="pkm-cartbar-info">
            {cartQty} article{cartQty > 1 ? 's' : ''} — <strong>{(totalCents / 100).toFixed(2)} €</strong>
            {shippingCents === 0 && subtotalCents > 0 ? ' (port offert)' : ''}
          </div>
          <button className="pkm-btn pkm-btn-gold" onClick={openCheckout}>Commander</button>
        </div>
      )}

      {/* ── MODALE CHECKOUT ── */}
      {showCheckout && (
        <div className="pkm-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
          <div className="pkm-modal">
            <h2>Livraison</h2>
            <p className="pkm-modal-sub">Renseigne l'adresse de livraison de ta commande.</p>

            <div className="pkm-summary">
              {cartLines.map((l) => (
                <div key={l.product.id} className="pkm-summary-row">
                  <span>{l.product.name.fr} x{l.qty}</span>
                  <span>{((l.product.price * l.qty) / 100).toFixed(2)} €</span>
                </div>
              ))}
              <div className="pkm-summary-row">
                <span>Livraison</span>
                <span>{shippingCents === 0 ? 'Offerte' : `${(shippingCents / 100).toFixed(2)} €`}</span>
              </div>
              <div className="pkm-summary-total"><span>Total</span><span>{(totalCents / 100).toFixed(2)} €</span></div>
            </div>

            {checkoutErr && <div className="pkm-error">{checkoutErr}</div>}

            <form onSubmit={submitCheckout}>
              <div className="pkm-field">
                <label>Nom complet</label>
                <input required value={shipping.shippingName} onChange={(e) => setShipping({ ...shipping, shippingName: e.target.value })} />
              </div>
              <div className="pkm-field">
                <label>Adresse</label>
                <input required value={shipping.shippingLine1} onChange={(e) => setShipping({ ...shipping, shippingLine1: e.target.value })} />
              </div>
              <div className="pkm-field">
                <label>Complément (optionnel)</label>
                <input value={shipping.shippingLine2} onChange={(e) => setShipping({ ...shipping, shippingLine2: e.target.value })} />
              </div>
              <div className="pkm-row2">
                <div className="pkm-field">
                  <label>Code postal</label>
                  <input required value={shipping.shippingPostalCode} onChange={(e) => setShipping({ ...shipping, shippingPostalCode: e.target.value })} />
                </div>
                <div className="pkm-field">
                  <label>Ville</label>
                  <input required value={shipping.shippingCity} onChange={(e) => setShipping({ ...shipping, shippingCity: e.target.value })} />
                </div>
              </div>
              <div className="pkm-field">
                <label>Pays</label>
                <select value={shipping.shippingCountry} onChange={(e) => setShipping({ ...shipping, shippingCountry: e.target.value })}>
                  {(settings?.allowedCountries || ['FR']).map((c) => <option key={c} value={c}>{COUNTRY_NAMES[c] || c}</option>)}
                </select>
              </div>
              <div className="pkm-field">
                <label>Téléphone (optionnel, pour le transporteur)</label>
                <input value={shipping.shippingPhone} onChange={(e) => setShipping({ ...shipping, shippingPhone: e.target.value })} />
              </div>

              <button type="submit" className="pkm-btn pkm-btn-gold" disabled={checkoutBusy} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                {checkoutBusy ? 'Redirection…' : `Payer ${(totalCents / 100).toFixed(2)} €`}
              </button>
              <button type="button" onClick={() => setShowCheckout(false)} className="pkm-btn pkm-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '0.6rem' }}>
                Retour
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
