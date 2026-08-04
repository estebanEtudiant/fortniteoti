import React, { useState, useEffect } from 'react';
import { navigate } from '../lib/router.js';
import { PokemonNav, PokemonFooter } from './pokemon/Shell.jsx';
import './pokemon.css';

export default function PokemonRegisterPage({ onRegister }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = 'Créer un compte — CardRevive'; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await onRegister(email, username, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pkm">
      <PokemonNav />
      <div className="pkm-auth-wrap">
        <div className="pkm-auth-card">
          {done ? (
            <>
              <h1>Vérifie ta boîte mail</h1>
              <p className="pkm-auth-sub" style={{ lineHeight: 1.6 }}>
                Ton compte est créé. On t'a envoyé un email de confirmation — clique sur le lien qu'il contient pour pouvoir passer commande.
              </p>
              <button className="pkm-btn pkm-btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/pokemon')}>
                Retour à la boutique
              </button>
            </>
          ) : (
            <>
              <h1>Créer un compte</h1>
              <p className="pkm-auth-sub">Nécessaire pour commander et suivre tes kits.</p>
              {error && <div className="pkm-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="pkm-field">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="pkm-field">
                  <label>Identifiant</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" minLength={3} />
                </div>
                <div className="pkm-field">
                  <label>Mot de passe</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
                </div>
                <button type="submit" className="pkm-btn pkm-btn-gold" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                  {loading ? 'Création…' : 'Créer mon compte'}
                </button>
              </form>
              <p className="pkm-auth-switch">
                Déjà un compte ? <button onClick={() => navigate('/pokemon/login')}>Se connecter</button>
              </p>
            </>
          )}
        </div>
      </div>
      <PokemonFooter />
    </div>
  );
}
