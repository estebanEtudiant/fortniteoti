import React from 'react';
import { navigate } from '../lib/router.js';

const steps = [
  {
    icon: 'fa-cart-shopping',
    color: '#00D4FF',
    step: '01',
    title: 'Achetez',
    desc: 'Choisissez votre plan et payez en toute sécurité via Stripe. Vous recevez votre clé de licence par email en moins de 30 secondes.',
    details: ['Paiement sécurisé Stripe', 'Clé de licence par email', 'Accès immédiat'],
  },
  {
    icon: 'fa-download',
    color: '#8F66FF',
    step: '02',
    title: 'Téléchargez',
    desc: 'Téléchargez le logiciel 404 Tweaks depuis votre espace client. Installation en moins de 1 minute, aucune compétence technique requise.',
    details: ['1 clic pour télécharger', 'Compatible Windows 10/11', 'Aucune installation complexe'],
  },
  {
    icon: 'fa-rocket',
    color: '#33C76B',
    step: '03',
    title: 'Optimisez',
    desc: 'Lancez le logiciel, entrez votre clé, et appliquez vos 98 tweaks en un seul clic. Résultats visibles dès le premier lancement de Fortnite.',
    details: ['98 tweaks en 1 clic', 'Résultats immédiats', 'Restauration possible'],
  },
];

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: '80vh', padding: '7rem 1rem 6rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div className="hero-badge" style={{ marginBottom: '1.25rem', background: 'rgba(222,255,154,0.12)', border: '1px solid rgba(222,255,154,0.5)' }}>
            ⚡ SIMPLE &amp; RAPIDE
          </div>
          <h1 className="section-title" style={{ marginBottom: '1rem' }}>
            Comment <span className="highlight">ça marche</span> ?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 500, margin: '0 auto' }}>
            3 étapes pour transformer votre PC de gamer en machine de guerre
          </p>
        </div>

        {/* Steps */}
        <div className="how-steps">
          {steps.map((s, i) => (
            <div className="how-step animate-on-scroll" key={i} style={{ animationDelay: `${i * 0.15}s` }}>
              {i < steps.length - 1 && <div className="how-connector" aria-hidden="true" />}
              <div className="how-step-icon-wrap" style={{ '--step-color': s.color }}>
                <span className="how-step-num">{s.step}</span>
                <div className="how-step-icon">
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color }} />
                </div>
              </div>
              <div className="how-step-content">
                <h3 className="how-step-title" style={{ color: s.color }}>{s.title}</h3>
                <p className="how-step-desc">{s.desc}</p>
                <ul className="how-step-details">
                  {s.details.map((d, j) => (
                    <li key={j}><i className="fa-solid fa-check" style={{ color: s.color, marginRight: 8 }}></i>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '2.5rem 2rem', display: 'inline-block', maxWidth: 480 }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.4rem' }}>
              Prêt à <span className="highlight">passer au niveau supérieur</span> ?
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              Rejoignez les joueurs qui ont déjà transformé leur setup avec 404 Tweaks.
            </p>
            <button className="cta-primary" style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }} onClick={() => navigate('/')}>
              <i className="fa-solid fa-cart-shopping" style={{ marginRight: 8 }}></i>
              Voir les plans →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
