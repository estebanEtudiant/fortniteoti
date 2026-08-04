import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { PokemonNav, PokemonFooter } from './pokemon/Shell.jsx';
import './pokemon.css';

const STATUS_LABELS = {
  PENDING: 'En attente de paiement',
  PAID: 'Payée — en préparation',
  PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
};

function statusClass(status) {
  if (status === 'DELIVERED') return 'delivered';
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'cancelled';
  return '';
}

export default function PokemonAccountPage({ customer, onLogout }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    document.title = 'Mon compte — CardRevive';
    api.getPokemonOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  const resendVerification = async () => {
    setResendBusy(true);
    try { await api.resendVerification(); setResent(true); }
    catch (e) { setError(e.message); }
    finally { setResendBusy(false); }
  };

  return (
    <div className="pkm">
      <PokemonNav customer={customer} onLogout={onLogout} />
      <div className="pkm-section" style={{ maxWidth: 760 }}>
        <div className="pkm-account-header">
          <div>
            <h1>Mon compte</h1>
            <p style={{ color: 'var(--pkm-text-dim)', margin: '0.4rem 0 0' }}>{customer?.displayName || customer?.username} · {customer?.email}</p>
          </div>
        </div>

        {customer && !customer.emailVerified && (
          <div className="pkm-verify-banner">
            <span>Ton email n'est pas encore vérifié — indispensable pour commander.</span>
            {resent ? <span style={{ color: 'var(--pkm-gold-bright)' }}>Email envoyé ✓</span> : (
              <button className="pkm-link-btn" onClick={resendVerification} disabled={resendBusy}>
                {resendBusy ? 'Envoi…' : 'Renvoyer l\'email'}
              </button>
            )}
          </div>
        )}

        {error && <div className="pkm-error">{error}</div>}

        <h2 style={{ fontFamily: 'var(--pkm-serif)', fontSize: '1.3rem', margin: '0 0 1.25rem' }}>Mes commandes</h2>

        {orders === null && !error && <p style={{ color: 'var(--pkm-text-dim)' }}>Chargement…</p>}
        {orders?.length === 0 && (
          <p style={{ color: 'var(--pkm-text-dim)' }}>Tu n'as pas encore de commande. <a href="/pokemon" style={{ color: 'var(--pkm-gold-bright)', textDecoration: 'underline' }}>Découvrir les kits →</a></p>
        )}
        {orders?.map((o) => {
          const items = Array.isArray(o.items) ? o.items : [];
          return (
            <div className="pkm-order" key={o.id}>
              <div className="pkm-order-top">
                <span className={`pkm-order-status ${statusClass(o.status)}`}>{STATUS_LABELS[o.status] || o.status}</span>
                <span style={{ color: 'var(--pkm-text-dim)', fontSize: '0.82rem' }}>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="pkm-order-items">{items.map((it) => `${it.nameFr} x${it.qty}`).join(', ')}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--pkm-gold-bright)', fontFamily: 'var(--pkm-serif)' }}>{(o.amount / 100).toFixed(2)} €</strong>
                {o.trackingNumber && (
                  <span className="pkm-order-tracking">
                    Suivi : {o.trackingNumber}
                    {o.trackingUrl && <> · <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer">Suivre le colis</a></>}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <PokemonFooter />
    </div>
  );
}
