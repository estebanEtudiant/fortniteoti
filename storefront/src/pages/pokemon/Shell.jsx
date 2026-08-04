import React from 'react';
import { navigate } from '../../lib/router.js';

export function PokemonNav({ customer, onLogout, cartCount = 0, onCartClick }) {
  return (
    <nav className="pkm-nav">
      <div className="pkm-brand" onClick={() => navigate('/pokemon')} style={{ cursor: 'pointer' }}>
        Card<span>Revive</span>
      </div>
      <div className="pkm-nav-right">
        <button className="pkm-nav-link" onClick={() => navigate('/pokemon')}>Boutique</button>
        {customer ? (
          <>
            <button className="pkm-nav-link" onClick={() => navigate('/pokemon/account')}>Mon compte</button>
            <button className="pkm-nav-link" onClick={() => onLogout?.('/pokemon')}>Déconnexion</button>
          </>
        ) : (
          <button className="pkm-nav-link" onClick={() => navigate('/pokemon/login')}>Se connecter</button>
        )}
        {onCartClick && (
          <button className="pkm-cart-btn" onClick={onCartClick}>
            Panier
            {cartCount > 0 && <span className="pkm-cart-count">{cartCount}</span>}
          </button>
        )}
      </div>
    </nav>
  );
}

export function PokemonFooter() {
  return (
    <footer className="pkm-footer">
      <div className="pkm-footer-links">
        <button onClick={() => navigate('/pokemon')}>Boutique</button>
        <span>·</span>
        <button onClick={() => navigate('/pokemon/account')}>Mon compte</button>
        <span>·</span>
        <button onClick={() => navigate('/pokemon/legal')}>Mentions légales & CGV</button>
        <span>·</span>
        <a href="mailto:404tweakscontact@gmail.com">Contact</a>
      </div>
      <p>© {new Date().getFullYear()} CardRevive — Kits de rénovation de cartes à collectionner.</p>
    </footer>
  );
}
